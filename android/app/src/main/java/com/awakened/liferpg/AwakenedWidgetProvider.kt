package com.awakened.liferpg

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class AwakenedWidgetProvider : AppWidgetProvider() {

  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray
  ) {
    for (id in appWidgetIds) {
      try {
        appWidgetManager.updateAppWidget(id, buildViews(context))
      } catch (_: Throwable) {
      }
    }
  }

  override fun onAppWidgetOptionsChanged(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int,
    newOptions: android.os.Bundle?
  ) {
    try {
      appWidgetManager.updateAppWidget(appWidgetId, buildViews(context))
    } catch (_: Throwable) {
    }
  }

  companion object {
    const val PREFS = "awakened_widget"
    const val KEY_DATA = "data"

    private const val COLOR_PRIMARY = "#5B8CFF"
    private const val COLOR_SUCCESS = "#3DDC97"
    private const val COLOR_WARNING = "#FFB84D"
    private const val COLOR_TEXT = "#F3F6FF"
    private const val COLOR_MUTED = "#7884A8"

    /** Refreshes every placed instance of the widget. Never throws. */
    @JvmStatic
    fun updateAll(context: Context) {
      try {
        val app = context.applicationContext
        val manager = AppWidgetManager.getInstance(app)
        val ids = manager.getAppWidgetIds(ComponentName(app, AwakenedWidgetProvider::class.java))
        if (ids == null || ids.isEmpty()) return
        val views = buildViews(app)
        for (id in ids) {
          try {
            manager.updateAppWidget(id, views)
          } catch (_: Throwable) {
          }
        }
      } catch (_: Throwable) {
      }
    }

    private fun todayKey(): String =
      SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

    private fun clickIntent(context: Context): PendingIntent {
      val launch = Intent(context, MainActivity::class.java).apply {
        action = Intent.ACTION_MAIN
        addCategory(Intent.CATEGORY_LAUNCHER)
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED
      }
      return PendingIntent.getActivity(
        context,
        7100,
        launch,
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
      )
    }

    private fun readData(context: Context): JSONObject? {
      return try {
        val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
          .getString(KEY_DATA, null)
        if (raw.isNullOrBlank()) null
        else JSONObject(raw).let { if (it.length() == 0) null else it }
      } catch (_: Throwable) {
        null
      }
    }

    private fun formatLiters(ml: Int): String {
      val liters = ml / 1000.0
      val s = String.format(Locale.US, "%.1f", liters)
      return s
    }

    fun buildViews(context: Context): RemoteViews {
      val views = RemoteViews(context.packageName, R.layout.awakened_widget)
      views.setOnClickPendingIntent(R.id.widget_root, clickIntent(context))

      val data = readData(context)
      if (data == null) {
        views.setViewVisibility(R.id.widget_content, View.GONE)
        views.setViewVisibility(R.id.widget_empty, View.VISIBLE)
        views.setTextViewText(R.id.widget_empty_title, "Awakened")
        views.setTextViewText(R.id.widget_empty_hint, "เปิดแอปเพื่อซิงก์ข้อมูล / Open the app to sync")
        return views
      }

      views.setViewVisibility(R.id.widget_content, View.VISIBLE)
      views.setViewVisibility(R.id.widget_empty, View.GONE)

      val th = data.optString("lang", "en") == "th"
      val fresh = data.optString("dayKey", "") == todayKey()

      val name = data.optString("name", "").ifBlank { "Awakened" }
      val rankId = data.optString("rankId", "")
      val level = data.optInt("level", 1)
      val xpPct = data.optDouble("xpPct", 0.0).let { if (it.isNaN()) 0.0 else it }
        .coerceIn(0.0, 100.0).toInt()
      val restDay = data.optBoolean("restDay", false)

      val questsDone = if (fresh) data.optInt("questsDone", 0) else 0
      val questsTotal = data.optInt("questsTotal", 0)
      val kcal = if (fresh) data.optInt("kcal", 0) else 0
      val trophies = data.optInt("trophiesDone", 0)
      val alarmTime = data.optString("alarmTime", "")

      views.setTextViewText(R.id.widget_name, name)
      val rankLabel = if (rankId.isBlank()) "" else "Rank $rankId · "
      views.setTextViewText(R.id.widget_rank, "${rankLabel}Lv.$level")
      views.setProgressBar(R.id.widget_xp, 100, xpPct, false)

      // Avatar
      var avatarSet = false
      try {
        val src = AwakenedImages.loadAvatar(data.optString("avatarPath", ""), 160)
        if (src != null) {
          val circle = AwakenedImages.circleCrop(src, 160)
          views.setImageViewBitmap(R.id.widget_avatar, circle)
          avatarSet = true
        }
      } catch (_: Throwable) {
      }
      if (!avatarSet) {
        views.setImageViewResource(R.id.widget_avatar, R.mipmap.ic_launcher_round)
      }

      // Labels: เควสประจำวัน | นาฬิกา | สรุปแคลอรี่ | ถ้วยรางวัล
      views.setTextViewText(R.id.widget_quests_label, if (th) "ภารกิจ" else "Quests")
      views.setTextViewText(
        R.id.widget_clock_label,
        if (alarmTime.isNotBlank()) (if (th) "ปลุก $alarmTime" else "Alarm $alarmTime")
        else (if (th) "นาฬิกา" else "Clock")
      )
      views.setTextViewText(R.id.widget_kcal_label, if (th) "แคลอรี่" else "Calories")
      views.setTextViewText(R.id.widget_trophy_label, if (th) "ถ้วยรางวัล" else "Trophies")

      // 1. เควสประจำวัน (Daily Quests)
      if (restDay) {
        views.setTextViewText(R.id.widget_quests_value, if (th) "พัก" else "Rest")
        views.setTextColor(R.id.widget_quests_value, Color.parseColor(COLOR_MUTED))
      } else {
        views.setTextViewText(R.id.widget_quests_value, "$questsDone/$questsTotal")
        val complete = questsTotal > 0 && questsDone >= questsTotal
        views.setTextColor(
          R.id.widget_quests_value,
          Color.parseColor(if (complete) COLOR_SUCCESS else COLOR_TEXT)
        )
      }

      // 2. นาฬิกา (Clock / Alarm)
      // TextClock updates automatically in layout, but we also ensure text color
      views.setTextColor(R.id.widget_clock_value, Color.parseColor(COLOR_PRIMARY))

      // 3. สรุปแคลอรี่ (Calories)
      views.setTextViewText(R.id.widget_kcal_value, kcal.toString())
      views.setTextColor(R.id.widget_kcal_value, Color.parseColor(COLOR_WARNING))

      // 4. ถ้วยรางวัล (Trophies)
      views.setTextViewText(R.id.widget_trophy_value, "$trophies 🏆")
      views.setTextColor(R.id.widget_trophy_value, Color.parseColor(COLOR_SUCCESS))

      return views
    }
  }
}
