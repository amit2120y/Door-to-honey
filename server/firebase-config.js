// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyDfgWT0xoIigwLodRrhE0gBm5_7HkM-OJQ",
    authDomain: "door-to-honey.firebaseapp.com",
    projectId: "door-to-honey",
    storageBucket: "door-to-honey.firebasestorage.app",
    messagingSenderId: "999103451860",
    appId: "1:999103451860:web:dde028d01129b347ede141",
    measurementId: "G-83DSY4LHKL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Firebase Storage and get a reference to the service
export const storage = getStorage(app);

console.log("Firebase initialized successfully!");
