"use client"

import { useEffect, useMemo, useState } from "react"
import { Bot, Filter, Loader2, MessageSquareText, SendHorizonal, Sparkles, Stethoscope } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { getCurrentPatientUserId } from "@/lib/patient-session"
import { cn } from "@/lib/utils"

type AssistantMatch = {
  title: string
  detail: string
  badge?: string
}

type AssistantMessage = {
  role: "user" | "assistant"
  content: string
  matches?: AssistantMatch[]
  suggestedFilter?: string
}

const starterPrompts = [
  "Summarize my records",
  "Show my upcoming appointments",
  "What medications or prescriptions do I have?",
  "What information is missing from my profile?",
]

function mergeAssistantMessage(previous: AssistantMessage[], next: AssistantMessage) {
  return [...previous, next].slice(-12)
}

export function PatientCareAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [input, setInput] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [warningMessage, setWarningMessage] = useState("")
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      role: "assistant",
      content:
        "I can help you understand your care, summarize appointments, and surface the parts of your records that match what you ask for.",
    },
  ])

  const canSend = useMemo(() => input.trim().length > 0 && !isSending, [input, isSending])

  useEffect(() => {
    if (!isOpen || messages.length > 1) {
      return
    }

    const patientUserId = getCurrentPatientUserId()
    if (!patientUserId) {
      setMessages((previous) =>
        mergeAssistantMessage(previous, {
          role: "assistant",
          content: "I could not find an active patient session yet. Please sign in again to use the assistant.",
        })
      )
    }
  }, [isOpen, messages.length])

  const sendPrompt = async (prompt: string) => {
    const patientUserId = getCurrentPatientUserId()
    const normalizedPrompt = prompt.trim()

    if (!patientUserId) {
      setErrorMessage("Patient session is missing. Please sign in again.")
      return
    }

    if (!normalizedPrompt) {
      return
    }

    const nextMessages = mergeAssistantMessage(messages, {
      role: "user",
      content: normalizedPrompt,
    })

    setMessages(nextMessages)
    setInput("")
    setErrorMessage("")
    setWarningMessage("")
    setIsSending(true)

    try {
      const response = await fetch("/api/patient-assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: patientUserId,
          messages: nextMessages,
        }),
      })

      const data = (await response.json()) as {
        reply?: string
        matches?: AssistantMatch[]
        suggestedFilter?: string
        error?: string
        isFallback?: boolean
      }

      if (!response.ok) {
        throw new Error(data.error || "The assistant could not respond right now.")
      }

      if (data.isFallback) {
        setWarningMessage(
          "I’m using a limited care snapshot right now, so some details may be incomplete. You can still ask follow-up questions or try again shortly."
        )
      }

      setMessages((previous) =>
        mergeAssistantMessage(previous, {
          role: "assistant",
          content: data.reply || "I found some relevant care information, but I could not format the response.",
          matches: data.matches,
          suggestedFilter: data.suggestedFilter,
        })
      )
    } catch (error) {
      console.error("Patient assistant error:", error)
      setErrorMessage(error instanceof Error ? error.message : "The assistant is unavailable right now.")
      setMessages((previous) =>
        mergeAssistantMessage(previous, {
          role: "assistant",
          content:
            "I’m unable to answer from the care system right now, but I can still help if you try again in a moment.",
        })
      )
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-slate-950 px-4 py-3 text-sm font-medium text-white shadow-2xl shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400/60 dark:border-blue-900/60 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
        >
          <Sparkles className="size-4" />
          Care Assistant
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-xl">
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b border-slate-200/70 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-5 py-5 text-white dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/10 p-2 text-blue-200">
                <Bot className="size-5" />
              </div>
              <div>
                <SheetTitle className="text-xl text-white">Care Assistant</SheetTitle>
                <SheetDescription className="text-slate-300">
                  Ask about appointments, records, and care details in plain language.
                </SheetDescription>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {starterPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void sendPrompt(prompt)}
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/15"
                >
                  <MessageSquareText className="size-3.5" />
                  {prompt}
                </button>
              ))}
            </div>
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 px-4 py-4 dark:bg-slate-950">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}-${message.content.slice(0, 20)}`}
                className={cn(
                  "max-w-[92%] rounded-2xl border px-4 py-3 text-sm leading-6 shadow-sm",
                  message.role === "user"
                    ? "ml-auto border-blue-200 bg-blue-600 text-white dark:border-blue-900/60"
                    : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                )}
              >
                <p>{message.content}</p>

                {message.suggestedFilter ? (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
                    <Filter className="size-3.5" />
                    Suggested filter: {message.suggestedFilter}
                  </div>
                ) : null}

                {message.matches?.length ? (
                  <div className="mt-3 grid gap-2">
                    {message.matches.map((match) => (
                      <div
                        key={`${match.title}-${match.detail}`}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-semibold text-slate-800 dark:text-slate-100">{match.title}</span>
                          {match.badge ? (
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              {match.badge}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs leading-5">{match.detail}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}

            {isSending ? (
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                <Loader2 className="size-4 animate-spin" />
                Thinking through your records...
              </div>
            ) : null}

            {errorMessage ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                {errorMessage}
              </div>
            ) : null}

            {warningMessage ? (
              <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200">
                {warningMessage}
              </div>
            ) : null}
          </div>

          <div className="border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="space-y-3">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about your records, appointments, medication, or what to update..."
                className="min-h-24 resize-none rounded-2xl border-slate-300 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900"
              />

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Stethoscope className="size-3.5" />
                  For urgent medical issues, contact your care team directly.
                </div>

                <Button onClick={() => void sendPrompt(input)} disabled={!canSend} className="gap-2 rounded-full px-4">
                  {isSending ? <Loader2 className="size-4 animate-spin" /> : <SendHorizonal className="size-4" />}
                  Send
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}