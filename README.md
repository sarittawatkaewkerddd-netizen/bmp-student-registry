# BMP Student Registry — Netlify Deploy

เว็บไซต์สาธารณะสำหรับค้นหาข้อมูลนักเรียนโรงเรียนเบญจมเทพอุทิศ 2,857 รีย

## โครงสร้าง
- **Static Site** — `public/` (index.html, students.json, stats.json)
- **Netlify Functions** — `netlify/functions/api.js` (search, filter, pagination API)
- **Build Script** — `build.js` (generate JSON from TSV at build time)

## Quick Start (Local)

```bash
cd C:\Users\iCom\Downloads\bmp_student_registry
npm install
npm run build          # Generate public/students.json + stats.json
npx netlify dev        # Local dev with functions (http://localhost:8888)
```

## Deploy to Netlify (Free, No Credit Card)

### Option 1: Git Integration (Recommended)
1. Push to GitHub:
```bash
cd C:\Users\iCom\Downloads\bmp_student_registry
git init
git add .
git commit -m "initial"
# Create repo on github.com → push
```

2. Go to https://app.netlify.com → **Add new site** → **Import from Git** → Connect GitHub → Select repo
3. Build settings (auto-detected from `netlify.toml`):
   ```
   Build command: npm run build
   Publish directory: public
   Functions directory: netlify/functions
   ```
4. **Deploy site** → Get `https://random-name.netlify.app`

### Option 2: Drag & Drop (No Git)
```bash
npm run build
# Drag `public` folder to https://app.netlify.com/drop
# (Functions won't work — only static JSON)
```

### Option 3: Netlify CLI
```bash
npm i -g netlify-cli
netlify login
netlify init    # Link to existing or create new
netlify deploy --prod --dir=public
```

## Environment Variables (Optional)
ใน Netlify Dashboard → Site settings → Environment variables:
```
NODE_VERSION=20
```

## Custom Domain (Free)
1. Netlify Dashboard → Domain management → Add custom domain
2. ตั้ง DNS ชี้ไป Netlify (Netlify DNS หรือ External DNS)
3. HTTPS/SSL อัตโนมัติ (Let's Encrypt)

## API Endpoints (Netlify Functions)

| Endpoint | Method | Params | Description |
|----------|--------|--------|-------------|
| `/.netlify/functions/api/students` | GET | `q, grade, gender, room, name, citizen, limit, offset` | ค้นหานักเรียน + pagination |
| `/.netlify/functions/api/stats` | GET | - | สถิติรวม |
| `/.netlify/functions/api/student/:citizenId` | GET | - | ข้อมูลนักเรียนรายคน |

### Query Params
- `q` — ค้นหาทั่วไป (รองรับ regex `/pattern/flags`)
- `grade` — คั่น comma: `ม.1,ม.2`
- `gender` — `ชาย,หญิง`
- `room` — `1,2,3` หรือ `1-5`
- `name` — regex ชื่อ/นามสกุล
- `citizen` — regex เลขประจำตัว
- `limit` / `offset` — pagination

## Shareable URLs
คัดลอกจากปุ่ม 🔗 แชร์ลิงก์ — query params ทำงานกับ Netlify Functions
```
https://your-site.netlify.app/?q=สมชาย&grade=ม.1,ม.2&gender=ชาย
```

## Features
- 🔍 ค้นหาแบบ real-time (debounced 150ms) ผ่าน Netlify Functions
- 🎯 กรองขั้นสูง: ชั้น, ห้อง, เพศ, regex ชื่อ/บัตรประชาชน
- 🃏 มุมมองตาราง + การ์ด พิมพ์การ์ดนักเรียนได้
- 🌙 Dark/Light theme
- 📥 Export CSV/JSON (โหลดทั้งหมดผ่าน API ก่อน export)
- 📄 Pagination 100 รายการ/หน้า
- 🔗 Shareable URL (query params → Netlify Functions)
- 📱 Responsive mobile-friendly
- ⚡ Static JSON + Serverless Functions = เร็ว, ฟรี, ไม่ต้องดูแลเซิร์ฟเวอร์

## Data Source
`students_full_db.tsv` — 2,857 rows × 8 columns จากระบบ reexam MySQL พ.ศ. 2568
Build-time generates `public/students.json` + `public/stats.json`

## Limits (Netlify Free Tier)
- 100 GB bandwidth/เดือน
- 300 build minutes/เดือน
- 125,000 function invocations/เดือน
- Functions timeout 10s (พอสำหรับ query นี้)
- ไม่ต้องบัตรเครดิต, ไม่ sleep, HTTPS ฟรี