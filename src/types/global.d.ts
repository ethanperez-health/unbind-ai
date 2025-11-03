declare module 'fs';
declare module 'path';
declare module 'http';
declare module 'url';
declare module 'crypto';

declare var process: any;
declare var Buffer: any;

type OpenAIMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};
