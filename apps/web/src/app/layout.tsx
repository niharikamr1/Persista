import type { Metadata } from "next";
import { Inter, DM_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-dm-sans",
});
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["700"],
  style: ["italic"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: {
    default: "AI Context Continuity",
    template: "%s | AI Context Continuity",
  },
  description:
    "Durable semantic memory infrastructure that preserves AI workflow continuity across sessions, platforms, and crashes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${dmSans.variable} ${playfair.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
