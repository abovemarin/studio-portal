import type { Metadata } from "next"
import { Barlow, Barlow_Condensed } from "next/font/google"
import { Providers } from "@/components/providers"
import "./globals.css"

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-barlow-condensed",
})

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-barlow",
})

export const metadata: Metadata = {
  title: "Studio Portal",
  description: "Client project portal — The Scaler Studio",
}

// Every route is authenticated and DB-backed (session + per-request data), so nothing
// benefits from static prerendering. Force dynamic app-wide: the build never attempts to
// prerender a page — and therefore never contacts the database at build time (CI relies on
// this). Without it, adding root loading.tsx/error.tsx boundaries destabilises Next's
// dynamic inference and a page's DB query can surface as a prerender error during build.
export const dynamic = "force-dynamic"

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${barlowCondensed.variable} ${barlow.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
