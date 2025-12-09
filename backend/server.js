// server.js
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

// 1. INISIALISASI FIREBASE ADMIN (Akses Database Aman)
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();
const PORT = 3000;

// 2. MIDDLEWARE KEAMANAN

// Rate Limiter: Batasi request (misal: max 100 request per 15 menit per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100 
});
app.use(limiter);
app.use(express.static(path.join(__dirname, '../')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});


// 3. MIDDLEWARE VERIFIKASI AUTH (PENTING!)
// Fungsi ini memastikan yang request adalah user yang valid dari frontend
const verifyToken = async (req, res, next) => {
    const idToken = req.headers.authorization;
    
    if (!idToken) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    try {
        // Verifikasi token yang dikirim dari Frontend
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken; // Simpan data user di request
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Unauthorized: Invalid token' });
    }
};

// 4. API ENDPOINT: CREATE RESERVATION
app.post('/api/reservations', verifyToken, async (req, res) => {
    try {
        const { date, pax } = req.body;

        // Validasi Input di sisi server (Server-side validation)
        if (!date || !pax) {
            return res.status(400).json({ error: 'Data tidak lengkap' });
        }
        
        if (pax > 20) { // Contoh validasi bisnis
            return res.status(400).json({ error: 'Maksimal 20 pax untuk booking online.' });
        }

        // Simpan ke Firestore via Admin SDK
        const newBooking = {
            userId: req.user.uid,      // Ambil UID dari token yang sudah diverifikasi (AMAN)
            email: req.user.email,     // Ambil Email dari token
            date: new Date(date),
            pax: parseInt(pax),
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await db.collection('reservations').add(newBooking);

        res.status(200).json({ 
            message: 'Reservasi berhasil dibuat!', 
            id: docRef.id 
        });

    } catch (error) {
        console.error("Error creating reservation:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Jalankan Server
app.listen(PORT, () => {
    console.log(`Backend Monokrom berjalan aman di http://localhost:${PORT}`);
});