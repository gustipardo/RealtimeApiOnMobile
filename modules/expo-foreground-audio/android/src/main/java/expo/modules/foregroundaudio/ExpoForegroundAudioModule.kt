package expo.modules.foregroundaudio

import android.content.Context
import android.content.Intent
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoForegroundAudioModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("React context not available")

  override fun definition() = ModuleDefinition {
    Name("ExpoForegroundAudio")

    Events("onAudioFocusChange", "onNotificationAction")

    AsyncFunction("startService") { title: String, body: String ->
      ForegroundAudioService.moduleRef = this@ExpoForegroundAudioModule

      val intent = Intent(context, ForegroundAudioService::class.java).apply {
        action = ForegroundAudioService.ACTION_START
        putExtra(ForegroundAudioService.EXTRA_TITLE, title)
        putExtra(ForegroundAudioService.EXTRA_BODY, body)
      }

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
    }

    AsyncFunction("stopService") {
      val intent = Intent(context, ForegroundAudioService::class.java).apply {
        action = ForegroundAudioService.ACTION_STOP
      }
      context.startService(intent)
    }

    AsyncFunction("updateNotification") { title: String, body: String ->
      val intent = Intent(context, ForegroundAudioService::class.java).apply {
        action = ForegroundAudioService.ACTION_UPDATE
        putExtra(ForegroundAudioService.EXTRA_TITLE, title)
        putExtra(ForegroundAudioService.EXTRA_BODY, body)
      }
      context.startService(intent)
    }

    Function("isServiceRunning") {
      ForegroundAudioService.isRunning
    }
  }

  fun emitAudioFocusChange(state: String) {
    sendEvent("onAudioFocusChange", mapOf("state" to state))
  }

  fun emitNotificationAction(action: String) {
    sendEvent("onNotificationAction", mapOf("action" to action))
  }
}
