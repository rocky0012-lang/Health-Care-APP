"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"

import { Button } from "@/components/ui/button"
import { encryptKey } from "@/lib/utils"

const PasskeyModal = () => {
  const router = useRouter()
  const [open, setOpen] = useState(true)
  const [passkey, setPasskey] = useState("")
  const [error, setError] = useState("")
  const adminPasskey = "567468"

  const handleClose = () => {
    setOpen(false)
    router.push("/")
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (encryptKey(passkey) === encryptKey(adminPasskey)) {
      localStorage.setItem("accessKey", encryptKey(passkey))
      setOpen(false)
      router.push("/admin")
    } else {
      setError("Invalid passkey. Please try again.")
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="flex w-[min(92vw,42rem)] max-w-2xl flex-col items-center rounded-2xl border border-white/10 bg-[#3b4046] p-8 text-white shadow-2xl">
        <AlertDialogHeader className="flex flex-col items-center justify-center w-full">
          <AlertDialogTitle className="text-4xl text-center w-full">
            Admin Access
          </AlertDialogTitle>
          <AlertDialogDescription className="max-w-md text-center text-base text-slate-200">
            Enter the admin passkey to access the admin dashboard.
          </AlertDialogDescription>
        </AlertDialogHeader>


        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-6 w-full">
          <InputOTP
            maxLength={6}
            value={passkey}
            containerClassName="justify-center gap-3"
            onChange={(value) => {
              setPasskey(value);
              setError("");
            }}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} className="size-12 bg-[#4a5057] text-lg text-white" />
              <InputOTPSlot index={1} className="size-12 bg-[#4a5057] text-lg text-white" />
              <InputOTPSlot index={2} className="size-12 bg-[#4a5057] text-lg text-white" />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} className="size-12 bg-[#4a5057] text-lg text-white" />
              <InputOTPSlot index={4} className="size-12 bg-[#4a5057] text-lg text-white" />
              <InputOTPSlot index={5} className="size-12 bg-[#4a5057] text-lg text-white" />
            </InputOTPGroup>
          </InputOTP>
        
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
        
          {/* Using a div for the footer allows easier centering of the buttons */}
          <div className="flex flex-col sm:flex-row gap-3 w-full justify-center mt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" className="w-full sm:w-auto">
              Confirm
            </Button>
          </div>
        </form>
    </AlertDialogContent>
    </AlertDialog>
  )
}

export default PasskeyModal
