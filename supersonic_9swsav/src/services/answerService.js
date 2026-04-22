import { defaultApiBaseUrl } from '../config/envConfig.js';

/**
 * Fire-and-forget service for submitting MCQ answers to the backend.
 *
 * POST /noon2-core/v2/mcqs/{mcqId}/selectChoice/{choiceId}?source=LIVE
 */
export const answerService = {
  submitAnswer({ mcqId, choiceId, accessToken, defaultHeaders = {}, apiBaseUrl } = {}) {
    if (!mcqId || !choiceId || !accessToken) return;

    const baseUrl = normalizeBaseUrl(
      apiBaseUrl ?? import.meta.env.VITE_API_BASE_URL ?? defaultApiBaseUrl,
    );

    const url = `${baseUrl}/noon2-core/v2/mcqs/${mcqId}/selectChoice/${choiceId}?source=LIVE`;

    fetch(url, {
      method: 'POST',
      headers: {
        ...defaultHeaders,
        Authorization: accessToken,
      },
    }).catch((error) => {
      console.error('[answerService] Failed to submit answer:', error);
    });
  },
};

function normalizeBaseUrl(input) {
  if (!input) return '';
  return input.endsWith('/') ? input.slice(0, -1) : input;
}

export default answerService;
