import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDvlLYH_lLkLCM2FDKNymKtQpbP2VSIAJ4",
  authDomain: "twinsalib.firebaseapp.com",
  projectId: "twinsalib",
  storageBucket: "twinsalib.firebasestorage.app",
  messagingSenderId: "122556729134",
  appId: "1:122556729134:web:03857e4e89279580c2dcbf", // This is a placeholder web appId
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
