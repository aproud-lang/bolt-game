export const ENV_CONFIG = {
    local: {
        apiBaseUrl: '' /* nolt-preview-patched */,
        wsUrl: ((typeof window !== 'undefined' && window.location ? (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host : 'ws://localhost:5173') + '/noon2-core/ws-roomstomp') /* nolt-preview-patched */
    },
    dev: {
        apiBaseUrl: 'https://backend.dev.noonedu.io',
        wsUrl: 'wss://backend.dev.noonedu.io/noon2-ws/ws-roomstomp'
    },
    staging: {
        apiBaseUrl: 'https://backend.staging.noonedu.io',
        wsUrl: 'wss://backend.staging.noonedu.io/noon2-ws/ws-roomstomp'
    },
    prod: {
        apiBaseUrl: 'https://backend.studyatnoon.com',
        wsUrl: 'wss://backend.studyatnoon.com/noon2-ws/ws-roomstomp'
    },
};

export const targetEnv = (import.meta.env.VITE_ENV || 'dev').toLowerCase();
export const currentConfig = ENV_CONFIG[targetEnv] || ENV_CONFIG.prod;
export const defaultApiBaseUrl = import.meta.env.VITE_API_BASE_URL || currentConfig.apiBaseUrl;
export const defaultWsUrl = import.meta.env.VITE_MULTIPLAYER_WS_URL || currentConfig.wsUrl;
