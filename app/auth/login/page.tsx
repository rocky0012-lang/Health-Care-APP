import Image from "next/image"

import Logo from "@/components/logo"
import { UnifiedLoginForm } from "@/components/forms/unified-login-form"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden lg:flex-row">
      <section className="container flex-1 py-10 lg:min-h-screen lg:py-0">
        <div className="sub-container flex min-h-full w-full max-w-[1080px] flex-col items-center justify-center">
          <Logo width={220} height={38} className="mb-10 w-auto lg:mb-12" />
          <UnifiedLoginForm className="w-full max-w-2xl" />

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
        alt="login"
        className="side-img hidden max-w-[50%] lg:block"
      />
    </div>
  )
}
