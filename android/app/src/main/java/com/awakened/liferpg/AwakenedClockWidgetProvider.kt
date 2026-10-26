package com.awakened.liferpg

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.graphics.Color
import android.view.View
import android.widget.RemoteViews

class AwakenedClockWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    for (id in appWidgetIds) {
      try {
        appWidgetManager.updateAppWidget(id, buildViews(context))
      } catch (_: Throwable) {}
    }
  }

  override fun onAppWidgetOptionsChanged(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, newOptions: android.os.Bundle?) {
    try {
      appWidgetManager.updateAppWidget(appWidgetId, buildViews(context))
    } catch (_: Throwable) {}
  }

  companion object {
    fun buildViews(context: Context): RemoteViews {
      val views = RemoteViews(context.packageName, R.layout.awakened_widget_clock)
      views.setOnClickPendingIntent(R.id.widget_clock_root, AwakenedWidgetProvider.clickIntent(context))

      val data = AwakenedWidgetProvider.readData(context)
      val th = data?.optString("lang", "en") == "th"

      val alarmTime = data?.optString("alarmTime", "") ?: ""
      val morning = data?.optString("morningReminderTime", "") ?: ""
      val noon = data?.optString("noonReminderTime", "") ?: ""
      val evening = data?.optString("eveningReminderTime", "") ?: ""

      // Alarm info
      if (alarmTime.isNotBlank()) {
        views.setTextViewText(R.id.widget_clock_alarm_text, if (th) "⏰ เวลาปลุก $alarmTime น." else "⏰ Alarm $alarmTime")
        views.setTextColor(R.id.widget_clock_alarm_text, Color.parseColor("#FFB84D"))
      } else {
        views.setTextViewText(R.id.widget_clock_alarm_text, if (th) "⏰ ยังไม่ได้ตั้งเวลาปลุก" else "⏰ Alarm Off")
        views.setTextColor(R.id.widget_clock_alarm_text, Color.parseColor("#7884A8"))
      }

      // Reminders info
      val notifParts = mutableListOf<String>()
      if (morning.isNotBlank()) notifParts.add(if (th) "เช้า $morning" else "Morn $morning")
      if (noon.isNotBlank()) notifParts.add(if (th) "เที่ยง $noon" else "Noon $noon")
      if (evening.isNotBlank()) notifParts.add(if (th) "เย็น $evening" else "Eve $evening")

      if (notifParts.isNotEmpty()) {
        views.setTextViewText(R.id.widget_clock_remind_text, "🔔 " + notifParts.joinToString(" · "))
        views.setTextColor(R.id.widget_clock_remind_text, Color.parseColor("#5B8CFF"))
      } else {
        views.setTextViewText(R.id.widget_clock_remind_text, if (th) "🔔 แจ้งเตือนเควส: ปิดอยู่" else "🔔 Reminders Off")
        views.setTextColor(R.id.widget_clock_remind_text, Color.parseColor("#7884A8"))
      }

      return views
    }
  }
}
