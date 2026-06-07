import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "准双曲面齿轮节锥几何模型",
  description: "准双曲面齿轮节锥几何三维交互可视化工具",
  keywords: ["准双曲面齿轮", "节锥", "Hypoid Gear", "Pitch Cone"],
  authors: [{ name: "llduang" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "准双曲面齿轮节锥几何模型",
    description: "准双曲面齿轮节锥几何三维交互可视化工具",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
