package expo.modules.ankidroid

import android.content.Context
import android.content.pm.PackageManager
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AnkiDroidModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("React context is not available")

  override fun definition() = ModuleDefinition {
    Name("AnkiDroid")

    // Check if AnkiDroid is installed on the device
    AsyncFunction("isInstalled") { promise: Promise ->
      try {
        val packageManager = context.packageManager
        packageManager.getPackageInfo("com.ichi2.anki", PackageManager.GET_ACTIVITIES)
        promise.resolve(true)
      } catch (e: PackageManager.NameNotFoundException) {
        promise.resolve(false)
      } catch (e: Exception) {
        promise.reject("CHECK_FAILED", "Failed to check AnkiDroid installation: ${e.message}", e)
      }
    }

    // Get list of deck names from AnkiDroid
    // TODO: Implement actual ContentProvider query in Epic 2
    AsyncFunction("getDeckNames") { promise: Promise ->
      try {
        // Stub implementation - returns empty list
        // Real implementation will query: content://com.ichi2.anki.flashcards/decks
        val deckNames = listOf<String>()
        promise.resolve(deckNames)
      } catch (e: Exception) {
        promise.reject("QUERY_FAILED", "Failed to get deck names: ${e.message}", e)
      }
    }

    // Get due cards for a specific deck
    // TODO: Implement actual ContentProvider query in Epic 2
    AsyncFunction("getDueCards") { deckName: String, promise: Promise ->
      try {
        // Stub implementation - returns empty list
        // Real implementation will query ContentProvider for due cards
        val dueCards = listOf<Map<String, Any>>()
        promise.resolve(dueCards)
      } catch (e: Exception) {
        promise.reject("QUERY_FAILED", "Failed to get due cards for deck '$deckName': ${e.message}", e)
      }
    }

    // Trigger AnkiDroid sync
    // TODO: Implement broadcast intent in Epic 2
    AsyncFunction("triggerSync") { promise: Promise ->
      try {
        // Stub implementation - does nothing
        // Real implementation will send: com.ichi2.anki.DO_SYNC broadcast
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("SYNC_FAILED", "Failed to trigger sync: ${e.message}", e)
      }
    }
  }
}
