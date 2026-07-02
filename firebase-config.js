// ============================================
// PRESENCEHUB - Firebase Configuration
// Aplikasi Komputasi Bergerak - Kelompok 3
// ============================================
// 
// PETUNJUK:
// 1. Buka https://console.firebase.google.com/
// 2. Buat project baru atau gunakan project yang ada
// 3. Buka Project Settings > General > Your apps > Web app
// 4. Copy konfigurasi Firebase dan paste di bawah ini
// 5. Lihat SETUP_GUIDE.md untuk panduan lengkap
//
// ============================================

const firebaseConfig = {
    apiKey: "AIzaSyBZIe1DKUtlA_GWj8Sy60rO1IQuuDyt7SI",
    authDomain: "presencehub-fed91.firebaseapp.com",
    databaseURL: "https://presencehub-fed91-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "presencehub-fed91",
    storageBucket: "presencehub-fed91.firebasestorage.app",
    messagingSenderId: "313124236647",
    appId: "1:313124236647:web:acca29e5d8718e8b0fd3c2"
};

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);

// Inisialisasi layanan Firebase yang digunakan
const auth = firebase.auth();           // Firebase Authentication
const db = firebase.firestore();        // Cloud Firestore
const rtdb = firebase.database();       // Realtime Database (untuk Presence)
