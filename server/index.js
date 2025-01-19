const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server, {
  cors: {
    origin: ["https://chatroom-gold.vercel.app"],
    methods: ["GET", "POST"],
  }
});

const cors = require('cors');
app.use(cors({
  origin: ['https://chatroom-gold.vercel.app'],
  methods: ['GET', 'POST'],
  credentials: true
}));

let waitingQueue = [];
const activeChats = new Map();
const userPeerIds = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinQueue', (peerId) => {
    if (!peerId) {
      console.error('Missing peerId for socket:', socket.id);
      return;
    }
    console.log('User joined queue:', peerId);
    userPeerIds.set(socket.id, peerId);
    leaveCurrentChat(socket.id);
    
    addToWaitingQueue({ socketId: socket.id, peerId, joinTime: Date.now() });
    tryMatchPeers();
  });

  socket.on('endChat', () => {
    handleEndChat(socket.id);
  });

  socket.on('next', () => {
    handleNext(socket.id);
  });

  socket.on('disconnect', () => {
    handleDisconnect(socket.id);
  });
});

function leaveCurrentChat(socketId) {
  for (const [chatId, chatPair] of activeChats.entries()) {
    if (chatPair.peer1.socketId === socketId || chatPair.peer2.socketId === socketId) {
      activeChats.delete(chatId);
      return chatPair.peer1.socketId === socketId ? chatPair.peer2 : chatPair.peer1;
    }
  }
  return null;
}

function addToWaitingQueue(peer) {
  waitingQueue.push(peer);
}

function removeFromWaitingQueue(socketId) {
  waitingQueue = waitingQueue.filter(peer => peer.socketId !== socketId);
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

  let availablePeers = [...waitingQueue];
  shuffleArray(availablePeers);

  const matchedPeers = new Set();
  const matches = [];

  for (let i = 0; i < availablePeers.length; i++) {
    if (matchedPeers.has(availablePeers[i].socketId)) continue;

    for (let j = i + 1; j < availablePeers.length; j++) {
      if (matchedPeers.has(availablePeers[j].socketId)) continue;

      matches.push([availablePeers[i], availablePeers[j]]);
      matchedPeers.add(availablePeers[i].socketId);
      matchedPeers.add(availablePeers[j].socketId);
      break;
    }
  }

  for (const [peer1, peer2] of matches) {
    removeFromWaitingQueue(peer1.socketId);
    removeFromWaitingQueue(peer2.socketId);

    const chatId = `${peer1.socketId}-${peer2.socketId}`;
    activeChats.set(chatId, { peer1, peer2 });

    console.log('Matching peers:', peer1.peerId, peer2.peerId);

    io.to(peer1.socketId).emit('peerMatch', peer2.peerId);
    io.to(peer2.socketId).emit('peerMatch', peer1.peerId);
  }
}

function handleEndChat(socketId) {
  console.log('Chat ended by:', socketId);
  const chatPartner = leaveCurrentChat(socketId);

  if (chatPartner) {
    requeueUsers(socketId, chatPartner.socketId);
    io.to(socketId).emit('chatEnded');
    io.to(chatPartner.socketId).emit('chatEnded');
    tryMatchPeers();
  }
}

function handleNext(socketId) {
  console.log('Next requested by:', socketId);
  const chatPartner = leaveCurrentChat(socketId);

  if (chatPartner) {
    requeueUsers(socketId, chatPartner.socketId);
    io.to(socketId).emit('searching');
    io.to(chatPartner.socketId).emit('partnerLeft');
    tryMatchPeers();
  }
}

function handleDisconnect(socketId) {
  console.log('User disconnected:', socketId);
  const chatPartner = leaveCurrentChat(socketId);

  if (chatPartner) {
    io.to(chatPartner.socketId).emit('partnerLeft');
    addToWaitingQueue({ socketId: chatPartner.socketId, peerId: userPeerIds.get(chatPartner.socketId), joinTime: Date.now() });
    tryMatchPeers();
  }
  removeFromWaitingQueue(socketId);
  userPeerIds.delete(socketId);
}

function requeueUsers(socketId1, socketId2) {
  const peerId1 = userPeerIds.get(socketId1);
  const peerId2 = userPeerIds.get(socketId2);

  addToWaitingQueue({ socketId: socketId1, peerId: peerId1, joinTime: Date.now() });
  addToWaitingQueue({ socketId: socketId2, peerId: peerId2, joinTime: Date.now() });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
