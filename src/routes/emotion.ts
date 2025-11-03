import { recordEmotion } from '../services/emotionStore';
import { parseJsonBody, sendJson, sendMethodNotAllowed } from '../utils/http';

function validatePayload(payload: any) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid payload');
  }
  if (!payload.userId || typeof payload.userId !== 'string') {
    throw new Error('userId is required');
  }
  if (typeof payload.timestamp !== 'number') {
    throw new Error('timestamp must be a number');
  }
  if (!payload.dominant || typeof payload.dominant !== 'string') {
    throw new Error('dominant emotion is required');
  }
  if (!payload.scores || typeof payload.scores !== 'object') {
    throw new Error('scores object is required');
  }
  ['happy', 'sad', 'fear', 'angry', 'neutral'].forEach((key) => {
    if (typeof payload.scores[key] !== 'number') {
      payload.scores[key] = 0;
    }
  });
}

export async function emotionRoute(req: any, res: any) {
  if (req.method !== 'POST') {
    sendMethodNotAllowed(res, ['POST']);
    return;
  }

  try {
    const payload = await parseJsonBody(req);
    validatePayload(payload);
    recordEmotion({
      userId: payload.userId,
      timestamp: payload.timestamp,
      dominant: payload.dominant,
      scores: payload.scores,
    });
    sendJson(res, 200, { status: 'ok' });
  } catch (error: any) {
    sendJson(res, 400, { error: error.message || 'Invalid emotion payload' });
  }
}
