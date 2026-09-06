// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAk3xmDXDBWxiqWc2iqMpKMjzsEUebHiJU",
  authDomain: "cocoa-35632.firebaseapp.com",
  projectId: "cocoa-35632",
  storageBucket: "cocoa-35632.firebasestorage.app",
  messagingSenderId: "135997735106",
  appId: "1:135997735106:web:645fa543d81de4eeb63b5b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Storage
export const storage = getStorage(app);

// Initialize Authentication
export const auth = getAuth(app);

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

// Initialize Analytics
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default app;