package expo.modules.ankidroid

import android.content.ContentResolver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.database.Cursor
import android.net.Uri
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AnkiDroidModule : Module() {
  companion object {
    const val TAG = "AnkiDroidModule"
    const val ANKIDROID_PACKAGE = "com.ichi2.anki"
    const val ANKIDROID_PERMISSION = "com.ichi2.anki.permission.READ_WRITE_DATABASE"
    private const val PERMISSION_REQUEST_CODE = 42

    // ContentProvider URIs
    const val AUTHORITY = "com.ichi2.anki.flashcards"
    val DECKS_URI: Uri = Uri.parse("content://$AUTHORITY/decks")
    val NOTES_URI: Uri = Uri.parse("content://$AUTHORITY/notes")
    val CARDS_URI: Uri = Uri.parse("content://$AUTHORITY/cards")

    // Column names for decks
    const val DECK_ID = "deck_id"
    const val DECK_NAME = "deck_name"
    const val DECK_COUNTS = "deck_count"

    // Column names for cards (CARDS_URI has deck_id, question, answer directly)
    const val NOTE_FLDS = "flds"

    // Broadcast actions
    const val ACTION_SYNC = "com.ichi2.anki.DO_SYNC"
  }

  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("React context is not available")

  private val contentResolver: ContentResolver
    get() = context.contentResolver

  override fun definition() = ModuleDefinition {
    Name("AnkiDroid")

    // Check if AnkiDroid is installed on the device
    AsyncFunction("isInstalled") { promise: Promise ->
      try {
        val packageManager = context.packageManager
        packageManager.getPackageInfo(ANKIDROID_PACKAGE, PackageManager.GET_ACTIVITIES)
        promise.resolve(true)
      } catch (e: PackageManager.NameNotFoundException) {
        promise.resolve(false)
      } catch (e: Exception) {
        promise.reject("CHECK_FAILED", "Failed to check AnkiDroid installation: ${e.message}", e)
      }
    }

    // Check if AnkiDroid API permission is granted
    AsyncFunction("hasApiPermission") { promise: Promise ->
      try {
        val result = ContextCompat.checkSelfPermission(context, ANKIDROID_PERMISSION)
        promise.resolve(result == PackageManager.PERMISSION_GRANTED)
      } catch (e: Exception) {
        promise.resolve(false)
      }
    }

    // Request AnkiDroid API permission via Android's system permission dialog.
    // Uses ActivityCompat.requestPermissions which shows the system dialog.
    // The JS side uses AppState listener to re-check hasApiPermission after user responds.
    AsyncFunction("requestApiPermission") { promise: Promise ->
      try {
        val activity = appContext.currentActivity
        if (activity == null) {
          promise.reject("NO_ACTIVITY", "No current activity available", null)
          return@AsyncFunction
        }

        // Check if already granted
        val alreadyGranted = ContextCompat.checkSelfPermission(context, ANKIDROID_PERMISSION) == PackageManager.PERMISSION_GRANTED
        if (alreadyGranted) {
          promise.resolve(true)
          return@AsyncFunction
        }

        // Request the permission - this shows the system dialog
        ActivityCompat.requestPermissions(activity, arrayOf(ANKIDROID_PERMISSION), PERMISSION_REQUEST_CODE)
        // Resolve true to indicate the request was initiated.
        // The JS side should re-check hasApiPermission() via AppState listener
        // when the user returns to the app after responding to the dialog.
        promise.resolve(true)
      } catch (e: Exception) {
        promise.reject("REQUEST_FAILED", "Failed to request permission: ${e.message}", e)
      }
    }

    // Get list of deck names from AnkiDroid
    AsyncFunction("getDeckNames") { promise: Promise ->
      try {
        val hasPermission = ContextCompat.checkSelfPermission(context, ANKIDROID_PERMISSION) == PackageManager.PERMISSION_GRANTED
        if (!hasPermission) {
          promise.reject("PERMISSION_DENIED", "AnkiDroid API permission not granted", null)
          return@AsyncFunction
        }

        val deckNames = mutableListOf<String>()
        var cursor: Cursor? = null

        try {
          cursor = contentResolver.query(DECKS_URI, arrayOf(DECK_NAME), null, null, null)
          cursor?.let {
            val nameIndex = it.getColumnIndex(DECK_NAME)
            while (it.moveToNext()) {
              val name = it.getString(nameIndex)
              if (name != null && !name.startsWith("Default::")) {
                deckNames.add(name)
              }
            }
          }
        } finally {
          cursor?.close()
        }

        promise.resolve(deckNames)
      } catch (e: SecurityException) {
        promise.reject("PERMISSION_DENIED", "Permission denied when accessing AnkiDroid: ${e.message}", e)
      } catch (e: Exception) {
        promise.reject("QUERY_FAILED", "Failed to get deck names: ${e.message}", e)
      }
    }

    // Returns deck info (name + due count) in a single query, avoiding N getDueCards calls
    AsyncFunction("getDeckInfo") { promise: Promise ->
      try {
        val hasPermission = ContextCompat.checkSelfPermission(context, ANKIDROID_PERMISSION) == PackageManager.PERMISSION_GRANTED
        if (!hasPermission) {
          promise.reject("PERMISSION_DENIED", "AnkiDroid API permission not granted", null)
          return@AsyncFunction
        }

        val decks = mutableListOf<Map<String, Any>>()
        var cursor: Cursor? = null

        try {
          cursor = contentResolver.query(
            DECKS_URI,
            arrayOf(DECK_NAME, DECK_COUNTS),
            null, null, null
          )
          cursor?.let {
            Log.d(TAG, "getDeckInfo columns: ${it.columnNames.joinToString()}")
            val nameIdx = it.getColumnIndex(DECK_NAME)
            val countsIdx = it.getColumnIndex(DECK_COUNTS)
            while (it.moveToNext()) {
              val name = if (nameIdx >= 0) it.getString(nameIdx) else null
              if (name == null || name.startsWith("Default::")) continue

              val countsRaw = if (countsIdx >= 0) it.getString(countsIdx) else null
              val dueCount = parseDeckCounts(countsRaw)

              decks.add(mapOf("deckName" to name, "dueCount" to dueCount))
            }
          }
        } finally {
          cursor?.close()
        }

        promise.resolve(decks)
      } catch (e: SecurityException) {
        promise.reject("PERMISSION_DENIED", "Permission denied when accessing AnkiDroid: ${e.message}", e)
      } catch (e: Exception) {
        promise.reject("QUERY_FAILED", "Failed to get deck info: ${e.message}", e)
      }
    }

    // Get cards for a specific deck
    AsyncFunction("getDueCards") { deckName: String, promise: Promise ->
      try {
        val hasPermission = ContextCompat.checkSelfPermission(context, ANKIDROID_PERMISSION) == PackageManager.PERMISSION_GRANTED
        if (!hasPermission) {
          promise.reject("PERMISSION_DENIED", "AnkiDroid API permission not granted", null)
          return@AsyncFunction
        }

        val deckId = getDeckId(deckName)
        Log.d(TAG, "getDueCards: deckName='$deckName' deckId=$deckId")

        if (deckId == 0L) {
          promise.reject("DECK_NOT_FOUND", "Deck '$deckName' not found", null)
          return@AsyncFunction
        }

        val cards = mutableListOf<Map<String, Any>>()
        var cursor: Cursor? = null

        try {
          // Strategy 1: notes/decks/{deckId} — V2 URI (newer AnkiDroid builds only)
          val deckNotesUri = NOTES_URI.buildUpon()
            .appendPath("decks")
            .appendPath(deckId.toString())
            .build()

          cursor = try {
            contentResolver.query(deckNotesUri, arrayOf("_id", NOTE_FLDS), null, null, null)
          } catch (e: Exception) {
            Log.d(TAG, "getDueCards: V2 URI not supported (${e.message}), using fallback")
            null
          }
          Log.d(TAG, "getDueCards: notes/decks/$deckId count=${cursor?.count ?: -1}")

          // Strategy 2: plain notes URI — always works, returns all notes across all decks
          if (cursor == null || cursor.count == 0) {
            cursor?.close()
            cursor = contentResolver.query(NOTES_URI, null, null, null, null) // null = all columns
            Log.d(TAG, "getDueCards: fallback all notes count=${cursor?.count ?: -1}, columns=${cursor?.columnNames?.joinToString()}")
          }

          cursor?.let {
            var count = 0
            val fldsIdx = it.getColumnIndex(NOTE_FLDS)

            while (it.moveToNext() && count < 100) {
              val noteId = getColumnLong(it, "_id") ?: continue
              if (fldsIdx < 0) continue
              val fields = it.getString(fldsIdx) ?: continue

              // Filter out empty, numeric-only (sequence numbers), and sound-file fields
              val meaningful = fields.split("\u001f")
                .map { f -> cleanAnkiText(f) }
                .filter { f -> f.isNotEmpty() && !f.matches(Regex("\\d+")) && !f.startsWith("[sound:") }

              val front = meaningful.getOrNull(0) ?: ""
              val back = meaningful.drop(1).joinToString(" | ")

              if (front.isNotEmpty()) {
                cards.add(mapOf(
                  "cardId" to noteId,
                  "front" to front,
                  "back" to back,
                  "deckName" to deckName
                ))
                count++
              }
            }
          }
        } finally {
          cursor?.close()
        }

        Log.d(TAG, "getDueCards: returning ${cards.size} cards for '$deckName'")
        promise.resolve(cards)
        return@AsyncFunction
      } catch (e: SecurityException) {
        promise.reject("PERMISSION_DENIED", "Permission denied when accessing AnkiDroid: ${e.message}", e)
      } catch (e: Exception) {
        promise.reject("QUERY_FAILED", "Failed to get due cards for deck '$deckName': ${e.message}", e)
      }
    }

    // Trigger AnkiDroid sync
    AsyncFunction("triggerSync") { promise: Promise ->
      try {
        val intent = Intent(ACTION_SYNC).apply {
          setPackage(ANKIDROID_PACKAGE)
        }
        context.sendBroadcast(intent)
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("SYNC_FAILED", "Failed to trigger sync: ${e.message}", e)
      }
    }
  }

  // Parse deck_counts JSON — AnkiDroid returns "[new, lrn, rev]" or similar formats
  private fun parseDeckCounts(raw: String?): Int {
    if (raw == null) return 0
    return try {
      // Format: "[2, 5, 10]" — sum all counts
      val cleaned = raw.trim().removePrefix("[").removeSuffix("]")
      cleaned.split(",").sumOf { it.trim().toIntOrNull() ?: 0 }
    } catch (e: Exception) {
      0
    }
  }

  // Helper to get deck ID from deck name.
  // The decks URI does not support selection/WHERE filtering — must iterate all rows.
  private fun getDeckId(deckName: String): Long {
    var cursor: Cursor? = null
    try {
      cursor = contentResolver.query(
        DECKS_URI,
        arrayOf(DECK_ID, DECK_NAME),
        null,
        null,
        null
      )
      cursor?.let {
        val idIndex = it.getColumnIndex(DECK_ID)
        val nameIndex = it.getColumnIndex(DECK_NAME)
        while (it.moveToNext()) {
          val name = if (nameIndex >= 0) it.getString(nameIndex) else null
          if (name == deckName) {
            return if (idIndex >= 0) it.getLong(idIndex) else 0L
          }
        }
      }
    } finally {
      cursor?.close()
    }
    return 0L
  }

  // Helper to safely get Long column value
  private fun getColumnLong(cursor: Cursor, columnName: String): Long? {
    val index = cursor.getColumnIndex(columnName)
    return if (index >= 0 && !cursor.isNull(index)) cursor.getLong(index) else null
  }

  // Clean HTML and formatting from Anki text
  private fun cleanAnkiText(text: String): String {
    return text
      // Remove HTML tags
      .replace(Regex("<[^>]*>"), "")
      // Decode HTML entities
      .replace("&nbsp;", " ")
      .replace("&amp;", "&")
      .replace("&lt;", "<")
      .replace("&gt;", ">")
      .replace("&quot;", "\"")
      .replace("&#39;", "'")
      // Remove cloze deletion markers
      .replace(Regex("\\{\\{c\\d+::|\\}\\}"), "")
      // Clean up whitespace
      .replace(Regex("\\s+"), " ")
      .trim()
  }
}
