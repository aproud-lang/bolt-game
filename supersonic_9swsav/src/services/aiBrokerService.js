import {
  createThreadContext,
  parseJsonObjectLenient,
  resolveAiBrokerConfig,
  sendAiBrokerRequest,
  streamAiBrokerRequest,
} from './aiBrokerClient';

const DEFAULT_MODEL = import.meta.env.VITE_AI_BROKER_MODEL || 'gpt-4o-mini';
const DEFAULT_PROJECT_ID = import.meta.env.VITE_AI_BROKER_PROJECT_ID || 'template-activity';
const DEFAULT_MISSION_ID = import.meta.env.VITE_AI_BROKER_MISSION_ID || 'default-scoring';

const extractJsonFromContent = (content) => {
  const trimmed = (content || '').trim();
  if (!trimmed) {
    throw new Error('Empty AI response');
  }

  const withoutFence = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const start = withoutFence.indexOf('{');
  const end = withoutFence.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('AI response is not valid JSON');
  }

  return withoutFence.slice(start, end + 1);
};

const parseScoreResponse = (content) => {
  const jsonText = extractJsonFromContent(content);
  const parsed = parseJsonObjectLenient(jsonText);
  const score = Number(parsed?.score);
  const feedback = typeof parsed?.feedback === 'string'
    ? parsed.feedback.trim()
    : '';

  if (!Number.isInteger(score) || score < 0 || score > 10) {
    throw new Error('Invalid score from AI broker');
  }

  return {
    score,
    feedback: feedback || 'ØªÙ ØªÙÙÙÙ Ø¥Ø¬Ø§Ø¨ØªÙ.',
  };
};

const normalizeArabic = (value = '') => (
  value
    .toLowerCase()
    .replace(/[\u064b-\u0652]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
);

const buildScoringPrompt = ({ question, studentAnswer }) => {
  const rubric = Array.isArray(question?.rubricKeywords)
    ? question.rubricKeywords.join('Ø ')
    : '';

  return [
    'ÙÙÙÙ Ø¥Ø¬Ø§Ø¨Ø© Ø§ÙØ·Ø§ÙØ¨ Ø­Ø³Ø¨ Ø¬ÙØ¯Ø© Ø§ÙÙØ­ØªÙÙ ÙØ§ÙØ¯ÙØ©.',
    `Ø§ÙØ³Ø¤Ø§Ù: ${question?.prompt || ''}`,
    `Ø§ÙØ¥Ø¬Ø§Ø¨Ø© Ø§ÙÙØªÙÙØ¹Ø©: ${question?.idealAnswer || ''}`,
    `Ø§ÙÙÙÙØ§Øª Ø§ÙÙÙØªØ§Ø­ÙØ©: ${rubric}`,
    `Ø¥Ø¬Ø§Ø¨Ø© Ø§ÙØ·Ø§ÙØ¨: ${studentAnswer || ''}`,
    'Ø£Ø¹Ø¯ Ø§ÙÙØªÙØ¬Ø© Ø¨ØµÙØºØ© JSON ØµØ§ÙØ­Ø© ÙÙØ· Ø¯ÙÙ Ø£Ù ÙØµ Ø¥Ø¶Ø§ÙÙ.',
    'ÙØ³ÙÙØ­ ÙÙØ· Ø¨Ø§ÙÙÙØ§ØªÙØ­: score Ù feedback.',
    'score ÙØ¬Ø¨ Ø£Ù ÙÙÙÙ Ø¹Ø¯Ø¯Ø§Ù ØµØ­ÙØ­Ø§Ù ÙÙ 0 Ø¥ÙÙ 10.',
    'feedback ÙØ¬Ø¨ Ø£Ù ÙÙÙÙ ÙØµØ§Ù Ø¹Ø±Ø¨ÙØ§Ù ÙØµÙØ±Ø§Ù.',
    'ÙØ§ ØªØ³ØªØ®Ø¯Ù Ø§ÙÙØ§ØµÙØ© Ø§ÙØ¹Ø±Ø¨ÙØ© "Ø" Ø¯Ø§Ø®Ù JSON. Ø§Ø³ØªØ®Ø¯Ù "," ÙÙØ·.',
    'ÙØ§ ØªØ³ØªØ®Ø¯Ù Markdown Ø£Ù ```json.',
    'ØµÙØºØ© Ø§ÙØ±Ø¯ Ø§ÙÙØ­ÙØ¯Ø©: {"score": 0, "feedback": "..."}',
  ].join('\n');
};

export {
  resolveAiBrokerConfig,
  createThreadContext,
  streamAiBrokerRequest,
  sendAiBrokerRequest,
  parseJsonObjectLenient,
};

export const createScoringThread = async ({
  accessToken,
  projectId = DEFAULT_PROJECT_ID,
  missionId = DEFAULT_MISSION_ID,
  defaultHeaders = {},
  configOverrides = {},
}) => {
  return createThreadContext({
    accessToken,
    projectId,
    missionId,
    defaultHeaders,
    configOverrides,
  });
};

export const scoreFreeFormAnswer = async ({
  accessToken,
  userId,
  threadId,
  model = DEFAULT_MODEL,
  question,
  studentAnswer,
  locale = 'ar',
  timeoutMs,
  configOverrides = {},
  onParseErrorFallback,
}) => {
  if (!accessToken || !threadId || !userId) {
    throw new Error('Missing AI broker scoring context');
  }

  const messages = [
    {
      role: 'system',
      content: [
        'Ø£ÙØª ÙÙÙÙ Ø¥Ø¬Ø§Ø¨Ø§Øª ÙÙ ÙØ¹Ø¨Ø© ØªØ¹ÙÙÙÙØ©.',
        'ÙÙÙÙ Ø§ÙØ¥Ø¬Ø§Ø¨Ø© ÙÙ 0 Ø¥ÙÙ 10 ÙÙÙ Ø§ÙØ¯ÙØ© ÙØ§ÙØ§ÙØªÙØ§Ù ÙØ§ÙÙØ¶ÙØ­.',
        'ÙØ¬Ø¨ Ø£Ù ÙÙÙÙ score Ø¹Ø¯Ø¯Ø§ ØµØ­ÙØ­Ø§ Ø¨ÙÙ 0 Ù10.',
        'feedback ÙØ¬Ø¨ Ø£Ù ÙÙÙÙ ØªØ¹ÙÙÙØ§Ù ÙØµÙØ±Ø§Ù Ø¨Ø§ÙÙØºØ© Ø§ÙØ¹Ø±Ø¨ÙØ©.',
        'Ø£Ø¹Ø¯ JSON ØµØ§ÙØ­Ø§Ù ÙÙØ·Ø Ø¨Ø¯ÙÙ Ø£Ù ÙØµ ÙØ¨ÙÙ Ø£Ù Ø¨Ø¹Ø¯Ù.',
        'ÙÙÙÙØ¹ Markdown Ø£Ù code fences.',
        'ÙØ³ÙÙØ­ ÙÙØ· Ø¨Ø§ÙÙÙØ§ØªÙØ­ score Ù feedback.',
        'ÙØ§ ØªØ³ØªØ®Ø¯Ù Ø§ÙÙØ§ØµÙØ© Ø§ÙØ¹Ø±Ø¨ÙØ© "Ø" Ø¯Ø§Ø®Ù JSON. Ø§Ø³ØªØ®Ø¯Ù "," ÙÙØ·.',
        'ØµÙØºØ© Ø§ÙØ±Ø¯ Ø§ÙÙØ­ÙØ¯Ø©:',
        '{"score": 0, "feedback": "..."}',
      ].join('\n'),
    },
    {
      role: 'user',
      content: buildScoringPrompt({ question, studentAnswer, locale }),
    },
  ];

  let rawContent = '';

  try {
    const response = await sendAiBrokerRequest({
      accessToken,
      userId,
      threadId,
      request: {
        model,
        threadId,
        stream: true,
        keep_conversation_history: false,
        messages,
      },
      timeoutMs,
      configOverrides,
    });
    rawContent = response.content;
  } catch (error) {
    throw new Error(`ØªØ¹Ø°Ø± ØªÙÙÙÙ Ø§ÙØ¥Ø¬Ø§Ø¨Ø©: ${error.message || 'unknown error'}`);
  }

  try {
    return parseScoreResponse(rawContent);
  } catch (error) {
    if (typeof onParseErrorFallback === 'function') {
      const fallback = await onParseErrorFallback({
        rawContent,
        error,
        context: {
          accessToken,
          userId,
          threadId,
          model,
          question,
          studentAnswer,
          locale,
        },
      });

      if (fallback !== undefined) {
        return fallback;
      }
    }

    throw error;
  }
};

export const scoreFreeFormAnswerMock = ({ question, studentAnswer }) => {
  const answer = normalizeArabic(studentAnswer || '');
  if (!answer || answer.length < 3) {
    return {
      score: 0,
      feedback: 'Ø§ÙØ¥Ø¬Ø§Ø¨Ø© ÙØµÙØ±Ø© Ø¬Ø¯Ø§Ù. Ø­Ø§ÙÙ ÙØªØ§Ø¨Ø© Ø¥Ø¬Ø§Ø¨Ø© Ø£ÙØ¶Ø­.',
    };
  }

  const keywords = [
    ...(Array.isArray(question?.rubricKeywords) ? question.rubricKeywords : []),
    question?.idealAnswer || '',
  ]
    .map(normalizeArabic)
    .filter(Boolean);

  let matches = 0;
  keywords.forEach((keyword) => {
    if (answer.includes(keyword)) {
      matches += 1;
    }
  });

  const denominator = Math.max(3, keywords.length);
  const ratio = Math.min(1, matches / denominator);
  const score = Math.max(0, Math.min(10, Math.round(ratio * 10)));

  if (score >= 8) {
    return { score, feedback: 'Ø¥Ø¬Ø§Ø¨Ø© ÙÙØªØ§Ø²Ø© ÙÙÙØ¸ÙØ© Ø¬Ø¯Ø§Ù.' };
  }
  if (score >= 5) {
    return { score, feedback: 'Ø¥Ø¬Ø§Ø¨Ø© Ø¬ÙØ¯Ø©Ø ÙÙÙÙÙ Ø¥Ø¶Ø§ÙØ© ØªÙØ§ØµÙÙ Ø£Ø¯Ù.' };
  }
  if (score >= 1) {
    return { score, feedback: 'Ø¨Ø¯Ø§ÙØ© Ø¬ÙØ¯Ø©Ø ÙÙÙÙ ØªØ­ØªØ§Ø¬ ÙØ¹ÙÙÙØ§Øª Ø£ÙØ«Ø± Ø¯ÙØ©.' };
  }
  return { score, feedback: 'Ø§ÙØ¥Ø¬Ø§Ø¨Ø© ØºÙØ± ÙØ§ÙÙØ© Ø­Ø§ÙÙØ§Ù. Ø­Ø§ÙÙ ÙØ±Ø© Ø£Ø®Ø±Ù.' };
};
