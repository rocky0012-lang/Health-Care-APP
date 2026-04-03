"use client"

import { useEffect, useId, useState } from "react"
import PhoneInput from "react-phone-input-2"

import { cn } from "@/lib/utils"
import {
  DEFAULT_PHONE_COUNTRY,
  detectLocaleCountry,
  normalizePhoneNumber,
  stripPlusPrefix,
} from "@/lib/phone"

type PhoneNumberInputProps = {
  id?: string
  name?: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  autoFocus?: boolean
  invalid?: boolean
  containerClassName?: string
  inputClassName?: string
  buttonClassName?: string
  dropdownClassName?: string
  searchClassName?: string
}

export function PhoneNumberInput({
  id,
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  disabled,
  required,
  autoFocus,
  invalid,
  containerClassName,
  inputClassName,
  buttonClassName,
  dropdownClassName,
  searchClassName,
}: PhoneNumberInputProps) {
  const generatedId = useId()
  const [defaultCountry, setDefaultCountry] = useState(DEFAULT_PHONE_COUNTRY)

  useEffect(() => {
    if (typeof navigator === "undefined") {
      return
    }

    setDefaultCountry(detectLocaleCountry(navigator.languages ?? navigator.language))
  }, [])

  return (
    <PhoneInput
      country={defaultCountry}
      enableSearch
      disableSearchIcon
      countryCodeEditable={false}
      specialLabel=""
      value={stripPlusPrefix(value)}
      onChange={(nextValue) => onChange(normalizePhoneNumber(nextValue))}
      inputProps={{
        id: id ?? generatedId,
        name,
        onBlur,
        placeholder,
        disabled,
        required,
        autoFocus,
        "aria-invalid": invalid || undefined,
      }}
      containerClass={cn("app-phone-field", containerClassName)}
      inputClass={cn("app-phone-field-input", inputClassName)}
      buttonClass={cn("app-phone-field-button", buttonClassName)}
      dropdownClass={cn("app-phone-field-dropdown", dropdownClassName)}
      searchClass={cn("app-phone-field-search", searchClassName)}
      searchPlaceholder="Search country"
      disabled={disabled}
    />
  )
}