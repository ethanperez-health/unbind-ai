import { handleChat } from '../controllers/conversationController';
import { parseJsonBody, sendJson, sendMethodNotAllowed } from '../utils/http';

function validateChatPayload(payload: any) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid payload');
  }
  if (!payload.userId || typeof payload.userId !== 'string') {
    throw new Error('userId is required');
  }
  if (!payload.message || typeof payload.message !== 'string') {
    throw new Error('message is required');
  }
}

export async function chatRoute(req: any, res: any) {
  if (req.method !== 'POST') {
    sendMethodNotAllowed(res, ['POST']);
    return;
  }

  try {
    const payload = await parseJsonBody(req);
    validateChatPayload(payload);
    const response = await handleChat({
      userId: payload.userId,
      message: payload.message,
    });
    sendJson(res, 200, response);
  } catch (error: any) {
    const status = error.message && error.message.includes('Invalid JSON') ? 400 : 500;
    sendJson(res, status, { error: error.message || 'Unexpected error' });
  }
}
