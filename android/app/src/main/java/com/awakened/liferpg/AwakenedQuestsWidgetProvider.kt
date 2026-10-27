package com.awakened.liferpg

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.view.View
import android.widget.RemoteViews
import org.json.JSONArray
import org.json.JSONObject

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

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    if (intent.action == ACTION_COMPLETE_QUEST) {
      val index = intent.getIntExtra(EXTRA_QUEST_INDEX, -1)
      if (index >= 0) {
        handleCompleteQuestFromWidget(context, index)
      }
    }
  }

  companion object {
    const val ACTION_COMPLETE_QUEST = "com.awakened.liferpg.action.COMPLETE_QUEST"
    const val EXTRA_QUEST_INDEX = "quest_index"

    private fun completeQuestPendingIntent(context: Context, index: Int): PendingIntent {
      val intent = Intent(context, AwakenedQuestsWidgetProvider::class.java).apply {
        action = ACTION_COMPLETE_QUEST
        putExtra(EXTRA_QUEST_INDEX, index)
      }
      return PendingIntent.getBroadcast(
        context,
        7400 + index,
        intent,
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
      )
    }

    private fun handleCompleteQuestFromWidget(context: Context, index: Int) {
      try {
        val prefs = context.getSharedPreferences(AwakenedWidgetProvider.PREFS, Context.MODE_PRIVATE)
        val raw = prefs.getString(AwakenedWidgetProvider.KEY_DATA, null) ?: return
        val data = JSONObject(raw)
        val questList = data.optJSONArray("questList") ?: return
        if (index < 0 || index >= questList.length()) return

        val q = questList.optJSONObject(index) ?: return
        if (q.optBoolean("done", false)) return

        val target = q.optInt("target", 1).coerceAtLeast(1)
        val rewardXp = q.optInt("rewardXp", 15)
        q.put("done", true)
        q.put("status", "completed")
        q.put("progress", target)

        var newDone = 0
        for (i in 0 until questList.length()) {
          if (questList.optJSONObject(i)?.optBoolean("done", false) == true) {
            newDone += 1
          }
        }
        val total = data.optInt("questsTotal", questList.length())
        data.put("questsDone", newDone)

        val bonusXp = if (total > 0 && newDone >= total) 30 else 0
        val prevXpToday = data.optInt("xpEarnedToday", 0)
        data.put("xpEarnedToday", prevXpToday + rewardXp + bonusXp)

        val pendingRaw = prefs.getString(AwakenedWidgetProvider.KEY_PENDING_ACTIONS, "[]") ?: "[]"
        val pendingArr = try { JSONArray(pendingRaw) } catch (_: Throwable) { JSONArray() }
        val actionObj = JSONObject().apply {
          put("type", "complete_quest")
          put("questId", q.optInt("id", index + 1))
          put("templateId", q.optString("templateId", ""))
          put("occurredAt", System.currentTimeMillis())
        }
        pendingArr.put(actionObj)

        prefs.edit()
          .putString(AwakenedWidgetProvider.KEY_DATA, data.toString())
          .putString(AwakenedWidgetProvider.KEY_PENDING_ACTIONS, pendingArr.toString())
          .apply()

        AwakenedWidgetProvider.updateAll(context)
        AwakenedNativeModule.notifyWidgetAction()
      } catch (_: Throwable) {
      }
    }

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
      val hideWhenLocked = data.optBoolean("hideQuestsWhenLocked", false)
      val questsDone = if (fresh) data.optInt("questsDone", 0) else 0
      val questsTotal = data.optInt("questsTotal", 0)
      val xpEarnedToday = if (fresh) data.optInt("xpEarnedToday", 0) else 0

      views.setTextViewText(R.id.widget_quests_header, if (th) "เควสประจำวัน" else "Daily Quests")
      val allDone = questsTotal > 0 && questsDone >= questsTotal

      if (restDay) {
        val badgeText = if (questsTotal > 0) {
          if (th) "วันพัก ไม่บังคับ · $questsDone/$questsTotal" else "Rest Optional · $questsDone/$questsTotal"
        } else {
          if (th) "วันพักผ่อน" else "Rest Day"
        }
        views.setTextViewText(R.id.widget_quests_badge, badgeText)
        views.setTextColor(R.id.widget_quests_badge, Color.parseColor(if (allDone) "#3DDC97" else "#7884A8"))
      } else {
        views.setTextViewText(R.id.widget_quests_badge, "$questsDone/$questsTotal")
        views.setTextColor(R.id.widget_quests_badge, Color.parseColor(if (allDone) "#3DDC97" else "#5B8CFF"))
      }

      val questList = data.optJSONArray("questList") ?: JSONArray()
      val itemIds = intArrayOf(R.id.quest_item_1, R.id.quest_item_2, R.id.quest_item_3, R.id.quest_item_4)
      val textIds = intArrayOf(R.id.quest_text_1, R.id.quest_text_2, R.id.quest_text_3, R.id.quest_text_4)
      val iconIds = intArrayOf(R.id.quest_icon_1, R.id.quest_icon_2, R.id.quest_icon_3, R.id.quest_icon_4)

      if (hideWhenLocked) {
        views.setViewVisibility(R.id.quest_list_container, View.GONE)
        views.setViewVisibility(R.id.quest_rest_hint, View.VISIBLE)
        views.setTextColor(R.id.quest_rest_hint, Color.parseColor("#7884A8"))
        views.setTextViewText(
          R.id.quest_rest_hint,
          if (th) "🔒 ซ่อนรายละเอียดเมื่อล็อกแอป · เควสวันนี้ $questsDone/$questsTotal (แตะเพื่อเปิดแอป)"
          else "🔒 Details hidden while locked · Quests today $questsDone/$questsTotal"
        )
        return views
      }

      if (questList.length() == 0) {
        views.setViewVisibility(R.id.quest_list_container, View.GONE)
        views.setViewVisibility(R.id.quest_rest_hint, View.VISIBLE)
        views.setTextColor(R.id.quest_rest_hint, Color.parseColor("#7884A8"))
        views.setTextViewText(
          R.id.quest_rest_hint,
          if (th) "เปิดแอปเพื่อโหลดเควสวันนี้" else "Open app to load quests"
        )
        return views
      }

      // Show hint banner if all quests are completed OR if it's a rest day
      if (allDone) {
        views.setViewVisibility(R.id.quest_rest_hint, View.VISIBLE)
        views.setTextColor(R.id.quest_rest_hint, Color.parseColor("#3DDC97"))
        val xpSuffix = if (xpEarnedToday > 0) " (+${xpEarnedToday} XP)" else ""
        views.setTextViewText(
          R.id.quest_rest_hint,
          if (th) "🎉 ทำครบทุกเควสวันนี้แล้ว!$xpSuffix"
          else "🎉 All daily quests completed today!$xpSuffix"
        )
      } else if (restDay) {
        views.setViewVisibility(R.id.quest_rest_hint, View.VISIBLE)
        views.setTextColor(R.id.quest_rest_hint, Color.parseColor("#7884A8"))
        views.setTextViewText(
          R.id.quest_rest_hint,
          if (th) "🧘 วันพักไม่หัก EXP · แตะเควสเพื่อทำและรับ EXP ปกติได้"
          else "🧘 Rest day (no penalty) · Tap any quest to complete for normal EXP"
        )
      } else {
        views.setViewVisibility(R.id.quest_rest_hint, View.GONE)
      }

      views.setViewVisibility(R.id.quest_list_container, View.VISIBLE)
      for (i in 0 until 4) {
        if (i < questList.length()) {
          val q = questList.getJSONObject(i)
          val title = q.optString("title", "")
          val done = q.optBoolean("done", false)
          val rewardXp = q.optInt("rewardXp", 0)
          val displayTitle = if (rewardXp > 0) "$title (+${rewardXp} XP)" else title

          views.setViewVisibility(itemIds[i], View.VISIBLE)
          views.setTextViewText(textIds[i], displayTitle)
          views.setTextViewText(iconIds[i], if (done) "✔" else "⭕")
          views.setTextColor(iconIds[i], Color.parseColor(if (done) "#3DDC97" else "#7884A8"))
          views.setTextColor(textIds[i], Color.parseColor(if (done) "#8A94A6" else "#F3F6FF"))
          if (done) {
            views.setOnClickPendingIntent(itemIds[i], AwakenedWidgetProvider.clickIntent(context))
          } else {
            views.setOnClickPendingIntent(itemIds[i], completeQuestPendingIntent(context, i))
          }
        } else {
          views.setViewVisibility(itemIds[i], View.GONE)
        }
      }

      return views
    }
  }
}
