import { useCallback, useEffect, useRef, useState } from 'react';
import { questionsService } from '../services/questionsService.js';
import questionBank from '../data/questionBank.js';

/**
 * Hook that loads runtime questions for the current session slide's
 * embedded activity and keeps the result in component state.
 */
export const useQuestions = ({ sessionSlideId, token, sessionDetails, defaultHeaders, authStatus }) => {
  const [state, setState] = useState({
    questions: [],
    questionIds: [],
    activityId: null,
    status: 'idle',
    error: null,
    isConfigured: false,
  });

  const mountedRef = useRef(true);

  const accessToken = token?.accessToken;
  const courseSessionId = sessionDetails?.sessionId;
  const courseId = sessionDetails?.courseId;

  const load = useCallback(async () => {
    if (authStatus !== 'authenticated' || !accessToken || !courseSessionId || !sessionSlideId) {
      if (mountedRef.current) {
        setState({
          questions: questionBank,
          questionIds: questionBank.map((q) => q.id),
          activityId: null,
          status: 'loaded',
          error: null,
          isConfigured: false,
        });
      }
      return;
    }

    setState((prev) => ({ ...prev, status: 'loading' }));

    questionsService.clear();

    const result = await questionsService.load({
      courseSessionId,
      courseId,
      sessionSlideId,
      accessToken,
      defaultHeaders,
    });

    if (mountedRef.current) {
      const questions = result.questions ?? [];
      const useFallback = questions.length === 0;
      setState({
        questions: useFallback ? questionBank : questions,
        questionIds: useFallback
          ? questionBank.map((q) => q.id)
          : (result.questionIds ?? []),
        activityId: useFallback ? null : (result.activityId ?? null),
        status: result.status === 'loaded' || useFallback ? 'loaded' : result.status,
        error: useFallback ? null : (result.error ?? null),
        isConfigured: result.status === 'loaded' && !useFallback,
      });
    }
  }, [authStatus, accessToken, courseSessionId, courseId, sessionSlideId, defaultHeaders]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  return { ...state, reload: load };
};

export default useQuestions;
