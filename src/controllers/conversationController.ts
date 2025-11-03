import { generateChatCompletion } from '../lib/openai';
import { getRecentEmotion } from '../services/emotionStore';
import {
  getOrCreateSession,
  saveSession,
  SessionRecord,
} from '../services/sessionStore';
import { buildPlan, Plan } from '../services/planGenerator';
import { safetyPreface } from '../services/disclaimer';
import { synthesizeVoice } from '../services/tts';

const BASE_SYSTEM_PROMPT = `You are Unbind, a warm, playful, nonjudgmental AI coach who helps people overcome social anxiety using CBT and exposure therapy. You speak like a friendly cartoon guide. You validate FIRST, then teach a micro-skill, then progress the conversation. You never diagnose, you never promise a cure, and you always remind the user they can go slower. You can see an emotion_summary object that represents the user’s current facial emotion (from DeepFace). If the user seems anxious or fearful, slow down, shorten sentences, and reflect their feeling. If the user seems calm, gently increase challenge. At the end of the session, you output a short plan.`;

const INTAKE_QUESTIONS = [
  'When does social stuff feel hardest?',
  'Who is it hardest to talk to?',
  'What happens in your body when you get anxious?',
  'What do you want to be able to do in 30 days?',
];

const SESSION_DURATION_MS = 10 * 60 * 1000;

function buildDynamicInstructions(session: SessionRecord, emotion: any, nextQuestion: string | null, shouldWrap: boolean): string {
  const directives: string[] = [];
  directives.push('Always end with a line formatted exactly as: NextAction: <continue|collectMoreInfo|showPlan>.');
  directives.push('Keep replies between 2 and 4 sentences unless sharing the plan.');
  const answered = Object.keys(session.intakeAnswers);
  if (nextQuestion) {
    directives.push(`Ask this onboarding question verbatim after validating them: "${nextQuestion}"`);
  } else if (answered.length < INTAKE_QUESTIONS.length) {
    directives.push('Continue gentle intake until all onboarding questions are answered.');
  } else {
    directives.push('Move into micro-skills, exposure planning, and encouragement.');
  }
  if (emotion.anxious > 0.6) {
    directives.push('Emotion flag: anxious. Start with validation + normalization + one concrete tip. Keep sentences short.');
  }
  if (shouldWrap) {
    directives.push('Session timer hit or user asked to stop. Begin wrapping up and set NextAction: showPlan.');
  }
  directives.push('Use upbeat, cartoon-guide language and reflect user emotion.');
  directives.push('If the user already answered all intake questions, offer micro-exposures and CBT tools.');
  return `Session directives:\n- ${directives.join('\n- ')}`;
}

function detectWrapIntent(message: string): boolean {
  const lowered = message.toLowerCase();
  return /that's enough for today|thats enough for today|stop for today|i need to stop|i'm done|im done/.test(lowered);
}

function detectSuccess(message: string): string | null {
  if (/(i did it|i managed|went well|it worked|i talked|success|proud|i was brave)/i.test(message)) {
    return message.trim();
  }
  return null;
}

function inferCharacterMood(params: {
  emotion: any;
  reply: string;
  nextAction: string;
  isSessionStart: boolean;
  userMessage: string;
}): 'calm' | 'encouraging' | 'celebrating' | 'concerned' {
  if (params.emotion.anxious > 0.6) {
    return 'concerned';
  }
  if (/yay|great job|proud|celebrat|high five|amazing/i.test(params.reply) || /(i did it|i managed|went well|i talked)/i.test(params.userMessage)) {
    return 'celebrating';
  }
  if (params.nextAction === 'showPlan') {
    return 'encouraging';
  }
  if (params.isSessionStart) {
    return 'calm';
  }
  return 'encouraging';
}

export type ChatResponse = {
  reply: string;
  nextAction: 'continue' | 'collectMoreInfo' | 'showPlan';
  plan?: Plan;
  emotionUsed: any;
  sessionId: string;
  characterMood: 'calm' | 'encouraging' | 'celebrating' | 'concerned';
  voice: { audio: string; provider: string; format: 'base64' } | null;
};

export async function handleChat(input: { userId: string; message: string }): Promise<ChatResponse> {
  const session = getOrCreateSession(input.userId);
  const now = Date.now();
  const elapsed = now - session.startTime;
  const userMessage = input.message.trim();

  if (session.awaitingQuestion) {
    session.intakeAnswers[session.awaitingQuestion] = userMessage;
    session.awaitingQuestion = null;
  }

  const possibleSuccess = detectSuccess(userMessage);
  if (possibleSuccess) {
    session.lastSuccess = possibleSuccess;
  }

  const emotionSummary = getRecentEmotion(input.userId, 10);
  session.lastEmotion = emotionSummary;

  let nextQuestion: string | null = null;
  if (!session.awaitingQuestion && session.intakeStep < INTAKE_QUESTIONS.length) {
    nextQuestion = INTAKE_QUESTIONS[session.intakeStep];
    session.awaitingQuestion = nextQuestion;
    session.intakeStep += 1;
  }

  const shouldWrap = elapsed >= SESSION_DURATION_MS || detectWrapIntent(userMessage);

  const systemPrompt = `${BASE_SYSTEM_PROMPT}\n\n${buildDynamicInstructions(session, emotionSummary, nextQuestion, shouldWrap)}`;

  const history = session.messages.slice(-12);
  const userContent = `User said: ${userMessage}\nEmotion summary: ${JSON.stringify({
    dominant: emotionSummary.dominant,
    anxious: emotionSummary.anxious,
    calm: emotionSummary.calm,
  })}`;

  const messages: OpenAIMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: userContent },
  ];

  let modelReply = '';
  try {
    const completion = await generateChatCompletion(messages);
    modelReply = completion.content || '';
  } catch (error: any) {
    modelReply = "I'm having a little tech hiccup, but I'm still here for you. Let's take a slow breath together.";
  }

  session.messages.push({ role: 'user', content: userContent });
  session.messages.push({ role: 'assistant', content: modelReply });
  if (session.messages.length > 30) {
    session.messages.splice(0, session.messages.length - 30);
  }

  let actionRaw = 'continue';
  const actionMatch = modelReply.match(/NextAction:\s*(\w+)/i);
  if (actionMatch && actionMatch[1]) {
    actionRaw = actionMatch[1].toLowerCase();
  }
  let action: 'continue' | 'collectMoreInfo' | 'showPlan';
  if (actionRaw === 'collectmoreinfo') {
    action = 'collectMoreInfo';
  } else if (actionRaw === 'showplan') {
    action = 'showPlan';
  } else {
    action = 'continue';
  }

  if (shouldWrap) {
    action = 'showPlan';
  }

  const cleanedReply = modelReply.replace(/NextAction:\s*\w+/gi, '').trim();

  let finalReply = cleanedReply;
  if (session.disclaimerCount < 2) {
    finalReply = `${safetyPreface()} ${finalReply}`.trim();
    session.disclaimerCount += 1;
  }

  let plan = session.plan;
  if (action === 'showPlan') {
    const triggers: string[] = [];
    INTAKE_QUESTIONS.slice(0, 3).forEach((question) => {
      if (session.intakeAnswers[question]) {
        triggers.push(session.intakeAnswers[question]);
      }
    });
    const goals = session.intakeAnswers[INTAKE_QUESTIONS[3]]
      ? [session.intakeAnswers[INTAKE_QUESTIONS[3]]]
      : [];
    plan = buildPlan({
      triggers,
      goals,
      lastEmotion: emotionSummary,
      lastSuccess: session.lastSuccess || undefined,
    });
    session.plan = plan;
    session.planGeneratedAt = now;
  }

  const mood = inferCharacterMood({
    emotion: emotionSummary,
    reply: finalReply,
    nextAction: action,
    isSessionStart: session.messages.length <= 2,
    userMessage,
  });

  let voice = null;
  try {
    voice = await synthesizeVoice(finalReply);
  } catch (error) {
    voice = null;
  }

  saveSession(session);

  return {
    reply: finalReply,
    nextAction: action,
    plan,
    emotionUsed: emotionSummary,
    sessionId: session.id,
    characterMood: mood,
    voice,
  };
}
