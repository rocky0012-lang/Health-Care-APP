# Appwrite + Gemini Setup: `ai-support`

This project now calls an Appwrite Function from [app/api/patient-assistant/route.ts](app/api/patient-assistant/route.ts).

The assistant prompt is controlled in [app/api/patient-assistant/route.ts](app/api/patient-assistant/route.ts) via the `patientAssistantInstructions` constant.

## 1. Create the Appwrite Function

1. Open Appwrite Console.
2. Go to **Functions** -> **Create Function**.
3. Name: `ai-support`
4. Runtime: **Node.js**
5. Create the function.

## 2. Upload Function Code

Upload these files from your repo:

- [appwrite/functions/ai-support/index.js](appwrite/functions/ai-support/index.js)
- [appwrite/functions/ai-support/package.json](appwrite/functions/ai-support/package.json)

Deploy after upload.

## 3. Add Function Environment Variables (THIS is where Gemini key goes)

In Appwrite Console -> Functions -> `ai-support` -> **Settings** -> **Environment Variables**, add:

- `GEMINI_API_KEY` = your Google AI Studio API key
- `GEMINI_MODEL` = `gemini-1.5-flash` (or your preferred Gemini model)
- `CLINIC_ADDRESS` = `123 Medical Plaza` (or your real clinic address)

Then redeploy the function.

## 4. Get Function ID and Add to Next.js `.env.local`

1. In Appwrite Console, open the `ai-support` function.
2. Copy its **Function ID**.
3. In local file `.env.local`, add:

```env
AI_SUPPORT_FUNCTION_ID=your_appwrite_ai_support_function_id
```

This tells [app/api/patient-assistant/route.ts](app/api/patient-assistant/route.ts) which function to execute.

If you want to change the assistant behavior later, edit `patientAssistantInstructions` in [app/api/patient-assistant/route.ts](app/api/patient-assistant/route.ts).

## 5. Confirm Existing Appwrite Server Credentials in `.env.local`

The route executes functions using your existing Appwrite server key from [lib/appwrite.config.ts](lib/appwrite.config.ts). Ensure these are set:

- `PROJECT_ID`
- `API_KEY`
- `NEXT_PUBLIC_ENDPOINT`

If these are already working for your current Appwrite actions, no change is needed.

## 6. API Key Creation (Google AI Studio)

1. Open Google AI Studio.
2. Click **Get API key**.
3. Create key.
4. Paste it into Appwrite Function env var `GEMINI_API_KEY` (Step 3).

Do **not** place `GEMINI_API_KEY` in the frontend or in browser-exposed env vars.

## 7. Test

1. Start app: `npm run dev`
2. Open patient dashboard and launch **Care Assistant**.
3. Ask: "Show my upcoming appointments."
4. In Appwrite Console -> Functions -> `ai-support` -> **Executions**, confirm success logs.

## Notes

- If `AI_SUPPORT_FUNCTION_ID` is missing, route falls back to local rule-based assistant.
- The function prompt uses local emergency wording: "contact local emergency services" and visit clinic address.
