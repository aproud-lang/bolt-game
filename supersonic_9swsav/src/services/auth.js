// Platform authentication integration
import { defaultApiBaseUrl } from '../config/envConfig';

export const authService = {

  async refreshToken(refreshToken, defaultHeaders) {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl;
    const response = await fetch(`${baseUrl}/noon2-core/auth/token/refresh`, {
      method: 'POST',
      headers: {
        ...defaultHeaders,
      },
      body: JSON.stringify({
        refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`Auth failed: ${response.status}`);
    }

    const data = await response.json();
    return data;
  },

  async validateToken(token) {
    // Client-side JWT validation is limited â expiry is checked by the
    // platform handshake and refresh flow. This is a no-op placeholder;
    // actual validation happens server-side on every API call.
    return !!token;
  },
};

export default authService;
