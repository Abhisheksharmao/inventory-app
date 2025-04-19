import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Your Firebase configuration (replace with your own Firebase project's config)
const firebaseConfig = {
  apiKey: "AIzaSyBYx8aKmbWrlFqalGghZAtFBNDcHTPo8u4",
  authDomain: "inventory-a8046.firebaseapp.com",
  projectId: "inventory-a8046",
  storageBucket: "inventory-a8046.firebasestorage.app",
  messagingSenderId: "839218878619",
  appId: "1:839218878619:web:ecfbda36a2e53fffe84e3e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
