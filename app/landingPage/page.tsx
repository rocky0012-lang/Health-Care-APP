'use client'

import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogPanel } from '@headlessui/react'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import { Mail, MapPin, Phone } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import Logo from '@/components/logo'
import PasskeyModal from '@/components/PasskeyModal'
import { submitContactForm } from '@/lib/actions/contact.action'

const navigation = [
  { name: 'Home', href: '#product' },
  { name: 'Physicians', href: '#physicians' },
  { name: 'How it works', href: '#appointment-flow' },
  { name: 'Impact', href: '#appointment-impact' },
  { name: 'Contact', href: '#company' },
]

const heroBackgroundImage = '/assets/images/newNetcare.avif'
const appointmentSectionBackgroundImage = '/assets/images/appointmentSection.avif'

const appointmentLinks = [
  { name: 'Create account', href: '/auth/signup' },
  { name: 'Choose your doctor', href: '/auth/login' },
  { name: 'Pick date and time', href: '/auth/login' },
  { name: 'Confirm appointment', href: '/auth/login' },
]

const appointmentStats = [
  { name: 'Clinics supported', value: '12' },
  { name: 'Verified care staff', value: '300+' },
  { name: 'Average booking time', value: '2 min' },
  { name: 'Support availability', value: '24/7' },
]

const physicians = [
  {
    name: 'Dr. Cameron Lee',
    role: 'Consultant Cardiologist',
    imageUrl: '/assets/images/dr-cameron.png',
    experience: '12 years',
    availability: 'Available today',
  },
  {
    name: 'Dr. Cruz Rivera',
    role: 'Pediatric Specialist',
    imageUrl: '/assets/images/dr-cruz.png',
    experience: '9 years',
    availability: 'Next slot: 10:30 AM',
  },
  {
    name: 'Dr. Green Miller',
    role: 'General Practitioner',
    imageUrl: '/assets/images/dr-green.png',
    experience: '15 years',
    availability: 'Available today',
  },
  {
    name: 'Dr. Lee Morgan',
    role: 'Dermatology Consultant',
    imageUrl: '/assets/images/dr-lee.png',
    experience: '8 years',
    availability: 'Next slot: 2:00 PM',
  },
  {
    name: 'Dr. Sharma Patel',
    role: 'Internal Medicine',
    imageUrl: '/assets/images/dr-sharma.png',
    experience: '11 years',
    availability: 'Available today',
  },
  {
    name: 'Dr. Peter Lawson',
    role: 'Family Medicine',
    imageUrl: '/assets/images/dr-peter.png',
    experience: '10 years',
    availability: 'Next slot: 4:15 PM',
  },
]

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [visibleStepCount, setVisibleStepCount] = useState(0)
  const [isFlowInView, setIsFlowInView] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    message: '',
  })
  const [formState, setFormState] = useState<{
    isLoading: boolean
    success: boolean
    error: string | null
  }>({
    isLoading: false,
    success: false,
    error: null,
  })
  const appointmentFlowRef = useRef<HTMLElement | null>(null)
  const searchParams = useSearchParams()
  const isAdmin = searchParams.get('admin') === 'true'

  useEffect(() => {
    const target = appointmentFlowRef.current

    if (!target) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsFlowInView(entry.isIntersecting)
        })
      },
      { threshold: 0.4 }
    )

    observer.observe(target)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isFlowInView) {
      setVisibleStepCount(0)
      return
    }

    setVisibleStepCount(0)

    const interval = setInterval(() => {
      setVisibleStepCount((current) => {
        if (current >= appointmentLinks.length) {
          clearInterval(interval)
          return current
        }

        return current + 1
      })
    }, 220)

    return () => clearInterval(interval)
  }, [isFlowInView])

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    setFormState({ isLoading: true, success: false, error: null })

    try {
      const result = await submitContactForm({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        message: formData.message,
      })

      if (result.success) {
        setFormState({
          isLoading: false,
          success: true,
          error: null,
        })
        // Reset form
        setFormData({
          fullName: '',
          email: '',
          phone: '',
          message: '',
        })
        // Clear success message after 5 seconds
        setTimeout(() => {
          setFormState({ isLoading: false, success: false, error: null })
        }, 5000)
      } else {
        setFormState({
          isLoading: false,
          success: false,
          error: result.error || 'An error occurred',
        })
      }
    } catch (error) {
      setFormState({
        isLoading: false,
        success: false,
        error: 'An unexpected error occurred. Please try again.',
      })
    }
  }

  return (
    <div className="scroll-smooth bg-gray-900">
      {isAdmin && <PasskeyModal />}

      <header className="absolute inset-x-0 top-0 z-50">
        <nav aria-label="Global" className="flex items-center justify-between p-6 lg:px-8">
          <div className="flex lg:flex-1">
            <Link href="/landingPage" className="-m-1.5 p-1.5">
              <span className="sr-only">NetCare Flow</span>
              <Logo width={180} height={36} className="h-8 w-auto" />
            </Link>
          </div>
          <div className="flex lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-200"
            >
              <span className="sr-only">Open main menu</span>
              <Bars3Icon aria-hidden="true" className="size-6" />
            </button>
          </div>
          <div className="hidden lg:flex lg:gap-x-12">
            {navigation.map((item) => (
              <a key={item.name} href={item.href} className="text-base/6 font-medium text-white">
                {item.name}
              </a>
            ))}
          </div>
          <div className="hidden lg:flex lg:flex-1 lg:justify-end">
            <Link href="/auth/login" className="text-base/6 font-medium text-white">
              Log in <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </nav>
        <Dialog open={mobileMenuOpen} onClose={setMobileMenuOpen} className="lg:hidden">
          <div className="fixed inset-0 z-50" />
          <DialogPanel className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-gray-900 p-6 sm:max-w-sm sm:ring-1 sm:ring-gray-100/10">
            <div className="flex items-center justify-between">
              <Link href="/landingPage" className="-m-1.5 p-1.5">
                <span className="sr-only">NetCare Flow</span>
                <Logo width={180} height={36} className="h-8 w-auto" />
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="-m-2.5 rounded-md p-2.5 text-gray-200"
              >
                <span className="sr-only">Close menu</span>
                <XMarkIcon aria-hidden="true" className="size-6" />
              </button>
            </div>
            <div className="mt-6 flow-root">
              <div className="-my-6 divide-y divide-white/10">
                <div className="space-y-2 py-6">
                  {navigation.map((item) => (
                    <a
                      key={item.name}
                      href={item.href}
                      className="-mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-white hover:bg-white/5"
                    >
                      {item.name}
                    </a>
                  ))}
                </div>
                <div className="py-6">
                  <Link
                    href="/auth/login"
                    className="-mx-3 block rounded-lg px-3 py-2.5 text-base/7 font-semibold text-white hover:bg-white/5"
                  >
                    Log in
                  </Link>
                </div>
              </div>
            </div>
          </DialogPanel>
        </Dialog>
      </header>

      <div
        id="product"
        className="relative isolate px-6 pt-14 lg:px-8"
        style={{
          backgroundImage: `linear-gradient(rgba(17, 24, 39, 0.82), rgba(17, 24, 39, 0.82)), url(${heroBackgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
        >
          <div
            style={{
              clipPath:
                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
            className="relative left-[calc(50%-11rem)] aspect-1155/678 w-144.5 -translate-x-1/2 rotate-30 bg-linear-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-288.75"
          />
        </div>
        <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
          <div className="hidden sm:mb-8 sm:flex sm:justify-center">
            <div className="relative rounded-full px-3 py-1 text-sm/6 text-gray-400 ring-1 ring-white/10 hover:ring-white/20">
              Announcing faster digital appointment coordination for all patients.{" "}
              <Link href="/auth/signup" className="font-semibold text-indigo-400">
                <span aria-hidden="true" className="absolute inset-0" />
                Get started <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-5xl font-semibold tracking-tight text-balance text-white sm:text-7xl">
              Data to enrich your healthcare booking experience
            </h1>
            <p className="mt-8 text-lg font-medium text-pretty text-gray-400 sm:text-xl/8">
              Book appointments, manage care schedules, and keep your records organized in one secure platform built for patients and clinicians.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/auth/signup"
                className="rounded-md bg-indigo-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              >
                Get started
              </Link>
              <Link href="/auth/login" className="text-sm/6 font-semibold text-white">
                Learn more <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
        >
          <div
            style={{
              clipPath:
                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
            className="relative left-[calc(50%+3rem)] aspect-1155/678 w-144.5 -translate-x-1/2 bg-linear-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%+36rem)] sm:w-288.75"
          />
        </div>
      </div>

      <section id="appointment-flow" ref={appointmentFlowRef} className="relative isolate mt-14 overflow-hidden bg-gray-900 py-24 sm:mt-20 sm:py-32">
        <img
          alt="Patients and healthcare team coordinating care"
          src={appointmentSectionBackgroundImage}
          className="absolute inset-0 -z-10 size-full object-cover object-right md:object-center"
        />
        <div className="absolute inset-0 -z-10 bg-gray-900/75" />
        <div
          aria-hidden="true"
          className="hidden sm:absolute sm:-top-10 sm:right-1/2 sm:-z-10 sm:mr-10 sm:block sm:transform-gpu sm:blur-3xl"
        >
          <div
            style={{
              clipPath:
                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
            className="aspect-1097/845 w-274.25 bg-linear-to-tr from-[#ff4694] to-[#776fff] opacity-20"
          />
        </div>
        <div
          aria-hidden="true"
          className="absolute -top-52 left-1/2 -z-10 -translate-x-1/2 transform-gpu blur-3xl sm:-top-112 sm:ml-16 sm:translate-x-0"
        >
          <div
            style={{
              clipPath:
                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
            className="aspect-1097/845 w-274.25 bg-linear-to-tr from-[#ff4694] to-[#776fff] opacity-20"
          />
        </div>
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:mx-0">
            <h2 className="text-5xl font-semibold tracking-tight text-white sm:text-7xl">Appointments made simple</h2>
            <p className="mt-8 text-lg font-medium text-pretty text-gray-300 sm:text-xl/8">
              Follow the steps below and book care quickly. The arrows show the exact path from signup to confirmed appointment.
            </p>
          </div>
          <div className="mx-auto mt-10 max-w-2xl lg:mx-0 lg:max-w-none">
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 text-base/7 font-semibold text-white sm:grid-cols-2 md:flex lg:gap-x-10">
              {appointmentLinks.map((link, index) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`group inline-flex items-center gap-2 transition-all duration-500 ${
                    index < visibleStepCount ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-25'
                  }`}
                >
                  <span>{link.name}</span>
                  <span aria-hidden="true" className={`transition-transform duration-500 ${index < visibleStepCount ? 'translate-x-0 group-hover:translate-x-1' : '-translate-x-2'}`}>
                    &rarr;
                  </span>
                </Link>
              ))}
            </div>
            <dl id="appointment-impact" className="mt-16 grid grid-cols-1 gap-8 sm:mt-20 sm:grid-cols-2 lg:grid-cols-4">
              {appointmentStats.map((stat) => (
                <div key={stat.name} className="flex flex-col-reverse gap-1">
                  <dt className="text-base/7 text-gray-300">{stat.name}</dt>
                  <dd className="text-4xl font-semibold tracking-tight text-white">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section id="physicians" className="mt-14 bg-gray-900 py-24 sm:mt-20 sm:py-32">
        <div className="mx-auto grid max-w-7xl gap-14 px-6 lg:px-8 xl:grid-cols-3">
          <div className="max-w-xl">
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Meet our physicians</h2>
            <p className="mt-6 text-lg/8 text-gray-400">
              Our care team combines deep clinical experience with compassionate communication so you can book with confidence.
            </p>
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-gray-300">
              <p className="font-semibold text-white">Why patients trust this team</p>
              <p className="mt-2">Verified profiles, transparent availability, and reliable follow-up from booking to consultation.</p>
            </div>
          </div>

          <ul role="list" className="grid gap-x-8 gap-y-10 sm:grid-cols-2 xl:col-span-2">
            {physicians.map((person) => (
              <li key={person.name}>
                <article className="flex items-start gap-x-4 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-indigo-400/40 hover:bg-white/10">
                  <img
                    alt={person.name}
                    src={person.imageUrl}
                    className="size-16 rounded-full object-cover outline-1 -outline-offset-1 outline-white/10"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base/7 font-semibold tracking-tight text-white">{person.name}</h3>
                    <p className="text-sm/6 font-semibold text-indigo-300">{person.role}</p>
                    <p className="mt-2 text-xs text-gray-300">Experience: {person.experience}</p>
                    <p className="mt-1 text-xs text-emerald-300">{person.availability}</p>
                    <Link href="/auth/login" className="mt-3 inline-block text-xs font-semibold text-indigo-300 hover:text-indigo-200">
                      Book appointment <span aria-hidden="true">&rarr;</span>
                    </Link>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="technology" className="mt-14 bg-gray-900 py-24 sm:mt-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <h2 className="text-center text-lg/8 font-semibold text-white">Powered by reliable cloud infrastructure</h2>
          <div className="mx-auto mt-10 grid max-w-lg grid-cols-4 items-center gap-x-8 gap-y-10 sm:max-w-2xl sm:grid-cols-6 sm:gap-x-10 lg:mx-0 lg:max-w-none lg:grid-cols-5">
            <img
              alt="Appwrite"
              src="/assets/images/appwriteLogo.jpg"
              width={240}
              height={92}
              className="col-span-2 max-h-16 w-full object-contain sm:max-h-20 lg:col-span-1"
            />

            <img
              alt="Resend"
              src="/assets/images/resendLogo.png"
              width={240}
              height={92}
              className="col-span-2 max-h-16 w-full object-contain sm:max-h-20 lg:col-span-1"
            />

            <img
              alt="TypeScript"
              src="/assets/images/typescriptLogo.png"
              width={240}
              height={92}
              className="col-span-2 max-h-16 w-full object-contain sm:max-h-20 lg:col-span-1"
            />

            <img
              alt="React"
              src="/assets/images/reactLogo.png"
              width={240}
              height={92}
              className="col-span-2 max-h-16 w-full object-contain sm:col-start-2 sm:max-h-20 lg:col-span-1"
            />

            <img
              alt="Next.js"
              src="/assets/images/nextjsLogo.png"
              width={240}
              height={92}
              className="col-span-2 col-start-2 max-h-16 w-full object-contain sm:col-start-auto sm:max-h-20 lg:col-span-1"
            />
          </div>
        </div>
      </section>

      <section id="company" className="isolate mt-14 bg-gray-900 px-6 py-24 sm:mt-20 sm:py-32 lg:px-8">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
        >
          <div
            style={{
              clipPath:
                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
            className="relative left-1/2 -z-10 aspect-1155/678 w-144.5 max-w-none -translate-x-1/2 rotate-30 bg-linear-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%-40rem)] sm:w-288.75"
          />
        </div>

        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2">
          <div className="max-w-xl">
            <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">Get in touch</h2>
            <p className="mt-6 text-lg/8 text-gray-400">
              Have questions about our services or need to schedule an appointment? Our support team is here to help. Reach out and we'll get back to you within 24 hours.
            </p>

            <div className="mt-10 space-y-5 text-sm text-gray-300">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 text-indigo-300" />
                <div>
                  <p className="font-semibold text-white">Address</p>
                  <p>123 Medical Plaza</p>
                  <p>Nairobi, Kenya</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-5 w-5 text-indigo-300" />
                <div>
                  <p className="font-semibold text-white">Telephone</p>
                  <p>+254 (700) 123-4567</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-5 w-5 text-indigo-300" />
                <div>
                  <p className="font-semibold text-white">Email</p>
                  <p>support@netcareflow.com</p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleFormSubmit} className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label htmlFor="fullName" className="block text-sm/6 font-semibold text-white">
                  Full name
                </label>
                <div className="mt-2.5">
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    value={formData.fullName}
                    onChange={handleFormChange}
                    placeholder="John Doe"
                    required
                    className="block w-full rounded-md bg-white/5 px-3.5 py-2 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm/6 font-semibold text-white">
                  Email
                </label>
                <div className="mt-2.5">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    placeholder="you@example.com"
                    required
                    className="block w-full rounded-md bg-white/5 px-3.5 py-2 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm/6 font-semibold text-white">
                  Phone number
                </label>
                <div className="mt-2.5">
                  <input
                    id="phone"
                    name="phone"
                    type="text"
                    value={formData.phone}
                    onChange={handleFormChange}
                    placeholder="+254 (700) 000-0000"
                    className="block w-full rounded-md bg-white/5 px-3.5 py-2 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm/6 font-semibold text-white">
                  Message
                </label>
                <div className="mt-2.5">
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    value={formData.message}
                    onChange={handleFormChange}
                    placeholder="Tell us how we can help..."
                    required
                    className="block w-full rounded-md bg-white/5 px-3.5 py-2 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500"
                  />
                </div>
              </div>
            </div>

            {formState.error && (
              <div className="mt-4 rounded-md bg-red-500/10 p-3 text-sm text-red-200">
                {formState.error}
              </div>
            )}

            {formState.success && (
              <div className="mt-4 rounded-md bg-green-500/10 p-3 text-sm text-green-200">
                {' '}
                Thank you! We received your message and will get back to you within 24 hours.
              </div>
            )}

            <div className="mt-8">
              <button
                type="submit"
                disabled={formState.isLoading}
                className="block w-full rounded-md bg-indigo-500 px-3.5 py-2.5 text-center text-sm font-semibold text-white shadow-xs hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {formState.isLoading ? 'Sending...' : "Let's talk"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}
