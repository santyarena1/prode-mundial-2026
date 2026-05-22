interface SponsorLogoProps {
  src: string;
  alt: string;
  className?: string;
}

/** Logo de sponsor desde la API (PNG con fondo transparente) */
export function SponsorLogo({ src, alt, className = "" }: SponsorLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={`object-contain ${className}`.trim()} />
  );
}
