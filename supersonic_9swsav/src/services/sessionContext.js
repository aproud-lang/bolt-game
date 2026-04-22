import { defaultApiBaseUrl } from '../config/envConfig';

const DEFAULT_TIMEOUT_MS = 5000;

export const sessionContextService = {
  async fetchSessionContext(sessionId, accessToken, defaultHeaders = {}) {
    if (!sessionId || !accessToken) {
      return null;
    }

    const baseUrl = import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(
        `${baseUrl}/noon2-core/courseSessions/${sessionId}/context`,
        {
          method: 'GET',
          headers: {
            ...defaultHeaders,
            Authorization: accessToken,
          },
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        throw new Error(`Context fetch failed: ${response.status}`);
      }

      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  },
};

export default sessionContextService;
