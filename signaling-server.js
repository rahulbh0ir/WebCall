
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3000 });
console.log("Server Online");

const clients = new Map();         // id -> ws
const rooms = new Map();           // roomName -> Set of ids




// Sending messages to all peers in a room except the sender

function broadcastToRoom(room, senderId, message) {
  const peers = rooms.get(room) || new Set();
  
  peers.forEach(id => {
    if (id !== senderId && clients.has(id)) {
      clients.get(id).send(JSON.stringify({ ...message, from: senderId }));
    }
  });
}


// Join a room and set up local media stream

wss.on('connection', (ws) => {

  let joinedRoom = null;
  const id = Math.random().toString(36).substr(2, 9);

  // Store the client connection
  clients.set(id, ws);
  
  console.log(`Client connected: ${id}`);

  
  
  // Handle incoming messages

  ws.on('message', (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch (e) {
      console.error("Invalid JSON", e);
      return;
    }

 
    const { type, room, payload } = data;


    if (type === 'join') {
      joinedRoom = room;

      if (!rooms.has(room)) rooms.set(room, new Set());

      rooms.get(room).add(id);
      console.log(`Client ${id} joined room ${room}`);
    }


    // relay offer/answer/ice to other peers in room

    if (['offer', 'answer', 'ice-candidate'].includes(type) && joinedRoom) {
      broadcastToRoom(joinedRoom, id, { type, payload });
    }

    if (type === 'leave' && joinedRoom) {
      broadcastToRoom(joinedRoom, id, { type: 'leave', payload: "Friend has left" });

      if (rooms.has(joinedRoom)) {
        rooms.get(joinedRoom).delete(id);
        if (rooms.get(joinedRoom).size === 0) {
          rooms.delete(joinedRoom);
        }
      }
      joinedRoom = null;
      
      console.log(`Client ${id} left room ${room}`);
    }
  });


  
  // Handling disconnection

  ws.on('close', () => {
    broadcastToRoom(joinedRoom, id, { type: 'leave', payload: "Friend has left" });
    clients.delete(id);
    
    if (joinedRoom && rooms.has(joinedRoom)) {
      rooms.get(joinedRoom).delete(id);
      if (rooms.get(joinedRoom).size === 0) {
        rooms.delete(joinedRoom);
      }
    }
    console.log(`Client disconnected: ${id}`);
  });

  ws.send(JSON.stringify({ type: 'welcome', id }));


});
