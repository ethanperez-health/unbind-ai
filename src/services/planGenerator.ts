export type PlanInput = {
  triggers: string[];
  goals: string[];
  lastEmotion?: { anxious: number; calm: number; dominant: string } | null;
  lastSuccess?: string;
};

export type Plan = {
  todayMission: string;
  skillToPractice: string;
  regulationTool: string;
  encouragement: string;
};

const CALM_MISSIONS = [
  'Say hello to a neighbor or classmate and hold eye contact for 5 seconds.',
  'Ask a teammate or coworker one curious question today.',
  'Share one short story in a group chat or online community you trust.'
];

const GENTLE_MISSIONS = [
  'Make eye contact with a cashier for 3 seconds and give a warm thank-you.',
  'Send a supportive text to a friend and notice how your body feels.',
  'Practice saying "hi" to two people you pass, even if it feels awkward.'
];

const REGULATION_TOOLS = [
  'box breathing 4-4-4-4',
  '5-4-3-2-1 grounding scan',
  'butterfly taps on your shoulders for 30 seconds',
];

const SKILLS = [
  'answering “how are you?” without overthinking',
  'sharing one feeling + one fact when you meet someone',
  'using a curious follow-up question to keep chats going',
];

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function buildPlan(input: PlanInput): Plan {
  const anxiousLevel = input.lastEmotion?.anxious ?? 0;
  const wantsChallenge = (input.goals || []).some((goal) => /confident|lead|host|party|present/i.test(goal));

  let missionPool = GENTLE_MISSIONS;
  if (anxiousLevel < 0.3 && wantsChallenge) {
    missionPool = CALM_MISSIONS;
  } else if (anxiousLevel > 0.6) {
    missionPool = [
      'Take three slow breaths, then smile at yourself in the mirror.',
      'Practice saying your go-to greeting aloud in private three times.',
      'Write down one brave moment from this week and reread it tonight.',
    ];
  }

  const triggersSummary = input.triggers.length
    ? `You mentioned ${input.triggers.join(', ')} feeling tough.`
    : 'You showed up even when it was uncomfortable.';

  const todayMission = pickRandom(missionPool);
  const skillToPractice = pickRandom(SKILLS);
  const regulationTool = pickRandom(REGULATION_TOOLS);
  const encouragement = input.lastSuccess
    ? `${input.lastSuccess} Keep stacking those tiny wins.`
    : `${triggersSummary} That courage counts more than perfection.`;

  return {
    todayMission,
    skillToPractice,
    regulationTool,
    encouragement,
  };
}
