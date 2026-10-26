package com.awakened.liferpg

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.graphics.Color
import android.view.View
import android.widget.RemoteViews
import org.json.JSONArray

class AwakenedQuestsWidgetProvider : AppWidgetProvider() {
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
      val views = RemoteViews(context.packageName, R.layout.awakened_widget_quests)
      views.setOnClickPendingIntent(R.id.widget_quests_root, AwakenedWidgetProvider.clickIntent(context))

      val data = AwakenedWidgetProvider.readData(context)
      if (data == null) {
        views.setViewVisibility(R.id.widget_quests_content, View.GONE)
        views.setViewVisibility(R.id.widget_quests_empty, View.VISIBLE)
        return views
      }

      views.setViewVisibility(R.id.widget_quests_content, View.VISIBLE)
      views.setViewVisibility(R.id.widget_quests_empty, View.GONE)

      val th = data.optString("lang", "en") == "th"
      val fresh = data.optString("dayKey", "") == AwakenedWidgetProvider.todayKey()
      val restDay = data.optBoolean("restDay", false)
      val questsDone = if (fresh) data.optInt("questsDone", 0) else 0
      val questsTotal = data.optInt("questsTotal", 0)

      views.setTextViewText(R.id.widget_quests_header, if (th) "เควสประจำวัน" else "Daily Quests")
      if (restDay) {
        views.setTextViewText(R.id.widget_quests_badge, if (th) "วันพักผ่อน" else "Rest Day")
        views.setTextColor(R.id.widget_quests_badge, Color.parseColor("#7884A8"))
      } else {
        views.setTextViewText(R.id.widget_quests_badge, "$questsDone/$questsTotal")
        val complete = questsTotal > 0 && questsDone >= questsTotal
        views.setTextColor(R.id.widget_quests_badge, Color.parseColor(if (complete) "#3DDC97" else "#5B8CFF"))
      }

      val questList = data.optJSONArray("questList") ?: JSONArray()
      val itemIds = intArrayOf(R.id.quest_item_1, R.id.quest_item_2, R.id.quest_item_3, R.id.quest_item_4)
      val textIds = intArrayOf(R.id.quest_text_1, R.id.quest_text_2, R.id.quest_text_3, R.id.quest_text_4)
      val iconIds = intArrayOf(R.id.quest_icon_1, R.id.quest_icon_2, R.id.quest_icon_3, R.id.quest_icon_4)

      if (restDay || questList.length() == 0) {
        views.setViewVisibility(R.id.quest_list_container, View.GONE)
        views.setViewVisibility(R.id.quest_rest_hint, View.VISIBLE)
        views.setTextViewText(
          R.id.quest_rest_hint,
          if (restDay) (if (th) "🧘 วันนี้เป็นวันพักผ่อน ฟื้นฟูกล้ามเนื้อและพลังงาน" else "🧘 Today is a rest day. Recharge!")
          else (if (th) "เปิดแอปเพื่อโหลดเควสวันนี้" else "Open app to load quests")
        )
      } else {
        views.setViewVisibility(R.id.quest_list_container, View.VISIBLE)
        views.setViewVisibility(R.id.quest_rest_hint, View.GONE)
        for (i in 0 until 4) {
          if (i < questList.length()) {
            val q = questList.getJSONObject(i)
            val title = q.optString("title", "")
            val done = q.optBoolean("done", false)
            views.setViewVisibility(itemIds[i], View.VISIBLE)
            views.setTextViewText(textIds[i], title)
            views.setTextViewText(iconIds[i], if (done) "✔" else "⭕")
            views.setTextColor(iconIds[i], Color.parseColor(if (done) "#3DDC97" else "#7884A8"))
            views.setTextColor(textIds[i], Color.parseColor(if (done) "#8A94A6" else "#F3F6FF"))
          } else {
            views.setViewVisibility(itemIds[i], View.GONE)
          }
        }
      }

      return views
    }
  }
}
