# Birthday site

A scroll-and-touch birthday story for Android phones and tablets, built with
**React + TypeScript + Vite** and **GSAP + ScrollTrigger**.

## What's built so far

**Page 1, the white page.** Tap to begin (turns sound on, goes fullscreen, locks
portrait, keeps the screen awake). The greeting and question write themselves in
word by word. A wrong answer gets a small shake and a hint. The right answer starts
the rain: drops wet the paper, the ink runs, and the sheet falls apart.

**Page 2, the valley and the treasure trail.** Deep storm-grey fog glows as the sun
burns through, then the camera flies on its own into the valley, now in late-morning
light (clouds drift, mist creeps, the river glitters, birds fly across). A small card
tells her how to scroll. Then, scrolling:

1. a treasure trail draws itself across the valley, a compass spins in, an X marks the spot;
2. the camera glides down to a grassy hilltop, the valley behind softens like a lens
   focusing close, and a 3D tree stump rises into the foreground, standing in a
   meadow of swaying grass with wildflowers and stones;
3. a thick old treasure map unrolls on the stump (with a paper rustle) and the first
   message writes itself in, letter by letter;
4. each next message is written in turn while the sun moves across the sky, from
   late morning to mid-afternoon. Shadows turn with it and the grass glows when the
   sun is behind it. Golden hour, sunset and night are saved for the next scenes.

## Change the words

Everything she reads is in **`src/content.ts`**: her name, the question, accepted
answers, hints, the scroll instruction and the treasure-map messages. Add or remove
messages freely: the scroll length, the Roman numerals and the day's progression all
adjust themselves.

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
- `?scene=sunrise` at the end of the address jumps straight to page 2 (silent,
  since sound needs the first tap).
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
    Sunrise.tsx        page 2: fog flight, living valley, the scroll story
  components/
    TreasureMap.tsx    the parchment map (paper, compass, seal, drop caps)
  three/
    StumpScene.tsx     the 3D scene: camera sweep, sunlight that follows the sun, shadows
    meadow.ts          hillside, grass (custom shader), wildflowers, stones
    stumpAssets.ts     stump shape, bark and ring textures (all made in code)
  lib/
    motion.ts          GSAP + ScrollTrigger + SplitText setup, shared easing rules
    paper.ts           wet paper effect (WebGL)
    rain.ts            rain particles + wetness map (canvas)
    fog.ts             fog flight (WebGL)
    valley.ts          living valley: clouds, mist, river, sun, time of day, focus blur (WebGL)
    birds.ts           flocks of birds (canvas)
    audio.ts           rain and wind sounds (generated live)
    ink.ts, noise.ts, gl.ts, device.ts, firebase.ts   helpers
  assets/              valley picture, its sky/mist/river masks, birdsong
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
