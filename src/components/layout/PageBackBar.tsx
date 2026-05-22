import { BackButton } from "@/components/layout/BackButton";

interface PageBackBarProps {
  className?: string;
  label?: string;
  href?: string;
}

/** Barra con botón volver, debajo del navbar o al inicio del contenido */
export function PageBackBar({ className = "", label, href }: PageBackBarProps) {
  return (
    <div className={`max-w-7xl mx-auto w-full ${className}`}>
      <BackButton label={label} href={href} />
    </div>
  );
}
