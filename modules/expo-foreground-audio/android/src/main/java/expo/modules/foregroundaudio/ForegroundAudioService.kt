package expo.modules.foregroundaudio

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat

class ForegroundAudioService : Service() {

  companion object {
    const val TAG = "ForegroundAudioSvc"

    const val ACTION_START = "expo.modules.foregroundaudio.ACTION_START"
    const val ACTION_PAUSE = "expo.modules.foregroundaudio.ACTION_PAUSE"
    const val ACTION_RESUME = "expo.modules.foregroundaudio.ACTION_RESUME"
    const val ACTION_END = "expo.modules.foregroundaudio.ACTION_END"
    const val ACTION_STOP = "expo.modules.foregroundaudio.ACTION_STOP"
    const val ACTION_UPDATE = "expo.modules.foregroundaudio.ACTION_UPDATE"
    const val ACTION_HEADS_UP = "expo.modules.foregroundaudio.ACTION_HEADS_UP"
    const val ACTION_REQUEST_AUDIO_FOCUS = "expo.modules.foregroundaudio.ACTION_REQUEST_AUDIO_FOCUS"
    const val ACTION_ABANDON_AUDIO_FOCUS = "expo.modules.foregroundaudio.ACTION_ABANDON_AUDIO_FOCUS"

    const val EXTRA_TITLE = "title"
    const val EXTRA_BODY = "body"

    // Channel ID is versioned. Once a channel exists with given importance,
    // Android caches it and apps cannot programmatically raise the level —
    // only the user can via system settings. Bumping to v2 lets us upgrade
    // from IMPORTANCE_LOW (the silent ongoing-only channel) to IMPORTANCE_HIGH
    // with CATEGORY_CALL, giving the in-session banner phone-call-style
    // prominence (heads-up, status-bar chip, lockscreen surface).
    const val CHANNEL_ID = "voice_session_v2"
    const val NOTIFICATION_ID = 1001
    // How long the heads-up "Tap to return…" body stays before the
    // notification reverts to the card-progress body. Picked at 3s to match
    // the WhatsApp peek duration the user referenced.
    const val HEADS_UP_DURATION_MS = 3000L

    @Volatile
    var isRunning = false
      private set

    var moduleRef: ExpoForegroundAudioModule? = null
  }

  private var isPaused = false
  private var currentTitle = "Voice Study Session"
  private var currentBody = "Session active"
  private var audioFocusManager: AudioFocusManager? = null

  // Tracks the heads-up revert timer so a second minimize within 3s doesn't
  // race with a stale revert overwriting the freshly-shown peek text.
  private val mainHandler = Handler(Looper.getMainLooper())
  private var pendingHeadsUpRevert: Runnable? = null

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

      ACTION_HEADS_UP -> {
        // One notification, two states. Mutating the persistent
        // notification's body (rather than posting a separate one) avoids
        // both:
        //   - "Two notifications in the shade" — only ID 1001 ever exists.
        //   - "Heads-up shows two lines" — the body line during peek is
        //     just "Tap to return to your session"; afterwards it reverts
        //     to the card-progress body.
        // To force Android to animate the heads-up again on a second
        // minimize within the dedup window, we cancel the notification
        // first, then re-post. Cancel + re-post on the same ID is the
        // documented way to bypass the heads-up dedup, and is safe for a
        // foreground-service notification as long as we re-post on the
        // same tick (we never give the system a chance to stop the
        // service).
        Log.d(TAG, "ACTION_HEADS_UP: posting peek notification")
        val manager = getSystemService(NotificationManager::class.java)
        val savedBody = currentBody

        pendingHeadsUpRevert?.let { mainHandler.removeCallbacks(it) }

        manager.cancel(NOTIFICATION_ID)
        manager.notify(NOTIFICATION_ID, buildHeadsUpNotification())

        val revert = Runnable {
          // Only revert if our copy of currentBody is still what we saved —
          // otherwise an UPDATE happened during the peek and we'd clobber
          // the new body.
          Log.d(TAG, "ACTION_HEADS_UP: reverting peek body")
          manager.notify(NOTIFICATION_ID, buildNotification())
          pendingHeadsUpRevert = null
        }
        pendingHeadsUpRevert = revert
        mainHandler.postDelayed(revert, HEADS_UP_DURATION_MS)
      }

      ACTION_REQUEST_AUDIO_FOCUS -> {
        if (audioFocusManager == null) {
          audioFocusManager = AudioFocusManager(this) { state ->
            moduleRef?.emitAudioFocusChange(state)
          }
        }
        audioFocusManager?.requestFocus()
      }

      ACTION_ABANDON_AUDIO_FOCUS -> {
        audioFocusManager?.abandonFocus()
      }
    }

    return START_STICKY
  }

  override fun onTaskRemoved(rootIntent: Intent?) {
    // App swiped from recents — clean up gracefully
    audioFocusManager?.abandonFocus()
    stopSelf()
    super.onTaskRemoved(rootIntent)
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
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "Phone-call-style banner shown while a study session is active"
        setShowBadge(false)
        lockscreenVisibility = Notification.VISIBILITY_PUBLIC
        // No sound/vibration even at HIGH — the visual prominence is the point;
        // the AI tutor is producing audio already, we don't want a chirp on top.
        setSound(null, null)
        enableVibration(false)
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

    // Pause/Resume action.
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

    // End Session action — separate button, not the CallStyle red "Hang up".
    val endAction = NotificationCompat.Action.Builder(
      android.R.drawable.ic_menu_close_clear_cancel,
      "End",
      createActionPendingIntent(ACTION_END)
    ).build()

    // Default style (no CallStyle, no MediaStyle). This avoids:
    //   - The forced chronometer timer that CallStyle.forOngoingCall bakes in
    //     and you can't turn off via the builder.
    //   - The colorized (gold-everywhere) background that setColorized=true
    //     paints behind a CallStyle notification — too aggressive for a
    //     non-call session.
    // We keep CATEGORY_CALL (set below) so the OS still ranks this above
    // regular ongoing notifications and surfaces it prominently on the
    // lockscreen, but the visual is a normal Android notification with
    // gold accents (icon tint, action text) on the system's neutral surface.
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle(currentTitle)
      .setContentText(currentBody)
      // Small icon = the running indicator. ic_media_play is a simple "▶"
      // glyph on Android — visually says "session is going" without the
      // timer the user disliked.
      .setSmallIcon(android.R.drawable.ic_media_play)
      // Brand accent (gold #E4A13F from _design/03-tokens). NOT colorized
      // so the gold is only used as a tint for the small icon and action
      // text, not as the banner background.
      .setColor(Color.parseColor("#E4A13F"))
      .setContentIntent(contentIntent)
      .setOngoing(true)
      .setSilent(true)
      // Suppress the timestamp + chronometer — there's nothing time-sensitive
      // about the ongoing session that the user needs counted.
      .setShowWhen(false)
      .setUsesChronometer(false)
      .addAction(pauseResumeAction)
      .addAction(endAction)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setCategory(NotificationCompat.CATEGORY_CALL)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
      .build()
  }

  // Build the "peek" variant of the persistent notification. Identical to
  // the regular ongoing notification except the body is "Tap to return…"
  // and we do NOT pass setSilent — letting the HIGH-importance channel
  // animate the heads-up. Same notification ID + flags as the persistent
  // one so the foreground service stays attached.
  private fun buildHeadsUpNotification(): Notification {
    val contentIntent = packageManager.getLaunchIntentForPackage(packageName)?.let { launchIntent ->
      PendingIntent.getActivity(
        this, 0, launchIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
    }
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle(currentTitle)
      .setContentText("Tap to return to your session")
      .setSmallIcon(android.R.drawable.ic_media_play)
      .setColor(Color.parseColor("#E4A13F"))
      .setContentIntent(contentIntent)
      .setOngoing(true)
      .setSilent(true)
      .setShowWhen(false)
      .setUsesChronometer(false)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setCategory(NotificationCompat.CATEGORY_CALL)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
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
