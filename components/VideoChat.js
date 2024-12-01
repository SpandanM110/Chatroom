import { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
import io from 'socket.io-client';

const VideoChat = () => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peerId, setPeerId] = useState('');
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const socketRef = useRef();
  const peerRef = useRef();

  useEffect(() => {
    socketRef.current = io('https://chatroom-zutt.onrender.com', {
      transports: ['websocket'],
    });

    const peer = new Peer();
    peerRef.current = peer;

    peer.on('open', (id) => {
      setPeerId(id);
      socketRef.current.emit('join', id);
    });

    peer.on('call', (call) => {
      call.answer(localStream);
      call.on('stream', (stream) => {
        setRemoteStream(stream);
        remoteVideoRef.current.srcObject = stream;
        console.log("remote connected");
      });
    });

    return () => {
      socketRef.current.disconnect();
      peer.destroy();
    };
  }, []);

  useEffect(() => {
    if (localStream && socketRef.current) {
      socketRef.current.on('paired', (partnerId) => {
        const call = peerRef.current.call(partnerId, localStream);
        call.on('stream', (stream) => {
          setRemoteStream(stream);
          console.log("local connected");
          remoteVideoRef.current.srcObject = stream;
        });
      });
    }
  }, [localStream]);

  const startChat = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    setLocalStream(stream);
    localVideoRef.current.srcObject = stream;
  };

  const nextChat = () => {
    setRemoteStream(null);
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = new Peer();
      setPeerId('');
      socketRef.current.emit('join');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="relative w-full max-w-4xl">
        <video ref={localVideoRef} autoPlay muted playsInline className="absolute top-0 right-0 w-40 h-40 m-4 rounded shadow" />
        <video ref={remoteVideoRef} autoPlay playsInline className="w-full rounded shadow" />
      </div>
      <div className="mt-8">
        {!localStream && (
          <button
            onClick={startChat}
            className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600"
          >
            Start Chat
          </button>
        )}
        {remoteStream && (
          <button
            onClick={nextChat}
            className="px-4 py-2 text-white bg-green-500 rounded hover:bg-green-600"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
};

export default VideoChat;