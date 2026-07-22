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
  title: "ZADAAAANNNNNN PASHMAAAMMMMM",
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
      <body
        className={`${plex.variable} ${notoArabic.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
