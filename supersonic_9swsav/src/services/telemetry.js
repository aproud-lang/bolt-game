// Platform telemetry and analytics integration
// Connects to noon2-core service for activity event tracking

import { defaultApiBaseUrl } from '../config/envConfig';

// Event types matching backend ActivityEventType enum (lifecycle model)
export const EventType = {
  ACTIVITY_START: 'ACTIVITY_START',
  ACTIVITY_END: 'ACTIVITY_END',
  POINT_START: 'POINT_START',
  POINT_END: 'POINT_END',
};

// Configuration - set by environment or activity config
const CONFIG = {
  // Base URL for the noon2-core API (override via setConfig)
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl,
  // Activity ID (should be set by the activity)
  activityId: null,
  // Enable debug logging
  debug: import.meta.env.DEV || false,
  // Buffer events before sending (for batching)
  batchEnabled: false,
  batchSize: 10,
  batchIntervalMs: 5000,
};

// Internal state
let authToken = null;
let sessionDetails = null;
let defaultHeaders = null;
let user = null;
let eventBuffer = [];
let batchTimer = null;

/**
 * Initialize the telemetry service with auth credentials and session context.
 * Call this after receiving auth data from the embedded handshake.
 * 
 * @param {Object} authData - Auth data from useNoonAuth hook
 * @param {string} authData.accessToken - JWT access token
 * @param {Object} authData.sessionDetails - Session context (sessionId, classroomId, etc.)
 */
export function initTelemetry(authData) {
  if (!authData?.accessToken) {
    console.warn('[Telemetry] No access token provided, events will not be sent');
    return;
  }

  console.log('[Telemetry] Initialized');

  authToken = authData.accessToken;
  user = authData.user || {};
  sessionDetails = authData.sessionDetails || {};
  defaultHeaders = authData.defaultHeaders || {};

  if (CONFIG.debug) {
    console.log('[Telemetry] Initialized with session:', sessionDetails);
  }

  // Start batch timer if batching is enabled
  if (CONFIG.batchEnabled && !batchTimer) {
    batchTimer = setInterval(flushEvents, CONFIG.batchIntervalMs);
  }
}

/**
 * Configure the telemetry service.
 * 
 * @param {Object} config - Configuration options
 * @param {string} config.apiBaseUrl - Base URL for the API
 * @param {string} config.activityId - Unique ID for this activity
 * @param {boolean} config.debug - Enable debug logging
 * @param {boolean} config.batchEnabled - Enable event batching
 */
export function setConfig(config) {
  Object.assign(CONFIG, config);

  if (CONFIG.batchEnabled && !batchTimer) {
    batchTimer = setInterval(flushEvents, CONFIG.batchIntervalMs);
  } else if (!CONFIG.batchEnabled && batchTimer) {
    clearInterval(batchTimer);
    batchTimer = null;
    flushEvents(); // Send any remaining buffered events
  }
}

/**
 * Track an activity event.
 * 
 * @param {string} eventType - One of EventType values (ACTIVITY_START, ACTIVITY_END, POINT_START, POINT_END)
 * @param {string} eventName - Specific event name (e.g., 'question_1', 'step_intro')
 * @param {Object} eventData - Additional event-specific data
 * @returns {Promise<Object>} Response with success status
 */
export async function trackEvent(eventType, eventName, eventData = {}) {
  const event = {
    activityId: CONFIG.activityId || extractActivityId(),
    activityUrl: window.location.href,
    sessionId: sessionDetails?.sessionId || null,
    classroomId: sessionDetails?.roomId || null,
    eventType,
    eventName,
    eventData,
    recordedAt: new Date().toISOString(),
  };

  if (CONFIG.debug) {
    console.log('[Telemetry] Event:', eventType, eventName, eventData);
  }

  if (!authToken) {
    if (CONFIG.debug) {
      console.warn('[Telemetry] No auth token, event not sent:', event);
    }
    return { success: false, error: 'Not authenticated' };
  }

  if (CONFIG.batchEnabled) {
    eventBuffer.push(event);
    if (eventBuffer.length >= CONFIG.batchSize) {
      return flushEvents();
    }
    return { success: true, buffered: true };
  }

  return sendEvent(event);
}

/**
 * Send a single event to the backend.
 */
async function sendEvent(event) {
  try {
    if (CONFIG.debug) console.log('[Telemetry] Sending event:', event.type);
    const response = await fetch(`${CONFIG.apiBaseUrl}/noon2-core/activity-events`, {
      method: 'POST',
      headers: {
        ...defaultHeaders,
        'Content-Type': 'application/json',
        'Authorization': authToken,
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('[Telemetry] Failed to send event:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Flush all buffered events to the backend.
 */
export async function flushEvents() {
  if (eventBuffer.length === 0) {
    return { success: true, count: 0 };
  }

  if (!authToken) {
    if (CONFIG.debug) {
      console.warn('[Telemetry] No auth token, buffered events not sent');
    }
    return { success: false, error: 'Not authenticated' };
  }

  const events = [...eventBuffer];
  eventBuffer = [];

  try {
    const response = await fetch(`${CONFIG.apiBaseUrl}/noon2-core/activity-events/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authToken,
      },
      body: JSON.stringify({ events }),
    });

    if (!response.ok) {
      // Put events back in buffer on failure
      eventBuffer = events.concat(eventBuffer);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (CONFIG.debug) {
      console.log('[Telemetry] Flushed', events.length, 'events');
    }
    return { success: true, count: events.length, data };
  } catch (error) {
    console.error('[Telemetry] Failed to flush events:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Extract activity ID from the current URL path.
 */
function extractActivityId() {
  // Try to get activity ID from URL path (e.g., /activities/my-activity-id)
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  return pathParts[pathParts.length - 1] || 'unknown';
}

// ============================================================================
// Lifecycle Helpers - Activity Level
// ============================================================================

/**
 * Track that the activity has started.
 * 
 * @param {Object} details - Optional details about the activity start
 */
export function trackActivityStart(details = {}) {
  return trackEvent(EventType.ACTIVITY_START, 'activity', {
    startTime: new Date().toISOString(),
    url: window.location.href,
    ...details,
  });
}

/**
 * Track that the activity has ended.
 * 
 * @param {Object} summary - Completion summary (score, duration, totalPoints, etc.)
 */
export function trackActivityEnd(summary = {}) {
  return trackEvent(EventType.ACTIVITY_END, 'activity', {
    endTime: new Date().toISOString(),
    ...summary,
  });
}

// ============================================================================
// Lifecycle Helpers - Point Level (questions, steps, sections)
// ============================================================================

/**
 * Track that a point (question, step, section) has started.
 * 
 * @param {string} pointId - Identifier for the point (e.g., 'question_1', 'step_intro')
 * @param {Object} details - Details about the point (questionText, stepTitle, etc.)
 */
export function trackPointStart(pointId, details = {}) {
  return trackEvent(EventType.POINT_START, pointId, {
    startTime: new Date().toISOString(),
    ...details,
  });
}

/**
 * Track that a point (question, step, section) has ended.
 * 
 * @param {string} pointId - Identifier for the point (e.g., 'question_1', 'step_intro')
 * @param {Object} details - Details about completion (answer, correct, timeSpent, etc.)
 */
export function trackPointEnd(pointId, details = {}) {
  return trackEvent(EventType.POINT_END, pointId, {
    endTime: new Date().toISOString(),
    ...details,
  });
}

/**
 * Cleanup function - call before unmounting to flush remaining events.
 */
export function cleanup() {
  if (batchTimer) {
    clearInterval(batchTimer);
    batchTimer = null;
  }
  return flushEvents();
}

// Default export for convenience
export const telemetryService = {
  init: initTelemetry,
  setConfig,
  trackEvent,
  trackActivityStart,
  trackActivityEnd,
  trackPointStart,
  trackPointEnd,
  flushEvents,
  cleanup,
  EventType,
};

export default telemetryService;
