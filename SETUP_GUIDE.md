# 🔧 Panduan Setup Firebase untuk PresenceHub

Panduan lengkap untuk membuat dan mengkonfigurasi Firebase project agar aplikasi PresenceHub dapat berjalan.

---

## Langkah 1: Buat Firebase Project

1. Buka **[Firebase Console](https://console.firebase.google.com/)**
2. Klik **"Create a project"** (atau "Buat project")
3. Masukkan nama project: **`PresenceHub`** (atau nama lain sesuai keinginan)
4. Klik **Continue**
5. Matikan Google Analytics (opsional, tidak diperlukan untuk project ini)
6. Klik **Create project**
7. Tunggu hingga project selesai dibuat, lalu klik **Continue**

---

## Langkah 2: Tambahkan Web App

1. Di halaman utama project, klik ikon **Web** (`</>`) untuk menambahkan app
2. Masukkan nama app: **`PresenceHub Web`**
3. **Jangan** centang "Firebase Hosting" (tidak diperlukan)
4. Klik **Register app**
5. Anda akan melihat konfigurasi Firebase seperti ini:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyxxxxxxxxxxxxxxxxxxxxxxx",
    authDomain: "presencehub-xxxxx.firebaseapp.com",
    databaseURL: "https://presencehub-xxxxx-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "presencehub-xxxxx",
    storageBucket: "presencehub-xxxxx.firebasestorage.app",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:xxxxxxxxxxxxxx"
};
```

6. **Copy konfigurasi ini** dan paste ke file `firebase-config.js` (ganti placeholder yang ada)
7. Klik **Continue to console**

---

## Langkah 3: Aktifkan Authentication

1. Di sidebar kiri Firebase Console, klik **Build** → **Authentication**
2. Klik **Get started**
3. Di tab **Sign-in method**, klik **Email/Password**
4. **Aktifkan** toggle "Email/Password"
5. Klik **Save**

---

## Langkah 4: Buat Realtime Database

1. Di sidebar kiri, klik **Build** → **Realtime Database**
2. Klik **Create Database**
3. Pilih lokasi: **Singapore (asia-southeast1)** (terdekat dari Indonesia)
4. Pilih **Start in test mode** (untuk development)
5. Klik **Enable**

### ⚠️ PENTING: Update Database URL

Setelah database dibuat, Anda akan mendapatkan URL database.
**Pastikan URL ini sesuai dengan `databaseURL` di `firebase-config.js`!**

Contoh format URL:
```
https://presencehub-xxxxx-default-rtdb.asia-southeast1.firebasedatabase.app
```

### Security Rules (Opsional - untuk Production)

Untuk saat ini, gunakan test mode. Jika ingin rules yang lebih aman:

```json
{
  "rules": {
    "status": {
      "$uid": {
        ".read": true,
        ".write": "$uid === auth.uid"
      }
    }
  }
}
```

---

## Langkah 5: Buat Cloud Firestore

1. Di sidebar kiri, klik **Build** → **Firestore Database**
2. Klik **Create database**
3. Pilih lokasi: **asia-southeast1 (Singapore)**
4. Pilih **Start in test mode**
5. Klik **Create**

### Security Rules (Opsional - untuk Production)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## Langkah 6: Jalankan Aplikasi

### Cara Paling Mudah (Live Server di VS Code):
1. Install extension **"Live Server"** di VS Code
2. Buka folder `PresenceHub` di VS Code
3. Klik kanan pada `index.html` → **"Open with Live Server"**
4. Aplikasi akan terbuka di browser secara otomatis

### Cara Alternatif (Python HTTP Server):
```bash
cd "e:\Tugas Kuliah\Semester 6\Aplikasi Komputasi Bergerak\PresenceHub"
python -m http.server 8000
```
Lalu buka `http://localhost:8000` di browser.

### Cara Alternatif (Node.js):
```bash
npx -y serve .
```

---

## Langkah 7: Testing

1. **Buka di 2 tab browser** (atau 2 browser berbeda)
2. **Daftar 2 akun** dengan email berbeda di masing-masing tab
3. **Verifikasi fitur:**
   - ✅ Kedua user muncul sebagai **Online** (hijau)
   - ✅ **Tutup salah satu tab** → user berubah menjadi **Offline** (abu-abu)
   - ✅ **Toast notification** muncul saat user join/leave
   - ✅ **Activity log** mencatat semua perubahan status
   - ✅ Semua update terjadi **tanpa reload halaman**

---

## Troubleshooting

### "Firebase: No Firebase App has been created"
→ Pastikan `firebase-config.js` sudah diisi dengan config yang benar

### "Permission denied" di Realtime Database
→ Pastikan Realtime Database menggunakan **test mode** rules

### "Missing or insufficient permissions" di Firestore
→ Pastikan Firestore menggunakan **test mode** rules

### Status tidak berubah ke offline saat tab ditutup
→ Pastikan `databaseURL` di config sudah benar dan Realtime Database sudah dibuat

### Halaman blank / tidak muncul apa-apa
→ Buka Developer Tools (F12) → Console, periksa error messages

---

## Struktur Data Firebase

### Realtime Database: `/status/{uid}`
```json
{
    "state": "online",
    "last_changed": 1719907200000
}
```

### Cloud Firestore: `users/{uid}`
```json
{
    "displayName": "Nama User",
    "email": "user@email.com",
    "uid": "abc123...",
    "createdAt": "July 2, 2026"
}
```
