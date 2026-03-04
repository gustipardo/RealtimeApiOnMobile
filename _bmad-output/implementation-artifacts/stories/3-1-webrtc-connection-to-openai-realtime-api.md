# Story 3.1: WebRTC Connection to OpenAI Realtime API

## Status: done

## Story

As a user,
I want to connect to the AI voice tutor,
So that I can have a voice conversation for studying.

## Acceptance Criteria

**Given** a deck is selected and due cards are available
**When** the session screen loads and the user initiates a connection
**Then:**

1. `services/webrtcManager.ts` creates an RTCPeerConnection using react-native-webrtc
2. An SDP offer is sent to OpenAI's `/v1/realtime` endpoint with the API key from expo-secure-store
3. Microphone audio is captured via `mediaDevices.getUserMedia({ audio: true })`
4. The remote audio track (AI voice) plays through the device speaker
5. `useConnectionStore` tracks connection state (disconnected, connecting, connected, failed)
6. Connection failure shows an error in the UI and transitions session FSM to `error`

## Technical Context

- OpenAI Realtime API: https://platform.openai.com/docs/guides/realtime
- react-native-webrtc for WebRTC implementation
- expo-secure-store for API key retrieval

## Tasks

- [ ] Create webrtcManager service
- [ ] Implement SDP offer/answer exchange with OpenAI
- [ ] Capture microphone audio
- [ ] Play remote audio
- [ ] Update connection store state
- [ ] Handle connection errors
