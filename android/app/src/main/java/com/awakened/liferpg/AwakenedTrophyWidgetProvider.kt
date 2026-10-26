package com.awakened.liferpg

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.graphics.Color
import android.view.View
import android.widget.RemoteViews

class AwakenedTrophyWidgetProvider : AppWidgetProvider() {
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
      val views = RemoteViews(context.packageName, R.layout.awakened_widget_trophy)
      views.setOnClickPendingIntent(R.id.widget_trophy_root, AwakenedWidgetProvider.clickIntent(context))

      val data = AwakenedWidgetProvider.readData(context)
      if (data == null) {
        views.setViewVisibility(R.id.widget_trophy_content, View.GONE)
        views.setViewVisibility(R.id.widget_trophy_empty, View.VISIBLE)
        return views
      }

      views.setViewVisibility(R.id.widget_trophy_content, View.VISIBLE)
      views.setViewVisibility(R.id.widget_trophy_empty, View.GONE)

      val th = data.optString("lang", "en") == "th"
      val rankId = data.optString("rankId", "E")
      val level = data.optInt("level", 1)
      val trophies = data.optInt("trophiesDone", 0)
      val totalTrophies = data.optInt("trophiesTotal", 199)

      val bronze = data.optInt("bronzeDone", 0)
      val silver = data.optInt("silverDone", 0)
      val gold = data.optInt("goldDone", 0)
      val legend = data.optInt("legendDone", 0)

      views.setTextViewText(R.id.widget_trophy_header, if (th) "ห้องถ้วยรางวัล" else "Trophy Room")
      views.setTextViewText(R.id.widget_trophy_rank, "Rank $rankId · Lv.$level")
      views.setTextViewText(R.id.widget_trophy_total, "$trophies / $totalTrophies 🏆")

      views.setTextViewText(R.id.widget_trophy_bronze, "🥉 $bronze/68")
      views.setTextViewText(R.id.widget_trophy_silver, "🥈 $silver/49")
      views.setTextViewText(R.id.widget_trophy_gold, "🥇 $gold/57")
      views.setTextViewText(R.id.widget_trophy_legend, "💎 $legend/25")

      return views
    }
  }
}
