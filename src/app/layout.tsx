import type { Metadata, Viewport } from "next";
import { Outfit, Source_Sans_3, JetBrains_Mono } from "next/font/google";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const title = "Flight to Calendar — Generate ICS Calendar Events from Flight Numbers";
const description =
  "Turn any flight number into a downloadable .ics calendar event in seconds. Accurate departure and arrival times with correct timezones, ready to import into Google Calendar, Apple Calendar, and Outlook.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: "%s — Flight to Calendar",
  },
  description,
  applicationName: "Flight to Calendar",
  authors: [{ name: "Samuel Groesch", url: "https://www.groes.ch/" }],
  creator: "Samuel Groesch",
  publisher: "Samuel Groesch",
  keywords: [
    "flight to calendar",
    "flight ICS",
    "flight number to calendar",
    "ICS generator",
    "airline calendar event",
    "iCalendar flight",
    "travel itinerary",
    "Google Calendar flight",
    "Apple Calendar flight",
    "Outlook flight",
  ],
  category: "Travel",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Flight to Calendar",
    title,
    description,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2f4f7c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${sourceSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
