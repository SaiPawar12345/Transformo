// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth ,GoogleAuthProvider} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCslUCQkkeEtmI4uXQG7erC0nC8taNbHoM",
    authDomain: "transformodocs.firebaseapp.com",
    projectId: "transformodocs",
    storageBucket: "transformodocs.appspot.com",
    messagingSenderId: "141858945247",
    appId: "1:141858945247:web:0e8e2d3937dcaac995516a",
    measurementId: "G-57G6ZRM1CJ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();