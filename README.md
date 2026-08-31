# ระบบรายงานข้อมูลกองทุนเถิน (Thoen Funds Dashboard)

เว็บแอปพลิเคชันสำหรับแสดงผลข้อมูลจาก Google Sheet (`gid=806124582`) แบบเรียลไทม์ ด้วย Next.js 14, React และ Tailwind CSS พัฒนาขึ้นเพื่อ Deploy บน Vercel โดยเฉพาะ

## ✨ คุณสมบัติเด่น (Features)

- 📊 **ความถูกต้อง 100% (High Fidelity)**: รองรับการแสดงผลตารางพร้อมโครงสร้าง Merge Cell (Rowspan & Colspan), สีพื้นหลัง, สีตัวอักษร, ขนาดฟอนต์ และการจัดตำแหน่งข้อความตรงตาม Google Sheet ต้นฉบับ
- ☀️ **Light Mode ดีไซน์สะอาดตา**: สบายตา อ่านง่าย สไตล์ Modern Dashboard
- 🖱️ **Full Screen Single-Scroll**: แสดงผลเต็มหน้าจอโดยไม่ต้องเลื่อนซ้าย-ขวา (No Horizontal Scrollbar) และเลื่อนลูกกลิ้งเมาส์ (Mouse Wheel) ดูข้อมูลได้โดยตรงทันทีโดยไม่มีกล่อง Layer ซ้อนกวนใจ
- 🔄 **Auto-Refresh & Manual Sync**: อัปเดตข้อมูลอัตโนมัติทุก 60 วินาที พร้อมปุ่มกดรีเฟรชข้อมูลแบบทันที
- ⚙️ **Config ง่าย**: รองรับทั้งการใส่ Google Sheets API Key ลงในไฟล์ `src/config/sheet.config.ts` โดยตรง หรือตั้งค่าผ่าน Environment Variable `GOOGLE_SHEETS_API_KEY`

---

## 🚀 วิธีการติดตั้งและรันในเครื่อง (Local Setup)

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. ตั้งค่า Google Sheets API Key (เลือกวิธีใดวิธีหนึ่ง)
- **วิธีที่ 1 (สะดวกที่สุด)**: เปิดไฟล์ `src/config/sheet.config.ts` และระบุคีย์ของคุณในช่อง `API_KEY`:
  ```ts
  export const SHEET_CONFIG = {
    SPREADSHEET_ID: "1tEBhzMWF7QkwOEBXamCImWrbcOqthdb2Kb9Wgs6k04I",
    SHEET_GID: 806124582,
    API_KEY: "AIzaSy...", // <-- ใส่ Google Sheets API Key ที่นี่
    AUTO_REFRESH_SECONDS: 60,
    ...
  };
  ```
- **วิธีที่ 2 (ผ่าน .env.local)**: สร้างไฟล์ `.env.local` ที่ Root directory:
  ```env
  GOOGLE_SHEETS_API_KEY=AIzaSy...
  ```

### 3. รัน Development Server
```bash
npm run dev
```
เปิดบราวเซอร์ไปที่ [http://localhost:3000](http://localhost:3000)

---

## 🌐 การ Deploy ขึ้น Vercel

1. Push โค้ดทั้งหมดขึ้น GitHub / GitLab / Bitbucket
2. เข้าสู่ [Vercel](https://vercel.com) แล้วเลือก **Add New Project** -> Import repository นี้
3. (ทางเลือก) ในส่วน **Environment Variables** บน Vercel Dashboard ให้เพิ่ม:
   - Key: `GOOGLE_SHEETS_API_KEY`
   - Value: `(API Key ของคุณ)`
4. กด **Deploy** แล้วระบบจะ Build และออนไลน์ให้ทันที

---

## 🧪 การทดสอบ Build

```bash
npm run build
```
โครงการผ่านการตรวจสอบ Type Check และ Next.js Production Build 100% เรียบร้อยแล้ว
