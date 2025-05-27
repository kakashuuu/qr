const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const fs = require('fs');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const SESSION_FOLDER = './session';

app.use(express.static(path.join(__dirname, 'public')));

wss.on('connection', async (ws) => {
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_FOLDER);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async ({ connection, qr }) => {
        if (qr) {
            const qrImageUrl = await QRCode.toDataURL(qr);
            ws.send(JSON.stringify({ qr: qrImageUrl }));
        }

        if (connection === 'open') {
            ws.send(JSON.stringify({ status: 'connected' }));
            sock.end();
        }

        if (connection === 'close') {
            ws.send(JSON.stringify({ status: 'disconnected' }));
        }
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

server.listen(3000, () => {
    console.log('QR Code session server running at http://localhost:3000');
});
