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

const waitingQueue = new Set();
const activeChats = new Map();
const userPeerIds = new Map(); // Store peerIds for each socket

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('joinQueue', (peerId) => {
    console.log('User joined queue:', peerId);
    userPeerIds.set(socket.id, peerId); // Store peerId
    leaveCurrentChat(socket.id);
    waitingQueue.add({ socketId: socket.id, peerId });
    tryMatchPeers();
  });

  socket.on('endChat', () => {
    console.log('Chat ended by:', socket.id);
    const chatPartner = leaveCurrentChat(socket.id);
    
    if (chatPartner) {
      const currentPeerId = userPeerIds.get(socket.id);
      waitingQueue.add({ socketId: socket.id, peerId: currentPeerId });
      waitingQueue.add({ socketId: chatPartner.socketId, peerId: chatPartner.peerId });


      
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
      // Add both users back to queue with their stored peerIds
      waitingQueue.add({ socketId: socket.id, peerId: currentPeerId });
      waitingQueue.add({ socketId: chatPartner.socketId, peerId: chatPartner.peerId });
      
      io.to(socket.id).emit('searching');
      io.to(chatPartner.socketId).emit('partnerLeft');
      
      // Immediate attempt to match
      tryMatchPeers();
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const chatPartner = leaveCurrentChat(socket.id);
    if (chatPartner) {
      io.to(chatPartner.socketId).emit('partnerLeft');
      waitingQueue.add({ 
        socketId: chatPartner.socketId, 
        peerId: chatPartner.peerId 
      });
      tryMatchPeers();
    }
    // Clean up from all data structures
    waitingQueue.forEach(peer => {
      if (peer.socketId === socket.id) {
        waitingQueue.delete(peer);
      }
    });
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

function tryMatchPeers() {
  if (waitingQueue.size >= 2) {
    const peers = Array.from(waitingQueue);
    const randomIndex = Math.floor(Math.random(0,peers.length));
    const peer1 = peers[randomIndex];
    
    // Find a different peer for matching
    let peer2;
    do {
      const randomPeer2Index = Math.floor(Math.random(0,peers.length));
      peer2 = peers[randomPeer2Index];
    } while (peer2.socketId === peer1.socketId);
    
    waitingQueue.delete(peer1);
    waitingQueue.delete(peer2);
    
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