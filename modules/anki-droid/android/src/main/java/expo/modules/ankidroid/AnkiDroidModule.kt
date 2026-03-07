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

    // Get cards for a specific deck using the cards ContentProvider URI
    // which supports filtering by deck_id and returns question/answer directly
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
          // Query cards filtered by deck_id — returns only cards belonging to this deck
          cursor = contentResolver.query(
            CARDS_URI,
            null, // all columns (question, answer, _id, etc.)
            "deck_id=?",
            arrayOf(deckId.toString()),
            null
          )
          Log.d(TAG, "getDueCards: cards for deck $deckId count=${cursor?.count ?: -1}, columns=${cursor?.columnNames?.joinToString()}")

          // If deck_id filter not supported, try without filter and match manually
          if (cursor == null || cursor.count == 0) {
            cursor?.close()
            cursor = contentResolver.query(CARDS_URI, null, null, null, null)
            Log.d(TAG, "getDueCards: all cards count=${cursor?.count ?: -1}, columns=${cursor?.columnNames?.joinToString()}")
          }

          cursor?.let {
            var count = 0
            val questionIdx = it.getColumnIndex("question")
            val answerIdx = it.getColumnIndex("answer")
            val idIdx = it.getColumnIndex("_id")
            val deckIdIdx = it.getColumnIndex("deck_id")

            // If cards URI has question/answer columns, use them directly
            if (questionIdx >= 0 && answerIdx >= 0) {
              while (it.moveToNext() && count < 100) {
                // If we couldn't filter by deck_id in the query, filter here
                if (deckIdIdx >= 0) {
                  val cardDeckId = it.getLong(deckIdIdx)
                  if (cardDeckId != deckId) continue
                }

                val cardId = if (idIdx >= 0) it.getLong(idIdx) else count.toLong()
                val rawQuestion = it.getString(questionIdx) ?: continue
                val rawAnswer = it.getString(answerIdx) ?: ""

                val front = cleanAnkiText(rawQuestion)
                val back = cleanAnkiText(rawAnswer)

                if (front.isNotEmpty()) {
                  cards.add(mapOf(
                    "cardId" to cardId,
                    "front" to front,
                    "back" to back,
                    "deckName" to deckName
                  ))
                  count++
                }
              }
            } else {
              // Fallback: cards URI doesn't have question/answer — use flds from notes
              // First collect note IDs for this deck's cards
              val noteIds = mutableSetOf<Long>()
              val noteIdIdx = it.getColumnIndex("note_id")

              if (noteIdIdx >= 0) {
                while (it.moveToNext()) {
                  if (deckIdIdx >= 0) {
                    val cardDeckId = it.getLong(deckIdIdx)
                    if (cardDeckId != deckId) continue
                  }
                  noteIds.add(it.getLong(noteIdIdx))
                }
              }
              cursor?.close()

              if (noteIds.isNotEmpty()) {
                // Now query notes for those specific note IDs
                val notesCursor = contentResolver.query(NOTES_URI, null, null, null, null)
                notesCursor?.let { nc ->
                  val fldsIdx = nc.getColumnIndex(NOTE_FLDS)
                  val nIdIdx = nc.getColumnIndex("_id")

                  while (nc.moveToNext() && count < 100) {
                    val noteId = if (nIdIdx >= 0) nc.getLong(nIdIdx) else continue
                    if (noteId !in noteIds) continue
                    if (fldsIdx < 0) continue
                    val fields = nc.getString(fldsIdx) ?: continue

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
                  nc.close()
                }
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
