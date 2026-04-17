import Image from "next/image"
import Link from "next/link"

import Logo from "@/components/logo"
import { PatientSignupForm } from "@/components/forms/login-form"

export default function PatientSignupPage() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden lg:flex-row">
      <section className="container flex-1 py-10 lg:min-h-screen lg:py-0">
        <div className="sub-container flex min-h-full max-w-[896px] flex-col items-center">
          <Logo width={220} height={38} className="mb-12 w-auto" />
          <PatientSignupForm />

          <div className="mt-8 flex w-full items-center justify-center gap-4 text-sm">
            <Link href="/auth/login" className="text-blue-600 hover:underline">
              Patient login
            </Link>
            <Link href="/doctor/login" className="text-blue-500 hover:underline">
              Doctor
            </Link>
            <Link href="/?admin=true" className="text-green-500 hover:underline">
              Admin
            </Link>
          </div>

          <div className="text-14-regular mt-8 flex w-full flex-col gap-3 pb-8 text-center sm:flex-row sm:justify-between sm:text-left lg:pb-0">
            <p className="justify-items-end text-dark-dark-600 xl:text-left">
              © 2026 Health Care. All rights reserved.
            </p>
          </div>
        </div>
      </section>

      <Image
        src="/assets/images/onboarding-img.png"
        height={1000}
        width={1000}
        alt="patient sign up"
        className="side-img hidden max-w-[50%] lg:block"
      />
    </div>
  )
}
