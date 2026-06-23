import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "ClipForge — Product Clips from Any Video",
  description: "Paste any YouTube, TikTok or Instagram URL. AI detects every product and exports individual clips instantly.",
  metadataBase: new URL("https://getclipforge.online"),
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "ClipForge — AI Product Clip Extractor",
    description: "Turn any review video into product clips automatically. AI detects every product mentioned and exports separate high-quality clips.",
    type: "website",
    url: "https://getclipforge.online",
    siteName: "ClipForge",
  },
  twitter: {
    card: "summary_large_image",
    title: "ClipForge — AI Product Clip Extractor",
    description: "Turn any review video into product clips automatically.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.svg" />
        <meta name="theme-color" content="#7c3aed" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
