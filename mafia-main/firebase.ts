// Use scoped packages @firebase/app and @firebase/database to resolve export issues in some environments
import { initializeApp, getApps, getApp } from '@firebase/app';
import { getDatabase } from '@firebase/database';
import { getAuth } from '@firebase/auth';

// Configuration for Firebase Mafia Game.
const firebaseConfig = {
  apiKey: "AIzaSyCePbLQ77oYeFERrLdw8vZuaNbGL29_dfo",
  authDomain: "mafia-game-8fac4.firebaseapp.com",
  databaseURL: "https://mafia-game-8fac4-default-rtdb.firebaseio.com",
  projectId: "mafia-game-8fac4",
  storageBucket: "mafia-game-8fac4.firebasestorage.app",
  messagingSenderId: "673061154751",
  appId: "1:673061154751:web:ff3481797e9db3e257fb0a",
  measurementId: "G-WVH52FEBSG"
};

// Initialize Firebase App using modular syntax
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Realtime Database with the app instance.
export const db = getDatabase(app);

// Anonymous auth is used to securely identify players for rules + private role reads.
export const auth = getAuth(app);
