import { initializeApp, getApps, getApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your Firebase configuration here
const firebaseConfig = {
  apiKey: "AIzaSyDHqlCI64S8sidm2jdPLS6ZLgj1vd1z7fY",
  authDomain: "transformdocs-3de2b.firebaseapp.com",
  projectId: "transformdocs-3de2b",
  storageBucket: "transformdocs-3de2b.firebasestorage.app",
  messagingSenderId: "737393635128",
  appId: "1:737393635128:web:b89f98b037a144ca211bcd"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const storage = getStorage(app);
const db = getFirestore(app);
const auth = getAuth(app);

export { storage, db, auth };