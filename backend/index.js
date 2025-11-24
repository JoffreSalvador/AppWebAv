// Archivo: backend/index.js
const express = require('express');
const WebSocket = require('ws');
const path = require('path'); // Importamos path para manejar rutas

const app = express();
const port = 3000;

// Servir archivos estáticos
// AQUI ESTÁ EL CAMBIO: Le decimos que busque en la carpeta '../frontend'
app.use(express.static(path.join(__dirname, '../frontend')));

// Crear servidor HTTP
const server = app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
});

// Crear servidor WebSocket
const wss = new WebSocket.Server({ server });

// Almacenar conexiones activas
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('Cliente conectado. Total:', clients.size);

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      
      // Reenviar mensaje a todos los clientes conectados
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            username: message.username,
            text: message.text,
            timestamp: new Date().toLocaleTimeString()
          }));
        }
      });
    } catch (error) {
      console.error('Error procesando mensaje:', error);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log('Cliente desconectado. Total:', clients.size);
  });

  ws.on('error', (error) => {
    console.error('Error WebSocket:', error);
    clients.delete(ws);
  });
});