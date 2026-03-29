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
    <div className="flex h-screen max-h-screen">
      <section className="remove-scrollbar container my-auto">
        <div className="sub-container max-w-[896px] flex flex-col items-center">
          <div className="text-24-bold text-center text-dark-dark-900 mb-12 h-10 w-fit">
            NetCare
          </div>
          <p className="mb-6 text-center text-sm text-muted-foreground hidden">
            Completing registration for user: {userId}
          </p>


           <RegisterForm userId={userId} />


          <div className="text-14-regular mt-20 flex justify-between w-full">
            <p className="justify-items-end text-dark-dark-600 xl:text-left">
              © 2026 Health Care. All rights reserved.
            </p>
          </div>
        </div>
      </section>

      <div className="relative hidden h-screen w-[42%] lg:block">
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
