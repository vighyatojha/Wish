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
    // at the very end, about 5 seconds after his song has played through once, his picture pops up and asks…
    ask: 'Psst… would you like to know what everything here means, and why it’s there? 💛',
    askYes: 'Yes, show me!',
    askLater: 'Maybe later',
    // …if she says "maybe later", his picture stays with this note; tapping it opens his explanation
    endNote: 'Whenever you’d like to know, just tap on me. 💛',
    // the title of his explanation (what each thing in the scene means, and why it's there)
    cover: 'What everything here means',
    signature: '~ the bus that came to wish you',
    next: 'Turn the page',
    back: 'Back',
    close: 'Close',
    // the last page, a P.S.: the things she didn't tap on (it doesn't give their messages away)
    missedTitle: 'P.S. You missed a few little things 🤭',
    missedText: 'Each of these had a hidden message for you in the scene. Next time, try tapping on them… picture abhi baaki hai! 💫',
    foundAll: 'P.S. You found every hidden message along the way! Nothing gets past you. 🎉',
    hidden: {
      moon: '🌙 The moon',
      stars: '⭐ The stars',
      fireflies: '✨ The fireflies',
      lamp: '🏮 The lamp',
      birds: '🕊️ The birds',
    },
    // what each thing means (each page shows its part of the picture)
    steps: [
      { at: 'stop', title: 'This whole place is your life', text: 'And you are the bus stop. Life keeps moving around us, through different times, situations and seasons, and just like this little stop, you stay, take it all in, and keep going. 🚏' },
      { at: 'sky', title: '☁️ The sky is your mind', text: 'It’s endless, with no limit to how far it can go. The birds flying across it are your thoughts: the white ones are the good ones, the black ones are the worries. You don’t have to chase every bird; some are better left to fly away. 🕊️' },
      { at: 'clouds', title: '☁️ The clouds are your dreams', text: 'They’re the dreams and goals you hope to reach with your hard work. Time keeps moving, just like the clouds, so keep going after them, one small step at a time, before the chance drifts away. 🌱' },
      { at: 'bus', title: '🚌 The buses are the people in your life', text: 'Every bus that stops here is someone who comes into your life. Some stay for a long journey, some only for a short ride, and each of them leaves a little something behind.' },
      { at: 'door', title: '📜 The scrolls are the words they bring', text: 'Sometimes they’re kind wishes and good thoughts; please keep those close to your heart. And sometimes they’re negativity and harsh words; for those, you don’t have to signal the bus to stop. 🌼' },
      { at: 'lamp', title: '🏮 The lamp is your forever people', text: 'Your Bauji, Mummy, your brother, Raavi and Vedika. Just like this lamp, they keep a light on for you in the dark, and give you hope until the new morning comes. ❤️' },
      { at: 'moon', title: '🌙 The moon is the people who stand by you', text: 'They’re the ones who support you through your hard times and make your nights beautiful, not scary. Sometimes they come a little late, but they always come for you.' },
      { at: 'fireflies', title: '✨ The fireflies are the little lights', text: 'A kind message, a shared laugh, a check-in at just the right moment. The lamp, the moon and the fireflies are all the people who always come for you, each in their own way.' },
      { at: 'colours', title: '💛 And today, I’m the bus that came to wish you', text: 'Its colours carry what I hoped you would feel:' },
    ],
    colours: [
      ['#f2c230', 'Yellow', 'joy, warmth and sunshine'],
      ['#4caf50', 'Green', 'hope, fresh starts and growth'],
      ['#3a8fd0', 'Blue', 'calm and trust'],
      ['#7cc26a', 'The leaf', 'a new chapter'],
    ],
    thanks: 'I tried my best to make you feel at least one of these. Thank you for being here, and I hope you have a lovely day! 💛',
  },

  // The small round button in the corner
  sound: { mute: 'Turn sound off', unmute: 'Turn sound on' },
} as const;
