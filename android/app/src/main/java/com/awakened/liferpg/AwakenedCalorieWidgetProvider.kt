package com.awakened.liferpg

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.graphics.Color
import android.view.View
import android.widget.RemoteViews

class AwakenedCalorieWidgetProvider : AppWidgetProvider() {
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
      val views = RemoteViews(context.packageName, R.layout.awakened_widget_calorie)
      views.setOnClickPendingIntent(R.id.widget_calorie_root, AwakenedWidgetProvider.clickIntent(context))

      val data = AwakenedWidgetProvider.readData(context)
      if (data == null) {
        views.setViewVisibility(R.id.widget_calorie_content, View.GONE)
        views.setViewVisibility(R.id.widget_calorie_empty, View.VISIBLE)
        return views
      }

      views.setViewVisibility(R.id.widget_calorie_content, View.VISIBLE)
      views.setViewVisibility(R.id.widget_calorie_empty, View.GONE)

      val th = data.optString("lang", "en") == "th"
      val fresh = data.optString("dayKey", "") == AwakenedWidgetProvider.todayKey()

      val kcal = if (fresh) data.optInt("kcal", 0) else 0
      val goal = data.optInt("kcalGoal", 2000)
      val carbs = if (fresh) data.optInt("carbsG", 0) else 0
      val protein = if (fresh) data.optInt("proteinG", 0) else 0
      val fat = if (fresh) data.optInt("fatG", 0) else 0
      val water = if (fresh) data.optInt("waterMl", 0) else 0

      val pct = if (goal > 0) ((kcal.toDouble() / goal) * 100).toInt().coerceIn(0, 100) else 0

      views.setTextViewText(R.id.widget_calorie_header, if (th) "สรุปแคลอรี่วันนี้" else "Calories Today")
      views.setTextViewText(R.id.widget_calorie_kcal, "$kcal")
      views.setTextViewText(R.id.widget_calorie_goal, "/ $goal kcal")
      views.setProgressBar(R.id.widget_calorie_progress, 100, pct, false)

      views.setTextViewText(
        R.id.widget_calorie_macros,
        if (th) "คาร์บ ${carbs}g · โปรตีน ${protein}g · ไขมัน ${fat}g"
        else "Carb ${carbs}g · Protein ${protein}g · Fat ${fat}g"
      )
      views.setTextViewText(
        R.id.widget_calorie_water,
        if (th) "💧 น้ำดื่มวันนี้: $water มล." else "💧 Water today: ${water} ml"
      )

      return views
    }
  }
}
