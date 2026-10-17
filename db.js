/* =========================================================
   db.js — Sumber data realtime untuk Project Ruang
   ---------------------------------------------------------
   Cara pakai:
   1. Buat project gratis di https://console.firebase.google.com
   2. Tambahkan "Realtime Database" dan set rules:
      { "rules": { "ruang": { ".read": true, ".write": true } } }
   3. Salin config dari Project Settings → isi FB_CONFIG di bawah.
   Tanpa config, website tetap jalan dengan mode lokal (localStorage).
   ========================================================= */

const FB_CONFIG = null; // ← PASTE CONFIG FIREBASE DI SINI, contoh:
// const FB_CONFIG = { apiKey:"...", authDomain:"...", databaseURL:"https://NAMA.firebaseio.com", projectId:"...", storageBucket:"...", messagingSenderId:"...", appId:"..." };

let fbReady = false, fbRef = null, applyingRemote = false;

/* --- Firebase (opsional, via CDN) --- */
(function () {
   if (!FB_CONFIG || !FB_CONFIG.databaseURL) { console.info('Project Ruang: mode lokal (Firebase belum dikonfigurasi).'); return; }
   const s1 = document.createElement('script'); s1.src = 'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js';
   s1.onload = () => {
      const s2 = document.createElement('script'); s2.src = 'https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js';
      s2.onload = () => {
         try {
            firebase.initializeApp(FB_CONFIG);
            fbRef = firebase.database().ref('ruang');
            fbRef.on('value', snap => {
               const d = snap.val(); if (!d) return;
               applyingRemote = true;
               for (const k in d) {
                  const v = d[k];
                  try { localStorage.setItem(k, (v && typeof v === 'object') ? JSON.stringify(v) : v); } catch (e) { }
               }
               applyingRemote = false;
               document.dispatchEvent(new CustomEvent('ruang:remote'));
            });
            fbReady = true;
            console.info('Project Ruang: mode REALTIME aktif (Firebase).');
         } catch (e) { console.warn('Firebase gagal diinisialisasi:', e); }
      };
      document.head.appendChild(s2);
   };
   document.head.appendChild(s1);
})();

/* --- Intersep: setiap localStorage.setItem('ruang*') otomatis dikirim ke Firebase --- */
(function () {
   const _setItem = Storage.prototype.setItem;
   Storage.prototype.setItem = function (k, v) {
      _setItem.call(this, k, v);
      if (fbRef && !applyingRemote && String(k).startsWith('ruang')) {
         try { fbRef.child(k).set((v && (v[0] === '[' || v[0] === '{')) ? JSON.parse(v) : v).catch(() => { }); } catch (e) { }
      }
   };
})();

/* --- Penghitung pengunjung lintas perangkat --- */
function countVisit() {
   if (fbRef) {
      fbRef.child('ruangViews').transaction(v => ((v || 0) + 1));
   } else {
      let v = parseInt(localStorage.getItem('ruangViews') || '0') + 1;
      localStorage.setItem('ruangViews', v);
   }
}
