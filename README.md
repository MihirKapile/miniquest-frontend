# MiniQuest Frontend (Expo / React Native)

## Overview

This is the child-facing and parent-facing frontend for MiniQuest, built with **React Native + Expo**. It allows:

* Children to interact with the AI storyteller using speech.
* Parents to view dashboards summarizing gameplay.
* Minimal COPPA-compliant data collection and logging for pilot metrics.

---

### Features

* Push-to-talk speech recognition (mobile devices, Chrome recommended for web).
* Shows AI storyteller responses and child transcripts.
* Parent dashboard:

  * Time on task
  * Choices made
  * Skills practiced
  * 3-sentence story recap
* Logs events for metrics: session start/finish, turns, latency, fail-to-understand, recap opens.
* Safety filters: forbidden words blocked in child input and AI responses.
* COPPA-aware: no PII collected; only pseudonym and quest ID.

---

### Requirements

* Node.js 18+
* Expo CLI
* npm or yarn

---

### Setup & Run

1. Install Expo CLI globally (if not already installed):

```bash
npm install -g expo-av expo-speech react-native-voice
```

2. Clone the repository and install dependencies:

```bash
cd frontend
npm install
```

3. Start the Expo app:

```bash
npm start
```

4. Run on your device or simulator:

* Use the Expo Go app (iOS/Android) to scan the QR code.
* Or launch in web simulator with `w`.

---

### Backend Connection

* Set `backendURL` in `App.js` to point to your backend server:

```javascript
const backendURL = "http://10.0.0.89:5000";
```

---

### Event Logging

Frontend logs events by sending POST requests to backend `/log_event`:

* `session_start` / `session_finish`
* `turn` (child input, AI response, latency)
* `fail_to_understand`
* `recap_open`

Example payload:

```json
{
  "eventType": "turn",
  "quest_id": 1,
  "child_id": "player1",
  "turn_number": 2,
  "latency_ms": 250,
  "child_input": "I choose left",
  "ai_response": "You arrive at a river",
  "additionalData": {}
}
```

---

### COPPA Compliance

* Minimal data collected: `quest_id`, `child_id` (pseudonym), and gameplay transcript.
* No personal identifiers (PII) stored.
* Parent consent flow is mocked in UI.

---

### Notes

* Recommended devices: modern mobile or desktop browser with microphone access.
* For pilot testing, ensure backend is running at the `backendURL`.

