import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "วิเคราะห์ข้อมูลกองทุนเถิน (Analytics & Candlestick)",
  description: "กราฟแท่งเทียนการเงินและแนวโน้มการใช้งบประมาณกองทุนเถิน",
};

export default function AnalyticsPage() {
  return <AnalyticsDashboard />;
}
