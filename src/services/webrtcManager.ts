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
   * Connect to OpenAI Realtime API via WebRTC
   */
  async connect(): Promise<boolean> {
    const setConnectionState = useConnectionStore.getState().setConnectionState;

    try {
      setConnectionState('connecting');

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

      setConnectionState('connected');
      console.log('[WebRTC] Connected to OpenAI Realtime API');
      return true;

    } catch (error) {
      console.error('[WebRTC] Connection failed:', error);
      setConnectionState('failed');
      this.cleanup();
      throw error;
    }
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

      this.sendEvent({
        type: 'session.update',
        session: {
          modalities: config.modalities || ['text', 'audio'],
          instructions: config.instructions,
          input_audio_transcription: { model: 'whisper-1' },
          turn_detection: config.turn_detection !== undefined
            ? config.turn_detection
            : { type: 'server_vad' },
          tools: config.tools || [],
          tool_choice: 'auto',
        },
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
   * Send a text message to trigger AI response
   */
  sendTextMessage(text: string): void {
    this.sendEvent({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }],
      },
    });
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
   * Disconnect and cleanup
   */
  disconnect(): void {
    const setConnectionState = useConnectionStore.getState().setConnectionState;
    this.cleanup();
    setConnectionState('disconnected');
    console.log('[WebRTC] Disconnected');
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.state.dataChannel) {
      this.state.dataChannel.close();
      this.state.dataChannel = null;
    }

    if (this.state.localStream) {
      this.state.localStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      this.state.localStream = null;
    }

    if (this.state.peerConnection) {
      this.state.peerConnection.close();
      this.state.peerConnection = null;
    }

    this.state.remoteStream = null;
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
}

// Export singleton instance
export const webrtcManager = new WebRTCManager();
