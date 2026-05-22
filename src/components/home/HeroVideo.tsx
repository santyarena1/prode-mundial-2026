"use client";

/**
 * Video del hero (~74s). El archivo ya está recortado 5s del final respecto al original.
 */
export function HeroVideo() {
  return (
    <video
      autoPlay
      muted
      loop
      playsInline
      aria-hidden
      className="absolute inset-0 h-full w-full object-cover"
      src="/videos/hero.mp4"
    />
  );
}
