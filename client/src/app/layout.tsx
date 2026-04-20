import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import HospitalBackground from "@/components/HospitalBackground";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MediConnect | Future of Telehealth",
  description: "Advanced Patient Intake and Video Consultation Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased selection:bg-indigo-500/30">
        <HospitalBackground />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
