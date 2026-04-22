import { Client } from '@stomp/stompjs';
import { defaultApiBaseUrl } from '../config/envConfig';

const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_APP_DESTINATION = '/noon2app/ai-broker/chat';
const DEFAULT_SUB_PATTERN = '/queue/ai-broker/{userId}/threads/{threadId}';
const DEFAULT_TIMEOUT_MS = 18000;

const toMs = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const withoutTrailingSlash = (value = '') => String(value).replace(/\/+$/, '');

const buildWsUrlFromBase = (baseUrl) => {
  /* nolt-preview-patched */ let origin; try { origin = new URL(baseUrl).origin; } catch { return '/noon2-core/ws-roomstomp?routing-key=ai-broker'; }
  const wsProtocol = origin.startsWith('https://') ? 'wss://' : 'ws://';
  const host = origin.replace(/^https?:\/\//, '');
  return `${wsProtocol}${host}/noon2-core/ws-roomstomp?routing-key=ai-broker`;
};

const buildThreadContextUrl = (baseUrl) => {
  const normalizedBase = withoutTrailingSlash(baseUrl);
  if (normalizedBase.endsWith('/noon2-core')) {
    return `${normalizedBase}/ai-broker/threads/context`;
  }
  return `${normalizedBase}/noon2-core/ai-broker/threads/context`;
};

const interpolateSubDestination = (pattern, userId, threadId) => {
  return pattern
    .replace('{userId}', String(userId))
    .replace('{threadId}', String(threadId));
};

export const parseJsonObjectLenient = (jsonText) => {
  const normalized = String(jsonText || '')
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\u060c/g, ',')
    .replace(/,\s*([}\]])/g, '$1');

  const withInsertedMissingCommas = normalized
    .replace(/([0-9"'\]}])\s*("[^"]+"\s*:)/g, '$1, $2')
    .replace(/([0-9"'\]}])\s*(\w+\s*:)/g, '$1, $2');

  const candidates = [String(jsonText || ''), normalized, withInsertedMissingCommas];
  let lastError = null;

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Unable to parse JSON');
};

export const resolveAiBrokerConfig = (overrides = {}) => {
  const envBase = import.meta.env.VITE_AI_BROKER_HTTP_BASE_URL
    || import.meta.env.VITE_API_BASE_URL
    || defaultApiBaseUrl;

  const httpBaseUrl = withoutTrailingSlash(overrides.httpBaseUrl || envBase);
  const wsUrl = overrides.wsUrl
    || import.meta.env.VITE_AI_BROKER_WS_URL
    || buildWsUrlFromBase(httpBaseUrl);

  const appDestination = overrides.appDestination
    || import.meta.env.VITE_AI_BROKER_APP_DESTINATION
    || DEFAULT_APP_DESTINATION;

  const subDestinationPattern = overrides.subDestinationPattern
    || import.meta.env.VITE_AI_BROKER_SUB_PATTERN
    || DEFAULT_SUB_PATTERN;

  const defaultModel = overrides.defaultModel
    || import.meta.env.VITE_AI_BROKER_MODEL
    || DEFAULT_MODEL;

  const timeoutMs = toMs(
    overrides.timeoutMs ?? import.meta.env.VITE_AI_BROKER_TIMEOUT_MS,
    DEFAULT_TIMEOUT_MS
  );

  const defaultProjectId = overrides.defaultProjectId
    || import.meta.env.VITE_AI_BROKER_PROJECT_ID
    || null;

  const defaultMissionId = overrides.defaultMissionId
    || import.meta.env.VITE_AI_BROKER_MISSION_ID
    || null;

  return {
    httpBaseUrl,
    wsUrl,
    appDestination,
    subDestinationPattern,
    defaultModel,
    timeoutMs,
    defaultProjectId,
    defaultMissionId,
    threadContextUrl: overrides.threadContextUrl || buildThreadContextUrl(httpBaseUrl),
  };
};

export const createThreadContext = async ({
  accessToken,
  projectId,
  missionId,
  defaultHeaders = {},
  configOverrides = {},
}) => {
  if (!accessToken) {
    throw new Error('Missing access token for AI thread creation');
  }

  const config = resolveAiBrokerConfig(configOverrides);
  const resolvedProjectId = projectId || config.defaultProjectId;
  const resolvedMissionId = missionId || config.defaultMissionId;

  if (!resolvedProjectId || !resolvedMissionId) {
    throw new Error('Missing projectId/missionId for AI thread creation');
  }

  const response = await fetch(config.threadContextUrl, {
    method: 'POST',
    headers: {
      ...defaultHeaders,
      'Content-Type': 'application/json',
      Authorization: accessToken,
    },
    body: JSON.stringify({
      projectId: resolvedProjectId,
      missionId: resolvedMissionId,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Failed to create AI thread (${response.status}): ${errorText}`);
  }

  const payload = await response.json();
  if (!payload?.threadId) {
    throw new Error('AI thread response missing threadId');
  }

  return payload;
};

export const streamAiBrokerRequest = async ({
  accessToken,
  userId,
  threadId,
  request,
  onEvent,
  onChunk,
  onComplete,
  onError,
  timeoutMs,
  configOverrides = {},
}) => {
  if (!accessToken || !userId || !threadId) {
    throw new Error('Missing AI broker request context');
  }

  const config = resolveAiBrokerConfig(configOverrides);
  const resolvedTimeoutMs = toMs(timeoutMs, config.timeoutMs);
  const subDestination = interpolateSubDestination(config.subDestinationPattern, userId, threadId);

  const outgoingRequest = {
    ...request,
    threadId,
    model: request?.model || config.defaultModel,
    stream: request?.stream ?? true,
  };

  return new Promise((resolve, reject) => {
    const client = new Client({
      brokerURL: config.wsUrl,
      reconnectDelay: 0,
      heartbeatIncoming: 1500,
      heartbeatOutgoing: 1000,
      connectionTimeout: 5000,
      discardWebsocketOnCommFailure: true,
      connectHeaders: {
        Authorization: accessToken,
      },
    });

    const events = [];
    let completed = false;
    let subscription = null;
    let content = '';
    let rawFinalPayload = null;

    const finish = (fn, payload) => {
      if (completed) {
        return;
      }

      completed = true;
      clearTimeout(timeoutId);

      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch (error) {
          console.warn('[aiBrokerClient] Failed to unsubscribe', error);
        }
      }

      client.deactivate().catch((error) => {
        console.warn('[aiBrokerClient] Failed to deactivate', error);
      });

      fn(payload);
    };

    const fail = (error, payload) => {
      if (typeof onError === 'function') {
        onError(error, payload);
      }
      finish(reject, error);
    };

    const timeoutId = setTimeout(() => {
      fail(new Error(`AI broker request timeout after ${resolvedTimeoutMs}ms`));
    }, resolvedTimeoutMs);

    client.onConnect = () => {
      subscription = client.subscribe(subDestination, (message) => {
        let payload;

        try {
          payload = JSON.parse(message.body);
        } catch (error) {
          fail(new Error('Invalid AI broker message format'));
          return;
        }

        events.push(payload);

        if (typeof onEvent === 'function') {
          onEvent(payload);
        }

        if (payload.messageType === 'chunk') {
          if (typeof payload.data === 'string') {
            content += payload.data;
            if (typeof onChunk === 'function') {
              onChunk(payload.data, payload);
            }
          }
          return;
        }

        if (payload.messageType === 'complete') {
          rawFinalPayload = payload;
          if (typeof payload.data === 'string') {
            content += payload.data;
          }

          const result = {
            content: content.trim(),
            events,
            rawFinalPayload,
          };

          if (typeof onComplete === 'function') {
            onComplete(result);
          }

          finish(resolve, result);
          return;
        }

        if (payload.messageType === 'error') {
          fail(new Error(payload.error || 'AI broker error'), payload);
        }
      });

      client.publish({
        destination: config.appDestination,
        body: JSON.stringify(outgoingRequest),
      });
    };

    client.onStompError = (frame) => {
      fail(new Error(frame?.headers?.message || 'STOMP error'), frame);
    };

    client.onWebSocketError = () => {
      fail(new Error('WebSocket error while requesting AI broker'));
    };

    client.onWebSocketClose = () => {
      if (!completed) {
        fail(new Error('WebSocket closed before request completed'));
      }
    };

    client.activate();
  });
};

export const sendAiBrokerRequest = async ({
  accessToken,
  userId,
  threadId,
  request,
  timeoutMs,
  configOverrides = {},
}) => {
  return streamAiBrokerRequest({
    accessToken,
    userId,
    threadId,
    request: {
      ...request,
      stream: request?.stream ?? true,
    },
    timeoutMs,
    configOverrides,
  });
};
