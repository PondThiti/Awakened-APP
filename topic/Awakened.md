# Awakened — Life RPG
### เอกสาร Requirement และแผนพัฒนาแอปมือถือ (ฉบับละเอียด)

> **Tagline:** Your life is the game. Every day is a level up.
> **เวอร์ชันเอกสาร:** 0.1 (ร่างแรก)
> **แพลตฟอร์มเป้าหมาย:** Android ก่อน (ติดตั้งผ่านไฟล์ APK) และขยายไป iOS ภายหลัง
> **หลักการ:** ใช้เครื่องมือฟรีและโอเพนซอร์สทั้งหมด, ข้อมูลอยู่ในเครื่องผู้ใช้เป็นหลัก (Offline-first)

---

## สารบัญ
1. [ภาพรวมแอป](#1-ภาพรวมแอป)
2. [เป้าหมายและหลักการออกแบบ](#2-เป้าหมายและหลักการออกแบบ)
3. [ผู้ใช้เป้าหมายและสถานการณ์ใช้งาน](#3-ผู้ใช้เป้าหมายและสถานการณ์ใช้งาน)
4. [ข้อกำหนดทางเทคนิคและเครื่องมือฟรี](#4-ข้อกำหนดทางเทคนิคและเครื่องมือฟรี)
5. [โครงสร้างหน้าจอ (Navigation)](#5-โครงสร้างหน้าจอ-navigation)
6. [รายละเอียดฟีเจอร์ทีละระบบ](#6-รายละเอียดฟีเจอร์ทีละระบบ)
7. [สูตร XP / Level / Rank](#7-สูตร-xp--level--rank)
8. [ระบบ Quest ละเอียด](#8-ระบบ-quest-ละเอียด)
9. [Streak และ Weekly Consistency](#9-streak-และ-weekly-consistency)
10. [โครงสร้างฐานข้อมูล](#10-โครงสร้างฐานข้อมูล)
11. [สถาปัตยกรรมโค้ด](#11-สถาปัตยกรรมโค้ด)
12. [AI Food Scanner](#12-ai-food-scanner)
13. [การแจ้งเตือน, Widget, Celebration](#13-การแจ้งเตือน-widget-celebration)
14. [ความเป็นส่วนตัวและความปลอดภัย](#14-ความเป็นส่วนตัวและความปลอดภัย)
15. [UI/UX Guideline](#15-uiux-guideline)
16. [แผนการพัฒนาเป็นระยะ (Roadmap)](#16-แผนการพัฒนาเป็นระยะ-roadmap)
17. [วิธีสร้างและติดตั้งลงมือถือ](#17-วิธีสร้างและติดตั้งลงมือถือ)
18. [แผนการทดสอบ](#18-แผนการทดสอบ)
19. [ไลเซนส์และเครดิต](#19-ไลเซนส์และเครดิต)
20. [ความเสี่ยงและข้อควรระวัง](#20-ความเสี่ยงและข้อควรระวัง)
21. [Checklist เริ่มงาน](#21-checklist-เริ่มงาน)
22. [ภาคผนวก](#22-ภาคผนวก)

---

## 1. ภาพรวมแอป

**Awakened** คือแอปดูแลสุขภาพและพัฒนาตัวเองที่นำระบบ RPG มาผสมกับชีวิตประจำวัน ผู้ใช้บันทึกการกิน ดื่มน้ำ ออกกำลังกาย โฟกัส (Pomodoro) และเขียนบันทึกอารมณ์ ทุกกิจกรรมแปลงเป็น **XP** เพื่อเพิ่ม **Level** และเลื่อน **Rank**

แนวคิดสำคัญ:
- ความก้าวหน้ามาจาก **ความสม่ำเสมอ** ไม่ใช่ความสมบูรณ์แบบ
- **ไม่ลงโทษ**: XP และเลเวลที่สะสมแล้วจะไม่ถูกหัก
- **วันพักเป็นส่วนหนึ่งของแผน** ไม่บังคับให้ฝืนออกกำลังกาย
- ข้อมูลส่วนตัวอยู่ในเครื่อง ผู้ใช้ควบคุมได้เต็มที่

> **หมายเหตุเรื่องชื่อ:** เมื่อชื่อแอปคือ "Awakened" แล้ว ชื่อ Rank ระดับ E เดิมคือ "E – Awakened" จะซ้ำกับชื่อแอป
> เอกสารนี้จึงเสนอให้เปลี่ยนชื่อ Rank E เป็น **"E – Dormant" (ผู้หลับใหล)** ซึ่งสื่อว่าผู้ใช้เพิ่งเริ่มต้น และการ "ตื่น" คือการเดินทางของแอป
> (ปรับกลับได้ตามต้องการ ชื่อ Rank อยู่ในไฟล์ config ไม่ได้ผูกกับโค้ด)

---

## 2. เป้าหมายและหลักการออกแบบ

### 2.1 เป้าหมาย
1. บันทึกและติดตามพฤติกรรมสุขภาพในแอปเดียว
2. สร้างนิสัยที่ดีผ่านภารกิจและรางวัล
3. ทำให้การดูแลตัวเองสนุกขึ้น
4. ช่วยให้ผู้ใช้เข้าใจพฤติกรรมและความก้าวหน้าของตนเอง
5. สร้างแรงจูงใจระยะยาวผ่าน Level, Rank, XP และ Streak

### 2.2 หลักการออกแบบ (ห้ามละเมิด)
| # | หลักการ | ความหมายเชิงระบบ |
|---|---|---|
| P1 | ไม่ลงโทษ | ห้ามมีฟังก์ชันที่ลด XP/Level ของผู้ใช้ |
| P2 | ยืดหยุ่น | เป้าหมายและแผนทุกอย่างปรับได้ |
| P3 | โปร่งใส | ค่าประมาณ (เช่น แคลอรีจากภาพ) ต้องแสดงว่าเป็นค่าประมาณ |
| P4 | ส่วนตัว | ข้อมูลอยู่ในเครื่อง ลบ/ส่งออกได้ครบ |
| P5 | ไม่ส่งเสริมพฤติกรรมเสี่ยง | ไม่ให้รางวัลกับการกินน้อยที่สุด/ออกกำลังกายหนักที่สุด |
| P6 | แยก Logic ออกจาก UI | สูตร XP อยู่ในไฟล์ config และโมดูลแยก ปรับสมดุลได้ภายหลัง |
| P7 | เริ่มง่ายก่อน | Phase 1 ต้องใช้งานได้จริงก่อนเพิ่มของซับซ้อน |
| P8 | Rank ไม่ใช่การจัดอันดับสุขภาพ | ห้ามตีความว่าแรงค์สูง = ร่างกายดีกว่าคนอื่น |

### 2.3 สิ่งที่ "ไม่ทำ" (Non-goals)
- ไม่ทำระบบแข่งขัน/ลีดเดอร์บอร์ดเปรียบเทียบสุขภาพระหว่างผู้ใช้
- ไม่วินิจฉัยโรค ไม่วินิจฉัยอารมณ์ ไม่ให้คำแนะนำทางการแพทย์
- ไม่ตั้งเป้าแคลอรีต่ำสุดเป็นเป้าหมายของเกม
- ไม่มีโฆษณา ไม่ขายข้อมูล
- ไม่บังคับสร้างบัญชีออนไลน์ใน Phase 1

---

## 3. ผู้ใช้เป้าหมายและสถานการณ์ใช้งาน

### 3.1 กลุ่มผู้ใช้
- ผู้ที่อยากสร้างนิสัยสุขภาพแต่ขาดแรงจูงใจ
- ผู้ที่ชอบเกม RPG/ระบบเลเวล
- นักเรียน/ผู้ทำงานที่ใช้ Pomodoro อยู่แล้ว
- ผู้ที่ไม่ชอบแอปที่กดดันหรือทำให้รู้สึกผิด

### 3.2 สถานการณ์ตัวอย่าง (User Stories)
| ID | ในฐานะผู้ใช้ ฉันต้องการ... | เพื่อ... |
|---|---|---|
| U1 | กดปุ่มเดียวเพื่อบันทึกน้ำ 250 มล. | บันทึกได้เร็ว ไม่รำคาญ |
| U2 | เห็น XP เพิ่มทันทีหลังบันทึกกิจกรรม | รู้สึกได้รับรางวัลทันที |
| U3 | ตั้งวันพักในตารางออกกำลังกาย | พักโดยไม่รู้สึกผิดและยังได้ความต่อเนื่อง |
| U4 | จับเวลา Pomodoro พร้อมตั้งชื่อสิ่งที่ทำ | ติดตามเวลาโฟกัสของตนเอง |
| U5 | เขียนไดอารี่และเลือกอารมณ์ | ทบทวนตัวเองย้อนหลัง |
| U6 | สร้าง Personal Quest เอง เช่น "อ่านหนังสือ 20 นาที" | ปรับแอปให้เข้ากับชีวิต |
| U7 | เห็น Widget บนหน้าจอหลัก | ไม่ต้องเปิดแอปทุกครั้ง |
| U8 | ปิดเสียง/แอนิเมชันทั้งหมดได้ | ใช้ในที่เรียน/ที่ทำงานได้ |
| U9 | ส่งออก/ลบข้อมูลทั้งหมด | ควบคุมข้อมูลของตัวเอง |
| U10 | ถ่ายรูปอาหารแล้วแก้ค่าที่ AI ประมาณได้ | บันทึกอาหารสะดวกแต่ยังแม่นตามที่ฉันยืนยัน |

---

## 4. ข้อกำหนดทางเทคนิคและเครื่องมือฟรี

### 4.1 ข้อกำหนดขั้นต่ำ
- Android 8.0 (API 26) ขึ้นไป
- ทำงานได้ **ออฟไลน์ 100%** ใน Phase 1
- ขนาดแอปเป้าหมาย < 50 MB (ไม่รวมโมเดล AI)
- รองรับภาษาไทยและอังกฤษ (i18n ตั้งแต่เริ่ม)
- รองรับ Dark/Light mode

### 4.2 Tech Stack (ฟรี/โอเพนซอร์สทั้งหมด)

| ส่วน | เครื่องมือ | ไลเซนส์ | หน้าที่ |
|---|---|---|---|
| Framework | **Flutter** + Dart | BSD-3 | แอปข้ามแพลตฟอร์ม |
| ฐานข้อมูล | **SQLite** + **Drift** | MIT | เก็บข้อมูลในเครื่อง |
| State | **Riverpod** | MIT | จัดการสถานะ |
| Routing | **go_router** | BSD-3 | นำทางหน้าจอ |
| กราฟ | **fl_chart** | MIT | กราฟประวัติ |
| แจ้งเตือน | **flutter_local_notifications** | BSD-3 | เตือนในเครื่อง |
| งานเบื้องหลัง | **workmanager** | MIT | รีเซ็ตเควสต์/เตือน |
| Widget | **home_widget** | BSD-3 | Home Screen Widget |
| แอนิเมชัน | **lottie** / **rive** | MIT | Celebration |
| เสียง | **just_audio** | MIT | เอฟเฟกต์เสียง |
| กล้อง/รูป | **image_picker**, **camera** | BSD-3 | ถ่ายรูปอาหาร/แนบรูป |
| ไฟล์ | **path_provider**, **file_picker**, **share_plus** | BSD/MIT | Export/Import |
| i18n | **intl** + ARB files | BSD-3 | หลายภาษา |
| Test | **flutter_test**, **mocktail** | BSD/MIT | ทดสอบ |

**ทางเลือกอื่น:** React Native + Expo (MIT) ถ้าถนัด JavaScript/TypeScript โครงสร้างฐานข้อมูลและสูตรในเอกสารนี้ใช้ได้เหมือนกัน

### 4.3 เครื่องมือพัฒนา
- **VS Code / VSCodium**, **Android Studio** (ฟรี)
- **Git** + GitHub/Forgejo/GitLab
- **GitHub Actions** (ฟรีสำหรับ repo สาธารณะ) สำหรับ build APK อัตโนมัติ
- **Penpot** (MPL) ออกแบบ wireframe, **Inkscape/Krita** ทำกราฟิก

### 4.4 โครงสร้างโฟลเดอร์โปรเจกต์

```
awakened/
├── lib/
│   ├── main.dart
│   ├── app/                  # theme, router, constants
│   ├── core/
│   │   ├── engine/           # XP engine, quest engine, streak engine (Pure Dart)
│   │   ├── config/           # xp_config.json, ranks.json, quests.json
│   │   └── utils/
│   ├── data/
│   │   ├── database/         # Drift tables, DAOs
│   │   └── repositories/
│   ├── features/
│   │   ├── home/
│   │   ├── track/            # น้ำ, อาหาร, กิจกรรม
│   │   ├── train/            # workout, pomodoro
│   │   ├── journey/          # journal, mood, calendar, recap
│   │   ├── quests/
│   │   └── profile/
│   ├── services/             # notifications, widget, audio, export
│   └── l10n/                 # th.arb, en.arb
├── assets/
│   ├── config/
│   ├── lottie/
│   ├── sounds/
│   └── fonts/
├── test/
└── docs/
```

---

## 5. โครงสร้างหน้าจอ (Navigation)

แถบนำทางด้านล่าง 5 แท็บ:

| แท็บ | ชื่อ | เนื้อหา |
|---|---|---|
| 1 | **Home** | Dashboard, Rank/Level/XP, Daily Quest, ปุ่มเพิ่มกิจกรรมด่วน |
| 2 | **Track** | บันทึกอาหาร น้ำ กิจกรรมอื่น ๆ, Timeline |
| 3 | **Train** | Rep Counter, Workout Timer, Training Plan, History, Pomodoro |
| 4 | **Journey** | Journal, Mood, Calendar, Recap |
| 5 | **Profile** | Rank, เหรียญตรา, แผนส่วนตัว, ตั้งค่า |

### 5.1 แผนผังหน้าจอย่อย
```
Home
 ├─ Dashboard (การ์ดปรับแต่งได้)
 ├─ Daily Quest list
 └─ Quick Add (FAB): น้ำ / อาหาร / ออกกำลังกาย / Pomodoro / Journal

Track
 ├─ Water (ปุ่มปริมาณ + กราฟวัน)
 ├─ Food (มื้อเช้า/กลางวัน/เย็น/ของว่าง) ──> Add Food (manual / scan)
 ├─ Other Activity (กิจกรรมกำหนดเอง)
 └─ Timeline (ตัวกรอง/แก้ไข/ลบ)

Train
 ├─ Rep Counter
 ├─ Workout Timer
 ├─ Training Plan (ตารางสัปดาห์)
 ├─ Training History (กราฟ)
 └─ Pomodoro (Focus/Break/History)

Journey
 ├─ Daily Journal (เขียน/ค้นหา/หมวดหมู่)
 ├─ Mood Tracker
 ├─ Calendar View
 └─ Journey Recap (สัปดาห์/เดือน)

Profile
 ├─ Rank & Level card
 ├─ Achievements / Badges
 ├─ Personal Plan
 ├─ Quest Manager (Personal Quest)
 └─ Settings (ภาษา ธีม เสียง การแจ้งเตือน ข้อมูล/ความเป็นส่วนตัว)
```

---

## 6. รายละเอียดฟีเจอร์ทีละระบบ

### 6.1 Dashboard (Home)
**การ์ดที่แสดง (เปิด/ปิด/เรียงลำดับได้):**
- Rank + Level + แถบ XP (`XP ปัจจุบัน / XP ที่ต้องใช้`)
- Daily Quest (สำเร็จ X จาก Y)
- Streak และ Weekly Consistency
- น้ำวันนี้ (มล. / เป้าหมาย)
- อาหารวันนี้ (สรุปคร่าว ๆ เป็นค่าประมาณ)
- เวลาออกกำลังกายวันนี้
- เวลาโฟกัสวันนี้
- ปุ่ม Quick Add

**พฤติกรรม:** แตะการ์ดเพื่อเข้าหน้ารายละเอียด, ดึงลงเพื่อรีเฟรช, ข้อมูลอัปเดตแบบ real-time จากฐานข้อมูล

**Acceptance Criteria**
- [ ] แสดงผลภายใน 1 วินาทีหลังเปิดแอป
- [ ] ปรับแต่งการ์ดแล้วจำค่าไว้
- [ ] แถบ XP แสดงตัวเลขตรงกับฐานข้อมูลเสมอ

### 6.2 Activity Log
ศูนย์กลางเก็บกิจกรรมทุกประเภทเป็น **Timeline** เรียงตามเวลา

| ประเภท | ข้อมูลที่บันทึก |
|---|---|
| `water` | ปริมาณ (มล.), เวลา |
| `meal` | มื้อ, รายการอาหาร, ปริมาณ, แคลอรี/สารอาหารโดยประมาณ, รูป (ถ้ามี), เวลา |
| `workout` | ประเภท, ระยะเวลา, เซต/ครั้ง, ระยะทาง, ความรู้สึกหลังฝึก (1–5), หมายเหตุ |
| `focus` | ชื่องาน, จำนวนรอบ, เวลารวม |
| `custom` | ชื่อกิจกรรม, ระยะเวลา/ค่า, หมายเหตุ (เช่น อ่านหนังสือ ยืดเหยียด เดิน นอนพัก) |

**ฟังก์ชัน:** กรองตามประเภท/ช่วงวัน, แก้ไข, ลบ (ลบแล้วระบบต้องคำนวณ XP ที่เกี่ยวข้องให้ถูกต้อง, ดูหัวข้อ 7.6)

### 6.3 การดื่มน้ำ
- ปุ่มลัด: 100 / 150 / 250 / 500 มล. + กำหนดเอง
- เป้าหมายรายวัน: ผู้ใช้ตั้งเอง (ค่าเริ่มต้นแนะนำ 2,000 มล. ปรับได้ แอปไม่อ้างว่าเป็นค่าที่เหมาะสมทางการแพทย์สำหรับทุกคน)
- แสดงแถบความคืบหน้า + ประวัติย้อนหลัง
- ไม่เตือนถี่เกินไป (ตั้งช่วงเวลาและความถี่ได้)

### 6.4 การบันทึกอาหาร
**Phase 1 (Manual):** เพิ่มชื่ออาหาร, เลือกมื้อ, ใส่ปริมาณ/แคลอรี/โปรตีน/คาร์บ/ไขมัน (ไม่บังคับ), แนบรูป
**Phase 2:** AI Food Scanner (ดูหัวข้อ 12)

**กติกาสำคัญ:**
- XP ให้เมื่อ "บันทึก" ไม่ใช่เมื่อกินน้อยหรือมาก
- ไม่มีเป้าหมายแคลอรี "ต่ำสุด" ที่ให้รางวัล
- เป้าหมายแคลอรี (ถ้าผู้ใช้เลือกตั้งเอง) เป็นข้อมูลอ้างอิงส่วนตัว ไม่ผูกกับ XP
- ค่าที่ไม่ได้ผู้ใช้ป้อนเอง ต้องมีป้าย "ค่าประมาณ"

### 6.5 Workout Counter

**Rep Counter**
- เลือกท่า (มีรายการเริ่มต้น: Squat, Push-up, Sit-up, Plank ฯลฯ + เพิ่มเองได้)
- ปุ่ม +1 / −1 / +5, ปุ่มเสร็จเซต, ตัวจับเวลาพักระหว่างเซต
- บันทึก: ท่า, ครั้งต่อเซต, จำนวนเซต, เวลาพัก, วันเวลา, หมายเหตุ
- ขณะใช้งาน: หน้าจอไม่ดับ (wakelock) และรองรับปุ่มเสียง (ถ้าทำได้) เพื่อนับสะดวก

**Workout Timer**
- ประเภท: เดิน, วิ่ง, ปั่น, ยืดเหยียด, อื่น ๆ
- สถานะ: เริ่ม / พัก / ต่อ / จบ (บันทึกเวลารวมอัตโนมัติ)
- ทำงานต่อเมื่อพับหน้าจอ (Foreground service + แจ้งเตือนค้าง)
- ถ้าแอปถูกปิดกลางคัน ให้กู้คืนเวลาจาก timestamp ที่บันทึกไว้

**Training Plan**
- จัดตารางรายสัปดาห์ เลือกประเภทของแต่ละวัน: ส่วนบน / ส่วนล่าง / เต็มตัว / คาร์ดิโอ / ยืดเหยียด / **พัก (Rest)**
- วัน Rest นับเป็นวัน "ทำตามแผนสำเร็จ"
- แม่แบบเริ่มต้น 3 แบบ (เบา/กลาง/อิสระ) แก้ไขได้ทั้งหมด

**Training History**
- สถิติ: จำนวนครั้งฝึก, เวลารวม, จำนวนเซต ต่อสัปดาห์/เดือน
- กราฟแนวโน้ม (fl_chart)

**อนาคต:** ตรวจจับท่าทางด้วยกล้อง (MediaPipe Pose) เป็น Phase 3

### 6.6 Pomodoro
- ค่าเริ่มต้น: Focus 25 นาที / Short Break 5 นาที / Long Break 15 นาที / พักยาวทุก 4 รอบ (ปรับได้ทุกค่า)
- ตั้งชื่อสิ่งที่ทำต่อรอบ
- เริ่ม / พัก / ต่อ / ยกเลิก / จบรอบ
- **XP ให้เมื่อจบรอบตามเวลาที่ตั้งไว้เท่านั้น** (ยกเลิกกลางคัน = ไม่ได้ XP แต่ไม่หักอะไร)
- ทำงานเบื้องหลังได้ แจ้งเตือนเมื่อครบเวลา
- ป้องกันการ "เปิดทิ้งไว้": ต้องกดยืนยันจบรอบ หรือจบอัตโนมัติเมื่อครบเวลาจริงตามนาฬิกา (ใช้เวลาจาก timestamp ไม่ใช่นับถอยหลังในหน่วยความจำ)
- ประวัติรายวัน/รายสัปดาห์ + เป้าหมายโฟกัสที่ตั้งเอง

### 6.7 Journal และ Mood
**Daily Journal:** เขียน/แก้ไข/ลบ, หมวดหมู่, ค้นหา (ข้อความ/วันที่), แนบรูป (Phase 3)
**Mood Tracker:** เลือกอารมณ์ (ชุดอีโมจิ 5–8 ระดับ), คำอธิบายสั้น, แท็ก (เช่น งาน เรียน นอน ออกกำลัง), เวลา
**Calendar View:** ปฏิทินแสดงจุดสีว่าวันไหนมีบันทึก/อารมณ์
**Journey Recap (รายสัปดาห์/เดือน):** จำนวนกิจกรรม, ความต่อเนื่อง, เวลาโฟกัส, การกระจายอารมณ์ที่ผู้ใช้เลือก

> ข้อห้าม: Recap **ห้าม** วินิจฉัยอารมณ์หรือสรุปสาเหตุของความรู้สึกโดยไม่มีข้อมูลเพียงพอ ใช้ถ้อยคำเชิงบรรยาย เช่น "สัปดาห์นี้คุณเลือกอารมณ์ 'สงบ' 4 ครั้ง" ไม่ใช่ "คุณเครียดเพราะงาน"

### 6.8 Adaptive Personal Plan
ข้อมูลนำเข้า: เป้าหมายที่เลือก, ประสบการณ์, กิจกรรมที่ชอบ, เวลาว่าง, ตารางเรียน/งาน, ประวัติการฝึก, ความพร้อมที่ผู้ใช้ระบุ, วันพัก

**Phase 2 ใช้ระบบกฎ (Rule-based) ไม่ใช้ AI:**
| เงื่อนไข | ข้อเสนอของระบบ |
|---|---|
| เวลาว่าง < 20 นาที/วัน | เสนอกิจกรรมสั้น (10 นาที) แทนกิจกรรมยาว |
| ผู้ใช้กด "วันนี้ขอพัก" | เปลี่ยน Daily Quest เป็นชุด Recovery (ยืดเหยียด/ดื่มน้ำ/เขียนไดอารี่) |
| ทำตามแผนไม่ได้ 2 สัปดาห์ติด | เสนอ "ลดเป้าหมาย" (ผู้ใช้กดยอมรับเอง) โดยไม่หัก XP |
| ทำเกินเป้าหมาย 3 สัปดาห์ติด | เสนอ "เพิ่มเป้าหมาย" (ผู้ใช้เลือกเอง) |

หลักการ: ระบบ **เสนอ** เท่านั้น ผู้ใช้เป็นคนตัดสินใจเสมอ และข้อความต้องไม่ทำให้รู้สึกผิด

### 6.9 Celebration
| ระดับ | เหตุการณ์ | รูปแบบ |
|---|---|---|
| 1 | Quest Complete | Toast/การ์ดเล็ก + "+XP" |
| 2 | Level Up | หน้าจอเต็ม สั้น ๆ + เลเวลใหม่ |
| 3 | Rank Promotion | แอนิเมชันเต็มรูปแบบ + ฉายาใหม่ |
| 4 | Milestone Achievement | การ์ดเหรียญตรา + บันทึกลงโปรไฟล์ |

**ตั้งค่าได้:** ปิดเสียง, ลดเอฟเฟกต์, ปิดแอนิเมชัน (เคารพการตั้งค่า "Reduce motion" ของระบบด้วย)

### 6.10 Home Screen Widget (Phase 3)
- Daily Status: Quest ที่สำเร็จ, XP วันนี้
- Rank Widget: Rank, Level, XP ที่เหลือ
- Focus Widget: สถานะ Pomodoro + ทางลัด
- Activity Widget: ปริมาณน้ำ/ความคืบหน้าที่ผู้ใช้เลือก
- **อัปเดตเมื่อมีเหตุการณ์ (บันทึกกิจกรรม)** และตามรอบของระบบ ไม่อัปเดตทุกวินาที

---

## 7. สูตร XP / Level / Rank

> ค่าทั้งหมดในหัวข้อนี้เป็น **ค่าเริ่มต้นสำหรับทดลอง** เก็บใน `xp_config.json` ปรับได้โดยไม่ต้องแก้โค้ด และควรปรับสมดุลหลังใช้งานจริง 1–2 สัปดาห์

### 7.1 XP ที่ได้ต่อกิจกรรม

| กิจกรรม | XP | เงื่อนไข / เพดานต่อวัน |
|---|---|---|
| บันทึกน้ำ 1 ครั้ง | 2 | สูงสุด 5 ครั้ง/วัน (10 XP) |
| ดื่มน้ำถึงเป้าหมายส่วนตัว | 20 | วันละครั้ง |
| บันทึกอาหาร 1 มื้อ | 8 | สูงสุด 4 มื้อ/วัน (32 XP) |
| ออกกำลังกาย (พื้นฐาน) | 30 | ต่อ session, สูงสุด 2 session/วัน |
| ออกกำลังกาย (ตามเวลา) | +1 ต่อ 2 นาที | สูงสุด +15 ต่อ session |
| บันทึก Rep/Set ครบแผน | +10 | เมื่อทำครบตามแผนที่ตั้งไว้ |
| Pomodoro 1 รอบสำเร็จ | 15 | สูงสุด 8 รอบ/วัน (120 XP) |
| เขียนไดอารี่ (≥ 20 ตัวอักษร) | 15 | วันละครั้ง |
| บันทึกอารมณ์ | 5 | วันละ 1–2 ครั้ง |
| กิจกรรมกำหนดเอง | 5–20 | ผู้ใช้เลือกระดับ (เบา/กลาง/หนัก) เพดาน 3 ครั้ง/วัน |
| Rest Day Check-in (วันพักตามแผน) | 25 | วันละครั้ง ไม่ต้องออกกำลังกายเพื่อรับ |

### 7.2 โบนัส Quest
| Quest | XP |
|---|---|
| Daily Quest แต่ละข้อ | 10–40 (ตามความยาก) |
| ครบ Daily Quest ทุกข้อ | +30 |
| Weekly Quest แต่ละข้อ | 100–200 |
| Milestone Quest | 300–1,500 |
| Personal Quest | ผู้ใช้เลือกจากระดับ: 10 / 25 / 50 XP |

### 7.3 เพดาน XP รายวัน (กันฟาร์ม)
- **Soft Cap:** 300 XP/วัน จากกิจกรรมซ้ำ ๆ ทั่วไป
- หลังเกิน Soft Cap ได้ XP ที่ **25%** ของค่าปกติ (ไม่ใช่ศูนย์ เพื่อไม่ให้รู้สึกว่าเสียเปล่า)
- XP จาก **Quest และ Milestone ไม่นับรวมใน Soft Cap**
- กฎกันซ้ำ: กิจกรรมประเภทเดียวกันที่บันทึกห่างกัน < 2 นาที นับเป็นรายการเดียวสำหรับ XP

### 7.4 สูตรเลเวล

```
XP ที่ต้องใช้จากเลเวล L ไปเลเวล L+1:
    xp_to_next(L) = 100 + 20 × (L − 1)

XP สะสมที่ต้องมีเพื่อ "เริ่ม" เลเวล N:
    total_xp(N) = 100 × (N − 1) + 10 × (N − 1) × (N − 2)
```

ตัวอย่าง:
| เลเวล | XP ที่ต้องใช้ไปเลเวลถัดไป |
|---|---|
| 1 | 100 |
| 5 | 180 |
| 10 | 280 |
| 25 | 580 |
| 50 | 1,080 |
| 100 | 2,080 |
| 220 | 4,480 |

**Pseudo-code**
```dart
int xpToNext(int level) => 100 + 20 * (level - 1);

LevelResult applyXp(int currentLevel, int currentXpInLevel, int gained) {
  var level = currentLevel;
  var xp = currentXpInLevel + gained;
  while (xp >= xpToNext(level)) {
    xp -= xpToNext(level);
    level += 1;
  }
  return LevelResult(level: level, xpInLevel: xp);
}
```
> เก็บ **XP สะสมรวม (total_xp)** ในฐานข้อมูลเป็นแหล่งความจริงเดียว แล้วคำนวณ Level/XP ในเลเวลจากค่านี้ เพื่อให้แก้สูตรภายหลังได้โดยไม่ทำข้อมูลเพี้ยน

### 7.5 Rank

| ลำดับ | Rank | ช่วงเลเวล | XP สะสมเมื่อเริ่ม Rank | ฉายา (ตัวอย่าง) |
|---|---|---|---|---|
| 1 | **E – Dormant** | 1–10 | 0 | ผู้หลับใหล |
| 2 | **D – Novice** | 11–25 | 1,900 | ผู้เริ่มก้าวเดิน |
| 3 | **C – Fighter** | 26–45 | 8,500 | ผู้ฝ่าฟัน |
| 4 | **B – Elite** | 46–70 | 24,300 | ผู้แข็งแกร่ง |
| 5 | **A – Master** | 71–100 | 55,300 | ผู้เชี่ยวชาญ |
| 6 | **S – Champion** | 101–150 | 109,000 | ผู้พิชิต |
| 7 | **SS – National Level** | 151–220 | 238,500 | ผู้เป็นตำนาน |
| 8 | **Monarch** | 221+ | 503,800 | จักรพรรดิแห่งนิสัย |

**ประมาณระยะเวลา** (ถ้าได้ ~200 XP/วัน เฉลี่ย): E ≈ 10 วัน, ถึง D ≈ 1 เดือนกว่า, ถึง C ≈ 4 เดือน, ถึง B ≈ 8 เดือน … เป็นเป้าหมายระยะยาวจริง ๆ (ค่านี้เป็นเพียงการประมาณ ต้องปรับตามข้อมูลการใช้งานจริง)

**เงื่อนไขพิเศษ Monarch:** นอกจากถึง Lv 221 ต้องทำ Milestone Quest ที่กำหนดครบ เช่น ใช้ต่อเนื่อง 365 วัน (ไม่จำเป็นต้องติดกัน), ปลดล็อกเหรียญตราจาก ≥ 4 หมวด

**รางวัลจาก Rank:** ฉายา, กรอบโปรไฟล์, เหรียญตรา, ธีมสี, แอนิเมชันเลื่อนแรงค์, Quest พิเศษ, บันทึกในประวัติ

### 7.6 กฎการแก้ไข/ลบกิจกรรมกับ XP
- ลบกิจกรรมที่เพิ่งบันทึกผิด (ภายใน 10 นาที): ยกเลิก XP ของรายการนั้นได้
- แก้ไขหรือลบ **ย้อนหลังนานกว่านั้น**: ข้อมูลใน Timeline เปลี่ยน แต่ **XP ที่ได้ไปแล้วไม่ถูกหัก** (ตามหลักไม่ลงโทษ)
- ป้องกันการเพิ่มกิจกรรมย้อนหลังไปฟาร์ม: กิจกรรมที่เพิ่มย้อนหลัง > 24 ชม. ได้ XP 50% และไม่นับ Streak

### 7.7 โครงสร้าง `xp_config.json` (ตัวอย่าง)
```json
{
  "version": 1,
  "daily_soft_cap": 300,
  "over_cap_multiplier": 0.25,
  "level_formula": { "base": 100, "per_level": 20 },
  "activities": {
    "water_log":   { "xp": 2,  "max_per_day": 5 },
    "water_goal":  { "xp": 20, "max_per_day": 1 },
    "meal_log":    { "xp": 8,  "max_per_day": 4 },
    "workout":     { "xp": 30, "max_per_day": 2, "bonus_per_2min": 1, "bonus_cap": 15 },
    "pomodoro":    { "xp": 15, "max_per_day": 8 },
    "journal":     { "xp": 15, "max_per_day": 1, "min_chars": 20 },
    "mood":        { "xp": 5,  "max_per_day": 2 },
    "rest_checkin":{ "xp": 25, "max_per_day": 1 },
    "custom_light":{ "xp": 5,  "max_per_day": 3 },
    "custom_mid":  { "xp": 10, "max_per_day": 3 },
    "custom_hard": { "xp": 20, "max_per_day": 3 }
  },
  "ranks": [
    { "id": "E",  "name": "Dormant",        "min_level": 1   },
    { "id": "D",  "name": "Novice",         "min_level": 11  },
    { "id": "C",  "name": "Fighter",        "min_level": 26  },
    { "id": "B",  "name": "Elite",          "min_level": 46  },
    { "id": "A",  "name": "Master",         "min_level": 71  },
    { "id": "S",  "name": "Champion",       "min_level": 101 },
    { "id": "SS", "name": "National Level", "min_level": 151 },
    { "id": "M",  "name": "Monarch",        "min_level": 221 }
  ]
}
```

---

## 8. ระบบ Quest ละเอียด

### 8.1 ประเภท
| ประเภท | รอบ | ตัวอย่าง |
|---|---|---|
| Daily | รีเซ็ตเที่ยงคืนตามเวลาเครื่อง | ดื่มน้ำถึงเป้า, Pomodoro 1 รอบ, บันทึกอาหาร, เขียนไดอารี่, ออกกำลังกายตามแผน |
| Weekly | จันทร์–อาทิตย์ (ตั้งวันเริ่มได้) | ทำตามแผน ≥ 4 วัน, โฟกัสรวม ≥ 150 นาที, เขียนไดอารี่ ≥ 3 วัน |
| Milestone | ถาวร | บันทึกกิจกรรมครบ 30 ครั้ง, ทำ Weekly Quest ครบ 4 สัปดาห์, ใช้งาน 100 วัน |
| Personal | ผู้ใช้กำหนด | "อ่านหนังสือวันละ 20 นาที" |

### 8.2 การเลือก Daily Quest ในแต่ละวัน
1. จัดชุดจาก "คลังเควสต์" (`quests.json`) โดยสุ่มแบบถ่วงน้ำหนักให้ **ครอบคลุมหลายหมวด** (สุขภาพ / โฟกัส / จิตใจ)
2. ถ้าวันนี้เป็น **วันพัก** ตามแผน → ใช้ชุด Recovery
3. ไม่ซ้ำกับเมื่อวานเกินครึ่ง
4. จำนวนต่อวัน: 3–5 ข้อ (ตั้งค่าได้)
5. ผู้ใช้ **สลับ/ข้าม** เควสต์ได้ 1 ครั้ง/วัน โดยไม่เสียอะไร

### 8.3 โครงสร้าง Quest (JSON)
```json
{
  "id": "daily_water_goal",
  "type": "daily",
  "category": "health",
  "title_th": "ดื่มน้ำตามเป้าหมาย",
  "title_en": "Hit your water goal",
  "condition": { "metric": "water_ml", "op": ">=", "target": "user_goal" },
  "reward_xp": 20,
  "tags": ["water", "easy"]
}
```

### 8.4 Personal Quest
ช่องกรอก: ชื่อ, รายละเอียด, ความถี่ (รายวัน/กี่วันต่อสัปดาห์), เงื่อนไขสำเร็จ (ติ๊กเอง / ตามเวลา / ตามจำนวน), ระดับ XP (10/25/50), วันที่เริ่ม-สิ้นสุด (ไม่บังคับ)
ข้อจำกัด: Personal Quest นับ XP รวมไม่เกิน 50 XP/วัน (กันตั้งรางวัลเกินจริง)

### 8.5 สถานะ Quest
`available → in_progress → completed` และ `skipped` / `expired` (หมดอายุไม่มีการหัก XP)

---

## 9. Streak และ Weekly Consistency

### 9.1 นิยาม "วันที่นับ"
วันหนึ่งนับเป็นวัน active เมื่อทำอย่างน้อยหนึ่งใน:
- ทำ Daily Quest ≥ 1 ข้อ
- บันทึกกิจกรรมใด ๆ ≥ 1 รายการ
- Rest Day Check-in (วันพักที่วางแผนไว้)

### 9.2 Streak รายวัน
- นับวัน active ติดต่อกัน
- **Streak Freeze:** ได้ 1 โทเคนต่อสัปดาห์ (สะสมสูงสุด 2) ใช้ปกป้องวันที่ขาด **ใช้อัตโนมัติ** เมื่อพลาด 1 วัน
- วันพักตามแผนไม่ทำให้ Streak ขาด
- Streak ขาด = ตัวเลข Streak กลับเป็น 0 **เท่านั้น** ไม่กระทบ XP/Level/Rank
- เก็บ "Streak ที่ยาวที่สุด" ไว้ในโปรไฟล์เสมอ

### 9.3 Weekly Consistency
- ผู้ใช้ตั้งเป้า เช่น "ทำกิจกรรมตามแผน 4 วันต่อสัปดาห์"
- แสดงเป็นวงกลม/แถบ (เช่น 3/4 วัน)
- ครบเป้าสัปดาห์ = ได้ XP โบนัส และนับต่อเนื่องเป็น "Weekly Streak" (ไม่ต้องทำทุกวัน)

### 9.4 ข้อความเมื่อพลาด (ตัวอย่าง Tone)
- ✅ "ไม่เป็นไร พรุ่งนี้เริ่มใหม่ได้เลย XP และเลเวลของคุณยังอยู่ครบ"
- ❌ "คุณทำ Streak หาย!" / "คุณล้มเหลว"

---

## 10. โครงสร้างฐานข้อมูล

ใช้ SQLite (ผ่าน Drift) เก็บเวลาเป็น **UTC epoch (มิลลิวินาที)** และเก็บ `tz_offset_min` ไว้ใช้แสดงผลตามวันท้องถิ่น

### 10.1 ER ภาพรวม
```
user_profile 1──* xp_event
user_profile 1──* activity ──(0..1)── meal_detail / workout_detail / focus_detail
user_profile 1──* quest_instance *──1 quest_template
user_profile 1──* journal_entry ──* mood_entry (optional link)
user_profile 1──* training_plan_day
user_profile 1──* achievement_unlock *──1 achievement
user_profile 1──* streak_log
```

### 10.2 ตาราง (SQL อ้างอิง)

```sql
-- โปรไฟล์ (มีแถวเดียวใน Phase 1)
CREATE TABLE user_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  display_name TEXT NOT NULL DEFAULT 'Player',
  total_xp INTEGER NOT NULL DEFAULT 0,
  water_goal_ml INTEGER NOT NULL DEFAULT 2000,
  weekly_goal_days INTEGER NOT NULL DEFAULT 4,
  week_start_day INTEGER NOT NULL DEFAULT 1,      -- 1=จันทร์
  longest_streak INTEGER NOT NULL DEFAULT 0,
  freeze_tokens INTEGER NOT NULL DEFAULT 1,
  language TEXT NOT NULL DEFAULT 'th',
  theme TEXT NOT NULL DEFAULT 'system',
  sound_enabled INTEGER NOT NULL DEFAULT 1,
  reduce_effects INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- กิจกรรมทุกประเภท (Activity Log)
CREATE TABLE activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,            -- water|meal|workout|focus|custom|rest
  title TEXT,
  value REAL,                    -- ml / นาที / ฯลฯ
  unit TEXT,
  note TEXT,
  occurred_at INTEGER NOT NULL,
  tz_offset_min INTEGER NOT NULL DEFAULT 0,
  is_backfilled INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER             -- soft delete
);
CREATE INDEX idx_activity_time ON activity(occurred_at);
CREATE INDEX idx_activity_type ON activity(type, occurred_at);

CREATE TABLE meal_detail (
  activity_id INTEGER PRIMARY KEY REFERENCES activity(id) ON DELETE CASCADE,
  meal_slot TEXT NOT NULL,       -- breakfast|lunch|dinner|snack
  calories_est REAL,
  calories_min REAL,
  calories_max REAL,
  protein_g REAL, carbs_g REAL, fat_g REAL,
  is_estimate INTEGER NOT NULL DEFAULT 1,
  source TEXT NOT NULL DEFAULT 'manual',   -- manual|scan|database
  confidence REAL,               -- 0..1 (เฉพาะ scan)
  photo_path TEXT
);

CREATE TABLE workout_detail (
  activity_id INTEGER PRIMARY KEY REFERENCES activity(id) ON DELETE CASCADE,
  workout_type TEXT NOT NULL,    -- strength|cardio|stretch|walk|run|bike|other
  duration_sec INTEGER,
  distance_m REAL,
  feeling INTEGER,               -- 1..5
  plan_day_id INTEGER
);

CREATE TABLE workout_set (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id INTEGER NOT NULL REFERENCES activity(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  set_index INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  rest_sec INTEGER
);

CREATE TABLE focus_detail (
  activity_id INTEGER PRIMARY KEY REFERENCES activity(id) ON DELETE CASCADE,
  task_name TEXT,
  focus_sec INTEGER NOT NULL,
  planned_sec INTEGER NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0
);

-- ตัวบันทึก XP (Ledger — ไม่แก้ไข เพิ่มอย่างเดียว)
CREATE TABLE xp_event (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amount INTEGER NOT NULL,
  source_type TEXT NOT NULL,     -- activity|quest|milestone|bonus
  source_id INTEGER,
  reason_key TEXT NOT NULL,
  config_version INTEGER NOT NULL,
  occurred_at INTEGER NOT NULL
);
CREATE INDEX idx_xp_time ON xp_event(occurred_at);

-- Quest
CREATE TABLE quest_template (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,            -- daily|weekly|milestone|personal
  category TEXT NOT NULL,
  title_th TEXT NOT NULL, title_en TEXT NOT NULL,
  condition_json TEXT NOT NULL,
  reward_xp INTEGER NOT NULL,
  is_custom INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE quest_instance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id TEXT NOT NULL REFERENCES quest_template(id),
  period_start INTEGER NOT NULL,
  period_end INTEGER NOT NULL,
  progress REAL NOT NULL DEFAULT 0,
  target REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'available',
  completed_at INTEGER
);
CREATE INDEX idx_quest_period ON quest_instance(period_start, status);

-- แผนออกกำลังกาย
CREATE TABLE training_plan_day (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  weekday INTEGER NOT NULL,      -- 1..7
  day_type TEXT NOT NULL,        -- upper|lower|full|cardio|stretch|rest
  note TEXT
);

-- Journal / Mood
CREATE TABLE journal_entry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_date TEXT NOT NULL,      -- 'YYYY-MM-DD' ตามเวลาท้องถิ่น
  title TEXT,
  body TEXT NOT NULL,
  category TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_journal_date ON journal_entry(entry_date);

CREATE TABLE mood_entry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mood_level INTEGER NOT NULL,   -- 1..7
  note TEXT,
  tags TEXT,                     -- JSON array
  occurred_at INTEGER NOT NULL
);

-- ความสำเร็จ / Streak
CREATE TABLE achievement (
  id TEXT PRIMARY KEY, title_th TEXT, title_en TEXT,
  description TEXT, icon TEXT, category TEXT
);
CREATE TABLE achievement_unlock (
  achievement_id TEXT PRIMARY KEY REFERENCES achievement(id),
  unlocked_at INTEGER NOT NULL
);
CREATE TABLE streak_log (
  day TEXT PRIMARY KEY,          -- 'YYYY-MM-DD'
  status TEXT NOT NULL           -- active|rest|frozen|missed
);
```

### 10.3 หลักการข้อมูล
- **XP Ledger เป็น append-only:** ยอด `total_xp` = ผลรวม `xp_event.amount` (เก็บค่า cache ไว้ใน `user_profile` แล้วตรวจสอบซ้ำได้)
- **Soft delete** สำหรับกิจกรรม เพื่อไม่ให้ประวัติ XP อ้างอิงข้อมูลที่หายไป
- **Migration:** ใช้ Drift schema versioning ทุกครั้งที่เปลี่ยนตาราง ห้ามลบข้อมูลผู้ใช้เมื่ออัปเดตแอป
- **Backup:** Export เป็น JSON + zip รูป (ดูหัวข้อ 14)

---

## 11. สถาปัตยกรรมโค้ด

### 11.1 Layers
```
UI (Widgets)  →  Providers (Riverpod)  →  Repositories  →  DAOs (Drift)  →  SQLite
                                   ↓
                              Engines (Pure Dart, ไม่พึ่ง UI/DB)
                      XpEngine · QuestEngine · StreakEngine · RankEngine
```

### 11.2 Engines (ทดสอบแยกได้)
| Engine | หน้าที่ | Input → Output |
|---|---|---|
| `XpEngine` | คำนวณ XP จากกิจกรรม + กฎเพดาน | (activity, อดีตของวัน, config) → XpResult |
| `LevelEngine` | แปลง total_xp เป็น level/xpInLevel | total_xp → LevelState |
| `RankEngine` | หา Rank + ตรวจเงื่อนไขพิเศษ Monarch | level, achievements → Rank |
| `QuestEngine` | สร้าง/ประเมินความคืบหน้า Quest | (activities, quest) → Progress |
| `StreakEngine` | คำนวณ Streak/Freeze/Weekly | streak_log, plan → StreakState |

### 11.3 Flow เมื่อบันทึกกิจกรรม (ตัวอย่าง: ดื่มน้ำ)
```
1. ผู้ใช้กดปุ่ม "+250 มล."
2. Repository เขียนแถวใน activity
3. XpEngine ตรวจ: เพดานต่อวัน / Soft Cap / กฎกันซ้ำ → คืน +2 XP
4. เขียน xp_event + อัปเดต total_xp (ใน transaction เดียวกัน)
5. QuestEngine อัปเดตความคืบหน้า → ถ้าสำเร็จ: สร้าง xp_event ของ Quest
6. LevelEngine/RankEngine เทียบกับเดิม → ตรวจ Level Up / Rank Up
7. StreakEngine บันทึกวันนี้เป็น active
8. UI รับเหตุการณ์ → แสดง Celebration ตามระดับ
9. อัปเดต Widget (ถ้าเปิดใช้)
```
ทุกขั้นตอน 2–7 ต้องอยู่ใน **database transaction เดียว** เพื่อไม่ให้ข้อมูลครึ่ง ๆ กลาง ๆ

### 11.4 การจัดการเวลาและวัน
- "วัน" = ตามเวลาท้องถิ่นของเครื่อง เก็บ offset ไว้กับข้อมูล
- ผู้ใช้เปลี่ยนเขตเวลา/เดินทาง: ไม่คำนวณ Streak ใหม่ย้อนหลัง
- ป้องกันการแก้นาฬิกาเครื่องเพื่อโกง: ไม่ให้ XP กับกิจกรรมที่มีเวลาในอนาคต

---

## 12. AI Food Scanner

> **ทำใน Phase 2 เท่านั้น** ต้องมี Manual Logging ที่เสถียรก่อน

### 12.1 เป้าหมาย
ช่วยให้บันทึกอาหารเร็วขึ้นจากรูปถ่าย โดยแสดงผลเป็น **ค่าประมาณพร้อมช่วงและความมั่นใจ** และให้ผู้ใช้แก้ไขได้เสมอ

### 12.2 ขั้นตอนการทำงาน
```
ถ่ายรูป/เลือกจากแกลเลอรี
   → (ย่อรูป/ลบ metadata ตำแหน่ง)
   → โมเดลตรวจชนิดอาหาร (Top-3 candidates + confidence)
   → ผู้ใช้เลือก/แก้ชนิดอาหาร
   → ผู้ใช้ปรับขนาดส่วน (เล็ก/กลาง/ใหญ่ หรือกรัม)
   → ดึงค่าโภชนาการจากฐานข้อมูลอาหารเปิด × ปริมาณ
   → แสดง "ช่วงแคลอรี" + ป้าย "ค่าประมาณ"
   → ผู้ใช้ยืนยัน → บันทึก Activity Log
```

### 12.3 ทางเลือกการทำงาน (ฟรี/โอเพนซอร์ส)
| ตัวเลือก | ข้อดี | ข้อเสีย |
|---|---|---|
| **ออนดีไวซ์**: TensorFlow Lite / ONNX Runtime + โมเดลจำแนกอาหาร (เช่น เทรนจาก Food-101 หรือชุดข้อมูลเปิดอื่น) | ส่งรูปออกนอกเครื่องไม่ต้อง, ใช้ออฟไลน์ได้, ฟรี | ต้องเทรน/หาโมเดลเอง, อาหารไทยต้องเพิ่มข้อมูลเอง |
| **เซิร์ฟเวอร์ส่วนตัว**: Ollama + โมเดลวิชั่นแบบเปิด | ฉลาดกว่า รับอาหารหลากหลาย | ต้องมีเครื่องรันเอง, ไม่ออฟไลน์ |
| **บาร์โค้ด**: Open Food Facts API/ข้อมูลดาวน์โหลด | แม่นสำหรับอาหารแพ็ก | ใช้ไม่ได้กับอาหารปรุงสด |
| **ค้นหาเองในฐานข้อมูล**: ไฟล์ SQLite อาหารไทยที่สร้าง/รวมจากแหล่งเปิด | ควบคุมได้, เร็ว | ต้องสร้างและดูแลข้อมูล |

**แนะนำ:** เริ่มจาก "ค้นหา + เลือกขนาดส่วนเอง" (ไม่ต้องใช้ AI) → เพิ่มบาร์โค้ด → จึงเพิ่มโมเดลรูปภาพออนดีไวซ์

### 12.4 กติกาการแสดงผล (บังคับ)
- แสดงเป็น **ช่วง** เช่น "ประมาณ 450–650 kcal" และป้าย **"ค่าประมาณจากภาพ"**
- แสดงระดับความมั่นใจ (สูง/กลาง/ต่ำ) ถ้ามั่นใจต่ำให้ขอให้ผู้ใช้ยืนยัน
- มีข้อความเตือน: ภาพไม่สามารถบอกปริมาณน้ำมัน น้ำตาล เครื่องปรุงที่มองไม่เห็นได้
- ผู้ใช้แก้ไขได้ทุกค่า และค่าที่ผู้ใช้แก้ถือเป็นค่า "ยืนยันแล้ว"
- **ห้าม** ใช้ผลสแกนเพื่อให้รางวัล/ลงโทษตามปริมาณแคลอรี
- ถ้าผู้ใช้เลือกส่งรูปไปเซิร์ฟเวอร์ ต้องมีหน้าขอความยินยอมชัดเจน และปิดได้

### 12.5 ข้อมูลอาหารไทย
ฐานข้อมูลเปิดมีอาหารไทยจำกัด แผนรับมือ:
1. เริ่มด้วยรายการอาหารไทยยอดนิยม 100–200 รายการที่ใส่ค่าประมาณเอง พร้อมระบุแหล่งที่มา
2. ให้ผู้ใช้ "สร้างอาหารของฉัน" และบันทึกเป็นเทมเพลตเพื่อใช้ซ้ำ
3. ตรวจสอบไลเซนส์ของแหล่งข้อมูลก่อนนำมารวมทุกครั้ง (ดูหัวข้อ 19)

---

## 13. การแจ้งเตือน, Widget, Celebration

### 13.1 การแจ้งเตือน (Local Notifications)
| ประเภท | ค่าเริ่มต้น | ตั้งค่าได้ |
|---|---|---|
| เตือนดื่มน้ำ | ปิด | ช่วงเวลา, ความถี่ |
| เตือนออกกำลังกายตามแผน | เปิด (เฉพาะวันที่มีแผน) | เวลา |
| Pomodoro ครบเวลา | เปิด | เสียง/สั่น |
| เตือนเขียนไดอารี่ | ปิด | เวลา |
| สรุปรายสัปดาห์ | เปิด | วัน/เวลา |

**หลักการ:** จำนวนแจ้งเตือนรวมไม่เกิน 3 ครั้ง/วันโดยค่าเริ่มต้น, มีโหมด "ห้ามรบกวน" ตามเวลานอน, ข้อความเชิงบวกไม่กดดัน

### 13.2 Android Permissions ที่จะใช้
- `POST_NOTIFICATIONS` (Android 13+)
- `SCHEDULE_EXACT_ALARM` (เฉพาะ Pomodoro/เตือนที่ต้องตรงเวลา, ขอเมื่อจำเป็น)
- `FOREGROUND_SERVICE` (Workout Timer/Pomodoro ตอนทำงาน)
- `CAMERA` (เฉพาะเมื่อใช้ถ่ายรูปอาหาร)
- ไม่ขอสิทธิ์ตำแหน่ง/รายชื่อติดต่อ/ไมโครโฟน

### 13.3 หมายเหตุเรื่องการประหยัดแบตเตอรี่ของระบบ
Android บางยี่ห้อฆ่าแอปเบื้องหลังแรง ให้มีหน้า "ช่วยให้การแจ้งเตือนทำงาน" แนะนำผู้ใช้ปิดการจำกัดแบตเตอรี่สำหรับแอป และออกแบบ Timer ให้ **คำนวณจาก timestamp** เสมอ เพื่อไม่พึ่งการทำงานต่อเนื่องของแอป

---

## 14. ความเป็นส่วนตัวและความปลอดภัย

### 14.1 หลักการ
- ข้อมูลทั้งหมด (รูปอาหาร, สุขภาพ, ไดอารี่, อารมณ์) **เก็บในเครื่อง** โดยค่าเริ่มต้น
- ไม่มี Analytics/โฆษณา/Tracker ของบุคคลที่สาม
- ไม่ต้องสมัครสมาชิก
- ถ้าอนาคตมีซิงก์/ส่งข้อมูลออกนอกเครื่อง ต้องเป็น **opt-in** พร้อมคำอธิบายชัดเจน

### 14.2 ฟีเจอร์ที่ต้องมี
| ฟีเจอร์ | รายละเอียด |
|---|---|
| App Lock | PIN/ลายนิ้วมือ/ใบหน้า (`local_auth`) สำหรับเปิดแอปหรือเฉพาะ Journal |
| เข้ารหัสฐานข้อมูล | ใช้ SQLCipher (BSD) เข้ารหัสไฟล์ฐานข้อมูล (ตัวเลือกใน Phase 2) |
| ซ่อนตัวอย่างใน Recent Apps | เปิด `FLAG_SECURE` ได้ในตั้งค่า |
| Export ข้อมูล | JSON (ข้อมูล) + ZIP (รูป) เก็บไฟล์ไว้เอง |
| Import ข้อมูล | กู้คืนจากไฟล์ Export |
| ลบข้อมูลทั้งหมด | ปุ่มลบทั้งหมด + ยืนยัน 2 ชั้น |
| ลบรายหมวด | ลบเฉพาะรูปอาหาร/ไดอารี่/อารมณ์ได้ |
| ลบ metadata รูป | ลบพิกัด GPS/EXIF ก่อนบันทึกรูปอาหาร |

### 14.3 ข้อควรระวังเรื่องข้อมูลสุขภาพ
- ข้อมูลสุขภาพและอารมณ์เป็นข้อมูลอ่อนไหว เอกสารและ UI ต้องไม่ใช้ถ้อยคำเชิงวินิจฉัย
- ใส่หน้า "ข้อจำกัดความรับผิดชอบ": แอปไม่ใช่เครื่องมือทางการแพทย์ ไม่ทดแทนคำแนะนำของผู้เชี่ยวชาญ
- ถ้าจะเผยแพร่จริง ควรมีนโยบายความเป็นส่วนตัว (Privacy Policy) และตรวจข้อกำหนด PDPA ของประเทศไทย
- ถ้าผู้ใช้บันทึกข้อความที่สื่อถึงความเสี่ยงต่อตนเอง แอปไม่ควรวิเคราะห์เอง แต่ควรมีหน้า "ขอความช่วยเหลือ" ให้ผู้ใช้เข้าถึงช่องทางช่วยเหลือที่เชื่อถือได้ได้ง่าย (เตรียมเนื้อหาให้ถูกต้องตามประเทศก่อนเผยแพร่)

---

## 15. UI/UX Guideline

### 15.1 Design Principles
1. **เร็ว:** บันทึกกิจกรรมที่พบบ่อย (น้ำ) ให้ได้ใน ≤ 2 แตะ
2. **ใช้มือเดียวได้:** ปุ่มหลักอยู่โซนล่างหน้าจอ
3. **ให้กำลังใจ ไม่กดดัน:** สีและถ้อยคำเชิงบวก
4. **อ่านง่าย:** ขนาดตัวอักษรขั้นต่ำ 14sp, คอนทราสต์ผ่าน WCAG AA
5. **ปรับได้:** Dark/Light, ขนาดตัวอักษร, ลดแอนิเมชัน

### 15.2 ธีมและสไตล์
- แนวทาง: โทนสีเข้มพร้อมสีเน้นเรืองแสง (ฟีล RPG/System Window) แต่ต้องไม่ลดความอ่านง่าย
- สีหลัก (ตัวอย่าง): พื้นหลัง `#0E1220`, การ์ด `#171C2E`, สีเน้น `#5B8CFF` (น้ำเงิน), สำเร็จ `#3DDC97`, เตือน `#FFB84D`
- สีประจำ Rank (ไล่จากเทา → ฟ้า → เขียว → ม่วง → ทอง → แดง → ขาวเรืองแสง)
- ฟอนต์: **Sarabun** หรือ **Noto Sans Thai** (เนื้อหา) + ฟอนต์หัวข้อสไตล์เกมที่รองรับไทย/อังกฤษ (ตรวจไลเซนส์ SIL OFL)

### 15.3 Component หลัก
- `XpBar` (แถบ XP แบบเคลื่อนไหวนุ่ม)
- `RankBadge` (ตราตาม Rank)
- `QuestCard` (ชื่อ, ความคืบหน้า, XP รางวัล)
- `QuickAddFab` (ปุ่มลอย → เมนูวงกลม/แผ่นล่าง)
- `ActivityTile` (แสดงใน Timeline)
- `StatCard` (การ์ดตัวเลขใน Dashboard)
- `CelebrationOverlay`

### 15.4 Accessibility
- รองรับ TalkBack (Semantics label ครบ)
- ไม่ใช้สีอย่างเดียวสื่อความหมาย
- ปุ่มสัมผัสขนาด ≥ 48×48 dp
- เคารพ "Remove animations" ของระบบ

### 15.5 ตัวอย่าง Wireframe (Home)
```
┌──────────────────────────────┐
│  Awakened              ⚙️    │
├──────────────────────────────┤
│  [RankBadge]  E – Dormant    │
│  Lv 7                         │
│  XP ▓▓▓▓▓▓▓░░░  180/220      │
├──────────────────────────────┤
│  Daily Quest        2 / 4 ✓  │
│  ☑ ดื่มน้ำตามเป้า      +20   │
│  ☑ Pomodoro 1 รอบ     +15   │
│  ☐ เขียนไดอารี่        +15   │
│  ☐ ออกกำลังกายตามแผน  +30   │
├──────────────────────────────┤
│  🔥 Streak 5 วัน | สัปดาห์ 3/4│
├───────────┬──────────────────┤
│ 💧 1,250ml │ ⏱ Focus 25 นาที │
│ 🏋 25 นาที │ 🍚 2 มื้อ        │
├───────────┴──────────────────┤
│                         (＋)  │
├──────────────────────────────┤
│ Home Track Train Journey Me  │
└──────────────────────────────┘
```

---

## 16. แผนการพัฒนาเป็นระยะ (Roadmap)

> ระยะเวลาเป็นค่าประมาณสำหรับผู้พัฒนาคนเดียวแบบไม่เต็มเวลา ปรับตามความสะดวกได้ **แต่ละระยะต้องผ่านการทดสอบก่อนเริ่มระยะถัดไป**

### Phase 0 — เตรียมการ (สัปดาห์ที่ 1)
- [ ] ติดตั้ง Flutter, Android Studio, Git
- [ ] สร้าง repo, ตั้งโครงสร้างโฟลเดอร์ (หัวข้อ 4.4)
- [ ] เขียน `xp_config.json`, `ranks`, `quests` ฉบับแรก
- [ ] วาด wireframe 5 หน้าหลักใน Penpot
- [ ] ตั้งค่า Drift + สร้าง Schema (หัวข้อ 10)
- **ผลลัพธ์:** แอปเปล่าที่รันบนมือถือได้ + Schema พร้อม

### Phase 1 — Core System (สัปดาห์ที่ 2–7)
| สัปดาห์ | งาน | ผลลัพธ์ที่ตรวจสอบได้ |
|---|---|---|
| 2 | XpEngine + LevelEngine + Unit Test | Test ผ่านครบ (เคสเพดาน/ข้ามเลเวล) |
| 2–3 | Activity Log + **ดื่มน้ำ** + Dashboard พื้นฐาน | กดน้ำ → XP ขึ้น → แถบ XP ขยับ ✅ **(Vertical Slice แรก)** |
| 3 | Daily Quest + QuestEngine | เควสต์สำเร็จอัตโนมัติเมื่อทำครบ |
| 4 | บันทึกอาหาร (Manual) + Journal ข้อความ | เพิ่ม/แก้/ลบได้ |
| 5 | Workout (Rep Counter + Timer) + Training Plan พื้นฐาน | จับเวลาต่อเมื่อพับหน้าจอได้ |
| 6 | Pomodoro (เบื้องหลัง + แจ้งเตือน) | จบรอบแล้วได้ XP, ปิดแอปแล้วยังนับต่อ |
| 6 | Rank + Streak + Weekly Consistency | เลื่อน Rank ถูกต้อง, Freeze ทำงาน |
| 7 | Profile, Settings, Export/Import, Celebration ระดับ 1–3 | สำรอง-กู้คืนข้อมูลสำเร็จ |
- **Exit Criteria:** ใช้งานเองต่อเนื่อง 7 วันโดยไม่เจอบั๊กร้ายแรง, ข้อมูลไม่หาย, XP ตรงตามสูตร

### Phase 1.5 — ใช้งานจริงและปรับสมดุล (สัปดาห์ที่ 8–9)
- [ ] ใช้เองทุกวัน จดว่ารู้สึกอย่างไร
- [ ] ปรับตัวเลข XP/เพดานจากข้อมูลจริง (แก้ที่ config เท่านั้น)
- [ ] เก็บ Feedback จากเพื่อน 3–5 คน

### Phase 2 — Smart Features (สัปดาห์ที่ 10–16)
1. กราฟประวัติ (fl_chart)
2. Weekly Quest + Milestone Quest + Achievements
3. Mood Tracker + Calendar + Journey Recap
4. Adaptive Personal Plan (Rule-based)
5. ระบบแจ้งเตือนเต็มรูปแบบ
6. Celebration ครบ 4 ระดับ + Lottie
7. อาหาร: ค้นหาฐานข้อมูล → บาร์โค้ด → AI Food Scanner (ตามหัวข้อ 12)
8. App Lock + เข้ารหัสฐานข้อมูล

### Phase 3 — Advanced (สัปดาห์ที่ 17+)
1. Home Screen Widget (4 แบบ)
2. ตรวจจับท่าทางด้วยกล้อง (MediaPipe)
3. วิเคราะห์แนวโน้มพฤติกรรม (เชิงสถิติ ไม่วินิจฉัย)
4. แนบสื่อใน Journal
5. ระบบปลดล็อก Monarch
6. ปรับ Quest ให้เข้ากับผู้ใช้มากขึ้น
7. (ตัวเลือก) ซิงก์ข้ามอุปกรณ์แบบ self-host (PocketBase/Syncthing)

---

## 17. วิธีสร้างและติดตั้งลงมือถือ

### 17.1 ติดตั้งเครื่องมือ (Windows/macOS/Linux)
1. ติดตั้ง **Flutter SDK** จาก flutter.dev
2. ติดตั้ง **Android Studio** (เพื่อให้ได้ Android SDK) แล้วรัน `flutter doctor` ให้ผ่านทุกข้อ
3. เปิดโหมดนักพัฒนาบนมือถือ: ตั้งค่า → เกี่ยวกับโทรศัพท์ → แตะ "หมายเลขรุ่น/Build number" 7 ครั้ง → เปิด **USB debugging** (หรือ **Wireless debugging**)

### 17.2 สร้างโปรเจกต์
```bash
flutter create --org com.yourname --project-name awakened awakened
cd awakened
flutter pub add drift sqlite3_flutter_libs path_provider path flutter_riverpod go_router \
  fl_chart flutter_local_notifications workmanager intl lottie just_audio image_picker \
  share_plus file_picker local_auth
flutter pub add --dev drift_dev build_runner flutter_test mocktail
```
> ชื่อแพ็กเกจ/เวอร์ชันอาจเปลี่ยน ให้ตรวจที่ pub.dev ก่อนใช้งานจริง

### 17.3 รันบนมือถือ (ระหว่างพัฒนา)
```bash
flutter devices          # ตรวจว่าเห็นมือถือ
flutter run              # รันแบบ debug (Hot Reload)
```

### 17.4 สร้างไฟล์ APK สำหรับติดตั้งจริง
```bash
# 1) สร้าง keystore สำหรับเซ็นแอป (ทำครั้งเดียว เก็บไฟล์และรหัสผ่านไว้ให้ดี ห้ามหาย)
keytool -genkey -v -keystore ~/awakened-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias awakened

# 2) ตั้งค่า android/key.properties (อย่า commit ลง Git)
#    storePassword=...
#    keyPassword=...
#    keyAlias=awakened
#    storeFile=/path/to/awakened-release.jks

# 3) แก้ android/app/build.gradle ให้อ่าน key.properties (ดูเอกสาร Flutter: Build and release an Android app)

# 4) สร้าง APK (แยกตามสถาปัตยกรรม ไฟล์เล็กกว่า)
flutter build apk --release --split-per-abi
# ผลลัพธ์อยู่ที่ build/app/outputs/flutter-apk/app-arm64-v8a-release.apk
```

### 17.5 ติดตั้ง APK ลงมือถือ
**วิธี A: ผ่านสาย (ADB)**
```bash
adb install -r build/app/outputs/flutter-apk/app-arm64-v8a-release.apk
```
**วิธี B: ส่งไฟล์เข้ามือถือ** (สาย USB / Google Drive / Syncthing / แชร์ใกล้ตัว) แล้วเปิดไฟล์ในมือถือ → อนุญาต "ติดตั้งแอปจากแหล่งที่ไม่รู้จัก" ให้แอปที่ใช้เปิดไฟล์ → ติดตั้ง

### 17.6 ช่องทางเผยแพร่ (ถ้าต้องการแจกจ่าย)
| ช่องทาง | ค่าใช้จ่าย | หมายเหตุ |
|---|---|---|
| ส่งไฟล์ APK เอง | ฟรี | อัปเดตเองด้วยมือ |
| **F-Droid** | ฟรี | ต้องเป็นโอเพนซอร์ส และไม่ใช้ไลบรารีปิด (ตรวจ dependencies) |
| GitHub Releases | ฟรี | แจก APK + Changelog |
| Google Play | ค่าสมัครครั้งเดียว 25 USD | ต้องมี Privacy Policy |
| Apple App Store | 99 USD/ปี + ต้องใช้ macOS | ทำทีหลังได้ |

### 17.7 Build อัตโนมัติด้วย GitHub Actions (ตัวเลือก)
สร้างไฟล์ `.github/workflows/build.yml` ให้รัน `flutter test` และ `flutter build apk` ทุกครั้งที่ push แล้วอัปโหลด APK เป็น Artifact (ฟรีสำหรับ repo สาธารณะ)

---

## 18. แผนการทดสอบ

### 18.1 Unit Test (สำคัญที่สุด สำหรับ Engines)
| เคสทดสอบ | ผลที่คาดหวัง |
|---|---|
| ได้ XP เท่ากับค่าใน config | ตรง |
| บันทึกน้ำครั้งที่ 6 ในวันเดียว | ได้ 0 XP (เกิน max_per_day) หรือตามกติกา |
| XP รวมเกิน Soft Cap | ได้ 25% ของค่าปกติ |
| XP พอข้ามหลายเลเวลพร้อมกัน | Level ถูกต้อง, XP คงเหลือถูกต้อง |
| ถึง Lv 11 พอดี | Rank เปลี่ยนเป็น D |
| พลาด 1 วัน มี Freeze | Streak ไม่ขาด, Freeze −1 |
| พลาด 1 วัน ไม่มี Freeze | Streak = 0, XP/Level เท่าเดิม |
| วันพักตามแผน | Streak ต่อเนื่อง |
| ลบกิจกรรมเก่า > 10 นาที | XP ไม่ถูกหัก |
| เพิ่มกิจกรรมย้อนหลัง > 24 ชม. | ได้ 50% และไม่นับ Streak |
| เปลี่ยน config สูตร | total_xp เดิมคำนวณเป็น Level ใหม่ถูกต้อง |

### 18.2 Integration/Widget Test
- Flow: เปิดแอป → กดน้ำ → XP ขึ้น → Quest อัปเดต → Celebration แสดง
- Pomodoro: จบรอบ/ยกเลิก/ปิดแอปกลางคัน
- Export → ลบข้อมูล → Import → ข้อมูลเหมือนเดิม

### 18.3 ทดสอบบนอุปกรณ์จริง
- [ ] Android อย่างน้อย 2 รุ่น/2 เวอร์ชัน (เช่น 10 และ 14)
- [ ] โหมดประหยัดแบตเตอรี่ → Timer/แจ้งเตือนยังทำงาน
- [ ] หมุนจอ/พับหน้าจอ/สลับแอป
- [ ] เปลี่ยนเขตเวลาและแก้นาฬิกา
- [ ] หน้าจอเล็กและแท็บเล็ต
- [ ] ใช้ TalkBack
- [ ] ข้อมูลขนาดใหญ่ (จำลอง 1 ปี ≈ 10,000+ รายการ) ยังลื่น

### 18.4 เกณฑ์ผ่าน Phase 1
- Unit Test ผ่าน 100% ของ Engines
- ไม่มี Crash ในการใช้งานต่อเนื่อง 7 วัน
- เปิดแอป < 2 วินาที (เครื่องระดับกลาง)
- ไม่มีข้อมูลสูญหายเมื่อปิดแอปกะทันหัน

---

## 19. ไลเซนส์และเครดิต

### 19.1 ตารางตรวจไลเซนส์
| ทรัพยากร | ไลเซนส์ | ข้อกำหนด |
|---|---|---|
| Flutter/Dart | BSD-3 | แสดงข้อความไลเซนส์ (มีหน้า Licenses ในตัว) |
| Drift, fl_chart, Riverpod ฯลฯ | MIT/BSD | แสดงไลเซนส์ |
| ฟอนต์ Sarabun/Noto Sans Thai/Kanit | SIL OFL | ใช้ได้ ห้ามขายฟอนต์เดี่ยว ๆ |
| Kenney.nl assets | CC0 | ไม่ต้องให้เครดิต (แต่ควรให้) |
| game-icons.net | CC BY 3.0 | **ต้องให้เครดิต** ผู้สร้างไอคอน |
| Freesound | ขึ้นกับแต่ละไฟล์ | เลือกเฉพาะ CC0 |
| Open Food Facts | ODbL | ระบุที่มา และแชร์ข้อมูลที่ดัดแปลงในไลเซนส์เดียวกัน |
| USDA FoodData Central | สาธารณสมบัติ | ใช้ได้ (ควรอ้างอิงแหล่งที่มา) |
| MediaPipe | Apache 2.0 | แสดง NOTICE |
| โมเดล AI/ชุดข้อมูลที่เลือกใช้ | ตรวจเป็นรายตัว | บางชุดห้ามใช้เชิงพาณิชย์ |

### 19.2 สิ่งที่ต้องทำ
- สร้างไฟล์ `CREDITS.md` และหน้า "เกี่ยวกับ/เครดิต" ในแอป
- บันทึกแหล่งที่มา+ไลเซนส์ของทุกไฟล์ใน `assets/` (ตาราง `assets/LICENSES.md`)
- เลือกไลเซนส์ของโปรเจกต์ตัวเอง (เช่น GPLv3/AGPL ถ้าอยากให้เปิดต่อ หรือ MIT ถ้าอยากให้อิสระสูง)
- **ตรวจชื่อแอป "Awakened"** ว่าซ้ำกับแอปอื่นใน Play Store/App Store หรือไม่ และตรวจโดเมน/ชื่อโซเชียลก่อนเผยแพร่จริง (คำทั่วไปอาจมีผู้ใช้แล้ว)
- ชื่อ Rank, ฉายา และภาพ ควรเป็นงานออริจินัลของตัวเอง ไม่ลอกจากอนิเมะ/เกมที่มีลิขสิทธิ์

---

## 20. ความเสี่ยงและข้อควรระวัง

| ความเสี่ยง | ผลกระทบ | แนวทางลดความเสี่ยง |
|---|---|---|
| ทำฟีเจอร์เยอะเกินไปพร้อมกัน | งานไม่เสร็จ | ยึด Phase, เริ่มจาก Vertical Slice "น้ำ → XP" |
| สูตร XP ไม่สมดุล | เบื่อ/โกงง่าย | แยก config, ใช้ 2 สัปดาห์ปรับ, มีเพดาน |
| Timer/แจ้งเตือนไม่ทำงานเบื้องหลัง (ยี่ห้อฆ่าแอป) | Pomodoro/Workout เพี้ยน | คำนวณจาก timestamp, Foreground service, หน้าแนะนำตั้งค่าแบตเตอรี่ |
| ข้อมูลหาย | เสียความเชื่อมั่น | Transaction, Export อัตโนมัติรายสัปดาห์ (ตัวเลือก), Migration ระวัง |
| แคลอรีจากภาพคลาดเคลื่อน | ผู้ใช้เข้าใจผิด/เกิดพฤติกรรมไม่ดี | แสดงเป็นช่วง+ความมั่นใจ+แก้ไขได้+ไม่ผูกกับรางวัล |
| Gamification ทำให้ฝืนร่างกาย/ติดตัวเลข | ผลเสียต่อสุขภาพ | เพดาน XP, Rest Day ได้ XP, ไม่หักคะแนน, ข้อความเชิงสนับสนุน |
| ข้อมูลอ่อนไหวรั่ว | ผลต่อความเป็นส่วนตัว | เก็บในเครื่อง, App Lock, เข้ารหัส, ไม่ส่งออกโดยไม่ยินยอม |
| ปัญหาลิขสิทธิ์ (ภาพ/เสียง/ชื่อ) | ถูกถอดแอป | ใช้แต่เนื้อหา CC0/ออริจินัล, เก็บตารางไลเซนส์ |
| ชื่อแอปซ้ำ | ต้องเปลี่ยนชื่อภายหลัง | ตรวจก่อนอัปโหลดสโตร์ |
| ผู้พัฒนาหมดแรงจูงใจ | โปรเจกต์หยุด | ทำ Milestone เล็ก ๆ, ใช้แอปเอง (Dogfooding), ปล่อย APK ให้เพื่อนลอง |

---

## 21. Checklist เริ่มงาน

### วันนี้ (30–60 นาที)
- [ ] ติดตั้ง Flutter + Android Studio, รัน `flutter doctor`
- [ ] สร้างโปรเจกต์ `awakened` และรันบนมือถือได้ (หน้า Hello World)
- [ ] สร้าง Git repo

### สัปดาห์นี้
- [ ] สร้างไฟล์ `xp_config.json` ตามหัวข้อ 7.7
- [ ] สร้าง Drift schema ตามหัวข้อ 10 (อย่างน้อย `user_profile`, `activity`, `xp_event`)
- [ ] เขียน `LevelEngine` + Unit Test
- [ ] ทำหน้า Home มีแถบ XP + ปุ่ม "ดื่มน้ำ +250 มล."
- [ ] **ได้ Vertical Slice แรก:** กดปุ่ม → บันทึก → ได้ XP → แถบขยับ → ปิดเปิดแอปข้อมูลยังอยู่

### ก่อนปล่อยให้คนอื่นลอง
- [ ] Export/Import ทำงาน
- [ ] ตรวจไลเซนส์ครบ + หน้าเครดิต
- [ ] ทดสอบบนมือถืออย่างน้อย 2 เครื่อง
- [ ] เขียนข้อความ Disclaimer สุขภาพ + Privacy Policy

---

## 22. ภาคผนวก

### ก. Glossary
| คำ | ความหมาย |
|---|---|
| XP | ค่าประสบการณ์ที่ได้จากกิจกรรม |
| Level | ระดับความก้าวหน้าระยะสั้น คำนวณจาก XP สะสม |
| Rank | ลำดับขั้นระยะยาว ตามช่วงเลเวล |
| Quest | ภารกิจที่แปลงเป้าหมายเป็นรางวัล XP |
| Streak | จำนวนวันต่อเนื่องที่ทำกิจกรรม |
| Weekly Consistency | ความสม่ำเสมอรายสัปดาห์ (ไม่ต้องทำทุกวัน) |
| Soft Cap | เพดาน XP รายวัน เกินแล้วได้ในอัตราลดลง |
| Freeze | โทเคนปกป้อง Streak เมื่อพลาดวัน |
| Vertical Slice | งานชิ้นเล็กที่ทำครบทุกชั้นตั้งแต่ UI ถึงฐานข้อมูล |
| Offline-first | ใช้งานได้เต็มที่โดยไม่ต้องมีอินเทอร์เน็ต |

### ข. ตารางเลเวล 1–30 (คำนวณจากสูตรเริ่มต้น)
| Lv | XP ไป Lv ถัดไป | XP สะสมเมื่อเริ่ม Lv นี้ |
|---|---|---|
| 1 | 100 | 0 |
| 2 | 120 | 100 |
| 3 | 140 | 220 |
| 4 | 160 | 360 |
| 5 | 180 | 520 |
| 6 | 200 | 700 |
| 7 | 220 | 900 |
| 8 | 240 | 1,120 |
| 9 | 260 | 1,360 |
| 10 | 280 | 1,620 |
| 11 | 300 | 1,900 |
| 12 | 320 | 2,200 |
| 13 | 340 | 2,520 |
| 14 | 360 | 2,860 |
| 15 | 380 | 3,220 |
| 16 | 400 | 3,600 |
| 17 | 420 | 4,000 |
| 18 | 440 | 4,420 |
| 19 | 460 | 4,860 |
| 20 | 480 | 5,320 |
| 21 | 500 | 5,800 |
| 22 | 520 | 6,300 |
| 23 | 540 | 6,820 |
| 24 | 560 | 7,360 |
| 25 | 580 | 7,920 |
| 26 | 600 | 8,500 |
| 27 | 620 | 9,100 |
| 28 | 640 | 9,720 |
| 29 | 660 | 10,360 |
| 30 | 680 | 11,020 |

### ค. ตัวอย่างข้อความในแอป (Tone of Voice)
| สถานการณ์ | ข้อความ |
|---|---|
| ทำ Quest สำเร็จ | "เยี่ยมมาก! +20 XP" |
| Level Up | "เลเวลอัป! คุณเข้าสู่ Lv 8 แล้ว" |
| Rank Up | "คุณก้าวสู่ Rank D – Novice" |
| พลาดวัน | "ไม่เป็นไร พรุ่งนี้เริ่มใหม่ได้เลย ทุกอย่างที่สะสมมายังอยู่ครบ" |
| วันพัก | "วันนี้คือวันพักตามแผน การพักก็เป็นส่วนหนึ่งของความก้าวหน้า" |
| สแกนอาหาร | "ค่าประมาณจากภาพ อาจคลาดเคลื่อนได้ แตะเพื่อปรับแก้" |
| เกินเพดาน XP | "วันนี้คุณทำได้เยอะมากแล้ว XP ที่เหลือจะได้ในอัตราลดลง พักบ้างก็ดีนะ" |

### ง. เอกสารอ้างอิงที่ควรอ่านเพิ่ม
- เอกสาร Flutter: *Build and release an Android app*
- เอกสาร Drift (drift.simonbinder.eu)
- เอกสาร Android: *Foreground services*, *Notification runtime permission*
- Open Food Facts: *Data & API* และเงื่อนไข ODbL
- PDPA ประเทศไทย (สำหรับการเผยแพร่จริง)

### จ. สิ่งที่ต้องตัดสินใจต่อ (Open Questions)
1. ใช้ Flutter หรือ React Native? (เอกสารนี้ใช้ Flutter เป็นหลัก)
2. จะเปลี่ยนชื่อ Rank E เป็น "Dormant" ตามข้อเสนอหรือไม่?
3. จะแจกจ่ายผ่านช่องทางใด (APK เอง / F-Droid / Play Store)?
4. AI Food Scanner จะใช้ออนดีไวซ์หรือเซิร์ฟเวอร์ส่วนตัว?
5. ภาษาแรกที่รองรับ: ไทยอย่างเดียว หรือไทย+อังกฤษ?
6. ต้องการซิงก์ข้ามอุปกรณ์หรือไม่?

---
*เอกสารนี้เป็นฉบับร่าง ตัวเลขทั้งหมด (XP, เพดาน, ระยะเวลา) เป็นค่าเริ่มต้นสำหรับการทดลอง และควรปรับตามการใช้งานจริง*
