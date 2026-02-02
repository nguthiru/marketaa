import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Space_Mono, Fraunces } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const spaceMono = Space_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const fraunces = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Marketaa | AI-Assisted Outreach",
  description:
    "Turn intent into action with AI-assisted research, lead enrichment, and personalized outreach—while staying in control.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${plusJakartaSans.variable} ${spaceMono.variable} ${fraunces.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
