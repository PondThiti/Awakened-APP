package com.awakened.liferpg

import android.app.Activity
import android.content.Intent
import android.database.Cursor
import android.media.AudioManager
import android.media.ToneGenerator
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.provider.OpenableColumns
import android.view.WindowManager
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.uimanager.ViewManager

class AwakenedNativeModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private var pickImagePromise: Promise? = null
  private val PICK_IMAGE_REQUEST = 49102

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
}

class AwakenedNativePackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    return listOf(AwakenedNativeModule(reactContext))
  }

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
    return emptyList()
  }
}
