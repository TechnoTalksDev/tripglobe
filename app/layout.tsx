import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "SeniorGlobe",
  description: "A collaborative globe where travelers vote on the best destinations to visit next.",
  openGraph: {
    title: "SeniorGlobe — Vote for your next destination",
    description: "A collaborative globe where travelers vote on the best destinations to visit next.",
    images: [{ url: "/card.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SeniorGlobe — Vote for your next destination",
    description: "A collaborative globe where travelers vote on the best destinations to visit next.",
    images: ["/card.png"],
  },
}

const geist = Geist({subsets:['latin'],variable:'--font-sans'})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", geist.variable)}
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
