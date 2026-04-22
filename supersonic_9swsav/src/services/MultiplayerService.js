import { Client } from '@stomp/stompjs';
import { defaultWsUrl, defaultApiBaseUrl } from '../config/envConfig';

/**
 * @typedef {Object} NormalizedMessage
 * @property {string} type - Message type identifier
 * @property {Object} payload - Message payload content
 * @property {string|number} senderId - Sender's user ID
 * @property {string} activityId - Activity ID
 * @property {string|number} playerId - Alias for senderId (for game compatibility)
 * @property {number} [timestamp] - Server timestamp (ms since epoch)
 * @property {boolean} [isHistorical] - True if this message is from history replay
 * @property {Object} rawMessage - Original unwrapped message for debugging
 */

/**
 * @typedef {Object} StatusEvent
 * @property {'connecting'|'connected'|'disconnected'|'error'} status - Connection status
 * @property {string} [error] - Error message if status is 'error'
 * @property {string|number} [roomId] - Current room ID
 * @property {string} [activityId] - Current activity ID
 */

/**
 * @typedef {Object} SessionDetails
 * @property {string|number} [classroomId] - Classroom ID (alternative to roomId)
 * @property {string|number} [roomId] - Room ID
 * @property {string|number} [userId] - User's ID
 * @property {string} [userName] - User's display name
 */

/**
 * Service to handle real-time multiplayer communication.
 * Connects to noon2-core via STOMP over WebSockets.
 * Supports sticky sessions and late-joiner history replay.
 */

class MultiplayerService {
    /** Max reconnection attempts before giving up */
    static MAX_RECONNECT_ATTEMPTS = 3;

    constructor() {
        this.client = null;
        this.connected = false;
        this.subscriptions = new Map();
        /** @type {Set<function(NormalizedMessage): void>} */
        this.messageHandlers = new Set();
        /** @type {Set<function(StatusEvent): void>} */
        this.statusHandlers = new Set();
        /** @type {Set<function(NormalizedMessage[]): void>} */
        this.historyHandlers = new Set();
        this.roomId = null;
        this.activityId = null;
        this.userId = null;
        /** @type {boolean} Whether history has been received */
        this.historyReceived = false;
        /** @type {number} Number of reconnection attempts */
        this.reconnectAttempts = 0;
    }

    /**
     * Initialize connection to the multiplayer server.
     * 
     * @param {Object} authDetails - Auth details from embeddedAuth handshake
     * @param {string} authDetails.accessToken - JWT token
     * @param {SessionDetails} authDetails.sessionDetails - Session info containing roomId
     * @param {string} activityId - Activity ID (static per activity type)
     * @throws {Error} If required fields are missing in non-dev mode
     */
    async connect(authDetails, activityId) {
        const { accessToken, sessionDetails } = authDetails;

        // Resolve roomId from session (required)
        const roomId = sessionDetails?.roomId;

        // Resolve activityId
        const resolvedActivityId = activityId;

        // Strict validation
        if (!roomId) {
            const msg = 'Room ID is missing from session details. Required: sessionDetails.roomId';
            console.error('[Multiplayer]', msg);
            throw new Error(msg);
        }

        if (!resolvedActivityId) {
            const msg = 'Activity ID is required. Set VITE_ACTIVITY_ID or pass to connect()';
            console.error('[Multiplayer]', msg);
            throw new Error(msg);
        }

        this.roomId = roomId;
        this.activityId = resolvedActivityId;
        this.userId = sessionDetails?.userId;

        // Notify connecting status
        this._notifyStatusChange('connecting');

        try {
            // 1. Get the correct server ID (Sticky Session)
            const serverId = await this._getServerId(this.roomId, accessToken);

            // 2. Construct Broker URL
            const brokerUrl = `${defaultWsUrl}?room_id=${this.roomId}&routing-key=${serverId}`;
            console.log('[Multiplayer] Connecting to:', brokerUrl);

            // 3. Create STOMP Client
            this.client = new Client({
                brokerURL: brokerUrl,
                connectHeaders: {
                    Authorization: accessToken
                },
                debug: (str) => {
                    // Uncomment for verbose STOMP debugging
                    // console.debug('[STOMP]', str);
                },
                reconnectDelay: 5000,
                heartbeatIncoming: 4000,
                heartbeatOutgoing: 4000,
            });

            this.client.onConnect = frame => {
                console.log('[Multiplayer] Connected');
                this.connected = true;
                this.reconnectAttempts = 0; // Reset on successful connect
                this._subscribeToActivity();
                this._notifyStatusChange('connected');
            };

            this.client.onStompError = frame => {
                const errorMsg = frame.headers['message'] || 'Unknown STOMP error';
                console.error('[Multiplayer] Broker reported error:', errorMsg);
                console.error('Additional details:', frame.body);
                this._notifyStatusChange('error', errorMsg);
            };

            this.client.onWebSocketClose = () => {
                console.log('[Multiplayer] Connection closed');
                this.connected = false;
                this.reconnectAttempts++;

                if (this.reconnectAttempts >= MultiplayerService.MAX_RECONNECT_ATTEMPTS) {
                    console.error(`[Multiplayer] Max reconnection attempts (${MultiplayerService.MAX_RECONNECT_ATTEMPTS}) reached. Stopping.`);
                    if (this.client) {
                        this.client.deactivate();
                    }
                    this._notifyStatusChange('error', 'Max reconnection attempts reached. Please refresh the page.');
                } else {
                    console.log(`[Multiplayer] Reconnect attempt ${this.reconnectAttempts}/${MultiplayerService.MAX_RECONNECT_ATTEMPTS}`);
                    this._notifyStatusChange('disconnected');
                }
            };

            this.client.onWebSocketError = (event) => {
                console.error('[Multiplayer] WebSocket error:', event);
                this._notifyStatusChange('error', 'WebSocket connection error');
            };

            this.client.activate();

        } catch (error) {
            console.error('[Multiplayer] Connection failed:', error);
            this._notifyStatusChange('error', error.message);
            throw error;
        }
    }

    /**
     * Fetch the server ID (pod routing key) for the room.
     * @private
     */
    async _getServerId(roomId, token) {
        const url = `${defaultApiBaseUrl}/noon2-core/rooms/${roomId}/server`;
        const response = await fetch(url, {
            headers: {
                'Authorization': token
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to get server ID: ${response.statusText}`);
        }

        return await response.text();
    }

    /**
     * Subscribe to the activity's topic.
     * @private
     */
    _subscribeToActivity() {
        if (!this.client || !this.connected) return;

        const topic = `/topic/rooms/${this.roomId}/activities/${this.activityId}`;
        console.log('[Multiplayer] Subscribing to:', topic);

        this.client.subscribe(topic, message => {
            if (message.body) {
                try {
                    const rawMessage = JSON.parse(message.body);

                    // Check if this is a history message from late-joiner support
                    if (rawMessage.type === 'ACTIVITY_HISTORY') {
                        this._handleHistoryMessage(rawMessage);
                        return;
                    }

                    const normalized = this._normalizeMessage(rawMessage, false);
                    this._onMessageReceived(normalized);
                } catch (e) {
                    console.error('[Multiplayer] Failed to parse message:', e);
                }
            }
        });
    }

    /**
     * Handle ACTIVITY_HISTORY message from server.
     * Unpacks historical messages and dispatches them with isHistorical flag.
     * @param {Object} historyMessage - { type: 'ACTIVITY_HISTORY', messages: [...] }
     * @private
     */
    _handleHistoryMessage(historyMessage) {
        const messages = historyMessage.messages || [];
        console.log('[Multiplayer] Received history:', messages.length, 'messages');

        if (messages.length === 0) {
            this.historyReceived = true;
            return;
        }

        // Normalize all historical messages
        const normalizedHistory = messages.map(msg => this._normalizeMessage(msg, true));

        // Sort by timestamp if available
        normalizedHistory.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

        // Notify history handlers for bulk processing (e.g. sync to latest STATE_UPDATE).
        // Individual messages are NOT dispatched to messageHandlers to avoid
        // double-applying state mutations. Late joiners should rely on the
        // latest STATE_UPDATE from history instead.
        this.historyHandlers.forEach(handler => handler(normalizedHistory));

        this.historyReceived = true;
        console.log('[Multiplayer] History replay complete');
    }

    /**
     * Normalize incoming messages from noon2-core format.
     * Handles both wrapped messages ({ senderId, payload, activityInstanceId, timestamp })
     * and raw messages (for local testing).
     * 
     * @param {Object} rawMessage - The raw message from STOMP
     * @param {boolean} [isHistorical=false] - Whether this is a replayed historical message
     * @returns {NormalizedMessage}
     * @private
     */
    _normalizeMessage(rawMessage, isHistorical = false) {
        // Check if this is a noon2-core wrapped message
        const isWrapped = rawMessage.senderId !== undefined && rawMessage.payload !== undefined;

        let senderId, payload, activityId, timestamp;

        if (isWrapped) {
            // noon2-core format: { senderId, payload, activityInstanceId, timestamp }
            senderId = rawMessage.senderId;
            payload = rawMessage.payload;
            activityId = rawMessage.activityInstanceId || this.activityId;
            timestamp = rawMessage.timestamp;
        } else {
            // Raw message format (local testing or direct sends)
            payload = rawMessage;
            // Try to derive senderId from various places
            senderId = rawMessage.player?.id || rawMessage.playerId || rawMessage.userId || this.userId;
            activityId = rawMessage.activityInstanceId || this.activityId;
            timestamp = rawMessage.timestamp;
        }

        // Extract type from payload
        const type = payload?.type || 'unknown';

        return {
            type,
            payload,
            senderId,
            activityId,
            playerId: senderId, // Alias for game compatibility
            timestamp,
            isHistorical,
            rawMessage
        };
    }

    /**
     * Handle incoming STOMP messages.
     * @param {NormalizedMessage} normalizedMessage
     * @private
     */
    _onMessageReceived(normalizedMessage) {
        this.messageHandlers.forEach(handler => handler(normalizedMessage));
    }

    /**
     * Notify status handlers of connection state changes.
     * @param {'connecting'|'connected'|'disconnected'|'error'} status
     * @param {string} [error] - Error message if applicable
     * @private
     */
    _notifyStatusChange(status, error = null) {
        /** @type {StatusEvent} */
        const event = {
            status,
            roomId: this.roomId,
            activityId: this.activityId,
            ...(error && { error })
        };
        this.statusHandlers.forEach(handler => handler(event));
    }

    /**
     * Add a listener for incoming messages.
     * @param {function(NormalizedMessage): void} handler - Callback receiving normalized messages
     * @returns {function(): void} Cleanup function to remove the listener
     */
    onMessage(handler) {
        this.messageHandlers.add(handler);
        return () => this.messageHandlers.delete(handler);
    }

    /**
     * Add a listener for connection status events.
     * @param {function(StatusEvent): void} handler
     * @returns {function(): void} Cleanup function
     */
    onStatusChange(handler) {
        this.statusHandlers.add(handler);
        return () => this.statusHandlers.delete(handler);
    }

    /**
     * Add a listener for history received events.
     * @param {function(NormalizedMessage[]): void} handler
     * @returns {function(): void} Cleanup function
     */
    onHistoryReceived(handler) {
        this.historyHandlers.add(handler);
        return () => this.historyHandlers.delete(handler);
    }

    /**
     * Check if history has been received (for late-joiner support).
     * @returns {boolean}
     */
    hasReceivedHistory() {
        return this.historyReceived;
    }

    /**
     * Broadcast a message to all participants in this activity.
     * @param {Object} data - JSON serializable object with a `type` property recommended
     */
    broadcast(data) {
        if (!this.client || !this.connected) {
            console.warn('[Multiplayer] Cannot send: not connected');
            return;
        }

        const destination = `/noon2app/rooms/${this.roomId}/activities/${this.activityId}`;
        this.client.publish({
            destination: destination,
            body: JSON.stringify({
                payload: data
            })
        });
    }

    /**
     * Disconnect from the multiplayer server.
     */
    disconnect() {
        if (this.client) {
            this.client.deactivate();
        }
        this.connected = false;
        this.historyReceived = false;
        this._notifyStatusChange('disconnected');
    }

    /**
     * Check if currently connected.
     * @returns {boolean}
     */
    isConnected() {
        return this.connected;
    }

    /**
     * Get current room ID.
     * @returns {string|number|null}
     */
    getRoomId() {
        return this.roomId;
    }

    /**
     * Get current activity ID.
     * @returns {string|null}
     */
    getActivityId() {
        return this.activityId;
    }
}

export const multiplayerService = new MultiplayerService();
export default multiplayerService;
