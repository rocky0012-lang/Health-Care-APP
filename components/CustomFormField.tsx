"use client"

import * as React from "react"

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type CustomFormFieldProps = Omit<React.ComponentProps<typeof Input>, "id"> & {
  id?: string
  label?: string
  description?: string
  error?: string
  wrapperClassName?: string
  rightLabelContent?: React.ReactNode
}

const CustomFormField = React.forwardRef<HTMLInputElement, CustomFormFieldProps>(
  (
    {
      id = "custom-form-field",
      label = "Field",
      description,
      error,
      wrapperClassName,
      rightLabelContent,
      className,
      ...inputProps
    },
    ref
  ) => {
    return (
      <Field className={cn("grid gap-2", wrapperClassName)}>
        <div className="flex items-center">
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          {rightLabelContent ? (
            <span className="ml-auto text-sm">{rightLabelContent}</span>
          ) : null}
        </div>
        <Input id={id} ref={ref} className={className} {...inputProps} />
        {description ? <FieldDescription>{description}</FieldDescription> : null}
        {error ? <FieldError>{error}</FieldError> : null}
      </Field>
    )
  }
)

CustomFormField.displayName = "CustomFormField"

export default CustomFormField
