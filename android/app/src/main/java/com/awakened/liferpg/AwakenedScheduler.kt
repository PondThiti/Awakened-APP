package com.awakened.liferpg

import android.Manifest
import android.annotation.SuppressLint
import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import org.json.JSONObject
import java.util.Calendar

/** Reminder / alarm-clock scheduling + notification posting helpers. */
object AwakenedAlarmPlayer {
  private var activeRingtone: android.media.Ringtone? = null
  private val handler = android.os.Handler(android.os.Looper.getMainLooper())
  private val stopRunnable = Runnable { stop() }

  @Synchronized
  fun play(context: Context, durationMs: Long = 60_000L) {
    try {
      stop()
      val alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
        ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
        ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
      val r = RingtoneManager.getRingtone(context.applicationContext, alarmUri)
      if (r != null) {
        if (Build.VERSION.SDK_INT >= 21) {
          r.audioAttributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        } else {
          @Suppress("DEPRECATION")
          r.streamType = android.media.AudioManager.STREAM_ALARM
        }
        r.play()
        activeRingtone = r
        handler.removeCallbacks(stopRunnable)
        if (durationMs > 0) {
          handler.postDelayed(stopRunnable, durationMs)
        }
      }
    } catch (_: Throwable) {
    }
  }

  @Synchronized
  fun stop() {
    try {
      handler.removeCallbacks(stopRunnable)
      activeRingtone?.stop()
      activeRingtone = null
    } catch (_: Throwable) {
    }
  }

  @Synchronized
  fun isPlaying(): Boolean = activeRingtone?.isPlaying == true
}

object AwakenedScheduler {
  const val CHANNEL_REMINDERS = "awakened_reminders"
  const val CHANNEL_ALARM = "awakened_alarm_v3"

  const val ACTION_REMINDER = "com.awakened.liferpg.action.REMINDER"
  const val ACTION_ALARM = "com.awakened.liferpg.action.ALARM"
  const val ACTION_SNOOZE = "com.awakened.liferpg.action.SNOOZE"

  const val EXTRA_ID = "id"
  const val EXTRA_TITLE = "title"
  const val EXTRA_BODY = "body"
  const val EXTRA_SNOOZE_LABEL = "snoozeLabel"
  const val EXTRA_IS_SNOOZE = "isSnooze"

  const val PREFS_SCHEDULES = "awakened_schedules"
  const val PREFS_ALARM = "awakened_alarm"

  private const val REMINDER_KEY_PREFIX = "reminder_"
  private const val ALARM_REQUEST_CODE = 7001
  private const val SNOOZE_REQUEST_CODE = 7002
  private const val ALARM_SHOW_REQUEST_CODE = 7003
  private const val ALARM_SNOOZE_ACTION_REQUEST_CODE = 7004
  private const val CONTENT_REQUEST_CODE_BASE = 7200
  private const val ALARM_NOTIFICATION_ID = 9001
  private const val REMINDER_NOTIFICATION_BASE = 10000
  private const val SNOOZE_MS = 10 * 60 * 1000L
  private const val DEFAULT_SNOOZE_LABEL = "Snooze 10 min"

  private const val IMMUTABLE_UPDATE = PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT

  // ---------------------------------------------------------------- permission

  fun canPostNotifications(context: Context): Boolean {
    return try {
      if (Build.VERSION.SDK_INT >= 33 &&
        context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) !=
        PackageManager.PERMISSION_GRANTED
      ) {
        false
      } else {
        NotificationManagerCompat.from(context).areNotificationsEnabled()
      }
    } catch (_: Throwable) {
      false
    }
  }

  // ---------------------------------------------------------------- time math

  private fun isoDay(cal: Calendar): Int = (cal.get(Calendar.DAY_OF_WEEK) + 5) % 7 + 1

  /**
   * Next local time at hour:minute (on one of [days], ISO 1..7; empty = any day)
   * that is strictly after now + [minLeadMs].
   */
  fun nextTrigger(
    hour: Int,
    minute: Int,
    days: Set<Int>,
    skipToday: Boolean,
    minLeadMs: Long
  ): Long {
    val now = System.currentTimeMillis()
    val cal = Calendar.getInstance()
    for (offset in 0..14) {
      cal.timeInMillis = now
      cal.add(Calendar.DAY_OF_YEAR, offset)
      cal.set(Calendar.HOUR_OF_DAY, hour.coerceIn(0, 23))
      cal.set(Calendar.MINUTE, minute.coerceIn(0, 59))
      cal.set(Calendar.SECOND, 0)
      cal.set(Calendar.MILLISECOND, 0)
      if (offset == 0 && skipToday) continue
      if (cal.timeInMillis <= now + minLeadMs) continue
      if (days.isNotEmpty() && isoDay(cal) !in days) continue
      return cal.timeInMillis
    }
    return now + 24L * 60 * 60 * 1000
  }

  // ---------------------------------------------------------------- intents

  private fun mainActivityIntent(context: Context): Intent =
    Intent(context, MainActivity::class.java).apply {
      action = Intent.ACTION_MAIN
      addCategory(Intent.CATEGORY_LAUNCHER)
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
    }

  private fun contentPendingIntent(context: Context, requestCode: Int): PendingIntent =
    PendingIntent.getActivity(context, requestCode, mainActivityIntent(context), IMMUTABLE_UPDATE)

  private fun receiverIntent(context: Context, action: String, data: String): Intent =
    Intent(context, AwakenedAlarmReceiver::class.java).apply {
      this.action = action
      this.data = Uri.parse(data)
    }

  private fun reminderPendingIntent(
    context: Context,
    id: Int,
    title: String? = null,
    body: String? = null
  ): PendingIntent {
    val intent = receiverIntent(context, ACTION_REMINDER, "awakened://reminder/$id").apply {
      putExtra(EXTRA_ID, id)
      if (title != null) putExtra(EXTRA_TITLE, title)
      if (body != null) putExtra(EXTRA_BODY, body)
    }
    return PendingIntent.getBroadcast(context, id, intent, IMMUTABLE_UPDATE)
  }

  private fun alarmPendingIntent(context: Context): PendingIntent {
    val intent = receiverIntent(context, ACTION_ALARM, "awakened://alarm/main")
    return PendingIntent.getBroadcast(context, ALARM_REQUEST_CODE, intent, IMMUTABLE_UPDATE)
  }

  private fun snoozeFirePendingIntent(
    context: Context,
    title: String?,
    body: String?,
    snoozeLabel: String?
  ): PendingIntent {
    val intent = receiverIntent(context, ACTION_ALARM, "awakened://alarm/snooze").apply {
      putExtra(EXTRA_IS_SNOOZE, true)
      if (title != null) putExtra(EXTRA_TITLE, title)
      if (body != null) putExtra(EXTRA_BODY, body)
      if (snoozeLabel != null) putExtra(EXTRA_SNOOZE_LABEL, snoozeLabel)
    }
    return PendingIntent.getBroadcast(context, SNOOZE_REQUEST_CODE, intent, IMMUTABLE_UPDATE)
  }

  private fun alarmManager(context: Context): AlarmManager =
    context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

  // ---------------------------------------------------------------- reminders

  private fun reminderPrefs(context: Context) =
    context.getSharedPreferences(PREFS_SCHEDULES, Context.MODE_PRIVATE)

  fun saveReminder(
    context: Context,
    id: Int,
    hour: Int,
    minute: Int,
    title: String,
    body: String
  ) {
    val json = JSONObject()
      .put("id", id)
      .put("hour", hour)
      .put("minute", minute)
      .put("title", title)
      .put("body", body)
    reminderPrefs(context).edit().putString(REMINDER_KEY_PREFIX + id, json.toString()).apply()
  }

  fun loadReminder(context: Context, id: Int): JSONObject? {
    return try {
      val raw = reminderPrefs(context).getString(REMINDER_KEY_PREFIX + id, null) ?: return null
      JSONObject(raw)
    } catch (_: Throwable) {
      null
    }
  }

  fun loadAllReminders(context: Context): List<JSONObject> {
    val out = ArrayList<JSONObject>()
    try {
      for ((key, value) in reminderPrefs(context).all) {
        if (key.startsWith(REMINDER_KEY_PREFIX) && value is String) {
          try {
            out.add(JSONObject(value))
          } catch (_: Throwable) {
          }
        }
      }
    } catch (_: Throwable) {
    }
    return out
  }

  /** Arms the AlarmManager entry for a reminder (does not persist). */
  @SuppressLint("ScheduleExactAlarm")
  fun armReminder(
    context: Context,
    id: Int,
    hour: Int,
    minute: Int,
    title: String,
    body: String,
    skipToday: Boolean,
    minLeadMs: Long
  ) {
    val triggerAt = nextTrigger(hour, minute, emptySet(), skipToday, minLeadMs)
    val pi = reminderPendingIntent(context, id, title, body)
    val am = alarmManager(context)
    val exactOk = Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms()
    try {
      if (exactOk) {
        am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi)
      } else {
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi)
      }
    } catch (_: SecurityException) {
      am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi)
    }
  }

  fun scheduleReminder(
    context: Context,
    id: Int,
    hour: Int,
    minute: Int,
    title: String,
    body: String,
    skipToday: Boolean
  ) {
    saveReminder(context, id, hour, minute, title, body)
    armReminder(context, id, hour, minute, title, body, skipToday, 0L)
  }

  fun cancelReminder(context: Context, id: Int) {
    try {
      val pi = reminderPendingIntent(context, id)
      alarmManager(context).cancel(pi)
      pi.cancel()
    } catch (_: Throwable) {
    }
    reminderPrefs(context).edit().remove(REMINDER_KEY_PREFIX + id).apply()
  }

  // ---------------------------------------------------------------- alarm clock

  private fun alarmPrefs(context: Context) =
    context.getSharedPreferences(PREFS_ALARM, Context.MODE_PRIVATE)

  fun saveAlarm(
    context: Context,
    hour: Int,
    minute: Int,
    days: Set<Int>,
    title: String,
    body: String,
    snoozeLabel: String
  ) {
    alarmPrefs(context).edit()
      .putBoolean("enabled", true)
      .putInt("hour", hour)
      .putInt("minute", minute)
      .putString("days", days.sorted().joinToString(","))
      .putString("title", title)
      .putString("body", body)
      .putString("snoozeLabel", snoozeLabel)
      .apply()
  }

  private fun alarmDays(csv: String?): Set<Int> {
    if (csv.isNullOrBlank()) return emptySet()
    return csv.split(",").mapNotNull { it.trim().toIntOrNull() }.filter { it in 1..7 }.toSet()
  }

  /** Arms the next occurrence of the saved alarm clock. Returns false when nothing is saved. */
  fun armAlarm(context: Context, minLeadMs: Long): Boolean {
    val prefs = alarmPrefs(context)
    if (!prefs.getBoolean("enabled", false)) return false
    val hour = prefs.getInt("hour", 7)
    val minute = prefs.getInt("minute", 0)
    val days = alarmDays(prefs.getString("days", ""))
    val triggerAt = nextTrigger(hour, minute, days, false, minLeadMs)
    val info = AlarmManager.AlarmClockInfo(
      triggerAt,
      contentPendingIntent(context, ALARM_SHOW_REQUEST_CODE)
    )
    alarmManager(context).setAlarmClock(info, alarmPendingIntent(context))
    return true
  }

  fun cancelAlarm(context: Context) {
    try {
      AwakenedAlarmPlayer.stop()
      val am = alarmManager(context)
      val main = alarmPendingIntent(context)
      am.cancel(main)
      main.cancel()
      val snooze = snoozeFirePendingIntent(context, null, null, null)
      am.cancel(snooze)
      snooze.cancel()
    } catch (_: Throwable) {
    }
    alarmPrefs(context).edit().clear().apply()
    try {
      (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
        .cancel(ALARM_NOTIFICATION_ID)
    } catch (_: Throwable) {
    }
  }

  fun scheduleSnooze(context: Context, title: String?, body: String?, snoozeLabel: String?) {
    AwakenedAlarmPlayer.stop()
    val triggerAt = System.currentTimeMillis() + SNOOZE_MS
    val info = AlarmManager.AlarmClockInfo(
      triggerAt,
      contentPendingIntent(context, ALARM_SHOW_REQUEST_CODE)
    )
    alarmManager(context).setAlarmClock(
      info,
      snoozeFirePendingIntent(context, title, body, snoozeLabel)
    )
  }

  fun cancelAlarmNotification(context: Context) {
    try {
      AwakenedAlarmPlayer.stop()
      (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
        .cancel(ALARM_NOTIFICATION_ID)
    } catch (_: Throwable) {
    }
  }

  /** Re-arms every saved reminder and the alarm clock (boot / package replaced). */
  fun rearmAll(context: Context) {
    for (r in loadAllReminders(context)) {
      try {
        armReminder(
          context,
          r.getInt("id"),
          r.optInt("hour", 9),
          r.optInt("minute", 0),
          r.optString("title", ""),
          r.optString("body", ""),
          false,
          0L
        )
      } catch (_: Throwable) {
      }
    }
    try {
      armAlarm(context, 0L)
    } catch (_: Throwable) {
    }
  }

  // ---------------------------------------------------------------- notifications

  private fun notificationManager(context: Context): NotificationManager =
    context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

  private fun ensureReminderChannel(context: Context) {
    if (Build.VERSION.SDK_INT < 26) return
    val channel = NotificationChannel(
      CHANNEL_REMINDERS,
      "Reminders",
      NotificationManager.IMPORTANCE_DEFAULT
    )
    notificationManager(context).createNotificationChannel(channel)
  }

  private fun alarmSoundUri(): Uri =
    RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
      ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

  private val VIBRATION = longArrayOf(0, 600, 400, 600, 400, 600)

  private fun ensureAlarmChannel(context: Context) {
    if (Build.VERSION.SDK_INT < 26) return
    val channel = NotificationChannel(
      CHANNEL_ALARM,
      "Daily mission alarm",
      NotificationManager.IMPORTANCE_HIGH
    ).apply {
      setSound(
        alarmSoundUri(),
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_ALARM)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build()
      )
      enableVibration(true)
      vibrationPattern = VIBRATION
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
    }
    notificationManager(context).createNotificationChannel(channel)
  }

  @SuppressLint("MissingPermission")
  fun postReminderNotification(context: Context, id: Int, title: String, body: String) {
    if (!canPostNotifications(context)) return
    ensureReminderChannel(context)
    val notification = NotificationCompat.Builder(context, CHANNEL_REMINDERS)
      .setSmallIcon(R.drawable.ic_stat_awakened)
      .setContentTitle(title)
      .setContentText(body)
      .setStyle(NotificationCompat.BigTextStyle().bigText(body))
      .setPriority(NotificationCompat.PRIORITY_DEFAULT)
      .setContentIntent(contentPendingIntent(context, CONTENT_REQUEST_CODE_BASE))
      .setAutoCancel(true)
      .build()
    notificationManager(context).notify(REMINDER_NOTIFICATION_BASE + id, notification)
  }

  @SuppressLint("MissingPermission")
  fun postAlarmNotification(context: Context, title: String, body: String, snoozeLabel: String) {
    if (!canPostNotifications(context)) return
    ensureAlarmChannel(context)

    val contentPi = contentPendingIntent(context, CONTENT_REQUEST_CODE_BASE + 1)
    val snoozeIntent = receiverIntent(context, ACTION_SNOOZE, "awakened://alarm/snooze-action").apply {
      putExtra(EXTRA_TITLE, title)
      putExtra(EXTRA_BODY, body)
      putExtra(EXTRA_SNOOZE_LABEL, snoozeLabel)
    }
    val snoozePi = PendingIntent.getBroadcast(
      context,
      ALARM_SNOOZE_ACTION_REQUEST_CODE,
      snoozeIntent,
      IMMUTABLE_UPDATE
    )

    val builder = NotificationCompat.Builder(context, CHANNEL_ALARM)
      .setSmallIcon(R.drawable.ic_stat_awakened)
      .setContentTitle(title)
      .setContentText(body)
      .setStyle(NotificationCompat.BigTextStyle().bigText(body))
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setContentIntent(contentPi)
      .setFullScreenIntent(contentPi, true)
      .setAutoCancel(true)
      .setTimeoutAfter(60_000L)
      .addAction(0, snoozeLabel, snoozePi)
    if (Build.VERSION.SDK_INT < 26) {
      builder.setSound(alarmSoundUri(), android.media.AudioManager.STREAM_ALARM)
      builder.setVibrate(VIBRATION)
    }
    val notification = builder.build()
    notification.flags = notification.flags or Notification.FLAG_INSISTENT
    notificationManager(context).notify(ALARM_NOTIFICATION_ID, notification)
    AwakenedAlarmPlayer.play(context, 60_000L)
  }

  fun defaultSnoozeLabel(): String = DEFAULT_SNOOZE_LABEL

  fun savedAlarmString(context: Context, key: String, default: String): String =
    alarmPrefs(context).getString(key, default) ?: default
}
