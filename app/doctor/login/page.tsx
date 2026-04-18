
import { GalleryVerticalEnd, Home } from "lucide-react"
import Link from "next/link"

import Logo from "@/components/logo"
import { LoginForm } from "@/components/login-form"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
        <Logo width={220} height={38} className="w-auto" />
      </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm space-y-6">
            <div className="space-y-2 text-center md:text-left">
              <p className="text-sm uppercase tracking-wide text-muted-foreground">
                Secure doctor portal
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">Welcome back, Doctor</h1>
              <p className="text-sm text-muted-foreground">
                Use your assigned credentials to access clinical tools and patient workflows.
              </p>
            </div>
            <LoginForm redirectTo="/doctor/dashboard" />
            <div className="text-center">
              <Button variant="link" asChild>
                <Link href="/doctor/forgot-password">
                  Forgot password?
                </Link>
              </Button>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">
                <Home className="mr-2 size-4" />
                Back to home
              </Link>
            </Button>
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <img
          src="/assets/images/onboarding-img.png"
          alt="Doctor portal"
          className="absolute inset-0 h-full w-full object-cover opacity-90 dark:brightness-[0.35]"
        />
      </div>
    </div>
  )
}
