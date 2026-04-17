import Image from "next/image"

export default function Logo({
  className,
  width = 200,
  height = 36,
}: {
  className?: string
  width?: number
  height?: number
}) {
  return (
    <div className={className}>
      <Image
        src="/assets/icons/logo-full.svg.png"
        alt="NetCare logo"
        width={width}
        height={height}
        className="h-full w-auto object-contain"
      />
    </div>
  )
}
