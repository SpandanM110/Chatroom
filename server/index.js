const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

let waitingQueue = [];

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (peerId) => {
    console.log('User joined with peer ID:', peerId);
    if (waitingQueue.length > 0) {
      const partner = waitingQueue.shift();
      socket.emit('paired', partner);
      socket.to(partner).emit('paired', peerId);
    } else {
      waitingQueue.push(peerId);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const index = waitingQueue.indexOf(socket.id);
    if (index !== -1) {
      waitingQueue.splice(index, 1);
    }
  });
});

const port = process.env.PORT || 5000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});