package expo.modules.ankidroid

import android.content.ContentResolver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.database.Cursor
import android.net.Uri
import androidx.core.content.ContextCompat
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AnkiDroidModule : Module() {
  companion object {
    const val ANKIDROID_PACKAGE = "com.ichi2.anki"
    const val ANKIDROID_PERMISSION = "com.ichi2.anki.permission.READ_WRITE_DATABASE"
    const val ANKIDROID_API_PERMISSION_ACTIVITY = "com.ichi2.anki.api.RequestPermissionActivity"

    // ContentProvider URIs
    const val AUTHORITY = "com.ichi2.anki.flashcards"
    val DECKS_URI: Uri = Uri.parse("content://$AUTHORITY/decks")
    val NOTES_URI: Uri = Uri.parse("content://$AUTHORITY/notes")
    val CARDS_URI: Uri = Uri.parse("content://$AUTHORITY/cards")

    // Column names for decks
    const val DECK_ID = "deck_id"
    const val DECK_NAME = "deck_name"
    const val DECK_COUNTS = "deck_counts" // JSON with new, learn, review counts

    // Column names for notes/cards
    const val NOTE_ID = "note_id"
    const val CARD_ID = "card_id"
    const val NOTE_FLDS = "flds" // Fields separated by \x1f
    const val NOTE_MID = "mid" // Model ID

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

    // Request AnkiDroid API permission
    AsyncFunction("requestApiPermission") { promise: Promise ->
      try {
        val intent = Intent().apply {
          component = android.content.ComponentName(
            ANKIDROID_PACKAGE,
            ANKIDROID_API_PERMISSION_ACTIVITY
          )
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
        promise.resolve(true)
      } catch (e: Exception) {
        promise.reject("REQUEST_FAILED", "Failed to open AnkiDroid permission request: ${e.message}", e)
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
          cursor = contentResolver.query(
            DECKS_URI,
            arrayOf(DECK_NAME),
            null,
            null,
            null
          )

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

        if (deckNames.isEmpty()) {
          // Check if this is because no decks exist vs query failed
          promise.resolve(deckNames)
        } else {
          promise.resolve(deckNames)
        }
      } catch (e: SecurityException) {
        promise.reject("PERMISSION_DENIED", "Permission denied when accessing AnkiDroid: ${e.message}", e)
      } catch (e: Exception) {
        promise.reject("QUERY_FAILED", "Failed to get deck names: ${e.message}", e)
      }
    }

    // Get due cards for a specific deck
    AsyncFunction("getDueCards") { deckName: String, promise: Promise ->
      try {
        val hasPermission = ContextCompat.checkSelfPermission(context, ANKIDROID_PERMISSION) == PackageManager.PERMISSION_GRANTED
        if (!hasPermission) {
          promise.reject("PERMISSION_DENIED", "AnkiDroid API permission not granted", null)
          return@AsyncFunction
        }

        val cards = mutableListOf<Map<String, Any>>()
        var cursor: Cursor? = null

        try {
          // Query for scheduled cards in the specified deck
          // The AnkiDroid API provides a scheduled_cards endpoint for due cards
          val scheduledUri = Uri.parse("content://$AUTHORITY/scheduled_cards")
            .buildUpon()
            .appendQueryParameter("deck_id", getDeckId(deckName).toString())
            .appendQueryParameter("limit", "100") // Limit for performance
            .build()

          cursor = contentResolver.query(
            scheduledUri,
            null, // Get all columns
            null,
            null,
            null
          )

          cursor?.let {
            while (it.moveToNext()) {
              val cardId = getColumnLong(it, "card_id") ?: continue
              val noteId = getColumnLong(it, "note_id") ?: continue

              // Get card content from notes
              val noteContent = getNoteContent(noteId)
              if (noteContent != null) {
                cards.add(mapOf(
                  "cardId" to cardId,
                  "front" to cleanAnkiText(noteContent.first),
                  "back" to cleanAnkiText(noteContent.second),
                  "deckName" to deckName
                ))
              }
            }
          }
        } finally {
          cursor?.close()
        }

        promise.resolve(cards)
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

  // Helper to get deck ID from deck name
  private fun getDeckId(deckName: String): Long {
    var cursor: Cursor? = null
    try {
      cursor = contentResolver.query(
        DECKS_URI,
        arrayOf(DECK_ID, DECK_NAME),
        "$DECK_NAME = ?",
        arrayOf(deckName),
        null
      )
      cursor?.let {
        if (it.moveToFirst()) {
          return getColumnLong(it, DECK_ID) ?: 0L
        }
      }
    } finally {
      cursor?.close()
    }
    return 0L
  }

  // Helper to get note content (front and back fields)
  private fun getNoteContent(noteId: Long): Pair<String, String>? {
    var cursor: Cursor? = null
    try {
      cursor = contentResolver.query(
        NOTES_URI,
        arrayOf(NOTE_FLDS),
        "$NOTE_ID = ?",
        arrayOf(noteId.toString()),
        null
      )
      cursor?.let {
        if (it.moveToFirst()) {
          val fields = it.getString(it.getColumnIndex(NOTE_FLDS))
          if (fields != null) {
            // Fields are separated by \x1f (unit separator)
            val parts = fields.split("\u001f")
            val front = parts.getOrNull(0) ?: ""
            val back = parts.getOrNull(1) ?: ""
            return Pair(front, back)
          }
        }
      }
    } finally {
      cursor?.close()
    }
    return null
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
