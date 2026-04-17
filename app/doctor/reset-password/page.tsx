"use client"

import Logo from "@/components/logo"
import { FormEvent, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function DoctorPasswordResetPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = searchParams.get("userId")
  const secret = searchParams.get("secret")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const isInvalidLink = !userId || !secret

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (password.trim().length < 8) {
      setStatus("error")
      setMessage("Password must be at least 8 characters long.")
      return
    }

    if (password !== confirmPassword) {
      setStatus("error")
      setMessage("Passwords do not match.")
      return
    }

    setStatus("saving")
    setMessage("")

    try {
      const response = await fetch("/api/doctor-reset-password", {
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          secret,
          password,
          confirmPassword,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.ok) {
        setStatus("error")
        setMessage(result.message || "Unable to reset your password. Please try again.")
        return
      }

      setStatus("success")
      setMessage("Your password has been updated successfully. Redirecting to login...")

      setTimeout(() => {
        router.push("/doctor/login")
      }, 1500)
    } catch (error) {
      setStatus("error")
      setMessage(
        error instanceof Error ? error.message : "Unable to reset your password. Please try again."
      )
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex max-w-md flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex justify-center">
          <Logo width={200} height={36} className="w-auto" />
        </div>
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Doctor portal</p>
          <h1 className="mt-3 text-3xl font-semibold">Reset your password</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Enter a new password for your doctor account.
          </p>
        </div>

        {isInvalidLink ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/30 dark:bg-rose-950/40 dark:text-rose-200">
            This password reset link is invalid or incomplete. Please request a new reset email.
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                New password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500"
                minLength={8}
                required
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500"
                minLength={8}
                required
              />
            </div>
            {message ? (
              <p className={`text-sm ${status === "error" ? "text-rose-600 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"}`}>
                {message}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={status === "saving" || isInvalidLink}
              className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {status === "saving" ? "Updating password..." : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
