import { Suspense } from "react"

import DoctorPasswordResetClient from "./reset-password-client"

export default function DoctorPasswordResetPage() {
  return (
    <Suspense fallback={null}>
      <DoctorPasswordResetClient />
    </Suspense>
  )
}
