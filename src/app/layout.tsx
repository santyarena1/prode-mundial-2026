import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Prode Mundial Gamer 2026 | The Gamer Shop",
  description: "Predecí los resultados del Mundial 2026, acumulá puntos y ganá premios increíbles con The Gamer Shop.",
  icons: {
    icon: [
      { url: "/logo-color.png", sizes: "any" },
    ],
    apple: "/logo-color.png",
  },
  openGraph: {
    title: "Prode Mundial Gamer 2026 | The Gamer Shop",
    description: "Predecí, competí y ganá premios. El prode gamer del Mundial 2026.",
    type: "website",
    locale: "es_AR",
    images: [
      {
        url: "https://prode-mundial-2026-ten-blue.vercel.app/og-image.png",
        width: 1280,
        height: 960,
        alt: "Prode Mundial Gamer 2026 - The Gamer Shop",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Prode Mundial Gamer 2026 | The Gamer Shop",
    description: "Predecí, competí y ganá premios.",
    images: ["https://prode-mundial-2026-ten-blue.vercel.app/og-image.png"],
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
