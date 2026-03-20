package expo.modules.foregroundaudio

import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.util.Base64
import android.util.Log

class AudioRecordManager {

  companion object {
    private const val TAG = "AudioRecordManager"
  }

  private var audioRecord: AudioRecord? = null
  private var isRecording = false
  private var recordThread: Thread? = null

  fun start(sampleRate: Int, onAudioData: (String) -> Unit) {
    if (isRecording) {
      Log.w(TAG, "Already recording")
      return
    }

    val bufferSize = AudioRecord.getMinBufferSize(
      sampleRate,
      AudioFormat.CHANNEL_IN_MONO,
      AudioFormat.ENCODING_PCM_16BIT
    )

    if (bufferSize == AudioRecord.ERROR || bufferSize == AudioRecord.ERROR_BAD_VALUE) {
      Log.e(TAG, "Invalid buffer size: $bufferSize")
      return
    }

    try {
      audioRecord = AudioRecord(
        MediaRecorder.AudioSource.VOICE_COMMUNICATION,
        sampleRate,
        AudioFormat.CHANNEL_IN_MONO,
        AudioFormat.ENCODING_PCM_16BIT,
        bufferSize * 2
      )
    } catch (e: SecurityException) {
      Log.e(TAG, "RECORD_AUDIO permission not granted", e)
      return
    }

    if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
      Log.e(TAG, "AudioRecord failed to initialize")
      audioRecord?.release()
      audioRecord = null
      return
    }

    audioRecord?.startRecording()
    isRecording = true

    recordThread = Thread {
      Log.d(TAG, "Recording thread started, sampleRate=$sampleRate, bufferSize=$bufferSize")
      val buffer = ByteArray(bufferSize)
      while (isRecording) {
        val bytesRead = audioRecord?.read(buffer, 0, buffer.size) ?: 0
        if (bytesRead > 0) {
          val base64 = Base64.encodeToString(buffer, 0, bytesRead, Base64.NO_WRAP)
          onAudioData(base64)
        }
      }
      Log.d(TAG, "Recording thread stopped")
    }
    recordThread?.priority = Thread.MAX_PRIORITY
    recordThread?.start()
  }

  fun stop() {
    isRecording = false
    try {
      recordThread?.join(1000)
    } catch (_: InterruptedException) {}
    recordThread = null
    try {
      audioRecord?.stop()
    } catch (_: IllegalStateException) {}
    audioRecord?.release()
    audioRecord = null
    Log.d(TAG, "Stopped")
  }
}
