import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyACSV_HiSucdybo481d1sDoemV0XrDk0kE",
  authDomain: "dance-b3ad8.firebaseapp.com",
  projectId: "dance-b3ad8",
  storageBucket: "dance-b3ad8.firebasestorage.app",
  messagingSenderId: "488381544894",
  appId: "1:488381544894:web:2c34d0d84fc1939d2aa1ef",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
