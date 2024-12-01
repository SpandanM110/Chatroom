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

let connectedUsers = [];

const getRandomPair = () => {
  const randomIndex1 = Math.floor(Math.random() * connectedUsers.length);
  let randomIndex2 = Math.floor(Math.random() * connectedUsers.length);

  while (randomIndex1 === randomIndex2) {
    randomIndex2 = Math.floor(Math.random() * connectedUsers.length);
  }

  const user1 = connectedUsers[randomIndex1];
  const user2 = connectedUsers[randomIndex2];

  return [user1, user2];
};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', () => {
    console.log('User joined:', socket.id);
    connectedUsers.push(socket.id);

    if (connectedUsers.length >= 2) {
      const [user1, user2] = getRandomPair();
      io.to(user1).emit('paired', user2);
      io.to(user2).emit('paired', user1);
    }
  });

  socket.on('offer', (data) => {
    socket.to(data.to).emit('offer', { from: socket.id, offer: data.offer });
  });

  socket.on('answer', (data) => {
    socket.to(data.to).emit('answer', data.answer);
  });

  socket.on('leave', () => {
    console.log('User left:', socket.id);
    const index = connectedUsers.indexOf(socket.id);
    if (index !== -1) {
      connectedUsers.splice(index, 1);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const index = connectedUsers.indexOf(socket.id);
    if (index !== -1) {
      connectedUsers.splice(index, 1);
    }
  });
});

const port = process.env.PORT || 5000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});