Awakened — Life RPG

"Your life is the game. Every day is a level up."

English | ภาษาไทย

English

Awakened is an offline-first mobile application that turns your daily health, fitness, and self-improvement habits into a role-playing game (RPG). Log your workouts, water intake, meals, Pomodoro focus sessions, and daily journal to earn XP, level up your Stats, and climb the Ranks from Dormant (Rank E) to Monarch.

Project Status

Currently in the Planning & Specification Phase. There is no runnable application code in this repository yet. If you cloned this repo looking for the app source code, you haven't missed anything—we are finalizing the system architecture, RPG balance formulas, and onboarding mechanics before writing the first vertical slice.

Why Awakened?

Most health and habit apps simply track numbers and leave motivation entirely up to you. Worse, missing a single day often breaks your streak and triggers guilt, causing most people to quit altogether.

Awakened is built around sustainable consistency rather than perfection:

Zero Punishment: You never lose XP, Levels, or Stats—no matter how many days you miss.

Rest is Progress: Scheduled rest days count toward your consistency and grant XP.

Comeback Quests, Not Penalties: If you miss a few days, the system welcomes you back with lighter Comeback Quests to help you regain momentum.

Core Principles

No Penalty Mechanics: Accumulated XP, Levels, and Stats (STR, VIT, INT, WIL) never decrease.

Personalized Daily Quests: A 4-stage onboarding questionnaire evaluates your goals, available time, equipment, physical constraints, and "Big Boss" habits (e.g., fading motivation, screen addiction) to generate tailored daily quests.

Privacy & Offline-First: No mandatory account, no ads, no third-party trackers. All data stays on your device in SQLite and can be exported or deleted anytime.

Transparent Estimates: Any estimated nutrition or AI food scan data is clearly labeled as a range/estimate and is never tied to XP rewards or calorie-restriction goals.

Config-Driven Balance: All XP formulas, level curves, and quest pools live in JSON configuration files, decoupled from UI code.

Planned Features

System

Description

Dashboard

Customizable Status Window showing Rank, Level, XP bar, Stats, Daily Quests, and Streak.

Activity Log

Unified timeline for water, meals, workouts, focus sessions, rest days, and custom habits.

Workout & Plan

Rep counter, background-safe workout timer, weekly training plan (with built-in Rest Days), and history charts.

Pomodoro Timer

Focus timer with task naming; awards XP upon completing a real-time verified session.

Dynamic Quests

Daily, Weekly, Milestone, Personal, and Comeback Quests tailored to your class and schedule.

Rank System

8 progression tiers from E – Dormant up to Monarch.

Player Stats

STR (Strength), VIT (Vitality), INT (Intellect), and WIL (Willpower) that grow with your habits.

Journal & Mood

Daily diary, mood tracker, calendar view, and non-judgmental weekly/monthly recaps.

Advanced features like the AI Food Scanner, Home Screen Widgets, and Camera Pose Detection are planned for later phases once the core loop is rock solid.

Roadmap

Phase 0 — Preparation: Repo setup, JSON configs (xp_config.json, quests.json), wireframes, and Drift SQLite schema.

Phase 1 — Core System: Pure Dart engines (XpEngine, LevelEngine, QuestEngine, StreakEngine), water/meal/workout logging, Pomodoro, Daily Quests, and JSON backup/restore.

Phase 1.5 — Dogfooding & Balancing: Real-world daily testing and XP curve tuning via config files.

Phase 2 — Smart Features: Onboarding quest generator, history charts, Weekly/Milestone Quests, Mood Tracker, Rule-based Adaptive Plan, and AI Food Scanner.

Phase 3 — Advanced: Home Screen Widgets, MediaPipe Pose Detection, media attachments in Journal, and Monarch unlocking rituals.

Tech Stack (100% Free & Open Source)

Framework: Flutter + Dart

Local Database: SQLite via Drift

State Management: Riverpod

Navigation: go_router

Charts & Animations: fl_chart, lottie

Target Platform: Android first (APK distribution), iOS later.

Getting Started (Once Code is Available)

Note: These commands are placeholders for Phase 1.

git clone <repo-url>
cd awakened
flutter pub get
flutter run


Documentation & Wiki

File / Link

Description

Awakened.md

Full System Requirements, XP/Level Formulas, Database Schema, Architecture, and Build Guide.

Awakened-Onboarding-Questionnaire.md

21-Question Onboarding Design, Player Classes, Stats (STR/VIT/INT/WIL), and Dynamic Quest Engine.

GitHub Wiki

Check the /wiki directory or the repository's Wiki tab for structured documentation.

Contributing

While there is no code to submit PRs for yet, your feedback is super valuable:

Review the specification documents and point out any logical gaps or balance issues.

Test-read the Onboarding Questionnaire and let us know if any questions feel awkward or overwhelming.

Suggest practical Daily Quests for different tiers and lifestyles by opening an Issue.

Medical Disclaimer

Awakened is a habit-building and self-improvement tool, not a medical device. It does not provide medical advice or diagnoses. Please consult a healthcare professional before starting a new exercise regimen, especially if you have pre-existing health conditions or injuries.

ภาษาไทย

Awakened คือแอปมือถือดูแลสุขภาพและพัฒนาตัวเองที่นำระบบเกม RPG มาผสมผสานกับชีวิตประจำวัน ไม่ว่าจะเป็นการออกกำลังกาย ดื่มน้ำ จดอาหาร จับเวลาโฟกัส (Pomodoro) หรือเขียนไดอารี่ ทุกกิจกรรมจะถูกแปลงเป็น XP เพื่ออัปเกรด Level, เพิ่มค่าสถานะ (Stats) และเลื่อนระดับ Rank ตั้งแต่ผู้หลับใหล (E – Dormant) ไปจนถึงจักรพรรดิแห่งนิสัย (Monarch)

สถานะปัจจุบัน

ยังอยู่ในช่วงวางแผนและออกแบบระบบ (ยังไม่มีโค้ดแอป) ในคลังเก็บข้อมูล (repo) นี้มีเฉพาะเอกสารโครงสร้างและการออกแบบ ตัวแอปจะเริ่มพัฒนาตามลำดับ Phase เร็ว ๆ นี้ หากเข้ามาแล้วไม่พบโค้ดสำหรับรัน ไม่ได้ตกหล่นแต่อย่างใด

ทำไมถึงสร้างโปรเจกต์นี้

แอปสุขภาพส่วนใหญ่ทำหน้าที่เพียงจดตัวเลขแล้วปล่อยให้ผู้ใช้หาแรงจูงใจเอง ปัญหาคลาสสิกที่ทำให้คนเลิกใช้คือ "พลาดแค่วันเดียวแล้วรู้สึกว่าสิ่งที่ทำมาพังหมด" จนพาลเลิกทำไปเลย

Awakened จึงออกแบบมาเพื่อแก้ปัญหานี้โดยเฉพาะ:

ไม่หักคะแนน ไม่ลงโทษ: หากคุณพักหรือหลุดแผน XP, เลเวล และค่าสถานะที่สะสมไว้จะไม่มีวันลดลง

วันพักคือส่วนหนึ่งของความก้าวหน้า: วันพักที่วางแผนไว้ (Rest Day) นับเป็นวันที่ทำสำเร็จตามแผนและได้รับ XP

Comeback Quest แทนบทลงโทษ: หากหายไปหลายวัน ระบบจะต้อนรับกลับด้วยเควสต์เบา ๆ เพื่อให้กลับมาเริ่มต้นใหม่ได้ง่ายขึ้นโดยไม่รู้สึกผิด

แนวคิดหลัก

ไม่ลงโทษ (Non-Punitive): XP, เลเวล และค่าสถานะ (STR, VIT, INT, WIL) จะเพิ่มขึ้นเท่านั้น ไม่มีระบบหักคะแนน

เควสต์ประจำวันปรับตามรายบุคคล: มีแบบสอบถามเริ่มต้น 4 ช่วงเพื่อวิเคราะห์เป้าหมาย เวลาที่มี อุปกรณ์ ข้อจำกัดร่างกาย และ "บอสใหญ่" ที่มักทำให้ล้มเลิก เพื่อสร้างเควสต์ที่ทำได้จริงสำหรับคนนั้น

ข้อมูลอยู่ในเครื่อง (Offline-First & Privacy): ไม่ต้องสมัครสมาชิก ไม่มีโฆษณา ข้อมูลเก็บในเครื่องด้วย SQLite ส่งออกหรือลบข้อมูลทั้งหมดได้เอง

โปร่งใสเรื่องค่าประมาณ: ข้อมูลโภชนาการหรือแคลอรีจากภาพถ่ายจะแสดงเป็นช่วงค่าประมาณเสมอ แก้ไขได้ และไม่ผูกการอดอาหารเข้ากับรางวัล XP

ปรับสมดุลได้โดยไม่แตะโค้ด: สูตร XP ตารางเลเวล และคลังเควสต์แยกอยู่ในไฟล์ JSON config

ฟีเจอร์ที่วางแผนไว้

ระบบ

รายละเอียด

Dashboard

หน้าต่างสถานะ (Status Window) แสดง Rank, เลเวล, แถบ XP, ค่าสถานะ, เควสต์วันนี้ และความต่อเนื่อง

Activity Log

บันทึกน้ำ อาหาร ออกกำลังกาย โฟกัส วันพัก และกิจกรรมกำหนดเอง เรียงเป็น Timeline

Workout & Plan

นับครั้ง (Rep Counter), จับเวลาฝึกซ้อม, จัดตารางรายสัปดาห์ (มีวันพัก) และดูกราฟสถิติ

Pomodoro

จับเวลาโฟกัสทำงาน/อ่านหนังสือ ได้รับ XP เมื่อจบรอบตามเวลาจริง

Quest System

เควสต์รายวัน รายสัปดาห์ เป้าหมายระยะยาว (Milestone) เควสต์ส่วนตัว และ Comeback Quest

Rank System

ระบบเลื่อนขั้น 8 ระดับ ตั้งแต่ E – Dormant จนถึง Monarch

Player Stats

ค่าสถานะ STR (พละกำลัง), VIT (ความอึด), INT (ปัญญา/โฟกัส), WIL (วินัย) ที่เติบโตตามเควสต์

Journal & Mood

ไดอารี่ บันทึกอารมณ์ มุมมองปฏิทิน และสรุปภาพรวมรายสัปดาห์แบบไม่ตัดสิน

ฟีเจอร์ขั้นสูง เช่น AI สแกนอาหารจากรูป, วิดเจ็ตหน้าจอโฮม และการตรวจจับท่าออกกำลังกายด้วยกล้อง จะพัฒนาหลังจากระบบพื้นฐานใน Phase 1 ใช้งานได้จริงแล้ว

แผนการพัฒนา (Roadmap)

Phase 0 — เตรียมการ: ตั้งค่าโปรเจกต์, ไฟล์ xp_config.json, ออกแบบหน้าจอ และสร้างฐานข้อมูล Drift

Phase 1 — ระบบหลัก (Core System): สร้าง Engine คำนวณ XP/เลเวล/เควสต์/Streak, บันทึกน้ำ/อาหาร/ออกกำลังกาย, Pomodoro, ไดอารี่ข้อความ และระบบสำรองข้อมูล

Phase 1.5 — ทดลองใช้จริงและปรับสมดุล: ใช้งานเองต่อเนื่องและปรับตัวเลข XP ในไฟล์ config

Phase 2 — ระบบอัจฉริยะ (Smart Features): ระบบสร้างเควสต์จากแบบสอบถาม, กราฟสถิติ, เควสต์รายสัปดาห์, บันทึกอารมณ์, แผนปรับตัวอัตโนมัติ และสแกนอาหาร

Phase 3 — ขั้นสูง (Advanced): วิดเจ็ตหน้าจอหลัก, ตรวจจับท่าด้วยกล้อง (MediaPipe), แนบรูปในไดอารี่ และภารกิจปลดล็อก Monarch

เครื่องมือที่ใช้ (ฟรีและโอเพนซอร์สทั้งหมด)

Framework: Flutter ร่วมกับภาษา Dart

ฐานข้อมูลในเครื่อง: SQLite ผ่านไลบรารี Drift

จัดการสถานะ: Riverpod

กราฟและแอนิเมชัน: fl_chart, lottie

แพลตฟอร์มเป้าหมาย: เริ่มที่ Android ก่อน (ติดตั้งผ่านไฟล์ APK) และขยายไป iOS ในภายหลัง

เอกสารในโปรเจกต์และ Wiki

ไฟล์

เนื้อหา

Awakened.md

เอกสารสเปกฉบับเต็ม สูตรคำนวณ โครงสร้างฐานข้อมูล แผนพัฒนา และวิธีสร้างไฟล์ APK

Awakened-Onboarding-Questionnaire.md

แบบสอบถามเริ่มต้น 21 ข้อ ระบบสายอาชีพ ค่าสถานะ และตรรกะการสร้างเควสต์รายวัน

GitHub Wiki

ดูไฟล์ในโฟลเดอร์ wiki/ สำหรับนำไปใส่ในหน้า GitHub Wiki ของโปรเจกต์

ร่วมแสดงความคิดเห็น

แม้ตอนนี้ยังไม่มีโค้ดให้ส่ง Pull Request แต่คุณสามารถช่วยพัฒนาโปรเจกต์ได้โดยการเปิด Issue เพื่อ:

ชี้จุดที่สเปกหรือสูตรคำนวณดูไม่สมเหตุสมผล

ทดลองอ่านแบบสอบถามแล้วแชร์ว่าข้อไหนรู้สึกอึดอัดหรือเข้าใจยาก

เสนอไอเดียเควสต์ประจำวันที่ทำได้จริงในชีวิตประจำวัน

ข้อจำกัดความรับผิดชอบทางการแพทย์

Awakened เป็นเครื่องมือช่วยสร้างนิสัยและพัฒนาตัวเอง ไม่ใช่เครื่องมือทางการแพทย์ และไม่สามารถใช้แทนคำแนะนำของแพทย์ได้ หากคุณมีโรคประจำตัว บาดเจ็บ หรือมีอาการผิดปกติ ควรปรึกษาแพทย์ก่อนเริ่มออกกำลังกาย

ไลเซนส์ (License)

อยู่ระหว่างการพิจารณาเลือกไลเซนส์โอเพนซอร์ส โดยจะเพิ่มไฟล์ LICENSE ก่อนปล่อยโค้ดชุดแรก
