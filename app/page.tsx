import PatientForm from "@/components/forms/PatientForm";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { LoginForm }from "@/components/forms/login-form";

export default function Home() {
  return (
    <div className="flex h-screen max-h-screen">
      {/* TODO: OTP Verification  passkey Modal*/}


      <section className="remove-scrollbar container my-auto">
        <div className="sub-container max-w-[896px] flex flex-col items-center">
          <div className="text-24-bold text-center text-dark-dark-900 mb-12 h-10 w-fit">
            NetCare
          </div>
         {/* <PatientForm /> */}
           <LoginForm /> 

          <div className="text-14-regular mt-20 flex justify-between w-full">
            <p className="justify-items-end text-dark-dark-600 xl:text-left">
              © 2026 Health Care. All rights reserved.
            </p>
            <Link href="/?admin=true" className="text-green-500">
              Admin
            </Link>
          </div>
          
          
          {/* <Button /> */}


        </div>
      </section>

      <Image
        src="/assets/images/onboarding-img.png"
        height={1000}
        width={1000}
        alt="patient"
        className="side-img max-w-[50%]"
      />
    </div>
  )
}
