const { withAndroidManifest } = require('@expo/config-plugins');

function withForegroundAudioService(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    // Add permissions
    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    const permissions = [
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MICROPHONE',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.WAKE_LOCK',
    ];

    permissions.forEach((perm) => {
      const exists = manifest['uses-permission'].some(
        (p) => p.$?.['android:name'] === perm
      );
      if (!exists) {
        manifest['uses-permission'].push({
          $: { 'android:name': perm },
        });
      }
    });

    // Add service declaration to application
    const application = manifest.application?.[0];
    if (application) {
      if (!application.service) {
        application.service = [];
      }

      const serviceExists = application.service.some(
        (s) =>
          s.$?.['android:name'] ===
          'expo.modules.foregroundaudio.ForegroundAudioService'
      );

      if (!serviceExists) {
        application.service.push({
          $: {
            'android:name':
              'expo.modules.foregroundaudio.ForegroundAudioService',
            'android:foregroundServiceType': 'microphone',
            'android:exported': 'false',
          },
        });
      }
    }

    return config;
  });
}

module.exports = withForegroundAudioService;
