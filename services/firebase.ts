
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC2aEP0v-dh0A5LAV3RKfJJ7K6Z0R-sqRE",
  authDomain: "sorumluluk-sinav.firebaseapp.com",
  projectId: "sorumluluk-sinav",
  storageBucket: "sorumluluk-sinav.firebasestorage.app",
  messagingSenderId: "603065482828",
  appId: "1:603065482828:web:121c3345d420426af1bee9",
  measurementId: "G-KYVCVXWGL0"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
