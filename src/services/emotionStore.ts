const MAX_HISTORY_MS = 30 * 1000;

export type EmotionScores = {
  happy: number;
  sad: number;
  fear: number;
  angry: number;
  neutral: number;
  [key: string]: number;
};

export type EmotionReading = {
  userId: string;
  timestamp: number;
  dominant: string;
  scores: EmotionScores;
};

export type EmotionSummary = {
  dominant: string;
  anxious: number;
  calm: number;
  rawAverages: EmotionScores | null;
};

const store = new Map<string, EmotionReading[]>();

function toMilliseconds(epoch: number): number {
  if (epoch < 1e12) {
    return epoch * 1000;
  }
  return epoch;
}

function pruneOld(userId: string, now: number) {
  const history = store.get(userId) || [];
  const filtered = history.filter((entry) => now - entry.timestamp <= MAX_HISTORY_MS);
  store.set(userId, filtered);
}

export function recordEmotion(reading: EmotionReading) {
  const now = Date.now();
  pruneOld(reading.userId, now);
  const history = store.get(reading.userId) || [];
  const normalized = { ...reading, timestamp: toMilliseconds(reading.timestamp) };
  history.push(normalized);
  history.sort((a, b) => a.timestamp - b.timestamp);
  store.set(reading.userId, history);
}

function aggregateScores(entries: EmotionReading[]): EmotionScores | null {
  if (!entries.length) {
    return null;
  }
  const totals: any = {};
  entries.forEach((entry) => {
    Object.keys(entry.scores).forEach((key) => {
      const value = entry.scores[key];
      if (typeof value !== 'number' || Number.isNaN(value)) {
        return;
      }
      if (!totals[key]) {
        totals[key] = 0;
      }
      totals[key] += value;
    });
  });
  Object.keys(totals).forEach((key) => {
    totals[key] /= entries.length;
  });
  return totals;
}

function normalize(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return Number(value.toFixed(2));
}

export function getRecentEmotion(userId: string, seconds = 10): EmotionSummary {
  const now = Date.now();
  pruneOld(userId, now);
  const history = store.get(userId) || [];
  const cutoff = now - seconds * 1000;
  const recent = history.filter((entry) => entry.timestamp >= cutoff);
  const averages = aggregateScores(recent);
  if (!averages) {
    return {
      dominant: 'neutral',
      anxious: 0,
      calm: 0.5,
      rawAverages: null,
    };
  }
  let dominant = 'neutral';
  let dominantValue = -Infinity;
  Object.keys(averages).forEach((key) => {
    if (averages[key] > dominantValue) {
      dominantValue = averages[key];
      dominant = key;
    }
  });
  const anxious = normalize((averages.fear || 0) + (averages.sad || 0));
  const calm = normalize((averages.neutral || 0) + (averages.happy || 0));
  return {
    dominant,
    anxious,
    calm,
    rawAverages: averages,
  };
}

export function clearEmotionStore() {
  store.clear();
}
