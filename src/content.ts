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

  // After the tulip: fairies fly in carrying birthday bunting, with her
  // name (above) underneath.
  banner: {
    text: 'Happy Birthday',
    continueHint: 'Tap anywhere to continue',
  },

  // Hidden messages: tapping these in the scene (there's no hint that she can) shows a little card.
  // Each tap on the same thing shows its next line, round and round.
  // PLACEHOLDERS: replace the lines with your own (as many as you like for each).
  secrets: {
    close: 'tap anywhere to close',
    // the moon (at night)
    moon: {
      title: 'A note from the moon',
      lines: [
        'Even on the darkest night, there is always some light left. Keep looking up.',
        'You don\'t have to be full every night to shine. Every phase of you is enough.',
        'I come back every night, without fail. Keep showing up for yourself the same way.',
      ],
    },
    // the stars (tap the night sky anywhere)
    stars: {
      title: 'Written in the stars',
      lines: [
        'The stars were here long before us. Your dreams are allowed to be that big.',
        'A star doesn\'t compete with the others; it just shines. So can you.',
        'Some of the light you see tonight left its star years ago. Nothing good you do is ever wasted.',
      ],
    },
    // a glowing firefly (at dusk and at night)
    fireflies: {
      title: 'A firefly whispers',
      lines: [
        'Small lights matter. You don\'t have to light up the whole sky to make the night beautiful.',
        'I make my own light. You can too, one small step at a time.',
        'The dark is where little lights are noticed most. Your hard days will show how bright you are.',
      ],
    },
    // the street lamp (any time of day)
    lamp: {
      title: 'The lamp by the bus stop',
      lines: [
        'I stand here every night so no one waits in the dark. Be that light for someone today.',
        'Even a lamp needs a moment to warm up. Be patient with yourself.',
        'I don\'t light the whole road, just the next few steps. That\'s all you need to keep going.',
      ],
    },
  },

  // Tapping a bird in the sky (there is no hint that she can) shows this.
  birds: {
    title: 'Why white birds and black birds?',
    meaning:
      'The white ones are your bright days, the black ones your hard days. They fly together in the same sky, and both of them carried you here, to today.',
    close: 'tap anywhere to close',
  },

  // One animal at a time steps off the bus with a scroll for her,
  // spread across the day (the clock runs 6 AM → 9 PM in about 3½ minutes). These are placeholders:
  // replace them with your own words (a sentence or two each).
  animals: [
    { animal: 'bunny', message: 'Bloom where you are planted, and keep growing towards the light.' },
    { animal: 'fox', message: 'What lies within you is stronger than anything that stands before you.' },
    { animal: 'duckling', message: 'Every sunset is a promise that a new dawn is on its way.' },
    { animal: 'hedgehog', message: 'Do small things with great love; one day they become the big things.' },
    { animal: 'squirrel', message: 'Stars can’t shine without darkness. So shine.' },
  ],
  noteHint: 'tap the note to close it',
  // shown in the fog only if page 2's pictures (or the bus film) are still downloading
  loading: {
    scene: 'Getting your surprise ready…',
    bus: 'The bus is on its way…',
    slow: 'Slow connection, almost there',
  },

  // At the end, all the animals ask her one thing. Her answer is saved.
  question: {
    lead: 'Before you go anywhere…',
    ask: 'Which flower do you like the most?',
    options: ['Tulip', 'Lily', 'Lotus'],
    thanks: 'Noted! Hold on, there’s more…',
  },

  // The very end, at night: the lights glow, a music box plays, and this appears.
  // A placeholder message: replace it with your own words.
  finale: {
    title: 'Happy Birthday',
    message: 'From the first light of the morning to the last firefly of the night, this whole day was for you. May your year be just as bright.',
    replay: 'Watch it again',
    // ten seconds after the message, the screen goes black and her favourite flower grows, a whole bunch of it
    countdown: 'one more surprise',
    // …and these words grow out of the dark above it, with roses on their letters
    gardenWords: 'for Varsha',
    // (only on a slow connection, if her flowers are still on their way when it's time for them to open)
    flowersComing: 'her flowers are on their way…',
  },

  // The last screen: he appears as a guide (a crumpled paper that unfolds into him) and tells her
  // what she missed, and what everything in the scene meant.
  meaning: {
    invite: 'Psst… there’s a little story hidden in all of this. Want to see it?',
    inviteButton: 'Show me',
    signature: '~ the bus that came to wish you',
    next: 'Next',
    back: 'Back',
    close: 'Close',
    // part 1: the hidden messages she didn't find
    missedTitle: 'First… you missed a few things 🤭',
    missedText: 'There were little messages hidden in the scene. Tap one to read it here:',
    foundAll: 'You found every hidden message! Nothing gets past you. 🎉',
    hidden: {
      moon: '🌙 The moon',
      stars: '⭐ The stars',
      fireflies: '✨ The fireflies',
      lamp: '🏮 The lamp',
      birds: '🕊️ The birds',
    },
    // part 2: what it all meant (each one shows its part of the picture)
    steps: [
      { at: 'stop', title: 'This whole place is your life', text: 'And you are the bus stop. Life keeps moving around you: different times, seasons and people. You stand through all of it, and see it all.' },
      { at: 'sky', title: '☁️ The sky is your mind', text: 'Endless, with no limits. The birds are your thoughts: white ones good, black ones bad. You don’t have to chase every bird that flies by.' },
      { at: 'clouds', title: '☁️ The clouds are your dreams', text: 'Your dreams and goals. Work hard for them before the chance drifts away, one small step at a time. 🌱' },
      { at: 'bus', title: '🚌 The buses are people', text: 'Everyone who comes into your life. Some stay long, some only for a short ride, and each one leaves something behind.' },
      { at: 'door', title: '📜 The scrolls are their words', text: 'Sometimes wishes and kind thoughts: keep those close. Sometimes negativity: you don’t have to signal that bus to stop.' },
      { at: 'lamp', title: '🏮 The lamp is your forever people', text: 'Bauji, Mummy, your brother, Raavi and Vedika. They keep a light on for you in the dark, until the new morning comes.' },
      { at: 'moon', title: '🌙 The moon is who stays in hard times', text: 'The people who make your nights beautiful, not scary. Sometimes they come a little late, but they always come.' },
      { at: 'fireflies', title: '✨ The fireflies are the little lights', text: 'A message, a laugh, a check-in at the right time. The lamp, the moon and the fireflies are the people who always come for you.' },
      { at: 'colours', title: '💛 And today, I’m the bus that came to wish you', text: 'Its colours are what I wanted you to feel:' },
    ],
    colours: [
      ['#f2c230', 'Yellow', 'joy, warmth, sunshine'],
      ['#4caf50', 'Green', 'hope, fresh starts, growth'],
      ['#3a8fd0', 'Blue', 'calm and trust'],
      ['#7cc26a', 'The leaf', 'a new chapter'],
    ],
    thanks: 'I hope you felt at least one of them. Thank you, and have a lovely day! 💛',
    // the little note at the very end ({n}: how many hidden messages she missed)
    psMissed: 'P.S. Btw, you missed {n} hidden things along the way 🤭 Picture abhi baaki hai! 💫',
    psFound: 'P.S. You found every hidden thing. Picture abhi baaki hai! 💫',
  },

  // The small round button in the corner
  sound: { mute: 'Turn sound off', unmute: 'Turn sound on' },
} as const;
