package com.awakened.liferpg

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Fires reminders / the daily alarm and handles the snooze action. */
class AwakenedAlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    try {
      when (intent?.action) {
        AwakenedScheduler.ACTION_REMINDER -> handleReminder(context, intent)
        AwakenedScheduler.ACTION_ALARM -> handleAlarm(context, intent)
        AwakenedScheduler.ACTION_SNOOZE -> handleSnooze(context, intent)
      }
    } catch (_: Throwable) {
    }
  }

  private fun handleReminder(context: Context, intent: Intent) {
    val id = intent.getIntExtra(AwakenedScheduler.EXTRA_ID, Int.MIN_VALUE)
    if (id == Int.MIN_VALUE) return
    // Cancelled (stale) reminders have no stored entry any more.
    val saved = AwakenedScheduler.loadReminder(context, id) ?: return
    val title = saved.optString("title", intent.getStringExtra(AwakenedScheduler.EXTRA_TITLE) ?: "Awakened")
    val body = saved.optString("body", intent.getStringExtra(AwakenedScheduler.EXTRA_BODY) ?: "")

    // Re-arm the next occurrence first so a posting failure can't break the chain.
    try {
      AwakenedScheduler.armReminder(
        context,
        id,
        saved.optInt("hour", 9),
        saved.optInt("minute", 0),
        title,
        body,
        false,
        60_000L
      )
    } catch (_: Throwable) {
    }
    try {
      AwakenedScheduler.postReminderNotification(context, id, title, body)
    } catch (_: Throwable) {
    }
  }

  private fun handleAlarm(context: Context, intent: Intent) {
    val isSnooze = intent.getBooleanExtra(AwakenedScheduler.EXTRA_IS_SNOOZE, false)
    val title = intent.getStringExtra(AwakenedScheduler.EXTRA_TITLE)
      ?: AwakenedScheduler.savedAlarmString(context, "title", "Awakened")
    val body = intent.getStringExtra(AwakenedScheduler.EXTRA_BODY)
      ?: AwakenedScheduler.savedAlarmString(context, "body", "")
    val snoozeLabel = intent.getStringExtra(AwakenedScheduler.EXTRA_SNOOZE_LABEL)
      ?: AwakenedScheduler.savedAlarmString(
        context,
        "snoozeLabel",
        AwakenedScheduler.defaultSnoozeLabel()
      )

    if (!isSnooze) {
      // Alarm may have been cancelled: nothing saved -> armAlarm returns false -> ignore.
      val stillEnabled = try {
        AwakenedScheduler.armAlarm(context, 60_000L)
      } catch (_: Throwable) {
        false
      }
      if (!stillEnabled) return
    }
    try {
      AwakenedScheduler.postAlarmNotification(context, title, body, snoozeLabel)
    } catch (_: Throwable) {
    }
  }

  private fun handleSnooze(context: Context, intent: Intent) {
    AwakenedScheduler.cancelAlarmNotification(context)
    AwakenedScheduler.scheduleSnooze(
      context,
      intent.getStringExtra(AwakenedScheduler.EXTRA_TITLE),
      intent.getStringExtra(AwakenedScheduler.EXTRA_BODY),
      intent.getStringExtra(AwakenedScheduler.EXTRA_SNOOZE_LABEL)
    )
  }
}

/** Re-arms saved reminders + alarm after reboot / app update. */
class AwakenedBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    try {
      when (intent?.action) {
        Intent.ACTION_BOOT_COMPLETED,
        Intent.ACTION_MY_PACKAGE_REPLACED -> {
          AwakenedScheduler.rearmAll(context)
          AwakenedWidgetProvider.updateAll(context)
        }
      }
    } catch (_: Throwable) {
    }
  }
}
