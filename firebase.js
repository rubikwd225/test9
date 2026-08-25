// firebase.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDXmCIJMvuuhjsurn_ZbZQ3ZMKxWBlSMoI",
  authDomain: "hauntedhouse-akita-hs-2027.firebaseapp.com",
  projectId: "hauntedhouse-akita-hs-2027",
  storageBucket: "hauntedhouse-akita-hs-2027.firebasestorage.app",
  messagingSenderId: "276628054937",
  appId: "1:276628054937:web:d63a94fcbc2a1a0d66e908",
  measurementId: "G-CFBT0G8TZ5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };