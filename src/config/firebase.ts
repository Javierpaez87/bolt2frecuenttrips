// firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // 🔥 Import Firestore

const firebaseConfig = {
  apiKey: "AIzaSyD2M6z2jn350b0xJvRi_HASwZIXUcWGe2M",
  authDomain: "bondicar-a7cf4.firebaseapp.com",
  projectId: "bondicar-a7cf4",
  storageBucket: "bondicar-a7cf4.appspot.com",
  messagingSenderId: "1040139946238",
  appId: "1:1040139946238:web:7ded652d737731466dfdaf",
  measurementId: "G-C44PFZF0XF"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const db = getFirestore(app); // ✅ Inicializa Firestore

export { auth, googleProvider, db };

