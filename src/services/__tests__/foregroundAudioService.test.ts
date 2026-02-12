import {
  startForegroundService,
  stopForegroundService,
  updateForegroundNotification,
  isServiceRunning,
} from '../foregroundAudioService';

// Mock the native module
const mockStartService = jest.fn().mockResolvedValue(undefined);
const mockStopService = jest.fn().mockResolvedValue(undefined);
const mockUpdateNotification = jest.fn().mockResolvedValue(undefined);
const mockIsServiceRunning = jest.fn().mockReturnValue(false);
const mockAddListener = jest.fn();

jest.mock('expo-foreground-audio', () => ({
  __esModule: true,
  default: {
    startService: (...args: any[]) => mockStartService(...args),
    stopService: (...args: any[]) => mockStopService(...args),
    updateNotification: (...args: any[]) => mockUpdateNotification(...args),
    isServiceRunning: (...args: any[]) => mockIsServiceRunning(...args),
    addListener: (...args: any[]) => mockAddListener(...args),
  },
}));

// Mock stores and webrtcManager
const mockTransitionTo = jest.fn();
const mockSetMicrophoneMuted = jest.fn();

jest.mock('../../stores/useSessionStore', () => ({
  useSessionStore: {
    getState: jest.fn().mockReturnValue({
      phase: 'asking_question',
      transitionTo: mockTransitionTo,
    }),
  },
}));

jest.mock('../webrtcManager', () => ({
  webrtcManager: {
    setMicrophoneMuted: (...args: any[]) => mockSetMicrophoneMuted(...args),
  },
}));

// Helper: get the registered listener callback by event name
function getListenerCallback(eventName: string): Function | undefined {
  const call = mockAddListener.mock.calls.find(
    (c: any[]) => c[0] === eventName
  );
  return call ? call[1] : undefined;
}

describe('foregroundAudioService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-setup the mock return for useSessionStore since clearAllMocks resets it
    const { useSessionStore } = require('../../stores/useSessionStore');
    useSessionStore.getState.mockReturnValue({
      phase: 'asking_question',
      transitionTo: mockTransitionTo,
    });
  });

  describe('startForegroundService', () => {
    it('calls native startService with title and body', async () => {
      await startForegroundService('Test Title', 'Test Body');
      expect(mockStartService).toHaveBeenCalledWith('Test Title', 'Test Body');
    });

    it('registers event listeners on first call', async () => {
      // Reset module to clear listenersRegistered flag
      jest.resetModules();
      const { startForegroundService: start } = require('../foregroundAudioService');
      await start('Title', 'Body');
      expect(mockAddListener).toHaveBeenCalledWith('onNotificationAction', expect.any(Function));
      expect(mockAddListener).toHaveBeenCalledWith('onAudioFocusChange', expect.any(Function));
    });
  });

  describe('stopForegroundService', () => {
    it('calls native stopService', async () => {
      await stopForegroundService();
      expect(mockStopService).toHaveBeenCalled();
    });
  });

  describe('updateForegroundNotification', () => {
    it('calls native updateNotification when service is running', async () => {
      mockIsServiceRunning.mockReturnValue(true);
      await updateForegroundNotification('Updated', 'Card 5 of 10');
      expect(mockUpdateNotification).toHaveBeenCalledWith('Updated', 'Card 5 of 10');
    });

    it('does not call native updateNotification when service is not running', async () => {
      mockIsServiceRunning.mockReturnValue(false);
      await updateForegroundNotification('Updated', 'Card 5 of 10');
      expect(mockUpdateNotification).not.toHaveBeenCalled();
    });
  });

  describe('isServiceRunning', () => {
    it('returns the native module value', () => {
      mockIsServiceRunning.mockReturnValue(true);
      expect(isServiceRunning()).toBe(true);

      mockIsServiceRunning.mockReturnValue(false);
      expect(isServiceRunning()).toBe(false);
    });
  });

  describe('notification action handlers', () => {
    // Ensure listeners are registered before testing handlers
    beforeEach(async () => {
      jest.resetModules();
      mockAddListener.mockClear();
      mockTransitionTo.mockClear();
      mockSetMicrophoneMuted.mockClear();

      const { useSessionStore } = require('../../stores/useSessionStore');
      useSessionStore.getState.mockReturnValue({
        phase: 'asking_question',
        transitionTo: mockTransitionTo,
      });

      const { startForegroundService: start } = require('../foregroundAudioService');
      await start('Title', 'Body');
    });

    it('mutes mic and transitions to paused on "pause" action', () => {
      const handler = getListenerCallback('onNotificationAction');
      expect(handler).toBeDefined();

      handler!({ action: 'pause' });

      expect(mockSetMicrophoneMuted).toHaveBeenCalledWith(true);
      expect(mockTransitionTo).toHaveBeenCalledWith('paused', 'notification_pause');
    });

    it('unmutes mic and transitions to asking_question on "resume" action', () => {
      const handler = getListenerCallback('onNotificationAction');
      handler!({ action: 'resume' });

      expect(mockSetMicrophoneMuted).toHaveBeenCalledWith(false);
      expect(mockTransitionTo).toHaveBeenCalledWith('asking_question', 'notification_resume');
    });

    it('calls sessionManager.endSession on "end" action', () => {
      const mockEndSession = jest.fn();
      jest.mock('../sessionManager', () => ({
        sessionManager: { endSession: mockEndSession },
      }));

      const handler = getListenerCallback('onNotificationAction');
      handler!({ action: 'end' });

      expect(mockEndSession).toHaveBeenCalled();
    });
  });

  describe('audio focus change handlers', () => {
    beforeEach(async () => {
      jest.resetModules();
      mockAddListener.mockClear();
      mockTransitionTo.mockClear();
      mockSetMicrophoneMuted.mockClear();

      const { useSessionStore } = require('../../stores/useSessionStore');
      useSessionStore.getState.mockReturnValue({
        phase: 'asking_question',
        transitionTo: mockTransitionTo,
      });

      const { startForegroundService: start } = require('../foregroundAudioService');
      await start('Title', 'Body');
    });

    it('mutes mic and pauses on "loss_transient"', () => {
      const handler = getListenerCallback('onAudioFocusChange');
      handler!({ state: 'loss_transient' });

      expect(mockSetMicrophoneMuted).toHaveBeenCalledWith(true);
      expect(mockTransitionTo).toHaveBeenCalledWith('paused', 'audio_focus_loss_transient');
    });

    it('does not double-pause on "loss_transient" when already paused', () => {
      const { useSessionStore } = require('../../stores/useSessionStore');
      useSessionStore.getState.mockReturnValue({
        phase: 'paused',
        transitionTo: mockTransitionTo,
      });

      const handler = getListenerCallback('onAudioFocusChange');
      handler!({ state: 'loss_transient' });

      expect(mockSetMicrophoneMuted).toHaveBeenCalledWith(true);
      expect(mockTransitionTo).not.toHaveBeenCalled();
    });

    it('unmutes mic and resumes on "gain" when paused', () => {
      const { useSessionStore } = require('../../stores/useSessionStore');
      useSessionStore.getState.mockReturnValue({
        phase: 'paused',
        transitionTo: mockTransitionTo,
      });

      const handler = getListenerCallback('onAudioFocusChange');
      handler!({ state: 'gain' });

      expect(mockSetMicrophoneMuted).toHaveBeenCalledWith(false);
      expect(mockTransitionTo).toHaveBeenCalledWith('asking_question', 'audio_focus_gain');
    });

    it('does not transition on "gain" when not paused', () => {
      const handler = getListenerCallback('onAudioFocusChange');
      handler!({ state: 'gain' });

      expect(mockSetMicrophoneMuted).toHaveBeenCalledWith(false);
      expect(mockTransitionTo).not.toHaveBeenCalled();
    });

    it('mutes mic and pauses on permanent "loss"', () => {
      const handler = getListenerCallback('onAudioFocusChange');
      handler!({ state: 'loss' });

      expect(mockSetMicrophoneMuted).toHaveBeenCalledWith(true);
      expect(mockTransitionTo).toHaveBeenCalledWith('paused', 'audio_focus_loss');
    });

    it('does not pause on "loss" when idle', () => {
      const { useSessionStore } = require('../../stores/useSessionStore');
      useSessionStore.getState.mockReturnValue({
        phase: 'idle',
        transitionTo: mockTransitionTo,
      });

      const handler = getListenerCallback('onAudioFocusChange');
      handler!({ state: 'loss' });

      expect(mockSetMicrophoneMuted).toHaveBeenCalledWith(true);
      expect(mockTransitionTo).not.toHaveBeenCalled();
    });

    it('mutes mic and pauses on "loss_transient_can_duck"', () => {
      const handler = getListenerCallback('onAudioFocusChange');
      handler!({ state: 'loss_transient_can_duck' });

      expect(mockSetMicrophoneMuted).toHaveBeenCalledWith(true);
      expect(mockTransitionTo).toHaveBeenCalledWith('paused', 'audio_focus_duck');
    });
  });
});
