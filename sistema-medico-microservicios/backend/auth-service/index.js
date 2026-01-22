// backend/auth-service/index.js
const express = require('express');
const cors = require('cors');
// Importar rutas
const authRoutes = require('./src/routes/authRoutes'); 

require('dotenv').config();

const app = express();

// --- CONFIGURACIÓN SEGURA DE CORS ---
const corsOptions = {
    // Solo permitimos peticiones desde nuestro gateway y agregamos el puerto 5173 (Frontend) 
    // para asegurar que el navegador acepte la respuesta
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 
            'http://localhost:5173', 'http://127.0.0.1:5173'], 
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Solo métodos necesarios
    allowedHeaders: ['Content-Type', 'Authorization'], // Solo cabeceras permitidas
    credentials: true // Si se usan cookies o sesiones
};

app.use(cors(corsOptions));

app.use(express.json());

const PORT = process.env.PORT || 3001;

// Usar las rutas
app.use('/', authRoutes); // Quedará como POST /register y POST /login

// Endpoint de salud
app.get('/ping', (req, res) => res.send('Auth Service OK'));

app.listen(PORT, () => {
    console.log(`Auth Service corriendo en http://localhost:${PORT}`);
});