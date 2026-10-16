// ─────────────────────────────────────────────────────────────
//  Firebase: only used to RECEIVE her answers (and later, her
//  selfie). Nothing is read back, and the Firebase code is only
//  downloaded on the first save, so it never slows page 1 down.
// ─────────────────────────────────────────────────────────────
import { FIREBASE_CONFIG } from '../firebase.config';

// One id per visit, so all of her answers can be grouped together.
export const sessionId: string = (() => {
  try {
    const saved = localStorage.getItem('bday-session');
    if (saved) return saved;
    const id = crypto.randomUUID?.() ?? `${Date.now()}${Math.random().toString(16).slice(2)}`;
    localStorage.setItem('bday-session', id);
    return id;
  } catch {
    return String(Date.now());
  }
})();

type Firestore = typeof import('firebase/firestore');
let ready: Promise<{ db: import('firebase/firestore').Firestore; fs: Firestore }> | null = null;

function connect() {
  if (!FIREBASE_CONFIG) return null;
  const config = FIREBASE_CONFIG;
  ready ??= (async () => {
    const [{ initializeApp }, fs] = await Promise.all([import('firebase/app'), import('firebase/firestore')]);
    const app = initializeApp(config);
    return { db: fs.getFirestore(app), fs };
  })();
  return ready;
}

export interface Response {
  scene: string;
  question: string;
  answer: string;
  correct: boolean;
  attempt: number;
}

export async function saveResponse(data: Response): Promise<void> {
  const conn = connect();
  if (!conn) {
    console.info('[Firebase not set up yet] would save:', data);
    return;
  }
  try {
    const { db, fs } = await conn;
    await fs.addDoc(fs.collection(db, 'responses'), { ...data, session: sessionId, at: fs.serverTimestamp() });
  } catch (err) {
    console.warn('Could not save the answer:', err);
  }
}
