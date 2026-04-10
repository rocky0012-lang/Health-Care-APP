"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"

import {
  getPatientBillingPreferences,
  getPatientSavedPaymentMethod,
} from "@/lib/actions/patient.action"
import { getCurrentPatientUserId, getStoredPatientName } from "@/lib/patient-session"

export const DEFAULT_PATIENT_BILLING_PREFERENCES: PatientBillingPreferences = {
  savePaymentMethod: true,
  emailReceipt: true,
  updatedAt: "",
}

type PatientBillingContextValue = {
  patientUserId: string
  patientName: string
  savedPaymentMethod: PatientSavedPaymentMethod | null
  billingPreferences: PatientBillingPreferences
  isLoading: boolean
  pendingAction: "saving" | "removing" | null
  loadMessage: string
  setBillingState: (nextState: {
    patientName?: string
    savedPaymentMethod?: PatientSavedPaymentMethod | null
    billingPreferences?: PatientBillingPreferences
    pendingAction?: "saving" | "removing" | null
    loadMessage?: string
  }) => void
}

const PatientBillingContext = createContext<PatientBillingContextValue | null>(null)

export function PatientBillingProvider({ children }: { children: React.ReactNode }) {
  const [patientUserId, setPatientUserId] = useState("")
  const [patientName, setPatientName] = useState("")
  const [savedPaymentMethod, setSavedPaymentMethod] = useState<PatientSavedPaymentMethod | null>(null)
  const [billingPreferences, setBillingPreferences] = useState<PatientBillingPreferences>(DEFAULT_PATIENT_BILLING_PREFERENCES)
  const [isLoading, setIsLoading] = useState(true)
  const [pendingAction, setPendingAction] = useState<"saving" | "removing" | null>(null)
  const [loadMessage, setLoadMessage] = useState("")

  useEffect(() => {
    let isMounted = true

    const loadBillingState = async () => {
      const userId = getCurrentPatientUserId()

      if (!userId) {
        if (isMounted) {
          setLoadMessage("Sign in to view and manage billing information.")
          setIsLoading(false)
        }
        return
      }

      try {
        const [paymentMethod, preferences] = await Promise.all([
          getPatientSavedPaymentMethod(userId),
          getPatientBillingPreferences(userId),
        ])

        if (!isMounted) {
          return
        }

        setPatientUserId(userId)
        setPatientName(getStoredPatientName(userId))
        setSavedPaymentMethod(paymentMethod)
        setBillingPreferences(preferences)
        setLoadMessage("")
      } catch (error) {
        console.error("Failed to load patient billing state", error)
        if (isMounted) {
          setLoadMessage("Unable to load billing information right now.")
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadBillingState()

    return () => {
      isMounted = false
    }
  }, [])

  const value = useMemo<PatientBillingContextValue>(() => ({
    patientUserId,
    patientName,
    savedPaymentMethod,
    billingPreferences,
    isLoading,
    pendingAction,
    loadMessage,
    setBillingState: ({ patientName: nextPatientName, savedPaymentMethod: nextSavedPaymentMethod, billingPreferences: nextBillingPreferences, pendingAction: nextPendingAction, loadMessage: nextLoadMessage }) => {
      if (typeof nextPatientName === "string") {
        setPatientName(nextPatientName)
      }

      if (typeof nextSavedPaymentMethod !== "undefined") {
        setSavedPaymentMethod(nextSavedPaymentMethod)
      }

      if (nextBillingPreferences) {
        setBillingPreferences(nextBillingPreferences)
      }

      if (typeof nextPendingAction !== "undefined") {
        setPendingAction(nextPendingAction)
      }

      if (typeof nextLoadMessage === "string") {
        setLoadMessage(nextLoadMessage)
      }
    },
  }), [billingPreferences, isLoading, loadMessage, patientName, patientUserId, pendingAction, savedPaymentMethod])

  return <PatientBillingContext.Provider value={value}>{children}</PatientBillingContext.Provider>
}

export function usePatientBilling() {
  const context = useContext(PatientBillingContext)

  if (!context) {
    throw new Error("usePatientBilling must be used within a PatientBillingProvider.")
  }

  return context
}