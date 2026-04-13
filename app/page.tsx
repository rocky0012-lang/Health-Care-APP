import Link from "next/link";
import Image from "next/image";
import PasskeyModal from "@/components/PasskeyModal";

export default async function Home({searchParams}: {searchParams: Promise<{admin?: string}>}) {
  const params = await searchParams;
  const isAdmin = params.admin === "true";
   
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden lg:flex-row">
      {isAdmin && <PasskeyModal />  }


      <section className="container flex-1 py-10 lg:min-h-screen lg:py-0">
        <div className="sub-container flex min-h-full max-w-[896px] flex-col items-center">
          <div className="text-24-bold text-center text-dark-dark-900 mb-12 h-10 w-fit">
            NetCare
          </div>
          <div className="w-full max-w-xl rounded-2xl border border-slate-200/80 bg-white/90 p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
            <p className="text-sm uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Patient portal</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">Choose how you want to continue</h1>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Patient sign up and login are now on separate pages for a cleaner and safer flow.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link href="/auth/login" className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800">
                Patient login
              </Link>
              <Link href="/auth/signup" className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700">
                Create patient account
              </Link>
            </div>
          </div>

          <div className="text-14-regular mt-12 flex w-full flex-col gap-3 pb-8 text-center sm:mt-20 sm:flex-row sm:justify-between sm:text-left lg:pb-0">
            <p className="justify-items-end text-dark-dark-600 xl:text-left">
              © 2026 Health Care. All rights reserved.
            </p>
            <div className="flex gap-4">
              <Link href="/doctor/login" className="text-blue-500">
                Doctor
              </Link>
              <Link href="/?admin=true" className="text-green-500">
                Admin
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Image
        src="/assets/images/onboarding-img.png"
        height={1000}
        width={1000}
        alt="patient"
        className="side-img hidden max-w-[50%] lg:block"
      />
    </div>
  )
}
