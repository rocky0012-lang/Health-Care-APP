import PatientForm from "@/components/forms/PatientForm";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { LoginForm }from "@/components/forms/login-form";
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
         {/* <PatientForm /> */}
           <LoginForm /> 

          <div className="text-14-regular mt-12 flex w-full flex-col gap-3 pb-8 text-center sm:mt-20 sm:flex-row sm:justify-between sm:text-left lg:pb-0">
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
        className="side-img hidden max-w-[50%] lg:block"
      />
    </div>
  )
}
