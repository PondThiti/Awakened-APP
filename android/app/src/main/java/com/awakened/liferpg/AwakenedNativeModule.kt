package com.awakened.liferpg

import android.Manifest
import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.ClipData
import android.content.ClipboardManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.database.Cursor
import android.media.AudioManager
import android.media.ToneGenerator
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.OpenableColumns
import android.provider.Settings
import android.view.WindowManager
import androidx.core.content.pm.ShortcutInfoCompat
import androidx.core.content.pm.ShortcutManagerCompat
import androidx.core.graphics.drawable.IconCompat
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import com.facebook.react.ReactPackage
import com.facebook.react.uimanager.ViewManager
import java.util.Locale

class AwakenedNativeModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private var pickImagePromise: Promise? = null
  private var pickProfileImagePromise: Promise? = null
  private val PICK_IMAGE_REQUEST = 49102
  private val PICK_PROFILE_IMAGE_REQUEST = 49103
  private val POST_NOTIFICATIONS_REQUEST = 49104

  init {
    reactContext.addActivityEventListener(object : BaseActivityEventListener() {
      override fun onActivityResult(
        activity: Activity?,
        requestCode: Int,
        resultCode: Int,
        data: Intent?
      ) {
        if (requestCode == PICK_IMAGE_REQUEST) {
          val promise = pickImagePromise
          pickImagePromise = null
          if (promise == null) return

          if (resultCode == Activity.RESULT_OK && data?.data != null) {
            val uri: Uri = data.data!!
            val name = resolveDisplayName(uri) ?: uri.lastPathSegment ?: "food_scan.jpg"
            promise.resolve(name)
          } else {
            promise.resolve(null)
          }
        } else if (requestCode == PICK_PROFILE_IMAGE_REQUEST) {
          val promise = pickProfileImagePromise
          pickProfileImagePromise = null
          if (promise == null) return

          if (resultCode == Activity.RESULT_OK && data?.data != null) {
            try {
              val uri: Uri = data.data!!
              val bitmap = AwakenedImages.decodeProfileSquare(reactContext, uri, 512)
              if (bitmap != null) {
                val file = AwakenedImages.saveAvatar(reactContext, bitmap)
                promise.resolve("file://${file.absolutePath}")
              } else {
                promise.resolve(null)
              }
            } catch (_: Throwable) {
              promise.resolve(null)
            }
          } else {
            promise.resolve(null)
          }
        }
      }
    })
  }

  private fun resolveDisplayName(uri: Uri): String? {
    var cursor: Cursor? = null
    return try {
      cursor = reactContext.contentResolver.query(uri, null, null, null, null)
      if (cursor != null && cursor.moveToFirst()) {
        val idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
        if (idx >= 0) cursor.getString(idx) else null
      } else {
        null
      }
    } catch (_: Throwable) {
      null
    } finally {
      cursor?.close()
    }
  }

  override fun getName(): String = "AwakenedNative"

  @ReactMethod
  fun setKeepScreenOn(enabled: Boolean) {
    val activity = currentActivity ?: return
    activity.runOnUiThread {
      try {
        if (enabled) {
          activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        } else {
          activity.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
      } catch (_: Throwable) {
      }
    }
  }

  @ReactMethod
  fun playTone(type: String) {
    try {
      val toneGen = ToneGenerator(AudioManager.STREAM_NOTIFICATION, 65)
      val toneType = when (type) {
        "rankUp", "levelUp" -> ToneGenerator.TONE_PROP_ACK
        "quest" -> ToneGenerator.TONE_PROP_BEEP2
        else -> ToneGenerator.TONE_PROP_BEEP
      }
      toneGen.startTone(toneType, 160)
      Handler(Looper.getMainLooper()).postDelayed({
        try {
          toneGen.release()
        } catch (_: Throwable) {
        }
      }, 250)
    } catch (_: Throwable) {
    }
  }

  @ReactMethod
  fun pickImage(promise: Promise) {
    val activity = currentActivity
    if (activity == null) {
      promise.resolve(null)
      return
    }
    pickImagePromise = promise
    try {
      val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
        addCategory(Intent.CATEGORY_OPENABLE)
        type = "image/*"
      }
      activity.startActivityForResult(intent, PICK_IMAGE_REQUEST)
    } catch (_: Throwable) {
      pickImagePromise = null
      promise.resolve(null)
    }
  }

  @ReactMethod
  fun pickProfileImage(promise: Promise) {
    val activity = currentActivity
    if (activity == null) {
      promise.resolve(null)
      return
    }
    pickProfileImagePromise = promise
    try {
      val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
        addCategory(Intent.CATEGORY_OPENABLE)
        type = "image/*"
      }
      activity.startActivityForResult(intent, PICK_PROFILE_IMAGE_REQUEST)
    } catch (_: Throwable) {
      pickProfileImagePromise = null
      promise.resolve(null)
    }
  }

  @ReactMethod
  fun getNotificationPermissionStatus(promise: Promise) {
    val granted = AwakenedScheduler.canPostNotifications(reactContext)
    promise.resolve(if (granted) "granted" else "denied")
  }

  @ReactMethod
  fun requestNotificationPermission(promise: Promise) {
    if (Build.VERSION.SDK_INT >= 33) {
      val activity = currentActivity
      if (activity is PermissionAwareActivity) {
        if (activity.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) ==
          PackageManager.PERMISSION_GRANTED
        ) {
          promise.resolve(true)
        } else {
          activity.requestPermissions(
            arrayOf(Manifest.permission.POST_NOTIFICATIONS),
            POST_NOTIFICATIONS_REQUEST,
            object : PermissionListener {
              override fun onRequestPermissionsResult(
                requestCode: Int,
                permissions: Array<String>,
                grantResults: IntArray
              ): Boolean {
                if (requestCode == POST_NOTIFICATIONS_REQUEST) {
                  val granted = grantResults.isNotEmpty() &&
                    grantResults[0] == PackageManager.PERMISSION_GRANTED
                  promise.resolve(granted)
                  return true
                }
                return false
              }
            }
          )
        }
      } else {
        promise.resolve(AwakenedScheduler.canPostNotifications(reactContext))
      }
    } else {
      promise.resolve(AwakenedScheduler.canPostNotifications(reactContext))
    }
  }

  @ReactMethod
  fun openNotificationSettings() {
    try {
      val intent = if (Build.VERSION.SDK_INT >= 26) {
        Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
          putExtra(Settings.EXTRA_APP_PACKAGE, reactContext.packageName)
          flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
      } else {
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
          data = Uri.parse("package:" + reactContext.packageName)
          flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
      }
      reactContext.startActivity(intent)
    } catch (_: Throwable) {
    }
  }

  @ReactMethod
  fun scheduleReminder(
    id: Double,
    hour: Double,
    minute: Double,
    title: String,
    body: String,
    skipToday: Boolean
  ) {
    try {
      AwakenedScheduler.scheduleReminder(
        reactContext,
        id.toInt(),
        hour.toInt(),
        minute.toInt(),
        title,
        body,
        skipToday
      )
    } catch (_: Throwable) {
    }
  }

  @ReactMethod
  fun cancelReminder(id: Double) {
    try {
      AwakenedScheduler.cancelReminder(reactContext, id.toInt())
    } catch (_: Throwable) {
    }
  }

  @ReactMethod
  fun scheduleAlarm(
    hour: Double,
    minute: Double,
    days: ReadableArray,
    title: String,
    body: String,
    snoozeLabel: String
  ) {
    try {
      val set = mutableSetOf<Int>()
      for (i in 0 until days.size()) {
        set.add(days.getInt(i))
      }
      AwakenedScheduler.saveAlarm(
        reactContext,
        hour.toInt(),
        minute.toInt(),
        set,
        title,
        body,
        snoozeLabel
      )
      AwakenedScheduler.armAlarm(reactContext, 0L)
    } catch (_: Throwable) {
    }
  }

  @ReactMethod
  fun cancelAlarm() {
    try {
      AwakenedScheduler.cancelAlarm(reactContext)
    } catch (_: Throwable) {
    }
  }

  @ReactMethod
  fun updateWidgetData(json: String) {
    try {
      reactContext.getSharedPreferences(AwakenedWidgetProvider.PREFS, Context.MODE_PRIVATE)
        .edit()
        .putString(AwakenedWidgetProvider.KEY_DATA, json)
        .apply()
      AwakenedWidgetProvider.updateAll(reactContext)
    } catch (_: Throwable) {
    }
  }

  @ReactMethod
  fun requestPinWidget(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT >= 26) {
        val appWidgetManager = reactContext.getSystemService(AppWidgetManager::class.java)
        val myProvider = ComponentName(reactContext, AwakenedWidgetProvider::class.java)
        if (appWidgetManager != null && appWidgetManager.isRequestPinAppWidgetSupported) {
          val success = appWidgetManager.requestPinAppWidget(myProvider, null, null)
          promise.resolve(success)
          return
        }
      }
      promise.resolve(false)
    } catch (_: Throwable) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun requestPinShortcut(label: String, avatarPath: String?, promise: Promise) {
    try {
      if (!ShortcutManagerCompat.isRequestPinShortcutSupported(reactContext)) {
        promise.resolve(false)
        return
      }
      val launchIntent = Intent(reactContext, MainActivity::class.java).apply {
        action = Intent.ACTION_MAIN
        addCategory(Intent.CATEGORY_LAUNCHER)
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
      }
      val icon = if (!avatarPath.isNullOrBlank()) {
        val bmp = AwakenedImages.loadAvatar(avatarPath, 192)
        if (bmp != null) {
          val circle = AwakenedImages.circleCrop(bmp, 192)
          IconCompat.createWithBitmap(circle)
        } else {
          IconCompat.createWithResource(reactContext, R.mipmap.ic_launcher)
        }
      } else {
        IconCompat.createWithResource(reactContext, R.mipmap.ic_launcher)
      }
      val shortcut = ShortcutInfoCompat.Builder(reactContext, "awakened_user_profile_shortcut")
        .setShortLabel(label.ifBlank { "Awakened" })
        .setLongLabel(label.ifBlank { "Awakened" })
        .setIcon(icon)
        .setIntent(launchIntent)
        .build()
      val success = ShortcutManagerCompat.requestPinShortcut(reactContext, shortcut, null)
      promise.resolve(success)
    } catch (_: Throwable) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun copyToClipboard(text: String) {
    try {
      val clipboard = reactContext.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
      val clip = ClipData.newPlainText("Awakened", text)
      clipboard.setPrimaryClip(clip)
    } catch (_: Throwable) {
    }
  }

  @ReactMethod
  fun getDeviceRegion(promise: Promise) {
    try {
      val country = Locale.getDefault().country ?: ""
      promise.resolve(country.uppercase(Locale.US))
    } catch (_: Throwable) {
      promise.resolve("")
    }
  }
}

class AwakenedNativePackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    return listOf(AwakenedNativeModule(reactContext))
  }

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
    return emptyList()
  }
}
