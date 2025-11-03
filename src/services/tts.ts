export type TTSResult = {
  audio: string;
  provider: string;
  format: 'base64';
};

export async function synthesizeVoice(text: string): Promise<TTSResult> {
  const cleaned = text.trim();
  const payload = Buffer.from(cleaned).toString('base64');
  return {
    audio: `data:audio/wav;base64,${payload}`,
    provider: 'mock-voice',
    format: 'base64',
  };
}
