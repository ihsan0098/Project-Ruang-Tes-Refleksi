const FB_CONFIG = {
   apiKey: 'AIzaSyBlaVPWme-as1H4TG9qTpQkBVhOko2_O3I',
   authDomain: 'ruang-project-c0e66.firebaseapp.com',
   databaseURL: 'https://ruang-project-c0e66-default-rtdb.asia-southeast1.firebasedatabase.app',
   projectId: 'ruang-project-c0e66',
   storageBucket: 'ruang-project-c0e66.firebasestorage.app',
   messagingSenderId: '849479181422',
   appId: '1:849479181422:web:6f626d023acb6f645d727f',
   measurementId: 'G-K196TQTH15'
};

const PUBLIC_COLLECTIONS = {
   daun: { storageKey: 'ruangDaun', maxMessageLength: 500 },
   forum: { storageKey: 'ruangForum', maxMessageLength: 1000 }
};
const PRIVATE_COLLECTIONS = {
   tests: 'ruangTes',
   kontak: 'ruangKontak'
};

let database = null;
let auth = null;
let connectionError = null;
let firebaseConnected = false;
const syncIssues = new Set();
let publicGallery = [];
let pendingGallery = [];
let adminData = {
   ruangTes: [],
   ruangDaun: [],
   ruangForum: [],
   ruangKontak: [],
   ruangGaleri: [],
   ruangViews: 0
};

function setRuangSyncStatus(message) {
   document.querySelectorAll('[data-sync-status]').forEach(status => {
      status.textContent = message;
   });
}

function updateRuangSyncStatus() {
   if (connectionError) {
      setRuangSyncStatus('Realtime tidak tersambung. Periksa koneksi internet lalu muat ulang halaman.');
      return;
   }
   if (!firebaseConnected) {
      setRuangSyncStatus('Menghubungkan ke Firebase realtime…');
      return;
   }
   if (syncIssues.size) {
      setRuangSyncStatus(`Firebase tersambung, tetapi gagal memuat: ${[...syncIssues].join(', ')}.`);
      return;
   }
   setRuangSyncStatus('Realtime tersambung: Pohon Dialog, Forum, galeri yang disetujui, dan statistik kunjungan.');
}

function loadFirebaseScript(src) {
   return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Tidak dapat memuat Firebase SDK.'));
      document.head.appendChild(script);
   });
}

function formatRecord(id, value) {
   if (!value || typeof value !== 'object' || !Number.isFinite(value.createdAt)) return null;
   const date = new Date(value.createdAt);
   if (!Number.isFinite(date.getTime())) return null;
   return {
      ...value,
      id,
      cap: value.caption || value.cap || '',
      createdAt: date.toISOString(),
      waktu: date.toLocaleString('id-ID')
   };
}

function readRows(snapshot) {
   return Object.entries(snapshot.val() || {})
      .map(([id, value]) => formatRecord(id, value))
      .filter(Boolean);
}

function updateLocalCollection(storageKey, rows) {
   localStorage.setItem(storageKey, JSON.stringify(rows));
   document.dispatchEvent(new CustomEvent('ruang:remote'));
}

function updateAdminCollection(storageKey, rows) {
   adminData[storageKey] = rows;
   document.dispatchEvent(new CustomEvent('ruang:remote'));
}

function getAdminData(storageKey) {
   return Object.prototype.hasOwnProperty.call(adminData, storageKey)
      ? adminData[storageKey]
      : storageKey === 'ruangViews' ? 0 : [];
}

function getPublicGallery() {
   return publicGallery;
}

function refreshAdminGallery() {
   adminData.ruangGaleri = [...pendingGallery, ...publicGallery];
   document.dispatchEvent(new CustomEvent('ruang:remote'));
}

async function connectFirebase() {
   try {
      await loadFirebaseScript('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
      await loadFirebaseScript('https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js');
      await loadFirebaseScript('https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js');
      firebase.initializeApp(FB_CONFIG);
      database = firebase.database();
      auth = firebase.auth();

      Object.entries(PUBLIC_COLLECTIONS).forEach(([collection, config]) => {
         database.ref(`public/${collection}`).on('value', snapshot => {
            syncIssues.delete(collection);
            const rows = readRows(snapshot).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
            if (collection === 'forum') rows.reverse();
            updateLocalCollection(config.storageKey, rows);
            updateRuangSyncStatus();
         }, error => {
            console.error(`Gagal membaca kiriman publik (${collection}):`, error);
            syncIssues.add(collection === 'daun' ? 'Pohon Dialog' : 'Forum');
            updateRuangSyncStatus();
         });
      });

      database.ref('gallery/published').on('value', snapshot => {
         syncIssues.delete('Galeri');
         publicGallery = readRows(snapshot).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
         refreshAdminGallery();
         document.dispatchEvent(new CustomEvent('ruang:remote'));
         updateRuangSyncStatus();
      }, error => {
         console.error('Gagal membaca galeri publik:', error);
         syncIssues.add('Galeri');
         updateRuangSyncStatus();
      });

      database.ref('.info/connected').on('value', snapshot => {
         firebaseConnected = snapshot.val() === true;
         updateRuangSyncStatus();
      }, error => {
         console.error('Gagal memeriksa koneksi realtime Firebase:', error);
         firebaseConnected = false;
         updateRuangSyncStatus();
      });
   } catch (error) {
      connectionError = error;
      console.error('Firebase gagal diinisialisasi:', error);
      updateRuangSyncStatus();
   }
}

const firebaseReady = connectFirebase();

function requireDatabase() {
   if (connectionError) throw new Error('Firebase tidak dapat dihubungi. Muat ulang halaman dan coba lagi.');
   if (!database) throw new Error('Firebase belum siap. Tunggu sebentar lalu coba lagi.');
   return database;
}

async function simpanKirimanPublik(collection, item) {
   const config = PUBLIC_COLLECTIONS[collection];
   if (!config) throw new Error('Jenis kiriman publik tidak dikenal.');
   const nama = String(item.nama || 'Anonim').trim().slice(0, 40) || 'Anonim';
   const pesan = String(item.pesan || '').trim();
   if (!pesan || pesan.length > config.maxMessageLength) {
      throw new Error(`Pesan harus berisi 1–${config.maxMessageLength} karakter.`);
   }

   await firebaseReady;
   const ref = requireDatabase().ref(`public/${collection}`).push();
   await ref.set({ nama, pesan, createdAt: firebase.database.ServerValue.TIMESTAMP });
   return { shared: true, id: ref.key };
}

async function simpanHasilTes(item) {
   if (!['orangtua', 'anak', 'masyarakat'].includes(item.jenis)
      || !Number.isInteger(item.skor) || item.skor < 0 || item.skor > 12) {
      throw new Error('Hasil tes tidak valid.');
   }
   await firebaseReady;
   const ref = requireDatabase().ref('private/tests').push();
   await ref.set({
      jenis: item.jenis,
      skor: item.skor,
      total: 12,
      createdAt: firebase.database.ServerValue.TIMESTAMP
   });
   return { shared: true, id: ref.key };
}

async function simpanPesanKontak(item) {
   const nama = String(item.nama || '').trim().slice(0, 80);
   const email = String(item.email || '').trim().slice(0, 120);
   const pesan = String(item.pesan || '').trim();
   if (!nama || !pesan || pesan.length > 2000) {
      throw new Error('Nama wajib diisi dan pesan harus berisi maksimal 2.000 karakter.');
   }
   await firebaseReady;
   const ref = requireDatabase().ref('private/kontak').push();
   await ref.set({
      nama,
      email,
      pesan,
      createdAt: firebase.database.ServerValue.TIMESTAMP,
      status: 'baru'
   });
   return { shared: true, id: ref.key };
}

async function simpanMediaGaleri(file, caption) {
   const types = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/ogg']);
   if (!types.has(file.type)) throw new Error('Format file tidak didukung.');
   if (!file.size || file.size > 1024 * 1024) throw new Error('Ukuran setiap foto/video maksimal 1 MB.');

   await firebaseReady;
   const db = requireDatabase();
   const src = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('File tidak dapat dibaca.'));
      reader.readAsDataURL(file);
   });
   if (typeof src !== 'string' || !src.startsWith(`data:${file.type};base64,`)) {
      throw new Error('File tidak dapat diproses dengan aman.');
   }
   const ref = db.ref('gallery/pending').push();
   await ref.set({
      caption: String(caption || '').trim().slice(0, 160),
      contentType: file.type,
      createdAt: firebase.database.ServerValue.TIMESTAMP,
      src,
      status: 'pending',
      type: file.type.startsWith('image/') ? 'image' : 'video'
   });
   return { id: ref.key };
}

async function moderasiMediaGaleri(id, action) {
   if (!id || !['approved', 'rejected', 'deleted'].includes(action)) {
      throw new Error('Aksi moderasi tidak valid.');
   }
   await firebaseReady;
   const db = requireDatabase();
   const pendingRef = db.ref(`gallery/pending/${id}`);
   if (action === 'approved') {
      const snapshot = await pendingRef.once('value');
      const item = snapshot.val();
      if (!item) throw new Error('Kiriman media tidak ditemukan atau sudah dimoderasi.');
      await db.ref().update({
         [`gallery/pending/${id}`]: null,
         [`gallery/published/${id}`]: { ...item, status: 'approved' }
      });
      return;
   }
   await pendingRef.remove();
   if (action === 'deleted') await db.ref(`gallery/published/${id}`).remove();
}

async function loginAdmin(email, password) {
   await firebaseReady;
   if (!auth) throw new Error('Firebase Auth belum siap. Muat ulang halaman.');
   await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
   return auth.signInWithEmailAndPassword(email, password);
}

async function logoutAdmin() {
   await firebaseReady;
   if (auth) await auth.signOut();
}

function pantauDataAdmin(onAuthChange, onError) {
   let disposed = false;
   let activeRefs = [];
   let unsubscribe = null;
   const stopData = () => {
      activeRefs.forEach(ref => ref.off());
      activeRefs = [];
   };
   firebaseReady.then(() => {
      if (disposed) return;
      if (!auth || !database) throw new Error('Firebase belum siap. Muat ulang halaman.');
      unsubscribe = auth.onAuthStateChanged(user => {
         stopData();
         adminData = {
            ruangTes: [],
            ruangDaun: [],
            ruangForum: [],
            ruangKontak: [],
            ruangGaleri: [],
            ruangViews: 0
         };
         pendingGallery = [];
         onAuthChange(user);
         if (!user) {
            document.dispatchEvent(new CustomEvent('ruang:remote'));
            return;
         }

         const collections = [
            ['private/tests', PRIVATE_COLLECTIONS.tests],
            ['private/kontak', PRIVATE_COLLECTIONS.kontak],
            ['gallery/pending', 'ruangGaleriPending'],
            ['public/stats/views', 'ruangViews']
         ];
         collections.forEach(([path, storageKey]) => {
            const ref = database.ref(path);
            activeRefs.push(ref);
            ref.on('value', snapshot => {
               if (storageKey === 'ruangViews') {
                  updateAdminCollection(storageKey, snapshot.val() || 0);
                  return;
               }
               const rows = readRows(snapshot).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
               if (storageKey === 'ruangGaleriPending') {
                  pendingGallery = rows;
                  refreshAdminGallery();
               } else {
                  updateAdminCollection(storageKey, rows);
               }
            }, error => onError(error));
         });
      }, onError);
   }).catch(onError);

   return () => {
      disposed = true;
      stopData();
      if (unsubscribe) unsubscribe();
   };
}

async function countVisit() {
   const marker = 'ruangVisitCounted';
   if (sessionStorage.getItem(marker)) return;
   await firebaseReady;
   const result = await requireDatabase().ref('public/stats/views').transaction(value => {
      if (value !== null && (!Number.isSafeInteger(value) || value < 0)) return;
      return (value || 0) + 1;
   });
   if (!result.committed) throw new Error('Penghitung kunjungan tidak dapat diperbarui.');
   sessionStorage.setItem(marker, '1');
}
