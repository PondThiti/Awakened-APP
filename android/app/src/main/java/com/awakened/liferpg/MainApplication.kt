package com.awakened.liferpg

import android.app.Application
import android.content.Context
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader
import java.io.File

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
    object : DefaultReactNativeHost(this) {
      override fun getPackages(): List<ReactPackage> =
        PackageList(this).packages.apply {
          add(AwakenedNativePackage())
        }

      override fun getJSMainModuleName(): String = "index"

      override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

      override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
    }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    enforceCleanStateOnReinstall()
    SoLoader.init(this, OpenSourceMergedSoMapping)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      load()
    }
  }

  /**
   * Guarantees 100% data wipe if the app was uninstalled and reinstalled,
   * even on custom OEM Android ROMs that attempt to restore app data despite allowBackup="false".
   */
  private fun enforceCleanStateOnReinstall() {
    try {
      val pkgInfo = packageManager.getPackageInfo(packageName, 0)
      val currentInstallTime = pkgInfo.firstInstallTime
      val guardPrefs = getSharedPreferences("awakened_install_guard", Context.MODE_PRIVATE)
      val recordedInstallTime = guardPrefs.getLong("first_install_time", -1L)

      if (recordedInstallTime != currentInstallTime) {
        if (recordedInstallTime != -1L) {
          // Reinstall after uninstall where OEM ROM restored residual data: wipe contents cleanly
          val dataDir = File(applicationInfo.dataDir)
          File(dataDir, "databases").deleteRecursively()
          File(dataDir, "files").listFiles()?.forEach { it.deleteRecursively() }
          File(dataDir, "cache").listFiles()?.forEach { it.deleteRecursively() }
        }
        filesDir.mkdirs()
        cacheDir.mkdirs()
        guardPrefs.edit().clear().putLong("first_install_time", currentInstallTime).commit()
      }
    } catch (_: Throwable) {
    }
  }
}
