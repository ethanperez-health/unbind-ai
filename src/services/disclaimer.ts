const DISCLAIMER_LINES = [
  'This is not a replacement for therapy.',
  'If you are in crisis, contact local emergency services.',
];

export function safetyPreface(): string {
  return DISCLAIMER_LINES.join(' ');
}
