import { env } from '../config/env';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

type ChatCompletionOptions = {
  temperature?: number;
  maxTokens?: number;
};

type ChatCompletionResult = {
  content: string;
  raw?: any;
};

function buildFallbackResponse(messages: OpenAIMessage[]): string {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  if (!lastUser) {
    return "I'm here whenever you're ready to chat.";
  }
  return `I hear you. You said: "${lastUser.content}". Let's keep exploring together.`;
}

export async function generateChatCompletion(
  messages: OpenAIMessage[],
  options: ChatCompletionOptions = {}
): Promise<ChatCompletionResult> {
  if (!env.openAiApiKey) {
    return { content: buildFallbackResponse(messages) };
  }

  const payload = {
    model: 'gpt-4o-mini',
    messages,
    temperature: options.temperature ?? 0.8,
    max_tokens: options.maxTokens ?? 600,
  };

  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.openAiApiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || '';
  return { content, raw: data };
}
