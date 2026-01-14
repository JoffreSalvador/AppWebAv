const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const chatRepo = require('./src/repositories/chatRepository');
require('dotenv').config();

const app = express();
app.use(cors());

// Creamos un servidor HTTP básico (necesario para montar WS)
const server = http.createServer(app);

// Creamos el servidor de WebSockets
const wss = new WebSocket.Server({ server });

// Lista de clientes conectados
const clients = new Set();

wss.on('connection', async (ws) => {
    console.log('Cliente conectado al chat');
    clients.add(ws);

    // 1. Al conectar, enviarle el historial de mensajes guardados
    const history = await chatRepo.getRecentMessages();
    history.forEach(msg => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(msg));
        }
    });

    // 2. Escuchar mensajes nuevos de este cliente
    ws.on('message', async (message) => {
        try {
            // El mensaje viene como Buffer o String, lo parseamos
            const parsedData = JSON.parse(message);
            
            // Agregamos timestamp
            const msgToSend = {
                ...parsedData,
                timestamp: new Date().toLocaleTimeString()
            };

            // A. Guardar en Base de Datos (Asíncrono, no bloqueamos el envío)
            chatRepo.saveMessage(msgToSend);

            // B. Reenviar (Broadcast) a TODOS los clientes conectados
            clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(msgToSend));
                }
            });

        } catch (err) {
            console.error('Error procesando mensaje:', err);
        }
    });

    // 3. Manejar desconexión
    ws.on('close', () => {
        console.log('Cliente desconectado');
        clients.delete(ws);
    });
});

const PORT = process.env.PORT || 3004;

// ¡OJO! Usamos server.listen, no app.listen
server.listen(PORT, () => {
    console.log(`Chat Service (WebSocket) corriendo en http://localhost:${PORT}`);
});