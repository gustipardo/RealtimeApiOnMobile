package expo.modules.foregroundaudio

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.util.Base64
import android.util.Log

class AudioTrackManager {

  companion object {
    private const val TAG = "AudioTrackManager"
  }

  private var audioTrack: AudioTrack? = null

  fun init(sampleRate: Int) {
    stop() // Release any previous instance

    val bufferSize = AudioTrack.getMinBufferSize(
      sampleRate,
      AudioFormat.CHANNEL_OUT_MONO,
      AudioFormat.ENCODING_PCM_16BIT
    )

    if (bufferSize == AudioTrack.ERROR || bufferSize == AudioTrack.ERROR_BAD_VALUE) {
      Log.e(TAG, "Invalid buffer size: $bufferSize")
      return
    }

    audioTrack = AudioTrack.Builder()
      .setAudioAttributes(
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
          .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
          .build()
      )
      .setAudioFormat(
        AudioFormat.Builder()
          .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
          .setSampleRate(sampleRate)
          .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
          .build()
      )
      .setBufferSizeInBytes(bufferSize * 4)
      .setTransferMode(AudioTrack.MODE_STREAM)
      .build()

    audioTrack?.play()
    Log.d(TAG, "Initialized: sampleRate=$sampleRate, bufferSize=${bufferSize * 4}")
  }

  fun writeChunk(base64Data: String) {
    val bytes = Base64.decode(base64Data, Base64.DEFAULT)
    audioTrack?.write(bytes, 0, bytes.size)
  }

  fun stop() {
    try {
      audioTrack?.stop()
    } catch (_: IllegalStateException) {}
    audioTrack?.release()
    audioTrack = null
    Log.d(TAG, "Stopped")
  }
}
