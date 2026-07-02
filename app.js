// ============================================
// PRESENCEHUB - Main Application Logic
// Aplikasi Komputasi Bergerak - Kelompok 3
// 
// Teknologi yang digunakan:
// - Firebase Authentication (Pekan 1b)
// - Firebase Realtime Database - Presence (Pekan 3b)
// - Firebase Cloud Firestore - User Data (Pekan 2)
// - Realtime Listeners: onSnapshot, onValue (Pekan 2)
// ============================================

// ============================================
// STATE MANAGEMENT
// ============================================
let currentUser = null;          // User yang sedang login
let allUsers = {};               // Data profil semua user dari Firestore
let allStatuses = {};            // Status online/offline dari Realtime Database
let previousStatuses = {};       // Status sebelumnya (untuk deteksi join/leave)
let currentFilter = 'all';      // Filter tampilan: 'all', 'online', 'offline'
let isFirstLoad = true;         // Flag untuk menghindari notifikasi saat pertama load

// ============================================
// DOM ELEMENTS
// ============================================
const loadingScreen = document.getElementById('loading-screen');
const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const authError = document.getElementById('auth-error');
const usersGrid = document.getElementById('users-grid');
const emptyState = document.getElementById('empty-state');
const activityList = document.getElementById('activity-list');
const activityEmpty = document.getElementById('activity-empty');
const toastContainer = document.getElementById('toast-container');

// Stat elements
const statTotal = document.getElementById('stat-total');
const statOnline = document.getElementById('stat-online');
const statOffline = document.getElementById('stat-offline');

// Current user elements
const currentUserAvatar = document.getElementById('current-user-avatar');
const currentUserName = document.getElementById('current-user-name');

// ============================================
// HTML SANITIZER
// Mencegah XSS attack dari input user
// ============================================
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ============================================
// AVATAR COLOR GENERATOR
// Menghasilkan warna konsisten berdasarkan string
// ============================================
const avatarColors = [
    '#6c63ff', '#00d4aa', '#ff6b6b', '#feca57', 
    '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd',
    '#01a3a4', '#f368e0', '#ff6348', '#2ed573',
    '#3742fa', '#ff4757', '#7bed9f', '#70a1ff'
];

function getAvatarColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return avatarColors[Math.abs(hash) % avatarColors.length];
}

function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
}

// ============================================
// TIME FORMATTER
// Format timestamp menjadi "x menit yang lalu"
// ============================================
function timeAgo(timestamp) {
    if (!timestamp) return '';
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 30) return 'Baru saja';
    if (seconds < 60) return `${seconds} detik lalu`;
    if (minutes < 60) return `${minutes} menit lalu`;
    if (hours < 24) return `${hours} jam lalu`;
    return `${days} hari lalu`;
}

function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// ============================================
// UI HELPERS
// ============================================

// Tampilkan/sembunyikan loading pada tombol
function setButtonLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    const text = btn.querySelector('.btn-text');
    const loader = btn.querySelector('.btn-loader');
    
    if (loading) {
        text.classList.add('hidden');
        loader.classList.remove('hidden');
        btn.disabled = true;
    } else {
        text.classList.remove('hidden');
        loader.classList.add('hidden');
        btn.disabled = false;
    }
}

// Tampilkan pesan error pada form auth
function showAuthError(message) {
    authError.textContent = message;
    authError.classList.remove('hidden');
    // Auto-hide setelah 5 detik
    setTimeout(() => {
        authError.classList.add('hidden');
    }, 5000);
}

// Sembunyikan pesan error
function hideAuthError() {
    authError.classList.add('hidden');
}

// Switch antara view auth dan dashboard
function showAuthView() {
    loadingScreen.classList.add('fade-out');
    setTimeout(() => {
        loadingScreen.classList.add('hidden');
    }, 500);
    authSection.classList.remove('hidden');
    dashboardSection.classList.add('hidden');
}

function showDashboardView() {
    loadingScreen.classList.add('fade-out');
    setTimeout(() => {
        loadingScreen.classList.add('hidden');
    }, 500);
    authSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
}

// ============================================
// AUTH TAB SWITCHING
// ============================================
function switchTab(tab) {
    const tabIndicator = document.getElementById('tab-indicator');
    const btnLogin = document.getElementById('btn-tab-login');
    const btnRegister = document.getElementById('btn-tab-register');

    hideAuthError();

    if (tab === 'login') {
        btnLogin.classList.add('active');
        btnRegister.classList.remove('active');
        tabIndicator.classList.remove('register');
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
    } else {
        btnLogin.classList.remove('active');
        btnRegister.classList.add('active');
        tabIndicator.classList.add('register');
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    }
}

// ============================================
// FIREBASE AUTHENTICATION
// Menggunakan Firebase Auth (Materi Pekan 1b)
// ============================================

// Handler untuk form Login
async function handleLogin(event) {
    event.preventDefault();
    hideAuthError();
    setButtonLoading('btn-login', true);

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        // Firebase Auth: signInWithEmailAndPassword
        await auth.signInWithEmailAndPassword(email, password);
        // onAuthStateChanged akan menangani navigasi
    } catch (error) {
        console.error('Login error:', error);
        // Tampilkan pesan error dalam bahasa Indonesia
        let message = 'Terjadi kesalahan saat login.';
        switch (error.code) {
            case 'auth/user-not-found':
                message = 'Akun tidak ditemukan. Silakan daftar terlebih dahulu.';
                break;
            case 'auth/wrong-password':
                message = 'Password salah. Silakan coba lagi.';
                break;
            case 'auth/invalid-email':
                message = 'Format email tidak valid.';
                break;
            case 'auth/too-many-requests':
                message = 'Terlalu banyak percobaan. Silakan coba beberapa saat lagi.';
                break;
            case 'auth/invalid-credential':
                message = 'Email atau password salah.';
                break;
        }
        showAuthError(message);
    } finally {
        setButtonLoading('btn-login', false);
    }
}

// Handler untuk form Register
async function handleRegister(event) {
    event.preventDefault();
    hideAuthError();
    setButtonLoading('btn-register', true);

    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    try {
        // Firebase Auth: createUserWithEmailAndPassword
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Update display name di Firebase Auth
        await user.updateProfile({ displayName: name });

        // Simpan data profil user ke Cloud Firestore (Materi Pekan 2)
        await db.collection('users').doc(user.uid).set({
            displayName: name,
            email: email,
            uid: user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // onAuthStateChanged akan menangani navigasi

    } catch (error) {
        console.error('Register error:', error);
        let message = 'Terjadi kesalahan saat mendaftar.';
        switch (error.code) {
            case 'auth/email-already-in-use':
                message = 'Email sudah digunakan. Silakan gunakan email lain atau login.';
                break;
            case 'auth/weak-password':
                message = 'Password terlalu lemah. Gunakan minimal 6 karakter.';
                break;
            case 'auth/invalid-email':
                message = 'Format email tidak valid.';
                break;
        }
        showAuthError(message);
    } finally {
        setButtonLoading('btn-register', false);
    }
}

// Handler untuk Logout
async function handleLogout() {
    try {
        // Set status offline sebelum logout
        if (currentUser) {
            const statusRef = rtdb.ref('/status/' + currentUser.uid);
            await statusRef.set({
                state: 'offline',
                last_changed: firebase.database.ServerValue.TIMESTAMP
            });
        }
        await auth.signOut();
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// ============================================
// FIREBASE PRESENCE SYSTEM
// Menggunakan Realtime Database (Materi Pekan 3b)
// 
// Cara kerja:
// 1. Deteksi koneksi via .info/connected
// 2. Saat online → set status "online" 
// 3. Saat disconnect → onDisconnect() otomatis set "offline"
// ============================================
function setupPresence(user) {
    // Reference ke node status user di Realtime Database
    const userStatusRef = rtdb.ref('/status/' + user.uid);

    // Data yang akan ditulis saat online
    const isOnlineData = {
        state: 'online',
        last_changed: firebase.database.ServerValue.TIMESTAMP
    };

    // Data yang akan ditulis saat offline (otomatis oleh server)
    const isOfflineData = {
        state: 'offline',
        last_changed: firebase.database.ServerValue.TIMESTAMP
    };

    // ======================================
    // KUNCI UTAMA: .info/connected
    // Node spesial Firebase yang mendeteksi
    // apakah client terhubung ke server
    // (Materi Pekan 3b - Firebase Presence)
    // ======================================
    const connectedRef = rtdb.ref('.info/connected');
    connectedRef.on('value', (snapshot) => {
        // Jika tidak terhubung, tidak perlu melakukan apa-apa
        // Firebase server akan menjalankan onDisconnect() otomatis
        if (snapshot.val() === false) {
            return;
        }

        // ======================================
        // onDisconnect()
        // Menjadwalkan operasi write yang akan
        // dieksekusi oleh SERVER saat client terputus
        // (Materi Pekan 3b)
        // ======================================
        userStatusRef.onDisconnect().set(isOfflineData).then(() => {
            // Setelah onDisconnect terdaftar, set status online
            userStatusRef.set(isOnlineData);
        });
    });
}

// ============================================
// REALTIME LISTENERS
// Menggunakan onSnapshot (Firestore) dan onValue (RTDB)
// (Materi Pekan 2)
// ============================================

// Listener untuk data user dari Firestore
let unsubscribeUsers = null;
function listenToUsers() {
    // Guard: hentikan listener lama jika masih aktif
    if (unsubscribeUsers) {
        unsubscribeUsers();
        unsubscribeUsers = null;
    }

    // ======================================
    // onSnapshot() - Realtime Listener Firestore
    // Mendengarkan perubahan data secara realtime
    // tanpa perlu reload halaman
    // (Materi Pekan 2 - Cloud Firestore)
    // ======================================
    unsubscribeUsers = db.collection('users').onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
            const userData = change.doc.data();
            const uid = change.doc.id;

            if (change.type === 'added' || change.type === 'modified') {
                allUsers[uid] = userData;
            }
            if (change.type === 'removed') {
                delete allUsers[uid];
            }
        });

        // Re-render daftar user setiap ada perubahan
        renderUserList();
        updateStats();
    }, (error) => {
        console.error('Error listening to users:', error);
    });
}

// Listener untuk status online/offline dari Realtime Database
let statusListenerRef = null;
function listenToStatuses() {
    // Guard: hentikan listener lama jika masih aktif
    if (statusListenerRef) {
        statusListenerRef.off();
        statusListenerRef = null;
    }

    statusListenerRef = rtdb.ref('/status');

    // ======================================
    // onValue() / on('value') - Realtime Listener RTDB
    // Mendengarkan perubahan pada node /status
    // secara realtime (Materi Pekan 2 - Realtime Database)
    // ======================================
    statusListenerRef.on('value', (snapshot) => {
        const statuses = snapshot.val() || {};

        // Deteksi perubahan status untuk notifikasi
        if (!isFirstLoad) {
            // Cek user yang statusnya berubah (termasuk yang baru muncul)
            Object.keys(statuses).forEach((uid) => {
                const newState = statuses[uid]?.state;
                const oldState = previousStatuses[uid]?.state;

                // Skip notifikasi untuk diri sendiri
                if (uid === currentUser?.uid) return;

                const userName = escapeHtml(allUsers[uid]?.displayName || 'User');

                if (oldState !== 'online' && newState === 'online') {
                    // User baru saja ONLINE (join)
                    showToast(`${userName} sedang online`, 'join', '🟢');
                    addActivityItem(userName, 'join');
                } else if (oldState === 'online' && newState === 'offline') {
                    // User baru saja OFFLINE (leave)
                    showToast(`${userName} sudah offline`, 'leave', '🔴');
                    addActivityItem(userName, 'leave');
                }
            });

            // Cek user yang hilang dari status (dihapus dari database)
            Object.keys(previousStatuses).forEach((uid) => {
                if (!statuses[uid] && previousStatuses[uid]?.state === 'online') {
                    if (uid === currentUser?.uid) return;
                    const userName = escapeHtml(allUsers[uid]?.displayName || 'User');
                    showToast(`${userName} sudah offline`, 'leave', '🔴');
                    addActivityItem(userName, 'leave');
                }
            });
        }

        // Simpan status sebelumnya dan update status saat ini
        previousStatuses = { ...allStatuses };
        allStatuses = statuses;
        isFirstLoad = false;

        // Re-render UI
        renderUserList();
        updateStats();
    });
}

// ============================================
// UI RENDERING
// ============================================

// Render daftar user ke dalam grid
function renderUserList() {
    // Gabungkan data user (Firestore) dengan status (RTDB)
    const userEntries = Object.keys(allUsers).map((uid) => {
        const user = allUsers[uid];
        const status = allStatuses[uid] || { state: 'offline', last_changed: null };
        return {
            uid,
            displayName: user.displayName || 'User',
            email: user.email || '',
            state: status.state || 'offline',
            lastChanged: status.last_changed || null,
            isSelf: uid === currentUser?.uid
        };
    });

    // Filter berdasarkan pilihan user
    const filtered = userEntries.filter((u) => {
        if (currentFilter === 'online') return u.state === 'online';
        if (currentFilter === 'offline') return u.state === 'offline';
        return true;
    });

    // Sort: online dulu, lalu self di paling atas
    filtered.sort((a, b) => {
        if (a.isSelf) return -1;
        if (b.isSelf) return 1;
        if (a.state === 'online' && b.state !== 'online') return -1;
        if (a.state !== 'online' && b.state === 'online') return 1;
        return (b.lastChanged || 0) - (a.lastChanged || 0);
    });

    // Tampilkan empty state jika tidak ada user
    if (filtered.length === 0) {
        usersGrid.innerHTML = '';
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty-state';
        emptyDiv.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <p>${currentFilter === 'all' ? 'Belum ada user lain yang terdaftar' : 
                 currentFilter === 'online' ? 'Tidak ada user yang online' : 
                 'Tidak ada user yang offline'}</p>
            <span>${currentFilter === 'all' ? 'Ajak teman untuk bergabung!' : 'Coba filter lain'}</span>
        `;
        usersGrid.appendChild(emptyDiv);
        return;
    }

    // Render user cards
    usersGrid.innerHTML = '';
    filtered.forEach((user) => {
        const card = createUserCard(user);
        usersGrid.appendChild(card);
    });
}

// Buat elemen user card
function createUserCard(user) {
    const card = document.createElement('div');
    card.className = `user-card${user.isSelf ? ' is-self' : ''}`;
    card.id = `user-card-${user.uid}`;

    const color = getAvatarColor(user.uid);
    const initials = getInitials(user.displayName);
    const isOnline = user.state === 'online';
    const lastSeenText = !isOnline && user.lastChanged ? timeAgo(user.lastChanged) : '';

    // Sanitasi data user untuk mencegah XSS
    const safeName = escapeHtml(user.displayName);
    const safeEmail = escapeHtml(user.email);

    card.innerHTML = `
        <div class="user-avatar">
            <div class="avatar-circle" style="background: ${color}">
                ${initials}
            </div>
            <span class="status-dot ${isOnline ? 'online' : 'offline'}"></span>
        </div>
        <div class="user-info">
            <div class="user-name">${safeName}${user.isSelf ? ' (Anda)' : ''}</div>
            <div class="user-email">${safeEmail}</div>
            ${lastSeenText ? `<div class="user-last-seen">Terakhir online: ${lastSeenText}</div>` : ''}
        </div>
        <div class="user-status-badge ${isOnline ? 'online' : 'offline'}">
            <span class="status-dot ${isOnline ? 'online' : 'offline'}"></span>
            ${isOnline ? 'Online' : 'Offline'}
        </div>
    `;

    return card;
}

// Update statistik
function updateStats() {
    const total = Object.keys(allUsers).length;
    let online = 0;
    let offline = 0;

    Object.keys(allUsers).forEach((uid) => {
        const status = allStatuses[uid];
        if (status && status.state === 'online') {
            online++;
        } else {
            offline++;
        }
    });

    // Animasi angka
    animateNumber(statTotal, total);
    animateNumber(statOnline, online);
    animateNumber(statOffline, offline);
}

// Animasi perubahan angka
function animateNumber(element, target) {
    const current = parseInt(element.textContent) || 0;
    if (current === target) return;

    element.style.transform = 'scale(1.2)';
    element.style.transition = 'transform 0.2s ease';
    element.textContent = target;

    setTimeout(() => {
        element.style.transform = 'scale(1)';
    }, 200);
}

// Filter user
function filterUsers(filter) {
    currentFilter = filter;

    // Update tombol filter aktif
    document.querySelectorAll('.filter-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });

    renderUserList();
}

// ============================================
// TOAST NOTIFICATIONS
// Notifikasi pop-up saat user join/leave
// ============================================
function showToast(message, type = 'info', icon = 'ℹ️') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const title = type === 'join' ? 'User Bergabung' :
                  type === 'leave' ? 'User Keluar' : 'Info';

    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-body">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;

    // Klik untuk menutup
    toast.addEventListener('click', () => removeToast(toast));

    toastContainer.appendChild(toast);

    // Auto-remove setelah 4 detik
    setTimeout(() => removeToast(toast), 4000);

    // Maksimal 5 toast sekaligus
    while (toastContainer.children.length > 5) {
        removeToast(toastContainer.firstChild);
    }
}

function removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    toast.classList.add('removing');
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
}

// ============================================
// ACTIVITY LOG
// Riwayat aktivitas join/leave user
// ============================================
function addActivityItem(userName, type) {
    // Sembunyikan empty state
    if (activityEmpty) {
        activityEmpty.classList.add('hidden');
    }

    const item = document.createElement('div');
    item.className = 'activity-item';

    const icon = type === 'join' ? '🟢' : '🔴';
    // userName sudah di-escape sebelum dipanggil di sini
    const text = type === 'join' 
        ? `<strong>${userName}</strong> sedang online`
        : `<strong>${userName}</strong> sudah offline`;

    item.innerHTML = `
        <div class="activity-icon ${type}">${icon}</div>
        <div class="activity-content">
            <div class="activity-text">${text}</div>
            <div class="activity-time">${formatTime(Date.now())}</div>
        </div>
    `;

    // Tambahkan di paling atas
    activityList.insertBefore(item, activityList.firstChild);

    // Maksimal 50 item
    while (activityList.children.length > 51) { // +1 untuk empty state element
        activityList.removeChild(activityList.lastChild);
    }
}

// Bersihkan activity log
function clearActivity() {
    activityList.innerHTML = '';
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'activity-empty';
    emptyDiv.id = 'activity-empty';
    emptyDiv.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="36" height="36">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        <p>Belum ada aktivitas</p>
    `;
    activityList.appendChild(emptyDiv);
}

// ============================================
// AUTH STATE OBSERVER
// Mendeteksi perubahan status login
// (Materi Pekan 1b - Firebase Authentication)
// ============================================
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // ====== USER SUDAH LOGIN ======
        currentUser = user;

        // Update UI header dengan info user
        currentUserName.textContent = user.displayName || user.email;
        currentUserAvatar.textContent = getInitials(user.displayName || user.email);

        // Pastikan data user ada di Firestore
        // (untuk kasus login tanpa register, atau data belum ada)
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            await db.collection('users').doc(user.uid).set({
                displayName: user.displayName || user.email.split('@')[0],
                email: user.email,
                uid: user.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        // Setup Firebase Presence (Materi Pekan 3b)
        setupPresence(user);

        // Mulai mendengarkan perubahan data secara realtime
        listenToUsers();
        listenToStatuses();

        // Tampilkan dashboard
        showDashboardView();

    } else {
        // ====== USER BELUM LOGIN ======
        currentUser = null;
        allUsers = {};
        allStatuses = {};
        previousStatuses = {};
        isFirstLoad = true;

        // Hentikan listeners
        if (unsubscribeUsers) {
            unsubscribeUsers();
            unsubscribeUsers = null;
        }
        if (statusListenerRef) {
            statusListenerRef.off();
            statusListenerRef = null;
        }

        // Tampilkan halaman auth
        showAuthView();
    }
});

// ============================================
// PERIODIC UPDATE
// Update "last seen" timestamps setiap 30 detik
// ============================================
setInterval(() => {
    if (currentUser && Object.keys(allUsers).length > 0) {
        renderUserList();
    }
}, 30000);

// ============================================
// WINDOW EVENTS
// Handle tab close / browser close
// ============================================
window.addEventListener('beforeunload', () => {
    // Catatan: onDisconnect() yang di-setup di setupPresence()
    // sudah menangani kasus tab ditutup secara otomatis oleh
    // Firebase server. beforeunload hanya sebagai backup tambahan.
    // Kita tidak perlu await karena tab akan segera ditutup.
    if (currentUser) {
        // Gunakan set() tanpa await — best effort saja
        // Firebase onDisconnect() yang sudah terdaftar di server
        // akan tetap berjalan meskipun set() ini gagal
        const statusRef = rtdb.ref('/status/' + currentUser.uid);
        statusRef.set({
            state: 'offline',
            last_changed: firebase.database.ServerValue.TIMESTAMP
        });
    }
});

// ============================================
// INITIALIZATION LOG
// ============================================
console.log('%c⚡ PresenceHub', 'font-size: 20px; font-weight: bold; color: #6c63ff;');
console.log('%cRealtime User Presence Tracker', 'font-size: 12px; color: #00d4aa;');
console.log('%cAplikasi Komputasi Bergerak - Kelompok 3', 'font-size: 11px; color: #888;');
