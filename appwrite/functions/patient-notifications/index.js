/*
  Appwrite Function: patient-notifications
  Runtime: Node.js
  Trigger events:
  - users.*.create
  - databases.*.tables.<APPOINTMENT_TABLE_ID>.rows.*.create
*/

const sdk = require("node-appwrite")

const {
  APPWRITE_FUNCTION_ENDPOINT,
  APPWRITE_FUNCTION_PROJECT_ID,
  APPWRITE_FUNCTION_API_KEY,
  DATABASE_ID,
  PATIENT_TABLE_ID,
  APPOINTMENT_TABLE_ID,
} = process.env

function buildClient() {
  const client = new sdk.Client()

  client
    .setEndpoint(APPWRITE_FUNCTION_ENDPOINT)
    .setProject(APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(APPWRITE_FUNCTION_API_KEY)

  return client
}

async function sendEmailToUser({ messaging, userId, subject, html }) {
  if (!userId) {
    return
  }

  await messaging.createEmail({
    messageId: sdk.ID.unique(),
    subject,
    content: html,
    users: [userId],
    html: true,
    draft: false,
  })
}

module.exports = async ({ req, res, log, error }) => {
  try {
    const event = req.headers["x-appwrite-event"] || ""
    const payload = req.body || {}

    const client = buildClient()
    const messaging = new sdk.Messaging(client)
    const users = new sdk.Users(client)
    const tablesDB = new sdk.TablesDB(client)

    if (event.includes("users") && event.includes("create")) {
      const userId = payload.$id
      const name = (payload.name || "Patient").trim() || "Patient"

      await sendEmailToUser({
        messaging,
        userId,
        subject: "Your NetCare account was created",
        html: `<h2>Welcome to NetCare, ${name}</h2><p>Your account was created successfully.</p>`,
      })

      return res.json({ ok: true, type: "account-created" })
    }

    if (
      event.includes("rows") &&
      event.includes("create") &&
      event.includes(`tables.${APPOINTMENT_TABLE_ID}`)
    ) {
      const patientRowId = typeof payload.patient === "string" ? payload.patient : payload.patient?.$id || ""
      const reason = payload.reason_for_visit || "General consultation"
      const appointmentDate = payload.appointment_date
        ? new Date(payload.appointment_date).toLocaleString()
        : payload.time_slot || ""

      if (patientRowId && DATABASE_ID && PATIENT_TABLE_ID) {
        const patientRow = await tablesDB.getRow({
          databaseId: DATABASE_ID,
          tableId: PATIENT_TABLE_ID,
          rowId: patientRowId,
        })

        const patientUserId = patientRow?.userId || ""

        if (!patientUserId) {
          return res.json({ ok: true, ignored: true, reason: "missing patient user id" })
        }

        const user = await users.get({ userId: patientUserId })
        const name = (user.name || "Patient").trim() || "Patient"

        await sendEmailToUser({
          messaging,
          userId: patientUserId,
          subject: "Your NetCare appointment is booked",
          html: `<h2>Appointment confirmed</h2><p>Hi ${name}, your appointment has been created successfully.</p><p><strong>Date:</strong> ${appointmentDate}</p><p><strong>Reason:</strong> ${reason}</p>`,
        })
      }

      return res.json({ ok: true, type: "appointment-created" })
    }

    log(`Ignored event: ${event}`)
    return res.json({ ok: true, ignored: true })
  } catch (err) {
    error(`Function failed: ${err?.message || err}`)
    return res.json({ ok: false, message: err?.message || "Unknown error" }, 500)
  }
}
