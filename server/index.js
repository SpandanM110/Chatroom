const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();

// Enable CORS for all routes
app.use(cors());

const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: 'https://chatroom-nine-sandy.vercel.app',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket'],
});

let waitingQueue = [];

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', () => {
    console.log('User joined:', socket.id);
    if (waitingQueue.length > 0) {
      console.log("Multiple users connected");
      const partner = waitingQueue.shift();
      socket.emit('paired', partner);
      socket.to(partner).emit('paired', socket.id);
    } else {
      console.log("Adding user to queue");
      waitingQueue.push(socket.id);
    }
  });

  socket.on('offer', (data) => {
    socket.to(data.to).emit('offer', { from: socket.id, offer: data.offer });
  });

  socket.on('answer', (data) => {
    socket.to(data.to).emit('answer', data.answer);
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