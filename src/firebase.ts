import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Estas variables se cargan desde .env (ver .env.example).
// En Expo, cualquier variable con prefijo EXPO_PUBLIC_ queda disponible en process.env en tiempo de build.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const missingFirebaseFields = Object.entries(firebaseConfig)
  .filter(([, value]) => !value || value.startsWith("REEMPLAZAR_"))
  .map(([key]) => key);

export const firebaseConfigError = missingFirebaseFields.length
  ? `Falta completar Firebase en .env: ${missingFirebaseFields.join(", ")}. Copia los valores reales desde Firebase Console > Configuracion del proyecto > Tus apps > SDK config.`
  : null;

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Usamos la inicializacion por defecto del SDK instalado para mantener compatibilidad
// entre web y Expo sin depender de APIs no expuestas por esta version.
export const auth = getAuth(app);

export const db = getFirestore(app);
export const storage = getStorage(app);
