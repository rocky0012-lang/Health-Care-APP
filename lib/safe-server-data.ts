export type SafeServerDataResult<T> =
  | {
      data: T
      dataUnavailable: false
      dataErrorMessage: ""
    }
  | {
      data: T
      dataUnavailable: true
      dataErrorMessage: string
    }

function collectErrorText(error: unknown): string {
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
    message?: unknown
    cause?: unknown
    code?: unknown
    name?: unknown
  }

  return [candidate.name, candidate.code, candidate.message, collectErrorText(candidate.cause)]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" | ")
}

function classifySafeServerErrorMessage(error: unknown, defaultMessage: string) {
  const errorText = collectErrorText(error)
  const normalized = errorText.toLowerCase()

  if (!normalized) {
    return defaultMessage
  }

  if (
    normalized.includes("timeout") ||
    normalized.includes("connecttimeouterror") ||
    normalized.includes("fetch failed")
  ) {
    return "The datasource request timed out while contacting Appwrite. Showing the page without live metrics."
  }

  if (
    normalized.includes("missing database_id") ||
    normalized.includes("missing project_id") ||
    normalized.includes("missing api_key") ||
    normalized.includes("missing next_public_endpoint") ||
    normalized.includes("missing database_id or") ||
    normalized.includes("missing") && normalized.includes("environment")
  ) {
    return "Server configuration for the datasource is incomplete. Check the Appwrite environment variables before expecting live metrics."
  }

  if (
    normalized.includes("unauthorized") ||
    normalized.includes("forbidden") ||
    normalized.includes("api key") ||
    normalized.includes("permission")
  ) {
    return "The server could not authenticate with the datasource. Verify the Appwrite project, API key, and permissions."
  }

  if (
    normalized.includes("enotfound") ||
    normalized.includes("econnrefused") ||
    normalized.includes("network") ||
    normalized.includes("connect")
  ) {
    return "The datasource is currently unreachable from the server. Check Appwrite connectivity and endpoint settings."
  }

  return typeof (error as { message?: unknown })?.message === "string"
    ? ((error as { message: string }).message || defaultMessage)
    : defaultMessage
}

export async function loadSafeServerData<T>({
  load,
  fallback,
  errorContext,
  defaultMessage,
}: {
  load: () => Promise<T>
  fallback: () => T
  errorContext: string
  defaultMessage: string
}): Promise<SafeServerDataResult<T>> {
  try {
    const data = await load()

    return {
      data,
      dataUnavailable: false,
      dataErrorMessage: "",
    }
  } catch (error: any) {
    console.error(`${errorContext}:`, error)

    return {
      data: fallback(),
      dataUnavailable: true,
      dataErrorMessage: classifySafeServerErrorMessage(error, defaultMessage),
    }
  }
}