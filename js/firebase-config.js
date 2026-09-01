import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB4yGEAgb5wylor8B8iVlkamYR35dJnfyI",
  authDomain: "evaluacion-ucip-hptu.firebaseapp.com",
  projectId: "evaluacion-ucip-hptu",
  storageBucket: "evaluacion-ucip-hptu.firebasestorage.app",
  messagingSenderId: "341910772768",
  appId: "1:341910772768:web:fa06d45300c61b41edf045",
  measurementId: "G-FE3R11HD3J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    collection,
    getDocs,
    addDoc,
    deleteDoc,
    doc,
    query,
    where,
    serverTimestamp
};
