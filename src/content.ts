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

  // ── Page 2: the bus stop ────────────────────────────────────
  // After the fog, the rain stops, a cloud of butterflies sweeps past,
  // and one lands on a tulip to talk to her.
  butterfly: {
    lines: ['How was the surprise?', 'Vese, picture abhi baki hai!'],
    hint: '(pluck the flower to continue)',
    tapLabel: 'Pluck the flower',
  },

  // Tapping a bird in the sky (there is no hint that she can) shows this.
  birds: {
    title: 'Why white birds and black birds?',
    meaning:
      'The white ones are your bright days, the black ones your hard days. They fly together in the same sky, and both of them carried you here, to today.',
    close: 'tap anywhere to close',
  },

  // One animal at a time steps off the bus with a scroll for her.
  // The day turns to night as they go. These are placeholders:
  // replace them with your own words (a sentence or two each).
  animals: [
    { animal: 'bunny', message: 'Bloom where you are planted, and keep growing towards the light.' },
    { animal: 'fox', message: 'What lies within you is stronger than anything that stands before you.' },
    { animal: 'duckling', message: 'Every sunset is a promise that a new dawn is on its way.' },
    { animal: 'hedgehog', message: 'Do small things with great love; one day they become the big things.' },
    { animal: 'squirrel', message: 'Stars can’t shine without darkness. So shine.' },
  ],
  noteHint: 'tap the note to close it',

  // At the end, all the animals ask her one thing. Her answer is saved.
  question: {
    lead: 'Before you go anywhere…',
    ask: 'Which flower do you like the most?',
    options: ['Tulip', 'Lily', 'Lotus'],
    thanks: 'Noted! Hold on, there’s more…',
  },
} as const;
