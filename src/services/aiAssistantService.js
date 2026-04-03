import {
  OPENAI_API_KEY,
  OPENAI_BASE_URL,
  OPENAI_MODEL
} from '../config/serverConfig.js';

const OPENAI_TIMEOUT_MS = 30000;
const MAX_TRANSCRIPT_SEGMENTS_FOR_LLM = 24;
const MAX_RECENT_MESSAGES_FOR_LLM = 4;

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'but',
  'by',
  'for',
  'from',
  'has',
  'have',
  'i',
  'if',
  'in',
  'into',
  'is',
  'it',
  'its',
  'me',
  'my',
  'of',
  'on',
  'or',
  'our',
  'so',
  'that',
  'the',
  'their',
  'them',
  'there',
  'they',
  'this',
  'to',
  'us',
  'was',
  'we',
  'will',
  'with',
  'you',
  'your'
]);

const ACTION_PATTERNS = [
  /\b(?:need to|needs to|should|must|follow up|action item|todo|to-do|please|share|send|review|update|schedule|assign|prepare|draft|finalize|ship)\b/i
];

const QUESTION_PATTERNS = [
  /\?$/,
  /\b(?:can|could|would|should|when|where|who|what|why|how|any update)\b/i
];

const dedupeStrings = (items = []) => [...new Set(items.filter(Boolean))];

const normalizeText = (value = '') =>
  value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const truncateText = (value = '', maxLength = 220) =>
  value.length > maxLength ? `${value.slice(0, maxLength).trim()}...` : value;

const deltaToPlainText = (value) => {
  if (!value) return '';

  if (typeof value !== 'string') {
    return normalizeText(String(value));
  }

  const trimmed = value.trim();

  if (!trimmed) return '';

  try {
    const parsed = JSON.parse(trimmed);
    const ops = Array.isArray(parsed) ? parsed : parsed?.ops;

    if (!Array.isArray(ops)) {
      return normalizeText(trimmed);
    }

    return normalizeText(
      ops
        .map((op) => {
          if (typeof op?.insert === 'string') return op.insert;
          if (op?.insert?.mention?.value) return `@${op.insert.mention.value}`;
          return '';
        })
        .join(' ')
    );
  } catch {
    return normalizeText(trimmed);
  }
};

const splitIntoSentences = (value = '') =>
  value
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => normalizeText(sentence))
    .filter((sentence) => sentence.length > 20);

const extractKeywords = (value = '', limit = 3) => {
  const frequencies = value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
    .reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {});

  return Object.entries(frequencies)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
};

const buildTopicLabel = (messages = []) => {
  const combinedText = messages
    .map((message) => deltaToPlainText(message?.body || message?.text))
    .join(' ');
  const keywords = extractKeywords(combinedText, 2);
  return keywords.length > 0 ? keywords.join(' / ') : 'this';
};

const toInputMessage = (role, text) => ({
  role,
  content: [
    {
      type: 'input_text',
      text
    }
  ]
});

const safeJsonParse = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const extractResponseText = (payload) => {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const outputText = payload?.output
    ?.flatMap((item) => item?.content || [])
    ?.find((content) => content?.type === 'output_text' && content?.text);

  return outputText?.text?.trim() || '';
};

const openAIAvailable = () => Boolean(OPENAI_API_KEY);

const createSchemaFormat = (name, schema) => ({
  type: 'json_schema',
  name,
  strict: true,
  schema
});

const callOpenAIJson = async ({ developerPrompt, userPrompt, schemaName, schema }) => {
  if (!openAIAvailable()) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    const response = await fetch(`${OPENAI_BASE_URL}/responses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: [
          toInputMessage('developer', developerPrompt),
          toInputMessage('user', userPrompt)
        ],
        text: {
          format: createSchemaFormat(schemaName, schema)
        }
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenAI request failed with status ${response.status}: ${errorText.slice(0, 300)}`
      );
    }

    const payload = await response.json();
    const responseText = extractResponseText(payload);
    const parsed = safeJsonParse(responseText);

    if (!parsed) {
      throw new Error('OpenAI returned an unexpected structured response');
    }

    return parsed;
  } finally {
    clearTimeout(timeoutId);
  }
};

const summarizeTranscriptHeuristic = ({
  channelName,
  segments = [],
  startedAt,
  endedAt
}) => {
  const cleanedSegments = segments
    .map((segment) => ({
      ...segment,
      speakerName: segment?.speakerName || 'Someone',
      text: normalizeText(segment?.text || '')
    }))
    .filter((segment) => segment.text);

  if (cleanedSegments.length === 0) {
    return {
      channelName,
      startedAt: startedAt || null,
      endedAt: endedAt || new Date().toISOString(),
      overview: 'No transcript was captured for this huddle yet.',
      keyPoints: [],
      actionItems: [],
      followUps: [],
      participants: [],
      transcriptCount: 0
    };
  }

  const participants = dedupeStrings(
    cleanedSegments.map((segment) => segment.speakerName)
  );
  const sentences = cleanedSegments.flatMap((segment) =>
    splitIntoSentences(segment.text).map((sentence) => ({
      speakerName: segment.speakerName,
      sentence
    }))
  );

  const keyPoints = dedupeStrings(
    sentences
      .map(({ sentence }) => sentence)
      .filter((sentence) => sentence.length >= 35)
      .slice(0, 4)
  ).slice(0, 4);

  const actionItems = dedupeStrings(
    cleanedSegments
      .filter((segment) =>
        ACTION_PATTERNS.some((pattern) => pattern.test(segment.text))
      )
      .map((segment) => `${segment.speakerName}: ${segment.text}`)
  ).slice(0, 4);

  const followUps = dedupeStrings(
    cleanedSegments
      .filter((segment) =>
        QUESTION_PATTERNS.some((pattern) => pattern.test(segment.text))
      )
      .map((segment) => `${segment.speakerName}: ${segment.text}`)
  ).slice(0, 3);

  const fallbackSummary = cleanedSegments
    .slice(0, 2)
    .map(
      (segment) =>
        `${segment.speakerName} discussed ${segment.text.toLowerCase()}`
    )
    .join(' ');

  return {
    channelName,
    startedAt: startedAt || cleanedSegments[0]?.createdAt || null,
    endedAt: endedAt || new Date().toISOString(),
    overview:
      keyPoints.length > 0
        ? keyPoints.slice(0, 2).join(' ')
        : fallbackSummary ||
          'The huddle covered a short discussion with no strong summary signals.',
    keyPoints,
    actionItems,
    followUps,
    participants,
    transcriptCount: cleanedSegments.length
  };
};

const generateReplySuggestionsHeuristic = ({
  targetMessage,
  recentMessages = []
}) => {
  const targetText = deltaToPlainText(targetMessage?.body || targetMessage?.text);
  const topicLabel = buildTopicLabel([targetMessage, ...recentMessages]);
  const lowerText = targetText.toLowerCase();

  if (!targetText) {
    return [
      'Happy to help. What should we tackle next?',
      'I can take a look and send an update shortly.',
      'Let me review the details and reply with the next step.'
    ];
  }

  if (/\b(thank|thanks|appreciate)\b/i.test(lowerText)) {
    return [
      'Happy to help. Let me know if you want me to keep moving on this.',
      `Glad that helped. I can also take the next pass on ${topicLabel}.`,
      'Anytime. I can summarize the remaining open items if that would help.'
    ];
  }

  if (/\b(blocked|issue|bug|error|failing|stuck|not working|problem)\b/i.test(lowerText)) {
    return [
      `I can help dig into ${topicLabel}. Can you share the latest error or blocker?`,
      'I am on it. I will review the failure path and send a concrete update shortly.',
      `Let us unblock this together. I can take first pass on the next step for ${topicLabel}.`
    ];
  }

  if (/\b(meet|huddle|sync|call|tomorrow|today|schedule|time)\b/i.test(lowerText)) {
    return [
      'Works for me. Share the time that is best and I will join.',
      `I am good to sync on ${topicLabel}. A short huddle should work well here.`,
      'Yes, let us do it. I can join once the slot is confirmed.'
    ];
  }

  if (/\?/.test(targetText) || /\b(can|could|would|should|when|where|what|why|how)\b/i.test(lowerText)) {
    return [
      `Yes, I can help with ${topicLabel}. I will send the next update soon.`,
      `My take is that we should keep moving on ${topicLabel}. I can draft the next step.`,
      'I can take this one. If you want, I will post a short summary after I check the details.'
    ];
  }

  return [
    `Sounds good. I can take the next step on ${topicLabel}.`,
    'I am aligned. I will follow up with a short update once I have progress.',
    'Makes sense to me. I can turn this into a concrete next action.'
  ];
};

const sanitizeSummary = (summary, fallback) => ({
  ...fallback,
  overview: normalizeText(summary?.overview || fallback.overview),
  keyPoints: dedupeStrings(summary?.keyPoints || []).slice(0, 4),
  actionItems: dedupeStrings(summary?.actionItems || []).slice(0, 4),
  followUps: dedupeStrings(summary?.followUps || []).slice(0, 3),
  participants: dedupeStrings(summary?.participants || fallback.participants)
});

const sanitizeSuggestions = (suggestions, fallback) => {
  const cleanedSuggestions = dedupeStrings(
    (Array.isArray(suggestions) ? suggestions : [])
      .map((suggestion) => normalizeText(suggestion))
      .filter((suggestion) => suggestion.length > 0)
  ).slice(0, 3);

  if (cleanedSuggestions.length >= 3) {
    return cleanedSuggestions;
  }

  return dedupeStrings([...cleanedSuggestions, ...fallback]).slice(0, 3);
};

const buildTranscriptPrompt = ({ channelName, segments = [] }) => {
  const transcriptLines = segments
    .slice(-MAX_TRANSCRIPT_SEGMENTS_FOR_LLM)
    .map(
      (segment, index) =>
        `${index + 1}. ${segment?.speakerName || 'Someone'}: ${truncateText(normalizeText(segment?.text || ''), 180)}`
    )
    .join('\n');

  return `Channel: ${channelName || 'Unknown channel'}

Transcript:
${transcriptLines}`;
};

const buildReplyPrompt = ({ targetMessage, recentMessages = [] }) => {
  const contextLines = recentMessages
    .slice(-MAX_RECENT_MESSAGES_FOR_LLM)
    .map(
      (message, index) =>
        `${index + 1}. ${message?.senderName || 'Teammate'}: ${truncateText(deltaToPlainText(message?.body || message?.text), 160)}`
    )
    .join('\n');

  return `Recent context:
${contextLines || 'No recent context available.'}

Target message:
${targetMessage?.senderName || 'Teammate'}: ${truncateText(deltaToPlainText(
    targetMessage?.body || targetMessage?.text
  ), 200)}`;
};

export const summarizeTranscript = async ({
  channelName,
  segments = [],
  startedAt,
  endedAt
}) => {
  const fallbackSummary = summarizeTranscriptHeuristic({
    channelName,
    segments,
    startedAt,
    endedAt
  });

  if (!openAIAvailable() || fallbackSummary.transcriptCount === 0) {
    return fallbackSummary;
  }

  try {
    const summary = await callOpenAIJson({
      developerPrompt:
        'Return JSON only. Summarize this team huddle briefly and accurately. Keep overview to 1 or 2 sentences. Keep lists short. Do not invent facts.',
      userPrompt: buildTranscriptPrompt({ channelName, segments }),
      schemaName: 'huddle_summary',
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          overview: { type: 'string' },
          keyPoints: {
            type: 'array',
            items: { type: 'string' }
          },
          actionItems: {
            type: 'array',
            items: { type: 'string' }
          },
          followUps: {
            type: 'array',
            items: { type: 'string' }
          },
          participants: {
            type: 'array',
            items: { type: 'string' }
          }
        },
        required: [
          'overview',
          'keyPoints',
          'actionItems',
          'followUps',
          'participants'
        ]
      }
    });

    return sanitizeSummary(summary, fallbackSummary);
  } catch (error) {
    console.error('OpenAI huddle summary failed, using heuristic fallback:', error.message);
    return fallbackSummary;
  }
};

export const generateReplySuggestions = async ({
  targetMessage,
  recentMessages = []
}) => {
  const fallbackSuggestions = generateReplySuggestionsHeuristic({
    targetMessage,
    recentMessages
  });

  if (!openAIAvailable()) {
    return fallbackSuggestions;
  }

  try {
    const suggestionsPayload = await callOpenAIJson({
      developerPrompt:
        'Return JSON only. Generate 3 short reply suggestions for a team chat app. Keep them natural, collaborative, ready to send, and usually under 20 words.',
      userPrompt: buildReplyPrompt({ targetMessage, recentMessages }),
      schemaName: 'reply_suggestions',
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          suggestions: {
            type: 'array',
            items: { type: 'string' }
          }
        },
        required: ['suggestions']
      }
    });

    return sanitizeSuggestions(
      suggestionsPayload?.suggestions,
      fallbackSuggestions
    );
  } catch (error) {
    console.error('OpenAI reply generation failed, using heuristic fallback:', error.message);
    return fallbackSuggestions;
  }
};

export const trimTranscriptSegments = (segments = [], maxSegments = 150) =>
  segments.length > maxSegments
    ? segments.slice(segments.length - maxSegments)
    : segments;
