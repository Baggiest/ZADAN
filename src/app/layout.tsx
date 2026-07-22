import type { Metadata } from "next";
import { IBM_Plex_Sans, Noto_Sans_Arabic } from "next/font/google";
import "./globals.css";

const plex = IBM_Plex_Sans({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const notoArabic = Noto_Sans_Arabic({
  variable: "--font-noto-ar",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ZADANNNN PASHMAMMMM",
  description:
    "OSINT heatmap of Iranian cities strike reports by the Iranian people on Telegram gathered by @VahidOnline",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${plex.variable} ${notoArabic.variable} antialiased`}>
        {children}
        <footer className="text-sm text-gray-500 mt-8">
          Made by Mani E. Sohi{' '}
          <a href="https://github.com/baggiest" rel="noopener noreferrer" target="_blank">GitHub</a> |{' '}
          <a href="https://linkedin.com/in/manisohi" rel="noopener noreferrer" target="_blank">LinkedIn</a>
        </footer>
      </body>
    </html>
  );
}
