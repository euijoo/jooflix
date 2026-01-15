// Firebase 설정 (CDN 방식)
const firebaseConfig = {
  apiKey: "AIzaSyBUKrd8fVGZlgpHH2y8EYbDanBIxx4iQdg",
  authDomain: "jooflix-6ecae.firebaseapp.com",
  projectId: "jooflix-6ecae",
  storageBucket: "jooflix-6ecae.firebasestorage.app",
  messagingSenderId: "540634103488",
  appId: "1:540634103488:web:46327f032162e7c445b725"
};

// Firebase 초기화 (CDN 방식)
firebase.initializeApp(firebaseConfig);

// Firebase 서비스 초기화
const auth = firebase.auth();
const db = firebase.firestore();

// Google Auth Provider
const googleProvider = new firebase.auth.GoogleAuthProvider();

console.log('✅ Firebase 초기화 완료!');
