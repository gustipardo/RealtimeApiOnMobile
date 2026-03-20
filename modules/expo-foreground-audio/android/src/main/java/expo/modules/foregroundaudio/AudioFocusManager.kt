package expo.modules.foregroundaudio

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioDeviceCallback
import android.media.AudioDeviceInfo
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log

class AudioFocusManager(
  private val context: Context,
  private val onFocusChange: (String) -> Unit
) : AudioManager.OnAudioFocusChangeListener {

  companion object {
    private const val TAG = "AudioFocusManager"
  }

  private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
  private var focusRequest: AudioFocusRequest? = null
  private var resumeOnFocusGain = false
  private var deviceCallback: AudioDeviceCallback? = null

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
        routeToConnectedBluetoothDevice()
        registerAudioDeviceCallback()
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
    unregisterAudioDeviceCallback()
    clearBluetoothRoute()

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      focusRequest?.let { audioManager.abandonAudioFocusRequest(it) }
    } else {
      @Suppress("DEPRECATION")
      audioManager.abandonAudioFocus(this)
    }
    audioManager.mode = AudioManager.MODE_NORMAL
    resumeOnFocusGain = false
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

  // ---------------------------------------------------------------------------
  // Bluetooth / audio device routing
  // ---------------------------------------------------------------------------

  private fun isBluetoothDevice(device: AudioDeviceInfo): Boolean {
    return device.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO ||
      device.type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP ||
      (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
        device.type == AudioDeviceInfo.TYPE_BLE_HEADSET)
  }

  /**
   * Check if a Bluetooth audio device is already connected and route to it.
   * Called when audio focus is first acquired.
   */
  private fun routeToConnectedBluetoothDevice() {
    val devices = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
    for (device in devices) {
      if (isBluetoothDevice(device)) {
        Log.d(TAG, "Found connected Bluetooth device: ${device.productName}, type=${device.type}")
        routeToBluetoothDevice(device)
        return
      }
    }
  }

  /**
   * Register a callback to detect audio device additions/removals mid-session.
   * When Bluetooth headphones connect, audio is automatically routed to them.
   */
  private fun registerAudioDeviceCallback() {
    if (deviceCallback != null) return

    deviceCallback = object : AudioDeviceCallback() {
      override fun onAudioDevicesAdded(addedDevices: Array<out AudioDeviceInfo>) {
        for (device in addedDevices) {
          if (isBluetoothDevice(device)) {
            Log.d(TAG, "Bluetooth device connected: ${device.productName}, type=${device.type}")
            routeToBluetoothDevice(device)
            return
          }
        }
      }

      override fun onAudioDevicesRemoved(removedDevices: Array<out AudioDeviceInfo>) {
        for (device in removedDevices) {
          if (isBluetoothDevice(device)) {
            Log.d(TAG, "Bluetooth device disconnected: ${device.productName}")
            clearBluetoothRoute()
            return
          }
        }
      }
    }

    audioManager.registerAudioDeviceCallback(deviceCallback, Handler(Looper.getMainLooper()))
    Log.d(TAG, "Audio device callback registered")
  }

  private fun unregisterAudioDeviceCallback() {
    deviceCallback?.let {
      audioManager.unregisterAudioDeviceCallback(it)
      Log.d(TAG, "Audio device callback unregistered")
    }
    deviceCallback = null
  }

  private fun routeToBluetoothDevice(device: AudioDeviceInfo) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      // API 31+: Use setCommunicationDevice for precise routing
      val success = audioManager.setCommunicationDevice(device)
      Log.d(TAG, "setCommunicationDevice(${device.productName}): $success")
    } else {
      // API 26-30: Use Bluetooth SCO
      @Suppress("DEPRECATION")
      audioManager.startBluetoothSco()
      @Suppress("DEPRECATION")
      audioManager.isBluetoothScoOn = true
      Log.d(TAG, "Started Bluetooth SCO for ${device.productName}")
    }
  }

  private fun clearBluetoothRoute() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      audioManager.clearCommunicationDevice()
      Log.d(TAG, "Cleared communication device")
    } else {
      @Suppress("DEPRECATION")
      if (audioManager.isBluetoothScoOn) {
        audioManager.isBluetoothScoOn = false
        audioManager.stopBluetoothSco()
        Log.d(TAG, "Stopped Bluetooth SCO")
      }
    }
  }
}
