import { SponsorLogo } from "@/components/ui/SponsorLogo";

interface HeroSponsor {
  id: string;
  name: string;
  logoUrl: string;
  websiteUrl?: string | null;
}

interface HeroSponsorsProps {
  sponsors: HeroSponsor[];
}

/** Sponsors debajo del logo principal del hero */
export function HeroSponsors({ sponsors }: HeroSponsorsProps) {
  if (sponsors.length === 0) return null;

  return (
    <div
      className="flex flex-col items-center mt-3 sm:mt-4 w-full"
      aria-label="Sponsors"
    >
      <span className="text-[9px] sm:text-[10px] text-gray-400/90 uppercase tracking-[0.35em] mb-2 sm:mb-2.5">
        Marcas que acompañan
      </span>
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 md:gap-8 px-2">
        {sponsors.map((sponsor) => {
          const logo = (
            <SponsorLogo
              src={sponsor.logoUrl}
              alt={sponsor.name}
              className="h-6 sm:h-7 md:h-8 w-auto max-w-[5rem] sm:max-w-[6rem] opacity-95 hover:opacity-100 transition-opacity drop-shadow-lg"
            />
          );

          if (sponsor.websiteUrl) {
            return (
              <a
                key={sponsor.id}
                href={sponsor.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={sponsor.name}
                className="inline-flex items-center px-2 py-1 hover:scale-105 transition-transform"
              >
                {logo}
              </a>
            );
          }

          return (
            <span
              key={sponsor.id}
              title={sponsor.name}
              className="inline-flex items-center px-2 py-1"
            >
              {logo}
            </span>
          );
        })}
      </div>
    </div>
  );
}
