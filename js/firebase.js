// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

// Firebase Configuration
 const firebaseConfig = {
    apiKey: "AIzaSyCk_YJhQFKjZy7Vk4Im00jPcsAhsIYL1hI",
    authDomain: "drcs-188d6.firebaseapp.com",
    projectId: "drcs-188d6",
    storageBucket: "drcs-188d6.firebasestorage.app",
    messagingSenderId: "921448195371",
    appId: "1:921448195371:web:d18cc7c83778dd4c54d16e",
    measurementId: "G-K6D7E646KC"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
const auth = getAuth(app);
const db = getFirestore(app);

// Export Services
export { auth, db };