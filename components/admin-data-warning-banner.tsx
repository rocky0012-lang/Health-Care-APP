import { AlertTriangle } from "lucide-react"

export function AdminDataWarningBanner({
  title,
  message,
}: {
  title: string
  message: string
}) {
  return (
    <div className="rounded-[28px] border border-amber-200/80 bg-[linear-gradient(135deg,rgba(254,243,199,0.9),rgba(255,255,255,0.94))] px-5 py-4 text-sm text-amber-900 shadow-[0_18px_44px_-30px_rgba(120,53,15,0.6)] dark:border-amber-900/60 dark:bg-[linear-gradient(135deg,rgba(120,53,15,0.34),rgba(15,23,42,0.92))] dark:text-amber-100">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0" />
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-amber-800/90 dark:text-amber-100/90">{message}</p>
        </div>
      </div>
    </div>
  )
}