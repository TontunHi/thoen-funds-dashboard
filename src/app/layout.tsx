import type { Metadata } from "next";
import "./globals.css";
import { SHEET_CONFIG } from "@/config/sheet.config";

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
    <html lang="th" className="light">
      <body className="bg-slate-50 text-slate-900 min-h-screen antialiased selection:bg-blue-100 selection:text-blue-900">
        {children}
      </body>
    </html>
  );
}
