import {
  RTCPeerConnection,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
  MediaStreamTrack,
} from 'react-native-webrtc';
import { getApiKey } from '../utils/secureStorage';
import { useConnectionStore } from '../stores/useConnectionStore';

const OPENAI_REALTIME_URL = 'https://api.openai.com/v1/realtime';
const REALTIME_MODEL = 'gpt-4o-realtime-preview-2024-12-17';

const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_BASE_DELAY_MS = 1000;

interface WebRTCManagerState {
  peerConnection: RTCPeerConnection | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  dataChannel: any | null;
}

type DataChannelEventHandler = (event: any) => void;

class WebRTCManager {
  private state: WebRTCManagerState = {
    peerConnection: null,
    localStream: null,
    remoteStream: null,
    dataChannel: null,
  };

  private eventHandlers: Map<string, DataChannelEventHandler[]> = new Map();

  /**
   * Whether the initial connection handshake (ICE + data channel) is still
   * in progress.  While true the one-shot `waitForIceConnection` promise
   * owns the `oniceconnectionstatechange` callback, so the persistent
   * monitor must not overwrite it.
   */
  private isInitialConnect = false;

  /** True while a reconnect sequence is in progress. */
  private isReconnecting = false;

  /**
   * Callback invoked when the connection drops during an active session.
   * Set by sessionManager to trigger the reconnect + resume flow.
   */
  onConnectionDropped: (() => void) | null = null;

  /**
   * Connect to OpenAI Realtime API via WebRTC
   */
  async connect(): Promise<boolean> {
    const setConnectionState = useConnectionStore.getState().setConnectionState;

    try {
      setConnectionState('connecting');
      this.isInitialConnect = true;

      // 1. Get API key from secure storage
      const apiKey = await getApiKey();
      if (!apiKey) {
        throw new Error('No API key found. Please add your OpenAI API key in settings.');
      }

      // 2. Get microphone access
      const localStream = await mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      this.state.localStream = localStream as MediaStream;

      // 3. Create peer connection
      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      this.state.peerConnection = peerConnection;

      // 4. Add local audio track
      (localStream as MediaStream).getTracks().forEach((track: MediaStreamTrack) => {
        peerConnection.addTrack(track, localStream as MediaStream);
      });

      // 5. Handle remote audio track (using callback style)
      (peerConnection as any).ontrack = (event: any) => {
        if (event.streams && event.streams[0]) {
          this.state.remoteStream = event.streams[0] as MediaStream;
          console.log('[WebRTC] Remote audio track received');
        }
      };

      // 6. Create data channel for events
      const dataChannel = peerConnection.createDataChannel('oai-events', {
        ordered: true,
      });
      this.state.dataChannel = dataChannel;

      // onopen is set later by waitForDataChannel — log happens there

      (dataChannel as any).onmessage = (event: any) => {
        try {
          const message = JSON.parse(event.data);
          this.handleServerEvent(message);
        } catch (e) {
          console.error('[WebRTC] Failed to parse message:', e);
        }
      };

      (dataChannel as any).onerror = (error: any) => {
        console.error('[WebRTC] Data channel error:', error);
      };

      // 7. Create and set local description (SDP offer)
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      } as any);
      await peerConnection.setLocalDescription(offer);

      // 8. Send offer to OpenAI and get answer
      const response = await fetch(`${OPENAI_REALTIME_URL}?model=${REALTIME_MODEL}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      // 9. Set remote description (SDP answer)
      const answerSdp = await response.text();
      const answer = new RTCSessionDescription({
        type: 'answer',
        sdp: answerSdp,
      });
      await peerConnection.setRemoteDescription(answer);

      // 10. Wait for ICE connection
      await this.waitForIceConnection(peerConnection);

      // 11. Wait for data channel to open before resolving
      await this.waitForDataChannel(dataChannel);

      // 12. Install persistent ICE & data-channel monitors
      this.isInitialConnect = false;
      this.installConnectionMonitor(peerConnection, dataChannel);

      setConnectionState('connected');
      console.log('[WebRTC] Connected to OpenAI Realtime API');
      return true;

    } catch (error) {
      console.error('[WebRTC] Connection failed:', error);
      this.isInitialConnect = false;
      setConnectionState('failed');
      this.cleanupConnection();
      throw error;
    }
  }

  /**
   * Reconnect to WebRTC with exponential backoff.
   * Cleans up the old connection but preserves event handlers so that
   * sessionManager's listeners survive the reconnect.
   * Returns true if reconnection succeeded, false if all attempts failed.
   */
  async reconnect(): Promise<boolean> {
    if (this.isReconnecting) {
      console.warn('[WebRTC] Reconnect already in progress, skipping');
      return false;
    }

    this.isReconnecting = true;
    const connStore = useConnectionStore.getState();
    connStore.setConnectionState('reconnecting');
    connStore.resetReconnectAttempts();

    for (let attempt = 1; attempt <= MAX_RECONNECT_ATTEMPTS; attempt++) {
      useConnectionStore.getState().incrementReconnectAttempts();
      const delay = RECONNECT_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(`[WebRTC] Reconnect attempt ${attempt}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);

      await this.sleep(delay);

      // Clean up old connection resources but keep event handlers
      this.cleanupConnection();

      try {
        await this.connect();
        // connect() succeeded — reset counters
        useConnectionStore.getState().resetReconnectAttempts();
        this.isReconnecting = false;
        console.log(`[WebRTC] Reconnected on attempt ${attempt}`);
        return true;
      } catch (error) {
        console.warn(`[WebRTC] Reconnect attempt ${attempt} failed:`, error);
      }
    }

    // All attempts exhausted
    console.error('[WebRTC] All reconnect attempts failed');
    useConnectionStore.getState().setConnectionState('failed');
    this.isReconnecting = false;
    return false;
  }

  /**
   * Wait for ICE connection to be established
   */
  private waitForIceConnection(pc: RTCPeerConnection): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('ICE connection timeout'));
      }, 30000);

      const checkState = () => {
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          clearTimeout(timeout);
          resolve();
        } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
          clearTimeout(timeout);
          reject(new Error(`ICE connection failed: ${pc.iceConnectionState}`));
        }
      };

      (pc as any).oniceconnectionstatechange = checkState;
      checkState(); // Check immediately in case already connected
    });
  }

  /**
   * Wait for data channel to reach 'open' state
   */
  private waitForDataChannel(dc: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (dc.readyState === 'open') {
        console.log('[WebRTC] Data channel opened');
        resolve();
        return;
      }
      const timeout = setTimeout(() => {
        reject(new Error('Data channel open timeout'));
      }, 10000);
      dc.onopen = () => {
        clearTimeout(timeout);
        console.log('[WebRTC] Data channel opened');
        resolve();
      };
    });
  }

  /**
   * Install persistent monitors on the peer connection and data channel.
   * These fire after the initial handshake and detect mid-session drops.
   */
  private installConnectionMonitor(pc: RTCPeerConnection, dc: any): void {
    const { setConnectionState, setNetworkStatus } = useConnectionStore.getState();

    // --- ICE connection state monitor ---
    (pc as any).oniceconnectionstatechange = () => {
      // Guard: if we are in the initial connect handshake, skip (handled by waitForIceConnection)
      if (this.isInitialConnect) return;

      const iceState = pc.iceConnectionState;
      console.log(`[WebRTC] ICE connection state changed: ${iceState}`);

      switch (iceState) {
        case 'connected':
        case 'completed':
          setConnectionState('connected');
          setNetworkStatus('online');
          break;
        case 'disconnected':
          // ICE disconnected — network may have dropped
          console.warn('[WebRTC] ICE disconnected — possible network loss');
          setConnectionState('reconnecting');
          setNetworkStatus('offline');
          this.handleConnectionDrop('ICE disconnected');
          break;
        case 'failed':
          console.error('[WebRTC] ICE connection failed');
          setConnectionState('failed');
          setNetworkStatus('offline');
          this.handleConnectionDrop('ICE failed');
          break;
        case 'closed':
          // Only update if we haven't already cleaned up intentionally
          if (useConnectionStore.getState().connectionState !== 'disconnected') {
            setConnectionState('disconnected');
          }
          break;
      }
    };

    // --- Data channel close/error monitor ---
    (dc as any).onclose = () => {
      console.warn('[WebRTC] Data channel closed unexpectedly');
      const currentState = useConnectionStore.getState().connectionState;
      // Only flag as failed if we weren't intentionally disconnecting
      if (currentState === 'connected' || currentState === 'reconnecting') {
        setConnectionState('failed');
        setNetworkStatus('offline');
        this.handleConnectionDrop('data channel closed');
      }
    };

    // Override onerror to also update connection store
    (dc as any).onerror = (error: any) => {
      console.error('[WebRTC] Data channel error:', error);
      const currentState = useConnectionStore.getState().connectionState;
      if (currentState === 'connected') {
        setConnectionState('reconnecting');
      }
    };
  }

  /**
   * Called when a connection drop is detected by the persistent monitors.
   * Notifies the session manager via the onConnectionDropped callback so
   * it can orchestrate reconnect and session resume.
   */
  private handleConnectionDrop(reason: string): void {
    // Don't fire during intentional disconnect or if already reconnecting
    if (this.isReconnecting) return;
    const connState = useConnectionStore.getState().connectionState;
    if (connState === 'disconnected') return;

    console.warn(`[WebRTC] Connection dropped: ${reason}`);

    if (this.onConnectionDropped) {
      this.onConnectionDropped();
    }
  }

  /**
   * Send an event to the server via data channel
   */
  sendEvent(event: any): void {
    if (this.state.dataChannel?.readyState === 'open') {
      this.state.dataChannel.send(JSON.stringify(event));
    } else {
      console.warn('[WebRTC] Data channel not open, cannot send event');
    }
  }

  /**
   * Update session configuration.
   * Returns a promise that resolves when the server acknowledges the update.
   */
  updateSession(config: {
    instructions?: string;
    tools?: any[];
    modalities?: string[];
    turn_detection?: any;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.off('session.updated', handler);
        reject(new Error('session.update acknowledgement timeout'));
      }, 10000);

      const handler = () => {
        clearTimeout(timeout);
        this.off('session.updated', handler);
        resolve();
      };

      this.on('session.updated', handler);

      // Only include fields that are explicitly provided to avoid
      // accidentally clearing tools/instructions on partial updates
      const session: Record<string, any> = {};
      if (config.modalities !== undefined) session.modalities = config.modalities;
      if (config.instructions !== undefined) session.instructions = config.instructions;
      if (config.tools !== undefined) session.tools = config.tools;
      if (config.turn_detection !== undefined) session.turn_detection = config.turn_detection;
      if (config.tools !== undefined) session.tool_choice = 'auto';
      if (config.modalities !== undefined) session.input_audio_transcription = { model: 'whisper-1' };

      this.sendEvent({
        type: 'session.update',
        session,
      });
    });
  }

  /**
   * Wait for the next `response.done` server event.
   * Useful to ensure an AI response has fully completed before proceeding.
   */
  waitForNextResponseDone(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.off('response.done', handler);
        reject(new Error('Timed out waiting for response.done'));
      }, 30000);

      const handler = () => {
        clearTimeout(timeout);
        this.off('response.done', handler);
        resolve();
      };

      this.on('response.done', handler);
    });
  }

  /**
   * Send a text message and trigger AI response.
   * Waits for the server to confirm the conversation item was created
   * before requesting a response, preventing race conditions.
   */
  async sendTextMessage(text: string): Promise<void> {
    // Wait for server confirmation that the item was added to the conversation
    const itemCreated = new Promise<void>((resolve) => {
      const handler = () => {
        this.off('conversation.item.created', handler);
        resolve();
      };
      this.on('conversation.item.created', handler);
    });

    this.sendEvent({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }],
      },
    });

    await itemCreated;

    // Now the item is confirmed in the conversation — safe to request response
    this.sendEvent({ type: 'response.create' });
  }

  /**
   * Send tool result back to AI
   */
  sendToolResult(callId: string, result: any): void {
    this.sendEvent({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: callId,
        output: JSON.stringify(result),
      },
    });
    this.sendEvent({ type: 'response.create' });
  }

  /**
   * Handle server events
   */
  private handleServerEvent(event: any): void {
    const handlers = this.eventHandlers.get(event.type) || [];
    handlers.forEach((handler) => handler(event));

    // Also call 'all' handlers
    const allHandlers = this.eventHandlers.get('all') || [];
    allHandlers.forEach((handler) => handler(event));
  }

  /**
   * Register event handler
   */
  on(eventType: string, handler: DataChannelEventHandler): void {
    const handlers = this.eventHandlers.get(eventType) || [];
    handlers.push(handler);
    this.eventHandlers.set(eventType, handlers);
  }

  /**
   * Remove event handler
   */
  off(eventType: string, handler: DataChannelEventHandler): void {
    const handlers = this.eventHandlers.get(eventType) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
      this.eventHandlers.set(eventType, handlers);
    }
  }

  /**
   * Remove all handlers for a specific event type
   */
  offAll(eventType: string): void {
    this.eventHandlers.delete(eventType);
  }

  /**
   * Disconnect and cleanup (intentional — clears everything including handlers)
   */
  disconnect(): void {
    const setConnectionState = useConnectionStore.getState().setConnectionState;
    this.onConnectionDropped = null;
    this.isReconnecting = false;
    this.cleanup();
    setConnectionState('disconnected');
    console.log('[WebRTC] Disconnected');
  }

  /**
   * Clean up WebRTC connection resources but PRESERVE event handlers.
   * Used during reconnect so sessionManager's listeners survive.
   */
  private cleanupConnection(): void {
    if (this.state.dataChannel) {
      try { this.state.dataChannel.close(); } catch (_e) { /* ignore */ }
      this.state.dataChannel = null;
    }

    if (this.state.localStream) {
      this.state.localStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      this.state.localStream = null;
    }

    if (this.state.peerConnection) {
      try { this.state.peerConnection.close(); } catch (_e) { /* ignore */ }
      this.state.peerConnection = null;
    }

    this.state.remoteStream = null;
  }

  /**
   * Full cleanup — closes connection AND clears all event handlers.
   * Used on intentional disconnect.
   */
  private cleanup(): void {
    this.cleanupConnection();
    this.eventHandlers.clear();
  }

  /**
   * Get current connection state
   */
  isConnected(): boolean {
    return useConnectionStore.getState().connectionState === 'connected';
  }

  /**
   * Mute/unmute microphone
   */
  setMicrophoneMuted(muted: boolean): void {
    if (this.state.localStream) {
      this.state.localStream.getTracks().forEach((track: MediaStreamTrack) => {
        track.enabled = !muted;
      });
    }
  }

  /** Simple async delay helper */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const webrtcManager = new WebRTCManager();
