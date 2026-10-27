# Awakened

**[ไทย](#ไทย) · [English](#english)**

> Your life is the game. Every day is a level up.

---

<a id="ไทย"></a>
## ไทย

แอปมือถือที่เอาระบบเกม RPG มาใส่ในชีวิตประจำวัน ออกกำลังกาย ดื่มน้ำ จดอาหาร จับเวลาโฟกัส เขียนไดอารี่ ทำแล้วได้ XP เก็บเลเวล เลื่อนแรงค์ไปเรื่อย ๆ

### สถานะตอนนี้

**เวอร์ชัน `0.10.5` — มีโค้ดแอปและไฟล์ติดตั้ง Android APK พร้อมใช้งานแล้ว**

📖 **อ่านเอกสารออกแบบแบบจัดหมวดหมู่ได้ที่ [Wiki](../../wiki)**

### แนวคิดหลัก

- **ระบบวินัยพร้อมระยะผ่อนผัน** หากขาดเควสต์ประจำวันเกินระยะผ่อนผัน (ไม่เข้าทำภารกิจครบ 3 วันติดต่อกัน) ระบบจะใช้โล่กันโทษ (Penalty Shield) หรือหัก 30% ของ EXP พร้อมภารกิจกู้คืน (Comeback Quest) ที่ได้ EXP คืน 50% เมื่อกลับมาทำเควสต์ โดยวันพักที่วางแผนไว้และโหมดลาพัก/ป่วยไม่ถูกนับเป็นวันขาด
- **เควสต์ประจำวันปรับตามคน** มีแบบสอบถามตอนเริ่มใช้ ถามอายุ เวลาที่มี อุปกรณ์ สิ่งที่มักทำให้เลิก แล้วสร้างเควสต์ให้พอดีกับคนนั้น
- **ข้อมูลอยู่ในเครื่อง 100% (Offline-First)** ไม่ต้องสมัครสมาชิก ไม่มีโฆษณา ส่งออกหรือลบข้อมูลได้เอง พร้อมระบบล็อกแอปด้วยรหัส PIN 4/6 หลัก (Salted SHA-256 + รหัสกู้คืนฉุกเฉิน) และสแกนลายนิ้วมือ
- **ตัวเลขที่ประมาณต้องบอกว่าประมาณ** เช่นแคลอรีที่เดาจากรูปอาหาร แก้ไขได้เสมอ และเมื่อลบรายการในประวัติ ระบบจะคำนวณย้อนคืน EXP และสถานะเควสต์ให้ตรงตามบัญชีจริงเสมอ
- **ปรับสมดุลได้โดยไม่แตะโค้ด** สูตร XP เลเวล แรงค์ และกฎบทลงโทษอยู่ในไฟล์ `assets/config/xp_config.json`

### ฟีเจอร์หลักในแอป

| ระบบ | ทำอะไร |
|---|---|
| Dashboard | ดู Rank เลเวล XP เควสต์วันนี้ ความต่อเนื่อง โล่กันโทษ และโหมดลาพัก/ป่วย |
| Activity Log & Timeline | บันทึกน้ำ อาหาร ออกกำลังกาย โฟกัส กิจกรรมอื่น เรียงเป็น timeline พร้อมสมุดบัญชี XP (XP Ledger) และการลบรายการที่คำนวณย้อนคืนเลเวล/เควสต์อัตโนมัติ |
| Workout & Focus | นับครั้ง จับเวลาออกกำลังกาย จัดตารางฝึกรายสัปดาห์ และ Pomodoro จับเวลาโฟกัส |
| Quest & Trophy Room | เควสต์รายวัน รายสัปดาห์ ภารกิจส่วนตัว และห้องถ้วยรางวัล (Achievements) |
| Rank Carousel | 7 แรงค์หลักตั้งแต่ E ถึง SS (และแรงค์ลับสูงสุดที่จะปรากฏเมื่อถึงเกณฑ์ปลดล็อกเท่านั้น) แสดงแบบการ์ดเลื่อนซ้าย-ขวาพร้อมคำอธิบายทั้งในเกมและในชีวิตจริง |
| Journal & Mood | ไดอารี่ บันทึกอารมณ์ ปฏิทิน สรุปรายสัปดาห์ |
| Home Widgets | วิดเจ็ตหน้าจอหลัก Android 5 รูปแบบ (เควสต์ประจำวันที่กดติ๊กทำเควสต์ได้จากหน้าโฮมและแสดงเควสต์ในวันพัก, ภาพรวม, นาฬิกา, แคลอรี, ถ้วยรางวัล) |
| Stats | STR, VIT, INT, WIL ค่อย ๆ เพิ่มตามเควสต์ที่ทำ |

### เทคโนโลยีที่ใช้จริง (Tech Stack)

ใช้ของฟรีและโอเพนซอร์สทั้งหมด ทำงานแบบออฟไลน์ในเครื่อง 100%:

- **Expo ~52.0** + **React Native 0.76** + **TypeScript 5.3**
- **Native Android (Kotlin)**: โมดูลจัดการวิดเจ็ตหน้าจอหลัก (`AppWidgetProvider`), นาฬิกาปลุกและการแจ้งเตือน (`AlarmManager`), และสแกนลายนิ้วมือ (`BiometricPrompt`)
- **Storage**: `AsyncStorage` / `expo-sqlite` / `expo-file-system` พร้อมระบบสำรองและกู้คืนข้อมูล JSON
- **Testing**: `Vitest` สำหรับทดสอบเอนจินคำนวณ XP, เลเวล, แรงค์, เควสต์, ความสำเร็จ, และกฎหัก EXP ย้อนหลัง

### วิธีรันและสร้างไฟล์ APK

```bash
npm install

# รันชุดทดสอบและตรวจสอบชนิดข้อมูล TypeScript
npm run typecheck
npm test

# รันโหมดพัฒนา
npx expo start

# สร้างไฟล์ติดตั้ง Release APK (Windows PowerShell)
npm run build:apk
```

### เอกสารในนี้

| ไฟล์ | เนื้อหา |
|---|---|
| `Awakened.md` | สเปกเต็ม สูตร XP และเลเวล ฐานข้อมูล แผนทำ วิธีสร้างไฟล์ติดตั้ง |
| `Awakened-Onboarding-Questionnaire.md` | แบบสอบถามตอนเริ่มใช้ และวิธีสร้างเควสต์จากคำตอบ |

### ข้อควรรู้

Awakened ไม่ใช่เครื่องมือทางการแพทย์ ถ้ามีโรคประจำตัวหรืออาการผิดปกติ ควรถามหมอก่อนเริ่มออกกำลังกาย

---

<a id="english"></a>
## English

A mobile app that brings RPG mechanics into everyday life. Work out, drink water, log meals, run focus timers, write a journal. Every action earns XP, builds your level, and moves you up through ranks.

### Current status

**Version `0.10.5` — Full React Native + Expo + Native Kotlin Android application with installable Release APK.**

📖 **The design docs are also split into browsable pages in the [Wiki](../../wiki)** (the Wiki is written in Thai).

### Core ideas

- **Accountability with a grace period.** Missing daily quests for 3 consecutive days triggers a 30% EXP penalty (or consumes 1 Penalty Shield), paired with a Comeback Quest that refunds 50% of the deducted EXP when you return. Planned rest days and Vacation/Sick mode are always exempt.
- **Daily quests adapt to the person.** An onboarding questionnaire asks about age, available time, equipment and what usually makes you quit, then builds quests that fit that person.
- **100% Offline-First.** Your data stays on your device. No account, no ads, full JSON export/import, plus 4/6-digit PIN App Lock (Salted SHA-256 + Recovery Code) and Biometric unlock.
- **Accurate XP Ledger.** Deleting an activity, meal, workout, journal, or mood entry cleanly reverts its XP and recalculates daily/weekly quests and player levels.
- **Tunable without touching code.** XP, level, rank, and penalty rules live in `assets/config/xp_config.json`.

### Features

| System | What it does |
|---|---|
| Dashboard | Rank, level, XP, today's quests, streak, Penalty Shields, and Vacation/Sick mode |
| Activity Log & Timeline | Log water, meals, workouts, focus time and activities on a timeline with full XP Ledger and reversible deletion |
| Workout & Pomodoro | Rep counter, workout timer, weekly training plan, and focus timer |
| Quest & Trophy Room | Daily, weekly, personal quests and multi-tier achievements |
| Rank Carousel | 7 visible tiers from E to SS (plus a secret final rank revealed only upon unlocking), presented in an interactive horizontal snap carousel |
| Journal & Mood | Diary, mood log, calendar, weekly recap |
| Android Home Widgets | 5 home-screen widgets including an interactive Daily Quests widget that works on rest days and allows completing quests directly from the home screen |
| Stats | STR, VIT, INT and WIL grow gradually as you complete quests |

### Tech stack

- **Expo ~52.0** + **React Native 0.76** + **TypeScript 5.3**
- **Native Android (Kotlin)** for home-screen widgets, exact alarms/reminders, and biometric authentication
- **Vitest** for unit testing core engines

### Run & Build

```bash
npm install
npm run typecheck
npm test
npx expo start
npm run build:apk
```

### Good to know

Awakened is not a medical tool. If you have a health condition or any unusual symptoms, check with a doctor before starting an exercise routine.
