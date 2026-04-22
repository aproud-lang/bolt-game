import { defaultApiBaseUrl } from '../config/envConfig';

const DEFAULT_TIMEOUT_MS = 5000;


export const teamService = {

  /* 
    response: {
      studentId: string;
      team: {
        id: string;
        teamId: string;
        physicalClassroomId: string;
        avatar: {
          key: string;
          name: string;
          url: string;
        }
      }
    }
  */
  async fetchTeam(roomId, studentId, accessToken, defaultHeaders = {}, routingKey = null) {
    console.log('fetchTeam', roomId, studentId, accessToken, defaultHeaders, routingKey);
    if (!roomId || !accessToken) {
      return null;
    }

    const baseUrl = import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    const pathPrefix = routingKey ? '/noon2-ws' : '/noon2-core';
    const url = new URL(`${baseUrl}${pathPrefix}/rooms/${roomId}/students/${studentId}/team`);
    if (routingKey) {
      url.searchParams.set('routing-key', routingKey);
    }

    try {
      const response = await fetch(
        url.toString(),
        {
          method: 'GET',
          headers: {
            ...defaultHeaders,
            Authorization: accessToken,
          },
          signal: controller.signal,
        }
      );

      console.log('fetchTeam response', response);

      if (response.status === 204) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Context fetch failed: ${response.status}`);
      }

      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  },
};

export default teamService;
