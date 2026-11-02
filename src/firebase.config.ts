import type { FirebaseOptions } from 'firebase/app';

// The Firebase project that receives her answers (Project settings → Your apps → Web app → SDK setup → Config).
// These values aren't secret: every website that uses Firebase sends them to the browser. What keeps the
// answers safe is the database's rules (firestore.rules): the site may only ADD answers, and nobody can
// read, change or delete them except you, in the Firebase console.
export const FIREBASE_CONFIG: FirebaseOptions | null = {
  apiKey: 'AIzaSyDY0BlVUpKsO9f_odtywCjzr65_OGcEihY',
  authDomain: 'wish-31240.firebaseapp.com',
  projectId: 'wish-31240',
  storageBucket: 'wish-31240.firebasestorage.app',
  messagingSenderId: '602701764137',
  appId: '1:602701764137:web:b6a531a22cd55da7976e38',
};
