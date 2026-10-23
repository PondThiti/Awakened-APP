# Credits & Open-Source Licenses — Awakened (Life RPG)

ตามข้อกำหนดใน `Awakened.md` (หัวข้อที่ 19 ไลเซนส์และเครดิต) โปรเจกต์นี้ใช้เฉพาะเครื่องมือและไลบรารีแบบฟรีและโอเพนซอร์สทั้งหมด:

## 1. Core Open-Source Libraries
| ไลบรารี | ไลเซนส์ | หน้าที่ |
|---|---|---|
| **React & React Native** | MIT | โครงสร้าง UI ข้ามแพลตฟอร์ม (Android / iOS / Web) |
| **Expo SDK** (`expo`, `expo-sqlite`, `expo-image-picker`, `expo-keep-awake`, `expo-haptics`) | MIT | ระบบฐานข้อมูล SQLite ในเครื่อง, กล้อง/รูปภาพ, Wakelock, Haptics |
| **AsyncStorage** (`@react-native-async-storage/async-storage`) | MIT | ระบบจัดเก็บสถานะแบบ Offline-first |
| **React Native SVG** (`react-native-svg`) | MIT | กราฟและองค์ประกอบเวกเตอร์ |
| **Vitest & TypeScript** | MIT / Apache-2.0 | ระบบตรวจสอบชนิดข้อมูลและ Unit Testing สำหรับ Core Engines |

## 2. Config & Data Assets (`assets/config/`)
| ไฟล์ | ที่มาและไลเซนส์ |
|---|---|
| `assets/config/xp_config.json` | งานออริจินัลตามสูตรใน `Awakened.md` (MIT) |
| `assets/config/quests.json` | คลังภารกิจออริจินัลตาม `Awakened.md` (MIT) |
| `assets/config/achievements.json` | ระบบเหรียญตราความสำเร็จออริจินัล (MIT) |
| `assets/config/thai_foods.json` | ค่าประมาณโภชนาการอ้างอิงจากตารางโภชนาการอาหารไทย (กรมอนามัย / USDA Public Domain) แสดงเป็นช่วงค่าประมาณเท่านั้น |
| `Awakened.ico` & `assets/icon.png` | ไอคอนหลักของแอป Awakened สำหรับติดตั้งบน Android (`mipmap-*`, `drawable-*`) และแสดงผลใน Header |
| `assets/icons/*.svg` (`AppIcons.tsx`) | ชุดไอคอนเวกเตอร์ SVG ดาวน์โหลดจาก [freeicons.io](https://freeicons.io/) (Iconly Essential Icons & Free Vector Sets) แสดงผลผ่าน `react-native-svg` |
