// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBUKrd8fVGZlgpHH2y8EYbDanBIxx4iQdg",
  authDomain: "jooflix-6ecae.firebaseapp.com",
  projectId: "jooflix-6ecae",
  storageBucket: "jooflix-6ecae.firebasestorage.app",
  messagingSenderId: "540634103488",
  appId: "1:540634103488:web:46327f032162e7c445b725"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firebase 서비스 초기화
const auth = firebase.auth();
const db = firebase.firestore();

// Google Auth Provider
const googleProvider = new firebase.auth.GoogleAuthProvider();
