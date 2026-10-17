# Birthday site

A touch-driven birthday story for Android phones and tablets, built with
**React + TypeScript + Vite** and **GSAP**.

## What's built so far

**Page 1, the white page.** Tap to begin (turns sound on, goes fullscreen, locks
portrait, keeps the screen awake). The greeting and question write themselves in
word by word. A wrong answer gets a small shake and a hint. The right answer starts
the rain: drops wet the paper, the ink runs, and the sheet falls apart.

**Page 2, the bus stop.** Through the fog: a country bus stop in the rain. The rain
stops and the day clears; a tulip opens in the grass and a swarm of butterflies sweeps
across the screen. One butterfly lands on the tulip and, in close-up, says hello. She
plucks the tulip: it flies at the screen and bursts into petals, and the garden comes
back with butterflies about the stop and white and black birds in the sky (tapping a
bird, which nothing hints at, explains them). The bus arrives with its own sound, the
brakes sigh, and the door folds open with a hiss of air. Five animals step off one at
a time in stop-motion, walk up to her and hand over a scroll that unrolls in the middle
of the screen; she taps it closed and the animal dissolves into golden dust. The day
turns to night as they go (golden hour, sunset, blue hour, moonlit night, with the bus
windows and the vending machine glowing), fireflies come out, and finally the animals
ask her which flower she likes most (her answer is saved).

## Change the words

Everything she reads is in **`src/content.ts`**: her name, the question and answers,
the butterfly's words, the birds' meaning, the five animals' messages and the flower
question.

## Just want to see it?

Open the **`dist`** folder through any local web server, the same way you'd open any
site. For example, if your server shows this folder at
`http://localhost:3000/birthday-site/`, go to **`http://localhost:3000/birthday-site/dist/`**.

The `index.html` in the main folder is only the starting point for the build tool. It
shows a blank page (or a short note) if opened through a plain server.

`dist` is the finished site. It's rebuilt by `npm run build`, and GitHub builds its own
copy when you publish, so you never need to upload it.

## Run it on your computer (for editing)

Install [Node.js](https://nodejs.org) (version 20 or newer) once. Then, in this folder:

```
npm install      # first time only
npm run dev
```

Open the address it prints (usually http://localhost:5173). The page reloads by
itself every time you save a file.

**Test on your real phone:** connect the phone to the same Wi-Fi and open the
`Network:` address that `npm run dev` prints (like `http://192.168.1.5:5173`).

Double-clicking `index.html` no longer works: React sites have to be built or run
through `npm run dev`.

Handy while building:
- `?scene=stop`, `?scene=pluck`, `?scene=bus`, `?scene=animals` or `?scene=question`
  at the end of the address jumps straight to that part of page 2 (silent, since sound
  needs the first tap). `?scene=gallery` shows all the characters.
- In Chrome DevTools, press Ctrl+Shift+M for a phone-sized screen.

## Put it online (GitHub Pages)

1. Create a repository on GitHub and push this folder to the `main` branch
   (`node_modules` and `dist` are ignored automatically).
2. In the repository: **Settings → Pages → Build and deployment → Source:
   GitHub Actions**.
3. Every push to `main` now builds and publishes the site (see the **Actions** tab).
   It goes live at `https://<your-username>.github.io/<repository-name>/`.

To check the production build locally: `npm run build`, then `npm run preview`.

## Set up Firebase (to receive her answers)

1. Create a project at https://console.firebase.google.com.
2. **Build → Firestore Database → Create database** (production mode, e.g. `asia-south1`).
3. **Rules** tab: paste everything from `firestore.rules`, then **Publish**.
4. **Project settings → Your apps → Web (`</>`)**, register an app, copy the config.
5. Paste it into `src/firebase.config.ts`.

Answers then appear under **Firestore → responses**. Until then they're only printed
in the browser console. The Firebase code downloads only when the first answer is
saved, so it doesn't slow the first page down.

## How it's put together

```
src/
  content.ts           ← all the words she sees (edit this)
  firebase.config.ts   ← your Firebase settings
  App.tsx              which scene is on screen
  scenes/
    Intro.tsx          page 1: question, rain, wet paper
    BusStop.tsx        page 2: the whole bus-stop story, step by step
  components/
    Garden.tsx         the talking butterfly and the tulip (SVG)
    Animals.tsx        bunny, fox, duckling, hedgehog, squirrel with their scrolls (SVG)
    Note.tsx           the big scroll: wooden rollers, parchment, flowing script
  lib/
    stage.ts           the living bus stop: rain, clouds, grass, day → night, lights,
                       moon and stars, the bus film and its door (WebGL)
    life.ts            butterflies, birds, fireflies, petals, golden dust (canvas)
    fog.ts             fog flight (WebGL)
    rain.ts            rain particles + wetness map (canvas)
    paper.ts           wet paper effect (WebGL)
    audio.ts           rain, wind, bus brakes and door, steps, shimmer, crickets (generated live)
    motion.ts          GSAP setup, shared easing rules
    camera.ts, ink.ts, noise.ts, gl.ts, device.ts, firebase.ts   helpers
  assets/              bus-stop pictures (empty, with the bus) and their masks,
                       the bus film, birdsong
```

**Motion rules used everywhere** (`src/lib/motion.ts`): entering things ease out,
leaving things ease in; taps and feedback take 100–200 ms, interface changes
200–400 ms; only transform and opacity are animated. Long cinematic moments (rain,
fog) are scenery and take their time. If the phone is set to reduce motion, the
rain and fog play faster and the messages simply fade in.

Every effect resizes its canvas to the real screen size (nothing stretches) and
frees its memory and graphics resources when its scene ends.

## Credits

- Fonts: EB Garamond (Georg Duffner, Octavio Pardo) and IM Fell English (Igino Marini,
  from the Fell types of the 1670s), both SIL Open Font License.
- 3D: Three.js with React Three Fiber.
- Animation: GSAP 3.15 with ScrollTrigger and SplitText.
