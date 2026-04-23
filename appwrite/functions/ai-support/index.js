/*
  Appwrite Function: ai-support
  Runtime: Node.js
  Trigger: HTTP (sync execution from Next.js API route)
*/

const EMERGENCY_ADDRESS = process.env.CLINIC_ADDRESS || "123 Medical Plaza"
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash"

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

function sanitizeMatches(value) {
  if (!Array.isArray(value)) {
    return undefined
  }

  return value
    .filter(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        typeof entry.title === "string" &&
        typeof entry.detail === "string"
    )
    .slice(0, 6)
    .map((entry) => ({
      title: entry.title.trim(),
      detail: entry.detail.trim(),
      badge: typeof entry.badge === "string" ? entry.badge.trim() : undefined,
    }))
}

function buildPrompt(customInstructions) {
  const guardrails = [
    "You are the official assistant for NetCareFlow.",
    "Help patients book appointments and explain our services: Cardiology, Pediatrics, Laboratory.",
    "Never provide diagnosis, medical prescriptions, dosages, or treatment plans.",
    "If there are emergency symptoms, tell the patient to contact local emergency services immediately and visit our clinic at " + EMERGENCY_ADDRESS + ".",
    "Use only the provided patient context. Do not invent facts.",
    "Keep answers concise and supportive.",
    "Return JSON only with keys: reply (string), suggestedFilter (string optional), matches (array optional with title/detail/badge).",
  ].join(" ")

  if (typeof customInstructions === "string" && customInstructions.trim()) {
    return `${customInstructions.trim()}\n\n${guardrails}`
  }

  return guardrails
}

async function requestGemini({ apiKey, question, snapshot, instructions }) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`
  const prompt = buildPrompt(instructions)

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: JSON.stringify({
                instructions: prompt,
                question,
                snapshot,
              }),
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const responseText = await response.text()
    throw new Error(`Gemini request failed (${response.status}): ${responseText.slice(0, 400)}`)
  }

  const payload = await response.json()
  const text =
    payload?.candidates?.[0]?.content?.parts
      ?.map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join("")
      .trim() || ""

  if (!text) {
    throw new Error("Gemini returned an empty response.")
  }

  return text
}

module.exports = async ({ req, res, log, error }) => {
  try {
    const { question, snapshot, instructions } = parseBody(req.body)
    const apiKey = process.env.GEMINI_API_KEY || ""

    if (!apiKey) {
      return res.json(
        {
          error: "GEMINI_API_KEY is missing in ai-support function environment variables.",
        },
        500
      )
    }

    const normalizedQuestion = typeof question === "string" ? question.trim() : ""
    if (!normalizedQuestion) {
      return res.json({ error: "Missing question for ai-support function." }, 400)
    }

    const rawOutput = await requestGemini({
      apiKey,
      question: normalizedQuestion,
      instructions: typeof instructions === "string" ? instructions : "",
      snapshot: snapshot && typeof snapshot === "object" ? snapshot : {},
    })

    let parsed
    try {
      parsed = JSON.parse(rawOutput)
    } catch {
      parsed = { reply: rawOutput }
    }

    const reply = typeof parsed.reply === "string" ? parsed.reply.trim() : ""

    if (!reply) {
      return res.json(
        {
          error: "AI output did not include a reply.",
        },
        502
      )
    }

    return res.json({
      reply,
      suggestedFilter:
        typeof parsed.suggestedFilter === "string" && parsed.suggestedFilter.trim()
          ? parsed.suggestedFilter.trim()
          : undefined,
      matches: sanitizeMatches(parsed.matches),
    })
  } catch (executionError) {
    error(executionError?.stack || String(executionError))

    return res.json(
      {
        error: "ai-support function failed to process the request.",
      },
      500
    )
  }
}