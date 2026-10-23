# Awakened

**[ไทย](#ไทย) · [English](#english)**

> Your life is the game. Every day is a level up.

---

<a id="ไทย"></a>
## ไทย

แอปมือถือที่เอาระบบเกม RPG มาใส่ในชีวิตประจำวัน ออกกำลังกาย ดื่มน้ำ จดอาหาร จับเวลาโฟกัส เขียนไดอารี่ ทำแล้วได้ XP เก็บเลเวล เลื่อนแรงค์ไปเรื่อย ๆ

### สถานะตอนนี้

**ยังอยู่ช่วงวางแผน ยังไม่มีโค้ดแอป** ใน repo นี้มีแค่เอกสารออกแบบ ตัวแอปจะเริ่มเขียนเร็ว ๆ นี้ ถ้าเข้ามาดูแล้วหาไฟล์ที่รันได้ไม่เจอ ไม่ได้พลาดอะไร มันยังไม่มีจริง ๆ

📖 **อ่านเอกสารออกแบบแบบจัดหมวดหมู่ได้ที่ [Wiki](../../wiki)**

### ทำไมถึงทำ

แอปสุขภาพส่วนใหญ่จะจดตัวเลขให้เราดู แล้วก็ปล่อยให้เรามีแรงใจเองเอาเอง ซึ่งไม่ค่อยได้ผลกับหลายคน เรื่องที่มักพังคือพลาดไปวันเดียวแล้วรู้สึกว่าเสียหมดแล้ว เลยเลิกไปเลย

Awakened พยายามแก้ตรงจุดนั้น ถ้าพักหรือพลาด XP กับเลเวลที่สะสมไว้ไม่หาย วันพักที่วางแผนไว้ก็นับเป็นวันที่ทำตามแผน ไม่มีบทลงโทษ

### แนวคิดหลัก

- **ไม่หัก ไม่ลงโทษ** XP เลเวล และค่าสถานะไม่ลดลงไม่ว่าจะหายไปนานแค่ไหน
- **เควสต์ประจำวันปรับตามคน** มีแบบสอบถามตอนเริ่มใช้ ถามอายุ เวลาที่มี อุปกรณ์ สิ่งที่มักทำให้เลิก แล้วสร้างเควสต์ให้พอดีกับคนนั้น
- **ข้อมูลอยู่ในเครื่อง** ไม่ต้องสมัครสมาชิก ไม่มีโฆษณา ส่งออกหรือลบข้อมูลได้เอง
- **ตัวเลขที่ประมาณต้องบอกว่าประมาณ** เช่นแคลอรีที่เดาจากรูปอาหาร แก้ไขได้เสมอ
- **ปรับสมดุลได้โดยไม่แตะโค้ด** สูตร XP และเลเวลอยู่ในไฟล์ config

### ฟีเจอร์ที่วางไว้

| ระบบ | ทำอะไร |
|---|---|
| Dashboard | ดู Rank เลเวล XP เควสต์วันนี้ ความต่อเนื่อง |
| Activity Log | บันทึกน้ำ อาหาร ออกกำลังกาย โฟกัส กิจกรรมอื่น เรียงเป็น timeline |
| Workout | นับครั้ง จับเวลา จัดตารางฝึกรายสัปดาห์ ดูประวัติ |
| Pomodoro | จับเวลาโฟกัส ได้ XP เมื่อจบรอบจริง |
| Quest | รายวัน รายสัปดาห์ เป้าหมายระยะยาว และเควสต์ที่ตั้งเอง |
| Rank | 8 ขั้น ตั้งแต่ E ถึง Monarch |
| Journal | ไดอารี่ บันทึกอารมณ์ ปฏิทิน สรุปรายสัปดาห์ |
| Stats | STR, VIT, INT, WIL ค่อย ๆ เพิ่มตามเควสต์ที่ทำ |

ฟีเจอร์ช่วงหลัง เช่น สแกนอาหารจากรูป วิดเจ็ตหน้าจอ และนับท่าออกกำลังกายด้วยกล้อง จะทำหลังจากส่วนพื้นฐานใช้งานได้จริงแล้วเท่านั้น

### แผนทำ

1. **Phase 1** ระบบพื้นฐาน บันทึกกิจกรรม XP เลเวล แรงค์ เควสต์รายวัน Streak ไดอารี่แบบข้อความ
2. **Phase 2** เควสต์รายสัปดาห์ แผนส่วนตัว บันทึกอารมณ์ แจ้งเตือน กราฟ สแกนอาหาร
3. **Phase 3** วิดเจ็ต ตรวจท่าทางด้วยกล้อง ระบบ Monarch

แต่ละช่วงต้องใช้เองได้จริงก่อน ถึงจะเริ่มช่วงถัดไป

### เครื่องมือที่ตั้งใจใช้

ใช้ของฟรีและโอเพนซอร์สทั้งหมด

- Flutter กับ Dart
- SQLite ผ่าน Drift
- Riverpod สำหรับจัดการสถานะ
- fl_chart สำหรับกราฟ

เริ่มที่ Android ก่อน iOS ค่อยว่ากัน เพราะต้องใช้เครื่อง Mac และค่าสมัครนักพัฒนา

### ลองรัน (เมื่อมีโค้ดแล้ว)

ส่วนนี้ยังใช้ไม่ได้ ใส่ไว้เป็นแผน

```bash
git clone <repo-url>
cd awakened
flutter pub get
flutter run
```

ต้องติดตั้ง Flutter SDK และต่อมือถือ Android หรือเปิด emulator ไว้ก่อน

### เอกสารในนี้

| ไฟล์ | เนื้อหา |
|---|---|
| `Awakened.md` | สเปกเต็ม สูตร XP และเลเวล ฐานข้อมูล แผนทำ วิธีสร้างไฟล์ติดตั้ง |
| `Awakened-Onboarding-Questionnaire.md` | แบบสอบถามตอนเริ่มใช้ และวิธีสร้างเควสต์จากคำตอบ |

เนื้อหาเดียวกันแยกเป็นหน้า ๆ อ่านง่ายขึ้นอยู่ใน [Wiki](../../wiki) ถ้าสองที่ไม่ตรงกัน ให้ถือไฟล์ต้นฉบับเป็นหลัก

ตัวเลข XP ในเอกสารเป็นค่าที่ตั้งไว้ลองก่อน ยังไม่เคยทดสอบกับคนใช้จริง

### อยากช่วย

ตอนนี้ยังไม่มีโค้ดให้ส่ง PR แต่ช่วยได้หลายอย่าง

- อ่านเอกสารแล้วบอกว่าตรงไหนฟังแปลกหรือไม่สมเหตุสมผล
- ลองตอบแบบสอบถามแล้วบอกว่าข้อไหนรู้สึกอึดอัด
- เสนอเควสต์ประจำวันที่คิดว่าทำได้จริง

เปิด Issue ได้เลย

### ข้อควรรู้

Awakened ไม่ใช่เครื่องมือทางการแพทย์ ถ้ามีโรคประจำตัวหรืออาการผิดปกติ ควรถามหมอก่อนเริ่มออกกำลังกาย

### ไลเซนส์

ยังไม่ได้เลือก จะเพิ่มไฟล์ `LICENSE` ก่อนมีโค้ดชุดแรก

---

<a id="english"></a>
## English

A mobile app that brings RPG mechanics into everyday life. Work out, drink water, log meals, run focus timers, write a journal. Every action earns XP, builds your level, and moves you up through ranks.

### Current status

**Planning stage. There is no app code yet.** This repo contains design documents only, and the app itself will start being written soon. If you came looking for something to run and found nothing, you haven't missed anything. It doesn't exist yet.

📖 **The design docs are also split into browsable pages in the [Wiki](../../wiki)** (the Wiki is currently written in Thai).

### Why

Most health apps record numbers and then leave motivation entirely up to you, which doesn't work for many people. The usual failure is missing a single day, feeling like everything is ruined, and quitting.

Awakened tries to fix exactly that. If you rest or miss a day, the XP and levels you've built stay. A planned rest day counts as a day you followed your plan. There are no penalties.

### Core ideas

- **No deductions, no punishment.** XP, levels and stats never go down, no matter how long you've been away.
- **Daily quests adapt to the person.** An onboarding questionnaire asks about age, available time, equipment and what usually makes you quit, then builds quests that fit that person.
- **Your data stays on your device.** No account, no ads, and you can export or delete your data yourself.
- **Estimates are labelled as estimates.** For example, calories guessed from a food photo are always shown as approximate and always editable.
- **Tunable without touching code.** The XP and level formulas live in a config file.

### Planned features

| System | What it does |
|---|---|
| Dashboard | See your rank, level, XP, today's quests and consistency |
| Activity Log | Log water, meals, workouts, focus time and other activities on a timeline |
| Workout | Rep counter, timer, weekly training plan, history |
| Pomodoro | Focus timer that awards XP only when a round is actually completed |
| Quest | Daily, weekly, long-term and self-made quests |
| Rank | 8 tiers, from E to Monarch |
| Journal | Diary, mood log, calendar, weekly recap |
| Stats | STR, VIT, INT and WIL grow gradually as you complete quests |

Later features such as food photo scanning, home-screen widgets and camera-based exercise counting will only be built after the basics are working in real use.

### Roadmap

1. **Phase 1** Core system: activity logging, XP, levels, ranks, daily quests, streaks, text journal
2. **Phase 2** Weekly quests, personal plans, mood tracking, notifications, charts, food scanning
3. **Phase 3** Widgets, camera-based form checking, Monarch rank system

Each phase has to be usable in real daily life before the next one starts.

### Intended tools

All free and open source.

- Flutter and Dart
- SQLite via Drift
- Riverpod for state management
- fl_chart for charts

Android first. iOS can wait, since it needs a Mac and a paid developer account.

### Try it (once code exists)

This doesn't work yet. It's here as a plan.

```bash
git clone <repo-url>
cd awakened
flutter pub get
flutter run
```

You'll need the Flutter SDK installed, plus an Android phone connected or an emulator running.

### Documents in this repo

| File | Contents |
|---|---|
| `Awakened.md` | Full spec: XP and level formulas, database, roadmap, how to build the installable APK |
| `Awakened-Onboarding-Questionnaire.md` | The first-run questionnaire and how quests are generated from the answers |

Both documents are written in Thai. The same content is split into pages in the [Wiki](../../wiki). If the two ever disagree, the original files are the source of truth.

The XP numbers in the documents are starting values for experimentation and have not been tested with real users.

### How to help

There's no code to send a PR for yet, but there are still useful things you can do:

- Read the docs and point out anything that sounds odd or doesn't make sense
- Try the questionnaire and tell us which questions felt uncomfortable
- Suggest daily quests you think people could realistically do

Feel free to open an Issue.

### Good to know

Awakened is not a medical tool. If you have a health condition or any unusual symptoms, check with a doctor before starting an exercise routine.

### License

Not chosen yet. A `LICENSE` file will be added before the first code lands.
