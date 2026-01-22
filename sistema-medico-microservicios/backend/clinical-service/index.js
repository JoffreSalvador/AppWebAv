const express = require('express');
const cors = require('cors');
const clinicalRoutes = require('./src/routes/clinicalRoutes');
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

const PORT = process.env.PORT || 3003;

app.use('/', clinicalRoutes);

app.listen(PORT, () => {
    console.log(`Clinical Service corriendo en http://localhost:${PORT}`);
});