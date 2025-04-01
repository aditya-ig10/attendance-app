// firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBMQX9mBps0XfGrDhT2spAYBdCKK1PvwcU",
  authDomain: "collegetracker-c92c1.firebaseapp.com",
  projectId: "collegetracker-c92c1",
  storageBucket: "collegetracker-c92c1.firebasestorage.app",
  messagingSenderId: "568343279720",
  appId: "1:568343279720:web:cddf9774dcea9e589723dd",
  measurementId: "G-P0GGS31W9B"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut };