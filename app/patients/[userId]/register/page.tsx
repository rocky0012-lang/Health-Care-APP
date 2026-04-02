import React from "react"
import Image from "next/image"
import Link from "next/link"
import RegisterForm from "@/components/forms/RegisterForm"


type RegisterPageProps = {
  params: Promise<{ userId: string }>
}

const RegisterPage = async ({ params }: RegisterPageProps) => {
  const { userId } = await params
        
  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <section className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-6 py-10 sm:py-12">
          <div className="text-24-bold text-center text-dark-dark-900 mb-12 h-10 w-fit">
            NetCare
          </div>
          <p className="mb-6 text-center text-sm text-muted-foreground hidden">
            Completing registration for user: {userId}
          </p>


           <RegisterForm userId={userId} />


          <div className="text-14-regular mt-12 flex w-full flex-col gap-3 text-center sm:mt-20 sm:flex-row sm:justify-between sm:text-left">
            <p className="justify-items-end text-dark-dark-600 xl:text-left">
              © 2026 Health Care. All rights reserved.
            </p>
          </div>
        </div>
      </section>

      <div className="relative hidden min-h-screen w-[42%] lg:block">
        <Image
          src="/assets/images/register-img.png"
          alt="patient"
          fill
          priority
          className="object-cover object-center"
        />
      </div>
    </div>
    
  )
}

export default RegisterPage
