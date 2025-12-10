const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
// const helmet = require('helmet'); // Biarkan mati dulu biar aman css-nya

const app = express();

// --- LOGIC KUNCI RAHASIA (Sama seperti sebelumnya) ---
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Kalau di Vercel, baca dari Environment Variable
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
    // Kalau lupa setting env, coba cari file lokal (opsional untuk dev)
    // Tapi di Vercel nanti kita pakai ENV
    try {
        serviceAccount = require('../serviceAccountKey.json');
    } catch (e) {
        console.log("Tidak ada file key lokal, pastikan ENV diset.");
    }
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

app.use(cors({ origin: true }));
app.use(express.json());

// --- MIDDLEWARE AUTH (Sama) ---
const verifyToken = async (req, res, next) => {
    const idToken = req.headers.authorization;
    if (!idToken) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid token' });
    }
};

// --- ROUTE UTAMA ---
// Penting: Vercel membaca file ini sebagai rute.
// Jadi kalau kita akses /api/reservations, dia akan masuk sini.

app.get('/', (req, res) => {
    res.send("Backend Monokrom Ready!");
});

app.post('/api/reservations', verifyToken, async (req, res) => {
    // ... (KODE LOGIC RESERVASI KAMU TETAP SAMA DISINI) ...
    try {
        const { date, pax } = req.body;
        // Validasi...
        const newBooking = {
            userId: req.user.uid,
            email: req.user.email,
            date: new Date(date),
            pax: parseInt(pax),
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
        await db.collection('reservations').add(newBooking);
        res.status(200).json({ message: 'Reservasi berhasil dibuat!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- PENTING: EXPORT APP ---
// Jangan pakai app.listen(PORT)! Vercel yang akan handle servernya.
module.exports = app;