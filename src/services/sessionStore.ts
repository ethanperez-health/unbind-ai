import { randomUUID } from 'crypto';
import { EmotionSummary } from './emotionStore';
import { Plan } from './planGenerator';

export type SessionRecord = {
  id: string;
  userId: string;
  startTime: number;
  messages: OpenAIMessage[];
  intakeAnswers: { [question: string]: string };
  intakeStep: number;
  awaitingQuestion: string | null;
  disclaimerCount: number;
  plan?: Plan;
  planGeneratedAt?: number;
  lastEmotion?: EmotionSummary;
  lastSuccess?: string;
};

const sessions = new Map<string, SessionRecord>();

export function getOrCreateSession(userId: string): SessionRecord {
  const existing = sessions.get(userId);
  if (existing) {
    return existing;
  }
  const session: SessionRecord = {
    id: randomUUID(),
    userId,
    startTime: Date.now(),
    messages: [],
    intakeAnswers: {},
    intakeStep: 0,
    awaitingQuestion: null,
    disclaimerCount: 0,
  };
  sessions.set(userId, session);
  return session;
}

export function saveSession(session: SessionRecord) {
  sessions.set(session.userId, session);
}

export function resetSession(userId: string) {
  sessions.delete(userId);
}

export function getActiveSessions() {
  return Array.from(sessions.values());
}
