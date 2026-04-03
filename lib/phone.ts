const E164_PHONE_REGEX = /^\+[1-9]\d{7,14}$/

const LANGUAGE_COUNTRY_FALLBACKS: Record<string, string> = {
  ar: "sa",
  da: "dk",
  de: "de",
  en: "us",
  es: "es",
  fr: "fr",
  hi: "in",
  it: "it",
  ja: "jp",
  ko: "kr",
  nl: "nl",
  pt: "br",
  sv: "se",
  zh: "cn",
}

export const DEFAULT_PHONE_COUNTRY = "us"

export function isE164PhoneNumber(value: string) {
  return E164_PHONE_REGEX.test(value)
}

export function normalizePhoneNumber(value: string) {
  const digitsOnly = value.replace(/\D/g, "")
  return digitsOnly ? `+${digitsOnly}` : ""
}

export function stripPlusPrefix(value: string) {
  return value.replace(/^\+/, "")
}

export function detectLocaleCountry(locales?: readonly string[] | string | null) {
  const localeList = Array.isArray(locales) ? locales : locales ? [locales] : []

  for (const locale of localeList) {
    if (!locale) {
      continue
    }

    const [language = "", scriptOrRegion = "", maybeRegion = ""] = locale
      .toLowerCase()
      .split(/[-_]/)

    if (scriptOrRegion.length === 2) {
      return scriptOrRegion
    }

    if (maybeRegion.length === 2) {
      return maybeRegion
    }

    if (language in LANGUAGE_COUNTRY_FALLBACKS) {
      return LANGUAGE_COUNTRY_FALLBACKS[language]
    }
  }

  return DEFAULT_PHONE_COUNTRY
}