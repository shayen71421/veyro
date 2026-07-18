import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, setPersistence, browserLocalPersistence, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, setLogLevel, type Firestore } from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
let app: FirebaseApp | null = null; let auth: Auth | null = null; let db: Firestore | null = null; let emulatorConnected = false;
setLogLevel("silent");

export function getFirebaseClient() {
  if (!firebaseConfigured) return null;
  app ??= getApps().length ? getApp() : initializeApp(config);
  auth ??= getAuth(app); db ??= getFirestore(app);
  void setPersistence(auth, browserLocalPersistence);
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true" && !emulatorConnected) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080); emulatorConnected = true;
  }
  return { app, auth, db };
}
