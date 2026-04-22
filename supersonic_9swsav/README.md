# Standard Activity Template

This is a React-based template for creating student activities that integrate with the Noon platform.

## Features

- **React 18** + **Vite**
- **Framer Motion** for animations
- **Noon Platform Authentication**
- **Optional generic AI Broker client** (`src/services/aiBrokerClient.js`)
- **Optional AI Broker recipe wrappers** (`src/services/aiBrokerService.js`)

## Authentication

This template includes a pre-built hook `useNoonAuth` that handles the handshake with the Noon mobile app.

### Usage

```javascript
import { useNoonAuth } from './hooks/useNoonAuth';

function MyActivity() {
  const { token, user, status, error } = useNoonAuth();

  if (status === 'initializing') {
    return <div>Loading...</div>;
  }

  if (status === 'error') {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div>
      <h1>Welcome, {user?.name}</h1>
      <p>Your access token is: {token.accessToken}</p>
    </div>
  );
}
```

### How it works

1. The activity sends a `HANDSHAKE_START_RN` message to the parent window (the mobile app).
2. The mobile app verifies the origin and responds with the authentication tokens and session details.
3. The `useNoonAuth` hook uses the session id (when available) to call `GET /noon2-core/courseSessions/{id}/context` and augment session details (room id, physical classroom id, server, etc.).
4. The hook exposes the merged data to your components.

### Session fields

The hook normalizes session info so that room and physical classroom are separate:

- `sessionDetails.sessionId`: Course session id.
- `sessionDetails.roomId`: Room id used for WebSocket multiplayer.
- `sessionDetails.classroomId`: Physical classroom id (when available). Not used for multiplayer.
- `sessionDetails.physicalClassroomId`: Same as `classroomId` (explicit name for clarity).

## Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the dev server:
   ```bash
   npm run dev
   ```

## Deployment notes

- The Vite config sets `base` to `./` so built assets load correctly from any S3/CDN prefix (e.g., `/activities/my-activity`). If you need a fixed base, set `ACTIVITY_BASE_PATH` when running the build.
- A default `favicon.svg` is included under `public/`; update it per-activity to avoid missing icon requests in production.
- Backend defaults target the production Noon stack, but can switch via `VITE_ENV` (`local`, `dev`, `staging`, `prod`) or explicit overrides:
  - `VITE_API_BASE_URL` for noon2-core (defaults: local `http://localhost:8082`, dev `https://backend.dev.noonedu.io`, staging `https://backend.staging.noonedu.io`, prod `https://backend.studyatnoon.com`)
  - `VITE_AUTH_BASE_URL` for noon2-auth (defaults: local `http://localhost:8771`, dev `https://backend.dev.noonedu.io/noon2-auth`, staging `https://backend.staging.noonedu.io/noon2-auth`, prod `https://backend.studyatnoon.com/noon2-auth`)
  - `VITE_AI_BROKER_HTTP_BASE_URL` optional explicit AI broker HTTP base (supports either origin or `/noon2-core` suffix)
  - `VITE_AI_BROKER_WS_URL` optional override for AI broker WebSocket endpoint
  - `VITE_AI_BROKER_APP_DESTINATION` optional STOMP publish destination (default `/noon2app/ai-broker/chat`)
  - `VITE_AI_BROKER_SUB_PATTERN` optional subscribe pattern with `{userId}` and `{threadId}` placeholders
  - `VITE_AI_BROKER_MODEL` optional model override (default `gpt-4o-mini`)
  - `VITE_AI_BROKER_TIMEOUT_MS` optional timeout in milliseconds (default `18000`)
  - `VITE_AI_BROKER_PROJECT_ID` optional AI broker project id override (default `template-activity`)
  - `VITE_AI_BROKER_MISSION_ID` optional AI broker mission id override (default `default-scoring`)

## AI Broker Core Client

Use `src/services/aiBrokerClient.js` for generic broker interactions:

- `resolveAiBrokerConfig(overrides?)`
- `createThreadContext({...})`
- `streamAiBrokerRequest({...})`
- `sendAiBrokerRequest({...})`
- `parseJsonObjectLenient(jsonText)`

### Chatbot recipe

```javascript
import { createThreadContext, sendAiBrokerRequest } from './services/aiBrokerClient';

const { threadId } = await createThreadContext({
  accessToken,
  projectId: 'my-chatbot',
  missionId: 'assistant-conversation',
});

const response = await sendAiBrokerRequest({
  accessToken,
  userId,
  threadId,
  request: {
    model: 'gpt-4o-mini',
    stream: true,
    keep_conversation_history: true,
    messages: [{ role: 'user', content: 'Explain photosynthesis simply.' }],
  },
});

console.log(response.content);
```

### Structured JSON output recipe

```javascript
import { parseJsonObjectLenient, sendAiBrokerRequest } from './services/aiBrokerClient';

const response = await sendAiBrokerRequest({
  accessToken,
  userId,
  threadId,
  request: {
    messages: [{ role: 'user', content: 'Return JSON with keys summary and riskLevel.' }],
  },
});

const parsed = parseJsonObjectLenient(response.content);
```

### Image generation pattern

Use `sendAiBrokerRequest` with a pass-through `request` payload for your broker contract, then branch on returned data shape in your app layer.

```javascript
const response = await sendAiBrokerRequest({
  accessToken,
  userId,
  threadId,
  request: {
    model: 'gpt-image-1',
    stream: true,
    messages: [{ role: 'user', content: 'Generate a classroom science poster in Arabic.' }],
    // add broker-specific fields here
  },
});
```

## AI Broker Recipe Wrappers (Backward Compatible)

`src/services/aiBrokerService.js` keeps scoring wrappers stable:

- `createScoringThread(...)`
- `scoreFreeFormAnswer(...)`
- `scoreFreeFormAnswerMock(...)`

`scoreFreeFormAnswer` is strict by default on malformed JSON.  
To opt into fallback behavior, pass:

```javascript
onParseErrorFallback: ({ rawContent, error, context }) => {
  // return fallback score object or undefined to rethrow
}
```

## Optimization Guidance

- Reuse `threadId` per user/session to keep context continuity and reduce setup overhead.
- Set `keep_conversation_history` intentionally: `true` for assistant chat, `false` for isolated scoring/tasks.
- Pick model per task (faster/smaller for scoring, stronger for reasoning-heavy tasks).
- Prefer streaming for responsive UX, but keep server/client timeout aligned.
- Use explicit output constraints when you need structured JSON.
- Use `parseJsonObjectLenient` only when necessary; prefer strict JSON when model compliance is reliable.
