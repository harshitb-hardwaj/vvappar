import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const cfg = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "dev",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "dev",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "dev",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "dev",
};

export const firebaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY
);

const app = getApps().length ? getApps()[0]! : initializeApp(cfg);
export const auth = getAuth(app);
