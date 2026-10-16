import type { FirebaseOptions } from 'firebase/app';

// Paste your web app config from the Firebase console here
// (Project settings → Your apps → Web app → SDK setup → Config).
// While this stays `null`, nothing is sent anywhere and answers are
// only printed in the browser console, which is handy for testing.
export const FIREBASE_CONFIG: FirebaseOptions | null = null;

/* Example:
export const FIREBASE_CONFIG: FirebaseOptions | null = {
  apiKey: 'AIza...',
  authDomain: 'your-project.firebaseapp.com',
  projectId: 'your-project',
  storageBucket: 'your-project.appspot.com',
  messagingSenderId: '1234567890',
  appId: '1:1234567890:web:abc123',
};
*/
