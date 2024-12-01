const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server, {
  cors: {
    origin: "https://chatroom-nine-sandy.vercel.app",
    methods: ["GET", "POST"],
  }
});

const cors = require('cors');
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  credentials: true
}));

// Using arrays instead of Set for better random access
let waitingQueue = [];
const activeChats = new Map();
const userPeerIds = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinQueue', (peerId) => {
    console.log('User joined queue:', peerId);
    userPeerIds.set(socket.id, peerId);
    leaveCurrentChat(socket.id);
    
    // Add user to waiting queue with timestamp for FIFO consideration
    waitingQueue.push({
      socketId: socket.id,
      peerId,
      joinTime: Date.now()
    });
    
    tryMatchPeers();
  });

  // Rest of the socket event handlers remain the same
  socket.on('endChat', () => {
    console.log('Chat ended by:', socket.id);
    const chatPartner = leaveCurrentChat(socket.id);
    
    if (chatPartner) {
      const currentPeerId = userPeerIds.get(socket.id);
      waitingQueue.push({
        socketId: socket.id,
        peerId: currentPeerId,
        joinTime: Date.now()
      });
      waitingQueue.push({
        socketId: chatPartner.socketId,
        peerId: chatPartner.peerId,
        joinTime: Date.now()
      });
      
      io.to(socket.id).emit('chatEnded');
      io.to(chatPartner.socketId).emit('chatEnded');
      
      tryMatchPeers();
    }
  });

  socket.on('next', () => {
    console.log('Next requested by:', socket.id);
    const chatPartner = leaveCurrentChat(socket.id);
    
    if (chatPartner) {
      const currentPeerId = userPeerIds.get(socket.id);
      waitingQueue.push({
        socketId: socket.id,
        peerId: currentPeerId,
        joinTime: Date.now()
      });
      waitingQueue.push({
        socketId: chatPartner.socketId,
        peerId: chatPartner.peerId,
        joinTime: Date.now()
      });
      
      io.to(socket.id).emit('searching');
      io.to(chatPartner.socketId).emit('partnerLeft');
      
      tryMatchPeers();
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const chatPartner = leaveCurrentChat(socket.id);
    if (chatPartner) {
      io.to(chatPartner.socketId).emit('partnerLeft');
      waitingQueue.push({
        socketId: chatPartner.socketId,
        peerId: chatPartner.peerId,
        joinTime: Date.now()
      });
      tryMatchPeers();
    }
    // Remove disconnected user from waiting queue
    waitingQueue = waitingQueue.filter(peer => peer.socketId !== socket.id);
    userPeerIds.delete(socket.id);
  });
});

function leaveCurrentChat(socketId) {
  for (const [key, value] of activeChats.entries()) {
    if (value.peer1.socketId === socketId || value.peer2.socketId === socketId) {
      const chatPair = activeChats.get(key);
      activeChats.delete(key);
      return chatPair.peer1.socketId === socketId ? chatPair.peer2 : chatPair.peer1;
    }
  }
  return null;
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function tryMatchPeers() {
  if (waitingQueue.length < 2) return;

  // Create a copy of the waiting queue and shuffle it
  let availablePeers = [...waitingQueue];
  shuffleArray(availablePeers);

  // Track which peers have been matched
  const matchedPeers = new Set();
  const matches = [];

  // Match peers randomly while considering waiting time
  for (let i = 0; i < availablePeers.length; i++) {
    if (matchedPeers.has(availablePeers[i].socketId)) continue;

    for (let j = i + 1; j < availablePeers.length; j++) {
      if (matchedPeers.has(availablePeers[j].socketId)) continue;

      // Match these peers
      matches.push([availablePeers[i], availablePeers[j]]);
      matchedPeers.add(availablePeers[i].socketId);
      matchedPeers.add(availablePeers[j].socketId);
      break;
    }
  }

  // Process all matches
  for (const [peer1, peer2] of matches) {
    // Remove matched peers from waiting queue
    waitingQueue = waitingQueue.filter(
      peer => peer.socketId !== peer1.socketId && peer.socketId !== peer2.socketId
    );

    const chatId = `${peer1.socketId}-${peer2.socketId}`;
    activeChats.set(chatId, { peer1, peer2 });

    console.log('Matching peers:', peer1.peerId, peer2.peerId);
    io.to(peer1.socketId).emit('peerMatch', peer2.peerId);
    io.to(peer2.socketId).emit('peerMatch', peer1.peerId);
  }
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});