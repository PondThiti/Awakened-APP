import { LanguageCode } from './types';

export interface AdaptivePlanInput {
  availableMinutesPerDay: number;
  isRestModeToday: boolean;
  consecutiveWeeksMissedGoal: number;
  consecutiveWeeksExceededGoal: number;
  currentWeeklyGoalDays: number;
  language: LanguageCode;
}

export interface AdaptivePlanRecommendation {
  id: string;
  type: 'short_routine' | 'recovery_mode' | 'lower_goal' | 'raise_goal' | 'steady';
  title: string;
  description: string;
  actionLabel?: string;
  suggestedWeeklyGoalDays?: number;
}

/**
 * Section 6.8: Rule-based Adaptive Personal Plan
 * Principle: System only SUGGESTS; user always decides; tone is supportive and never guilt-inducing.
 */
export function evaluateAdaptivePlan(input: AdaptivePlanInput): AdaptivePlanRecommendation[] {
  const recs: AdaptivePlanRecommendation[] = [];
  const isTh = input.language === 'th';

  if (input.isRestModeToday) {
    recs.push({
      id: 'rec_recovery_active',
      type: 'recovery_mode',
      title: isTh ? '🌿 โหมดวันพักและฟื้นฟู (Recovery Day)' : '🌿 Recovery Mode Active',
      description: isTh
        ? 'วันนี้คือวันพักตามแผน ระบบเปลี่ยน Daily Quest เป็นชุดดูแลตัวเองเบา ๆ (ดื่มน้ำ ยืดเหยียด เขียนบันทึก) การพักก็เป็นส่วนหนึ่งของความก้าวหน้า'
        : 'Today is your recovery day. Daily Quests are switched to gentle self-care (hydration, stretching, journaling). Rest is part of growth.',
    });
  }

  if (input.availableMinutesPerDay < 20) {
    recs.push({
      id: 'rec_short_time',
      type: 'short_routine',
      title: isTh ? '⚡ แผนกิจกรรมสั้น 10 นาที (Micro-Habits)' : '⚡ 10-Minute Micro-Habits Mode',
      description: isTh
        ? `คุณตั้งเวลาว่างไว้ ${input.availableMinutesPerDay} นาที/วัน ระบบจึงปรับเควสต์ให้เน้นกิจกรรมสั้น ๆ 10 นาทีที่ทำสำเร็จได้จริงโดยไม่ตึงเกินไป`
        : `With ${input.availableMinutesPerDay} min/day available, quests prioritize quick 10-minute habits you can realistically complete.`,
    });
  }

  if (input.consecutiveWeeksMissedGoal >= 2 && input.currentWeeklyGoalDays > 2) {
    const newGoal = Math.max(2, input.currentWeeklyGoalDays - 1);
    recs.push({
      id: 'rec_lower_goal',
      type: 'lower_goal',
      title: isTh ? '💡 ข้อเสนอปรับลดเป้าหมายให้พอดีชีวิต' : '💡 Gentle Goal Adjustment Available',
      description: isTh
        ? `ช่วง 2 สัปดาห์ที่ผ่านมาดูยุ่งกว่าปกติ อยากลองปรับเป้าสัปดาห์เป็น ${newGoal} วัน/สัปดาห์ไหม? (XP และเลเวลเดิมอยู่ครบ 100%)`
        : `The last 2 weeks looked busy. Would you like to adjust your weekly target to ${newGoal} days/week? (Your XP and Level stay 100% intact.)`,
      actionLabel: isTh ? `ปรับเป็น ${newGoal} วัน/สัปดาห์` : `Adjust to ${newGoal} days/week`,
      suggestedWeeklyGoalDays: newGoal,
    });
  } else if (input.consecutiveWeeksExceededGoal >= 3 && input.currentWeeklyGoalDays < 6) {
    const newGoal = Math.min(7, input.currentWeeklyGoalDays + 1);
    recs.push({
      id: 'rec_raise_goal',
      type: 'raise_goal',
      title: isTh ? '🔥 คุณทำเกินเป้าต่อเนื่อง 3 สัปดาห์แล้ว!' : '🔥 3 Weeks Above Target!',
      description: isTh
        ? `ความสม่ำเสมอของคุณยอดเยี่ยมมาก หากพร้อมท้าทายขึ้น สามารถเพิ่มเป้าสัปดาห์เป็น ${newGoal} วัน/สัปดาห์ได้ตามใจชอบ`
        : `Your consistency has been stellar! If you'd like, you can raise your weekly target to ${newGoal} days/week.`,
      actionLabel: isTh ? `เพิ่มเป็น ${newGoal} วัน/สัปดาห์` : `Increase to ${newGoal} days/week`,
      suggestedWeeklyGoalDays: newGoal,
    });
  }

  if (recs.length === 0) {
    recs.push({
      id: 'rec_steady',
      type: 'steady',
      title: isTh ? '✨ แผนปัจจุบันสมดุลดีแล้ว' : '✨ Current Plan is Balanced',
      description: isTh
        ? 'ก้าวต่อไปตามจังหวะของตัวเอง ความสม่ำเสมอสำคัญกว่าความสมบูรณ์แบบ'
        : 'Keep going at your own pace. Consistency matters more than perfection.',
    });
  }

  return recs;
}
