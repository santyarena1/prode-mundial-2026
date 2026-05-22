import Image from "next/image";
import Link from "next/link";

const sizes = {
  sm: { width: 260, height: 104, className: "h-20 w-auto", pad: "px-1 py-0" },
  md: { width: 340, height: 136, className: "h-28 w-auto", pad: "px-1 py-0" },
  lg: { width: 280, height: 112, className: "h-20 sm:h-24 w-auto", pad: "px-4 py-2" },
  xl: { width: 360, height: 144, className: "h-28 sm:h-32 w-auto", pad: "px-6 py-3" },
  hero: { width: 400, height: 150, className: "h-[4.25rem] sm:h-20 md:h-[5.5rem] lg:h-[6.25rem] xl:h-28 w-auto", pad: "px-1 py-0" },
} as const;

type LogoSize = keyof typeof sizes;

interface LogoProps {
  size?: LogoSize;
  href?: string;
  showTagline?: boolean;
  className?: string;
  priority?: boolean;
  /** Logo rojo original — solo para el hero del inicio */
  variant?: "default" | "hero";
}

export function Logo({
  size = "md",
  href = "/",
  showTagline = false,
  className = "",
  priority = false,
  variant = "default",
}: LogoProps) {
  const { width, height, className: sizeClass, pad } = sizes[size];
  const src = variant === "hero" ? "/logo-hero.png" : "/logo-color.jpg";

  const image = (
    <span className={`inline-flex items-center justify-center ${pad}`}>
      <Image
        src={src}
        alt="The Gamer Shop"
        width={width}
        height={height}
        unoptimized
        className={`${sizeClass} object-contain ${variant === "default" ? "rounded-lg" : "bg-transparent"} ${className}`}
        priority={priority}
      />
    </span>
  );

  const content = (
    <div className="flex flex-col items-start gap-1">
      {image}
      {showTagline && (
        <span className="text-gray-500 text-[10px] sm:text-xs uppercase tracking-widest pl-3">
          Prode Mundial 2026
        </span>
      )}
    </div>
  );

  if (!href) return content;

  return (
    <Link
      href={href}
      className="inline-flex shrink-0 group focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 rounded-lg -ml-1"
    >
      {content}
    </Link>
  );
}
