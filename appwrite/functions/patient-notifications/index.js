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
  APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID,
  DATABASE_ID,
  PATIENT_TABLE_ID,
  APPOINTMENT_TABLE_ID,
} = process.env

const RESOLVED_ENDPOINT = APPWRITE_FUNCTION_ENDPOINT || APPWRITE_ENDPOINT
const RESOLVED_PROJECT_ID = APPWRITE_FUNCTION_PROJECT_ID || APPWRITE_PROJECT_ID

function getHeaderValue(headers, key) {
  if (!headers || typeof headers !== "object") {
    return ""
  }

  const direct = headers[key]
  if (typeof direct === "string") {
    return direct
  }

  const lowered = Object.keys(headers).find((candidate) => candidate.toLowerCase() === key.toLowerCase())
  if (!lowered) {
    return ""
  }

  const value = headers[lowered]
  return typeof value === "string" ? value : ""
}

function parseBody(body) {
  if (!body) {
    return {}
  }

  if (typeof body === "string") {
    try {
      return JSON.parse(body)
    } catch {
      return {}
    }
  }

  if (typeof body === "object") {
    return body
  }

  return {}
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function renderEmailFooter(includeUnsubscribe = true) {
  return `
    <div style="margin-top: 24px; background-color: #f8f9fa; padding: 30px 20px; border-top: 1px solid #e9ecef; text-align: center; font-family: 'Segoe UI', Arial, sans-serif;">
      <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #333;">NetCare Flow Institution</p>
      <p style="margin: 0 0 20px 0; font-size: 12px; color: #777; line-height: 1.5;">123 Medical Plaza, Nairobi, Kenya<br />Questions? Contact us at <a href="mailto:support@netcareflow.com" style="color: #1a73e8; text-decoration: none;">support@netcareflow.com</a></p>
      ${includeUnsubscribe ? `
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td align="center" style="padding-bottom: 20px;">
            <a href="mailto:support@netcareflow.com?subject=Unsubscribe%20from%20NetCare%20emails" style="background-color: #ffffff; border: 1px solid #d1d5db; color: #4b5563; padding: 8px 16px; text-decoration: none; border-radius: 4px; font-size: 11px; font-weight: bold; display: inline-block;">UNSUBSCRIBE FROM THESE EMAILS</a>
          </td>
        </tr>
      </table>
      ` : `<p style="margin: 0 0 18px 0; font-size: 12px; color: #777; line-height: 1.6; max-width: 520px; margin-left: auto; margin-right: auto;">You are receiving this mandatory service announcement regarding your scheduled healthcare appointment. These messages are essential for your care and cannot be turned off.</p>`}
      <div style="font-size: 11px; color: #999;">
        <a href="https://netcareflow.com/privacy" style="color: #999; text-decoration: underline;">Privacy Policy</a>
        &nbsp;&bull;&nbsp;
        <a href="https://netcareflow.com/settings" style="color: #999; text-decoration: underline;">Notification Settings</a>
      </div>
      <p style="margin-top: 20px; font-size: 10px; color: #bbb; line-height: 1.4; max-width: 500px; margin-left: auto; margin-right: auto;">CONFIDENTIALITY NOTICE: This message may contain protected health information. If you are not the intended recipient, please delete this email and notify the sender immediately.</p>
    </div>
  `
}

function buildClient() {
  const client = new sdk.Client()

  client
    .setEndpoint(RESOLVED_ENDPOINT)
    .setProject(RESOLVED_PROJECT_ID)
    .setKey(APPWRITE_FUNCTION_API_KEY)

  return client
}

function getMissingVars(required) {
  return required.filter((entry) => !entry.value).map((entry) => entry.name)
}

function isValidUserId(userId) {
  if (!userId || typeof userId !== "string") {
    return false
  }
  if (userId.length > 36) {
    return false
  }
  if (userId.startsWith("_")) {
    return false
  }
  if (!/^[a-zA-Z0-9_]+$/.test(userId)) {
    return false
  }
  return true
}

function parseAppointmentEvent(event) {
  const tableMatch = event.match(/^databases\.([^.]+)\.tables\.([^.]+)\.rows\.([^.]+)\.create$/)
  if (tableMatch) {
    return {
      databaseId: tableMatch[1],
      collectionOrTableId: tableMatch[2],
      documentOrRowId: tableMatch[3],
      mode: "table",
    }
  }

  const collectionMatch = event.match(
    /^databases\.([^.]+)\.collections\.([^.]+)\.documents\.([^.]+)\.create$/
  )
  if (collectionMatch) {
    return {
      databaseId: collectionMatch[1],
      collectionOrTableId: collectionMatch[2],
      documentOrRowId: collectionMatch[3],
      mode: "collection",
    }
  }

  return null
}

async function sendEmailToUser({ messaging, userId, subject, html }) {
  if (!userId) {
    return
  }

  await messaging.createEmail(
    sdk.ID.unique(),
    subject,
    html,
    [],
    [userId],
    [],
    [],
    [],
    [],
    false,
    true
  )
}

module.exports = async ({ req, res, log, error }) => {
  try {
    const event = getHeaderValue(req.headers, "x-appwrite-event")
    const payload = parseBody(req.body)

    if (!event) {
      log("Ignored execution without x-appwrite-event header (likely manual console run).")
      return res.json({ ok: true, ignored: true, reason: "missing event header" })
    }

    const isUserCreateEvent = event === "users.*.create" || /^users\.[^.]+\.create$/.test(event)
    const parsedAppointmentEvent = parseAppointmentEvent(event)
    const isAppointmentCreateEvent = Boolean(parsedAppointmentEvent)

    if (!isUserCreateEvent && !isAppointmentCreateEvent) {
      log(`Ignored event: ${event}`)
      return res.json({ ok: true, ignored: true })
    }

    const requiredCore = [
      { name: "APPWRITE_FUNCTION_ENDPOINT (or APPWRITE_ENDPOINT)", value: RESOLVED_ENDPOINT },
      { name: "APPWRITE_FUNCTION_PROJECT_ID (or APPWRITE_PROJECT_ID)", value: RESOLVED_PROJECT_ID },
      { name: "APPWRITE_FUNCTION_API_KEY", value: APPWRITE_FUNCTION_API_KEY },
    ]

    const missingCore = getMissingVars(requiredCore)
    if (missingCore.length) {
      throw new Error(`Missing required function environment configuration: ${missingCore.join(", ")}`)
    }

    const client = buildClient()
    const messaging = new sdk.Messaging(client)
    const users = new sdk.Users(client)
    const databases = new sdk.Databases(client)

    if (isUserCreateEvent) {
      const userId = payload.$id
      const name = (payload.name || "Patient").trim() || "Patient"

      if (!isValidUserId(userId)) {
        log(`Skipping account email: userId from event is invalid "${userId}"`)
        return res.json({ ok: true, ignored: true, reason: "invalid user id format from event" })
      }

      try {
        await sendEmailToUser({
          messaging,
          userId,
          subject: `Welcome to NetCare, ${name}! 🚀`,
          html: `
            <p>Hi ${escapeHtml(name)},</p>
            <p>We’re thrilled to have you on board! You’ve taken the first step toward seamless appointment management and secure care coordination.</p>
            <p>To help you hit the ground running, here are the first three things you can do:</p>
            <ol>
              <li><strong>Complete Your Profile:</strong> Add your details to ensure a personalized experience.</li>
              <li><strong>Book Your First Appointment:</strong> Check out available slots and get started.</li>
              <li><strong>Explore the Dashboard:</strong> Get familiar with your tools and settings.</li>
            </ol>
            <p><strong>Quick Links:</strong></p>
            <ul>
              <li><a href="https://netcareflow-portal.com/dashboard">Go to Dashboard</a></li>
              <li><a href="https://netcareflow-portal.com/help">View Help Center</a></li>
            </ul>
            <p>If you have any questions, just hit Reply—our team is always here to help.</p>
              ${renderEmailFooter(false)}
            <p>Cheers,<br />The NetCare Flow Team</p>
          `,
        })
      } catch (emailErr) {
        log(`Account email send failed: ${emailErr?.message || emailErr}`)
        return res.json({ ok: true, email_error: emailErr?.message || "unknown" })
      }

      return res.json({ ok: true, type: "account-created" })
    }

    if (isAppointmentCreateEvent) {
      const eventDatabaseId = parsedAppointmentEvent.databaseId
      const eventAppointmentId = parsedAppointmentEvent.collectionOrTableId

      if (DATABASE_ID && eventDatabaseId !== DATABASE_ID) {
        log(`Ignored appointment event from different database: ${eventDatabaseId}`)
        return res.json({ ok: true, ignored: true, reason: "database mismatch" })
      }

      if (APPOINTMENT_TABLE_ID && eventAppointmentId !== APPOINTMENT_TABLE_ID) {
        log(`Ignored appointment event for different collection/table: ${eventAppointmentId}`)
        return res.json({ ok: true, ignored: true, reason: "appointment id mismatch" })
      }

      // Appointment confirmation emails are sent by the Next.js server action
      // (lib/actions/email-notification.action.ts). Skip function-based sends
      // to avoid duplicate patient emails for a single booking.
      log("Appointment email skipped in function: handled by app action to prevent duplicate sends")
      return res.json({ ok: true, ignored: true, reason: "appointment email handled by app" })

      const resolvedDatabaseId = DATABASE_ID || eventDatabaseId

      const reason = payload.reason_for_visit || "General consultation"
      const appointmentDateObj = payload.appointment_date ? new Date(payload.appointment_date) : null
      const appointmentDateText = appointmentDateObj && !Number.isNaN(appointmentDateObj.getTime())
        ? appointmentDateObj.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })
        : ""
      const appointmentTimeText = payload.time_slot || (
        appointmentDateObj && !Number.isNaN(appointmentDateObj.getTime())
          ? appointmentDateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
          : ""
      )

      // Patient ref may be a resolved document object or a plain string ID
      const patientRef = payload.patient
      let patientUserId = ""
      let patientName = "Patient"

      if (patientRef && typeof patientRef === "object") {
        patientUserId = String(patientRef.userId || "")
        patientName = String(patientRef.name || "Patient")
      } else if (typeof patientRef === "string" && patientRef) {
        try {
          const patientDoc = await databases.getDocument(resolvedDatabaseId, PATIENT_TABLE_ID, patientRef)
          patientUserId = String(patientDoc?.userId || "")
          patientName = String(patientDoc?.name || "Patient")
        } catch (fetchErr) {
          log(`Patient document lookup failed: ${fetchErr?.message || fetchErr}`)
        }
      }

      if (!patientUserId) {
        log("No valid patient userId found — appointment email skipped")
        return res.json({ ok: true, ignored: true, reason: "missing patient userId" })
      }

      if (!isValidUserId(patientUserId)) {
        log(`Patient userId "${patientUserId}" (length ${patientUserId.length}) is not a valid Appwrite user ID`)
        return res.json({ ok: true, ignored: true, reason: "invalid userId format", value: patientUserId })
      }

      // Try to get a better display name from the users API
      try {
        const user = await users.get(patientUserId)
        patientName = (user.name || patientName).trim() || "Patient"
      } catch (userErr) {
        // Ignore lookup failures and keep the original patient display name.
      }

      try {
        await sendEmailToUser({
          messaging,
          userId: patientUserId,
          subject: `🗓️ Confirmed: Your Appointment for ${reason}`,
          html: `
            <p>Hi ${escapeHtml(patientName)},</p>
            <p>Your appointment has been successfully scheduled. We’ve reserved your time slot, and our team is ready to assist you.</p>
            <p><strong>Appointment Details:</strong></p>
            <ul>
              <li>• Reason/Service: ${escapeHtml(reason)}</li>
              <li>• Date: ${escapeHtml(appointmentDateText)}</li>
              <li>• Time: ${escapeHtml(appointmentTimeText)}</li>
              <li>• Status: Confirmed ✅</li>
            </ul>
            <p><strong>What should I bring?</strong><br />Please ensure you have all necessary documentation ready for the verification process to avoid any delays.</p>
            <p><strong>Need to make a change?</strong><br />If you need to reschedule or cancel, please visit our portal or contact support at least 24 hours in advance.</p>
              ${renderEmailFooter(false)}
            <p>Best regards,<br />The NetCare Flow Team</p>
          `,
        })
        log(`Appointment email sent to userId=${patientUserId}`)
      } catch (emailErr) {
        log(`Appointment email send failed: ${emailErr?.message || emailErr}`)
        return res.json({ ok: true, email_error: emailErr?.message || "unknown" })
      }

      return res.json({ ok: true, type: "appointment-created" })
    }
  } catch (err) {
    error(`Function failed: ${err?.message || err}`)
    return res.json({ ok: false, message: err?.message || "Unknown error" }, 500)
  }
}
