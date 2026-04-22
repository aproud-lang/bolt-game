import { defaultApiBaseUrl } from '../config/envConfig.js';

const DEFAULT_TIMEOUT_MS = 5000;

const initialState = () => ({
  status: 'idle',
  questions: null,
  questionIds: null,
  activityId: null,
  sessionSlideId: null,
  courseSessionId: null,
  error: null,
});

let _state = initialState();
let _inflightPromise = null;

/**
 * Service for loading runtime questions from the embedded activity slide API.
 *
 * Fetches the activity + MCQs assigned to a session slide via
 * GET /noon2-core/courses/{courseId}/sessions/{courseSessionId}/slides/{sessionSlideId}/activity
 * and maps the response to the shape expected by QuestionCard.
 */
export const questionsService = {
  async load({ courseSessionId, courseId, sessionSlideId, accessToken, defaultHeaders = {}, apiBaseUrl } = {}) {
    if (!courseSessionId || !sessionSlideId || !accessToken) {
      _state = {
        ...initialState(),
        status: 'error',
        sessionSlideId: sessionSlideId ?? null,
        courseSessionId: courseSessionId ?? null,
        error: new Error('Missing required parameters: courseSessionId, sessionSlideId, and accessToken are all required'),
      };
      return snapshot();
    }

    // Deduplicate concurrent calls for the same parameters
    if (_inflightPromise && _state.courseSessionId === courseSessionId && _state.sessionSlideId === sessionSlideId) {
      return _inflightPromise;
    }

    // Return cached result if already loaded for same params
    if (
      (_state.status === 'loaded' || _state.status === 'not-configured') &&
      _state.courseSessionId === courseSessionId &&
      _state.sessionSlideId === sessionSlideId
    ) {
      return snapshot();
    }

    _state = { ...initialState(), status: 'loading', courseSessionId, sessionSlideId };

    _inflightPromise = this._fetch({ courseSessionId, courseId, sessionSlideId, accessToken, defaultHeaders, apiBaseUrl })
      .finally(() => {
        _inflightPromise = null;
      });

    return _inflightPromise;
  },

  /** @private */
  async _fetch({ courseSessionId, courseId, sessionSlideId, accessToken, defaultHeaders, apiBaseUrl }) {
    const baseUrl = normalizeBaseUrl(
      apiBaseUrl ?? import.meta.env.VITE_API_BASE_URL ?? defaultApiBaseUrl,
    );
    const cId = courseId || 0;
    const url = `${baseUrl}/noon2-core/courses/${cId}/sessions/${courseSessionId}/slides/${sessionSlideId}/activity`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...defaultHeaders,
          Authorization: accessToken,
        },
        signal: controller.signal,
      });

      if (response.status === 204) {
        _state = {
          status: 'not-configured',
          questions: [],
          questionIds: [],
          activityId: null,
          sessionSlideId,
          courseSessionId,
          error: null,
        };
        return snapshot();
      }

      if (!response.ok) {
        throw new Error(`Activity fetch failed: ${response.status}`);
      }

      const payload = await response.json();
      const activityId = payload?.activity?.id ?? null;
      const mcqs = Array.isArray(payload?.mcqs) ? payload.mcqs : [];

      // Map McqDTO â QuestionCard shape
      const questions = mcqs.map((mcq) => {
        const q = mcq.question || {};
        const choices = Array.isArray(q.choices) ? q.choices : [];
        return {
          id: q.id,
          prompt: q.text,
          choices: choices.map((c) => ({
            id: c.id,
            text: c.text,
            url: c.url,
            isCorrect: c.id === q.correctChoiceId,
          })),
          url: q.url,
          mcqId: mcq.id,
        };
      });

      const questionIds = questions.map((q) => q.id);

      _state = {
        status: 'loaded',
        questions,
        questionIds,
        activityId,
        sessionSlideId,
        courseSessionId,
        error: null,
      };
      return snapshot();
    } catch (error) {
      _state = {
        status: 'error',
        questions: null,
        questionIds: null,
        activityId: null,
        sessionSlideId,
        courseSessionId,
        error,
      };
      return snapshot();
    } finally {
      clearTimeout(timeoutId);
    }
  },

  getState() {
    return snapshot();
  },

  getQuestions() {
    return _state.questions ?? [];
  },

  getQuestionIds() {
    return _state.questionIds ?? [];
  },

  getActivityId() {
    return _state.activityId;
  },

  isLoaded() {
    return _state.status === 'loaded';
  },

  isNotConfigured() {
    return _state.status === 'not-configured';
  },

  clear() {
    _state = initialState();
    _inflightPromise = null;
  },
};

function snapshot() {
  return { ..._state };
}

function normalizeBaseUrl(input) {
  if (!input) return '';
  return input.endsWith('/') ? input.slice(0, -1) : input;
}

export default questionsService;
