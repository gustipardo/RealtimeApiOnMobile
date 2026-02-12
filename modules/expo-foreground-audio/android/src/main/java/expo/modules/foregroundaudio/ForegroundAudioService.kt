package expo.modules.foregroundaudio

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.media.app.NotificationCompat as MediaNotificationCompat

class ForegroundAudioService : Service() {

  companion object {
    const val ACTION_START = "expo.modules.foregroundaudio.ACTION_START"
    const val ACTION_PAUSE = "expo.modules.foregroundaudio.ACTION_PAUSE"
    const val ACTION_RESUME = "expo.modules.foregroundaudio.ACTION_RESUME"
    const val ACTION_END = "expo.modules.foregroundaudio.ACTION_END"
    const val ACTION_STOP = "expo.modules.foregroundaudio.ACTION_STOP"
    const val ACTION_UPDATE = "expo.modules.foregroundaudio.ACTION_UPDATE"

    const val EXTRA_TITLE = "title"
    const val EXTRA_BODY = "body"

    const val CHANNEL_ID = "foreground_audio_channel"
    const val NOTIFICATION_ID = 1001

    @Volatile
    var isRunning = false
      private set

    var moduleRef: ExpoForegroundAudioModule? = null
  }

  private var isPaused = false
  private var currentTitle = "Voice Study Session"
  private var currentBody = "Session active"
  private var audioFocusManager: AudioFocusManager? = null

  override fun onCreate() {
    super.onCreate()
    createNotificationChannel()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_START -> {
        currentTitle = intent.getStringExtra(EXTRA_TITLE) ?: currentTitle
        currentBody = intent.getStringExtra(EXTRA_BODY) ?: currentBody
        isPaused = false

        // Request audio focus
        audioFocusManager = AudioFocusManager(this) { state ->
          moduleRef?.emitAudioFocusChange(state)
        }
        audioFocusManager?.requestFocus()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
          startForeground(NOTIFICATION_ID, buildNotification(), android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
        } else {
          startForeground(NOTIFICATION_ID, buildNotification())
        }
        isRunning = true
      }

      ACTION_PAUSE -> {
        isPaused = true
        currentBody = "Paused"
        updateNotification()
        moduleRef?.emitNotificationAction("pause")
      }

      ACTION_RESUME -> {
        isPaused = false
        currentBody = "Session active"
        updateNotification()
        moduleRef?.emitNotificationAction("resume")
      }

      ACTION_END -> {
        // User pressed "End" in notification — emit event so JS can run session cleanup
        moduleRef?.emitNotificationAction("end")
        stopSelf()
      }

      ACTION_STOP -> {
        // Programmatic stop from JS — no event emission to avoid recursive loop
        stopSelf()
      }

      ACTION_UPDATE -> {
        currentTitle = intent.getStringExtra(EXTRA_TITLE) ?: currentTitle
        currentBody = intent.getStringExtra(EXTRA_BODY) ?: currentBody
        updateNotification()
      }
    }

    return START_STICKY
  }

  override fun onDestroy() {
    audioFocusManager?.abandonFocus()
    audioFocusManager = null
    isRunning = false
    moduleRef = null
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        CHANNEL_ID,
        "Voice Study Session",
        NotificationManager.IMPORTANCE_LOW
      ).apply {
        description = "Ongoing voice study session with AI tutor"
        setShowBadge(false)
        lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      }

      val manager = getSystemService(NotificationManager::class.java)
      manager.createNotificationChannel(channel)
    }
  }

  private fun buildNotification(): Notification {
    // Content intent: open app when tapping notification
    val contentIntent = packageManager.getLaunchIntentForPackage(packageName)?.let { launchIntent ->
      PendingIntent.getActivity(
        this, 0, launchIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
    }

    // Pause/Resume action
    val pauseResumeAction = if (isPaused) {
      NotificationCompat.Action.Builder(
        android.R.drawable.ic_media_play,
        "Resume",
        createActionPendingIntent(ACTION_RESUME)
      ).build()
    } else {
      NotificationCompat.Action.Builder(
        android.R.drawable.ic_media_pause,
        "Pause",
        createActionPendingIntent(ACTION_PAUSE)
      ).build()
    }

    // End Session action
    val endAction = NotificationCompat.Action.Builder(
      android.R.drawable.ic_delete,
      "End",
      createActionPendingIntent(ACTION_END)
    ).build()

    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle(currentTitle)
      .setContentText(currentBody)
      .setSmallIcon(android.R.drawable.ic_btn_speak_now)
      .setContentIntent(contentIntent)
      .setOngoing(true)
      .setSilent(true)
      .addAction(pauseResumeAction)
      .addAction(endAction)
      .setStyle(
        MediaNotificationCompat.MediaStyle()
          .setShowActionsInCompactView(0, 1)
      )
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .build()
  }

  private fun createActionPendingIntent(action: String): PendingIntent {
    val intent = Intent(this, ForegroundAudioService::class.java).apply {
      this.action = action
    }
    return PendingIntent.getService(
      this, action.hashCode(), intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  private fun updateNotification() {
    val manager = getSystemService(NotificationManager::class.java)
    manager.notify(NOTIFICATION_ID, buildNotification())
  }
}
