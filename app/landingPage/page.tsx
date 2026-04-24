import LandingPageClient from "./landing-page-client"

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{
    admin?: string
  }>
}) {
  const params = await searchParams
  const isAdmin = params?.admin === "true"

  return <LandingPageClient isAdmin={isAdmin} />
}
