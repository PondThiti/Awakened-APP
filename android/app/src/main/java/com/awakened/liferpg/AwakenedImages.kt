package com.awakened.liferpg

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.graphics.Rect
import android.media.ExifInterface
import android.net.Uri
import java.io.File
import java.io.FileOutputStream

/** Bitmap helpers shared by the native module and the home-screen widget. */
object AwakenedImages {

  /** Strips the `file://` scheme (if any) so the value can be used as a plain path. */
  fun toPlainPath(path: String?): String? {
    if (path.isNullOrBlank()) return null
    return if (path.startsWith("file://")) Uri.parse(path).path else path
  }

  private fun sampleSizeFor(width: Int, height: Int, target: Int): Int {
    var sample = 1
    val minSide = minOf(width, height)
    while (minSide / (sample * 2) >= target) sample *= 2
    return sample
  }

  private fun exifMatrix(orientation: Int): Matrix? {
    val m = Matrix()
    when (orientation) {
      ExifInterface.ORIENTATION_ROTATE_90 -> m.postRotate(90f)
      ExifInterface.ORIENTATION_ROTATE_180 -> m.postRotate(180f)
      ExifInterface.ORIENTATION_ROTATE_270 -> m.postRotate(270f)
      ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> m.postScale(-1f, 1f)
      ExifInterface.ORIENTATION_FLIP_VERTICAL -> m.postScale(1f, -1f)
      ExifInterface.ORIENTATION_TRANSPOSE -> { m.postRotate(90f); m.postScale(-1f, 1f) }
      ExifInterface.ORIENTATION_TRANSVERSE -> { m.postRotate(270f); m.postScale(-1f, 1f) }
      else -> return null
    }
    return m
  }

  /** Center-crops to a square and scales to [size]x[size]. */
  fun centerCropSquare(src: Bitmap, size: Int): Bitmap {
    val side = minOf(src.width, src.height)
    val x = (src.width - side) / 2
    val y = (src.height - side) / 2
    val cropped = Bitmap.createBitmap(src, x, y, side, side)
    val scaled = if (side != size) Bitmap.createScaledBitmap(cropped, size, size, true) else cropped
    if (cropped !== scaled && cropped !== src) cropped.recycle()
    return scaled
  }

  /** Decodes a content/file uri (sampled, EXIF-rotated), crops to a 512 square. */
  fun decodeProfileSquare(context: Context, uri: Uri, size: Int = 512): Bitmap? {
    val resolver = context.contentResolver
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
    if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null

    val opts = BitmapFactory.Options().apply {
      inSampleSize = sampleSizeFor(bounds.outWidth, bounds.outHeight, size)
      inPreferredConfig = Bitmap.Config.ARGB_8888
    }
    var bitmap = resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, opts) }
      ?: return null

    try {
      val orientation = resolver.openInputStream(uri)?.use {
        ExifInterface(it).getAttributeInt(
          ExifInterface.TAG_ORIENTATION,
          ExifInterface.ORIENTATION_NORMAL
        )
      } ?: ExifInterface.ORIENTATION_NORMAL
      val matrix = exifMatrix(orientation)
      if (matrix != null) {
        val rotated = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
        if (rotated !== bitmap) bitmap.recycle()
        bitmap = rotated
      }
    } catch (_: Throwable) {
      // Orientation is best-effort only.
    }

    val result = centerCropSquare(bitmap, size)
    if (result !== bitmap) bitmap.recycle()
    return result
  }

  /** Saves [bitmap] as `avatar_<millis>.jpg` in filesDir and deletes older avatars. */
  fun saveAvatar(context: Context, bitmap: Bitmap): File {
    val file = File(context.filesDir, "avatar_${System.currentTimeMillis()}.jpg")
    FileOutputStream(file).use { out ->
      bitmap.compress(Bitmap.CompressFormat.JPEG, 88, out)
      out.flush()
    }
    context.filesDir.listFiles()?.forEach {
      if (it.isFile && it.name.startsWith("avatar_") && it.name.endsWith(".jpg") &&
        it.absolutePath != file.absolutePath
      ) {
        try { it.delete() } catch (_: Throwable) {}
      }
    }
    return file
  }

  /** Loads an avatar file downsampled so it is at most roughly [maxSize] px; null on failure. */
  fun loadAvatar(path: String?, maxSize: Int): Bitmap? {
    val plain = toPlainPath(path) ?: return null
    return try {
      val file = File(plain)
      if (!file.exists()) return null
      val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
      BitmapFactory.decodeFile(file.absolutePath, bounds)
      if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null
      val opts = BitmapFactory.Options().apply {
        inSampleSize = sampleSizeFor(bounds.outWidth, bounds.outHeight, maxSize)
      }
      BitmapFactory.decodeFile(file.absolutePath, opts)
    } catch (_: Throwable) {
      null
    }
  }

  /** Returns a circular copy of [src] as a square [size] bitmap. */
  fun circleCrop(src: Bitmap, size: Int): Bitmap {
    val square = centerCropSquare(src, size)
    val output = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(output)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    canvas.drawARGB(0, 0, 0, 0)
    canvas.drawCircle(size / 2f, size / 2f, size / 2f, paint)
    paint.xfermode = PorterDuffXfermode(PorterDuff.Mode.SRC_IN)
    canvas.drawBitmap(square, Rect(0, 0, size, size), Rect(0, 0, size, size), paint)
    if (square !== src) square.recycle()
    return output
  }
}
