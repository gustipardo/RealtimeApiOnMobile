package expo.modules.foregroundaudio

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build

class AudioFocusManager(
  private val context: Context,
  private val onFocusChange: (String) -> Unit
) : AudioManager.OnAudioFocusChangeListener {

  private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
  private var focusRequest: AudioFocusRequest? = null
  private var resumeOnFocusGain = false

  fun requestFocus(): Boolean {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
        .setAudioAttributes(
          AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
            .build()
        )
        .setAcceptsDelayedFocusGain(true)
        .setOnAudioFocusChangeListener(this)
        .build()

      focusRequest = request
      val result = audioManager.requestAudioFocus(request)

      if (result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
        audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
      }

      return result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
    }

    // Pre-Oreo fallback (minSdk 26 so this shouldn't be reached)
    @Suppress("DEPRECATION")
    val result = audioManager.requestAudioFocus(
      this,
      AudioManager.STREAM_VOICE_CALL,
      AudioManager.AUDIOFOCUS_GAIN
    )
    return result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
  }

  fun abandonFocus() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      focusRequest?.let { audioManager.abandonAudioFocusRequest(it) }
    } else {
      @Suppress("DEPRECATION")
      audioManager.abandonAudioFocus(this)
    }
    audioManager.mode = AudioManager.MODE_NORMAL
  }

  override fun onAudioFocusChange(focusChange: Int) {
    when (focusChange) {
      AudioManager.AUDIOFOCUS_GAIN -> {
        if (resumeOnFocusGain) {
          resumeOnFocusGain = false
          onFocusChange("gain")
        }
      }
      AudioManager.AUDIOFOCUS_LOSS -> {
        resumeOnFocusGain = false
        onFocusChange("loss")
      }
      AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> {
        resumeOnFocusGain = true
        onFocusChange("loss_transient")
      }
      AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> {
        resumeOnFocusGain = true
        onFocusChange("loss_transient_can_duck")
      }
    }
  }
}
