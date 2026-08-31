import type { Metadata } from "next";
import { Prompt, Inter } from "next/font/google";
import "./globals.css";
import { SHEET_CONFIG } from "@/config/sheet.config";

const prompt = Prompt({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-prompt",
  display: "swap",
});

const inter = Inter({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: SHEET_CONFIG.APP_TITLE,
  description: "ระบบรายงานและแสดงผลข้อมูลกองทุนเถินจาก Google Sheet แบบเรียลไทม์",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={`${prompt.variable} ${inter.variable} light`}>
      <body className="font-prompt bg-slate-50/80 text-slate-900 min-h-screen antialiased selection:bg-indigo-100 selection:text-indigo-900">
        {children}
      </body>
    </html>
  );
}
