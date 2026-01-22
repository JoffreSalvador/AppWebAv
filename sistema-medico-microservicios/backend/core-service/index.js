const express = require('express');
const cors = require('cors');
const profileRoutes = require('./src/routes/profileRoutes');
require('dotenv').config();

const app = express();
// --- CONFIGURACIÓN SEGURA DE CORS ---
const corsOptions = {
    origin: [
        'http://localhost:3000', 'http://127.0.0.1:3000', // Gateway
        'http://localhost:5173', 'http://127.0.0.1:5173'  // Frontend
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

const PORT = process.env.PORT || 3002;

app.use('/', profileRoutes);

app.listen(PORT, () => {
    console.log(`Core Service corriendo en http://localhost:${PORT}`);
});