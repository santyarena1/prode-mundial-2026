import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { BackgroundOrbs } from "@/components/ui/BackgroundOrbs";
import { EmailVerificationBanner } from "@/components/auth/EmailVerificationBanner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://thegamershop-premios.com"),
  title: "Prode Mundial 2026 | The Gamer Shop",
  description: "Jugá el Prode del Mundial 2026 con The Gamer Shop. Predecí los resultados de los 104 partidos, acumulá puntos y canjeá premios gaming exclusivos. ¡Registrate gratis y competí contra miles de jugadores!",
  icons: {
    icon: [
      { url: "/logo-color.png", type: "image/png", sizes: "512x512" },
      { url: "/logo-color.png", type: "image/png", sizes: "192x192" },
      { url: "/logo-color.png", type: "image/png", sizes: "32x32" },
    ],
    apple: { url: "/logo-color.png", sizes: "180x180", type: "image/png" },
    shortcut: "/logo-color.png",
  },
  openGraph: {
    title: "Prode Mundial 2026 | The Gamer Shop",
    description: "Predecí los resultados del Mundial 2026, acumulá puntos y canjeá premios gaming exclusivos. ¡Registrate gratis!",
    url: "https://thegamershop-premios.com",
    siteName: "Prode Mundial 2026 | The Gamer Shop",
    type: "website",
    locale: "es_AR",
    images: [
      {
        url: "https://thegamershop-premios.com/og-image.png",
        width: 1280,
        height: 960,
        alt: "Prode Mundial 2026 - The Gamer Shop",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Prode Mundial 2026 | The Gamer Shop",
    description: "Predecí los resultados del Mundial 2026 y ganá premios gaming exclusivos con The Gamer Shop.",
    images: ["https://thegamershop-premios.com/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#0a0a0a] text-white">
        <BackgroundOrbs />
        <EmailVerificationBanner />
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#1a1a1a",
              color: "#fff",
              border: "1px solid #333",
            },
            success: {
              iconTheme: { primary: "#ef4444", secondary: "#fff" },
            },
            error: {
              iconTheme: { primary: "#ef4444", secondary: "#fff" },
            },
          }}
        />
      </body>
    </html>
  );
}
