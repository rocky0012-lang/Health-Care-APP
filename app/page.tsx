import { redirect } from "next/navigation"

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const query = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => query.append(key, entry))
      return
    }

    if (typeof value === "string") {
      query.set(key, value)
    }
  })

  redirect(query.toString() ? `/landingPage?${query.toString()}` : "/landingPage")
}
