// ─────────────────────────────────────────────────────────────
//  EDIT THIS FILE — every word she sees lives here.
//  You never need to touch the scene code to change the text.
// ─────────────────────────────────────────────────────────────

export const content = {
  // Her name, exactly as it should appear on the first page.
  name: 'Varsha',

  // ── Page 1: the white page ──────────────────────────────────
  intro: {
    tapPrompt: 'Turn your sound on, then tap anywhere to begin.',
    greeting: 'Happy birthday,',

    question: 'What’s the one thing that’s never missing on your birthday?',
    placeholder: 'Type your answer',
    button: 'Answer',

    // Any of these is accepted. Capitals, spaces and punctuation
    // are ignored, so "Cake!" and " cake " both count as "cake".
    answers: ['cake', 'a cake', 'birthday cake'],

    wrongMessage: 'That’s not it. Try again.',

    // Hints appear one by one after each wrong answer.
    hints: ['Hint: it has candles on it.', 'Hint: you cut it, and everyone sings.'],

    // After this many wrong answers she gets in anyway,
    // so she can never get stuck on the first page.
    letInAfter: 5,
    letInMessage: 'Close enough. Come in.',
  },

  // ── Page 2a: the little bird on the branch ──────────────────
  // It lands once the valley has opened, before the scrolling starts.
  greeting: {
    // Each line starts on its own line in the speech bubble.
    // The word "bell" is highlighted automatically.
    lines: ['Hi!', 'How was the surprise?', 'Now tap the bell to move further.'],
    bellLabel: 'Ring the bell',
    // The birds carry these on bunting, with her name (above) underneath.
    banner: 'Happy Birthday',
  },

  // ── Page 2b: the fog, the valley and the treasure map ───────
  sunrise: {
    // Shown once the valley has opened, before she scrolls.
    instruction: {
      touch: 'Swipe up slowly to follow the trail.',
      mouse: 'Scroll down slowly to follow the trail.',
    },

    // Written on the treasure map, one per stretch of scrolling.
    // The sun moves across the sky as she scrolls: late morning →
    // mid-afternoon. Golden hour, sunset and night come in later scenes.
    // Keep each to a sentence or two so it fits on a phone.
    // These are placeholders: replace them with your own words.
    messages: [
      'The rain’s over. This whole morning is yours.',
      'Some people feel like sunrise. You’re one of them.',
      'Thank you for every laugh, every long talk, and every time you showed up.',
      'Stay a little longer. The sky has more to say after sunset.',
    ],
  },
} as const;
