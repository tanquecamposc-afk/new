// Servidor de retransmisión para el multijugador de Blockverse.
// Uso:  npm install ws  &&  node servidor-multijugador.js   (puerto 8080, o PORT=xxxx)
// En el juego: Multijugador → Servidor → wss://tu-dominio (o ws://IP:8080 en tu red local).
// Cada sala reenvía los mensajes de un jugador a todos los demás de la misma sala.
const { WebSocketServer } = require('ws');
const puerto = +process.env.PORT || 8080;
const wss = new WebSocketServer({ port: puerto });
const salas = new Map();
wss.on('connection', ws => {
  let sala = null;
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (m.unirse) {
      sala = String(m.unirse).slice(0, 16);
      if (!salas.has(sala)) salas.set(sala, new Set());
      salas.get(sala).add(ws);
      return;
    }
    if (!sala || typeof m.datos !== 'string' || m.datos.length > 2_000_000) return;
    for (const otro of salas.get(sala) || []) if (otro !== ws && otro.readyState === 1) otro.send(JSON.stringify({ datos: m.datos }));
  });
  ws.on('close', () => { if (sala && salas.has(sala)) { salas.get(sala).delete(ws); if (!salas.get(sala).size) salas.delete(sala); } });
});
console.log('Servidor de Blockverse escuchando en el puerto ' + puerto);
