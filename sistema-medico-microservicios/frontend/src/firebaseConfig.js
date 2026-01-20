import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAle2Gi-xkLph2HxlIMW3Z_hB3KA_5k3PA",
  authDomain: "apolo-a6108.firebaseapp.com",
  projectId: "apolo-a6108",
  storageBucket: "apolo-a6108.firebasestorage.app",
  messagingSenderId: "669021643236",
  appId: "1:669021643236:web:984f8c2c5be11f5fb6a7f1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);