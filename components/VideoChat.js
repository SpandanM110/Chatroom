import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const VideoChat = () => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const socketRef = useRef();
  const peerConnectionRef = useRef();

  useEffect(() => {
    socketRef.current = io('https://chatroom-zutt.onrender.com', {
      transports: ['websocket'],
    });

    socketRef.current.on('paired', async (partnerId) => {
      console.log('Paired with:', partnerId);
      const peerConnection = new RTCPeerConnection();
      peerConnectionRef.current = peerConnection;

      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });

      peerConnection.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      socketRef.current.emit('offer', { to: partnerId, offer });
    });

    socketRef.current.on('offer', async (data) => {
      const peerConnection = new RTCPeerConnection();
      peerConnectionRef.current = peerConnection;

      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });

      peerConnection.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };

      await peerConnection.setRemoteDescription(data.offer);

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      socketRef.current.emit('answer', { to: data.from, answer });
    });

    socketRef.current.on('answer', async (data) => {
      await peerConnectionRef.current.setRemoteDescription(data.answer);
    });

    socketRef.current.on('disconnect', () => {
      setRemoteStream(null);
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [localStream]);

  const startChat = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    setLocalStream(stream);
    localVideoRef.current.srcObject = stream;
    socketRef.current.emit('join');
  };

  const nextChat = () => {
    setRemoteStream(null);
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    socketRef.current.emit('join');
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