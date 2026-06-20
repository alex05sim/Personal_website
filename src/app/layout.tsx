import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CommandMenu } from "@/components/command-menu";
import { SiteFooter } from "@/components/site-footer";
import { HudFrame, ScrollProgress } from "@/components/site-chrome";
import { SmoothScroll } from "@/components/smooth-scroll";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://alexsimpson.dev";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Alex Simpson - Security - Hardware - AI",
    template: "%s - Alex Simpson",
  },
  description:
    "Alex Simpson - UC Berkeley CS + Data Science. Cryptographic security, custom hardware, and GPU-accelerated AI. Former NSA software intern.",
  keywords: [
    "Alex Simpson",
    "UC Berkeley",
    "security engineering",
    "PCB design",
    "embedded systems",
    "GPU computing",
    "machine learning",
    "software engineer",
  ],
  authors: [{ name: "Alex Simpson" }],
  openGraph: {
    title: "Alex Simpson - Security - Hardware - AI",
    description:
      "Cryptographic security, custom hardware, and GPU-accelerated AI - systems built from the board up.",
    url: siteUrl,
    siteName: "Alex Simpson",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Alex Simpson - Security - Hardware - AI",
    description:
      "Cryptographic security, custom hardware, and GPU-accelerated AI - systems built from the board up.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {/* Always load at the top - don't let the browser restore scroll on reload. */}
        <script dangerouslySetInnerHTML={{ __html: "history.scrollRestoration='manual';" }} />
        <SmoothScroll />
        <ScrollProgress />
        <HudFrame />
        {children}
        <SiteFooter />
        <CommandMenu />
      </body>
    </html>
  );
}
