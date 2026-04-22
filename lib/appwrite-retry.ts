const RETRYABLE_ERROR_PATTERN = /connecttimeouterror|fetch failed|timeout|timed out|econnreset|enotfound|eai_again|socket hang up|network/i

function extractErrorText(error: unknown): string {
  if (!error) {
    return ""
  }

  if (typeof error === "string") {
    return error
  }

  if (typeof error !== "object") {
    return ""
  }

  const candidate = error as {
    name?: unknown
    message?: unknown
    code?: unknown
    cause?: unknown
  }

  const pieces = [candidate.name, candidate.code, candidate.message]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)

  const causeText = extractErrorText(candidate.cause)
  if (causeText) {
    pieces.push(causeText)
  }

  return pieces.join(" | ")
}

function shouldRetry(error: unknown) {
  const text = extractErrorText(error).toLowerCase()
  return RETRYABLE_ERROR_PATTERN.test(text)
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function withAppwriteRetry<T>(
  operation: () => Promise<T>,
  label: string,
  attempts = 3
): Promise<T> {
  let lastError: unknown

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      const retryable = shouldRetry(error)
      const isLastAttempt = attempt === attempts

      if (!retryable || isLastAttempt) {
        throw error
      }

      const backoffMs = 250 * Math.pow(2, attempt - 1)
      console.warn(`${label} failed on attempt ${attempt}. Retrying in ${backoffMs}ms...`)
      await sleep(backoffMs)
    }
  }

  throw lastError
}
