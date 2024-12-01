import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

const VideoChat = () => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isInQueue, setIsInQueue] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isChatActive, setIsChatActive] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerRef = useRef();
  const socketRef = useRef();
  const currentCallRef = useRef();
  const [peerId, setPeerId] = useState(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const initializePeerAndSocket = async () => {
      const io = (await import('socket.io-client')).default;
      const { default: Peer } = await import('peerjs');

      socketRef.current = io('https://chatroom-4671.vercel.app');
      
      socketRef.current.on('connect', () => {
        setSocketConnected(true);
      });

      const peer = new Peer();

      peer.on('open', (id) => {
        console.log('My peer ID is:', id);
        setPeerId(id);
      });

      peer.on('call', (call) => {
        currentCallRef.current = call;
        if (typeof window !== 'undefined' && navigator.mediaDevices) {
          navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
            setLocalStream(stream);
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
            }
            call.answer(stream);
            call.on('stream', (remoteStream) => {
              setRemoteStream(remoteStream);
              if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remoteStream;
              }
              setIsInQueue(false);
              setIsChatActive(true);
              setIsSearching(false);
            });
          });
        }
      });

      // Handle peer matching
      socketRef.current.on('peerMatch', (matchedPeerId) => {
        console.log('Matched with peer:', matchedPeerId);
        callPeer(matchedPeerId);
      });

      // Handle chat ended
      socketRef.current.on('chatEnded', () => {
        cleanupCurrentChat();
        setIsSearching(true);
      });

      // Handle partner left
      socketRef.current.on('partnerLeft', () => {
        cleanupCurrentChat();
        setIsSearching(true);
      });

      // Handle searching state
      socketRef.current.on('searching', () => {
        setIsSearching(true);
      });

      peerRef.current = peer;

      return () => {
        cleanupStreams();
        peer.destroy();
        socketRef.current.disconnect();
      };
    };

    initializePeerAndSocket();
  }, [isClient]);

  const cleanupStreams = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
      setRemoteStream(null);
    }
  };

  const cleanupCurrentChat = () => {
    if (currentCallRef.current) {
      currentCallRef.current.close();
      currentCallRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    setRemoteStream(null);
    setIsChatActive(false);
  };

  const joinQueue = async () => {
    if (!localStream && typeof window !== 'undefined' && navigator.mediaDevices) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing media devices:', error);
        return;
      }
    }
    
    setIsInQueue(true);
    setIsSearching(true);
    if (socketRef.current) {
      socketRef.current.emit('joinQueue', peerId);
    }
  };

  const leaveQueue = () => {
    setIsInQueue(false);
    setIsSearching(false);
    cleanupStreams();
  };

  const endChat = () => {
    if (socketRef.current) {
      socketRef.current.emit('endChat');
    }
    setIsSearching(true);
    cleanupCurrentChat();
  };

  const nextChat = () => {
    if (socketRef.current) {
      socketRef.current.emit('next');
    }
    cleanupCurrentChat();
    //setIsSearching(true);
  };

  const callPeer = (targetPeerId) => {
    if (typeof window !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        if (peerRef.current) {
          const call = peerRef.current.call(targetPeerId, stream);
          currentCallRef.current = call;
          call.on('stream', (remoteStream) => {
            setRemoteStream(remoteStream);
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
            }
            setIsInQueue(false);
            setIsChatActive(true);
            setIsSearching(false);
          });
        }
      });
    }
  };

  if (!isClient) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="relative w-full max-w-4xl bg-white p-4 rounded-lg shadow-lg">
        <div className="relative aspect-video">
          {remoteStream ? (
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full rounded-lg" />
          ) : (
            <div className="w-full h-full bg-gray-800 rounded-lg flex items-center justify-center">
              <p className="text-white text-xl">
                {isSearching ? "Searching for partner..." : "Start a chat to connect"}
              </p>
            </div>
          )}
          {localStream && (
            <div className="absolute top-4 right-4 w-1/4 aspect-video">
              <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full rounded-lg shadow-md" />
            </div>
          )}
        </div>
        
        <div className="mt-4 flex justify-center gap-4">
          {!localStream && !isInQueue && (
            <button
              onClick={joinQueue}
              className="px-6 py-3 text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Start Random Chat
            </button>
          )}
          {isInQueue && !isChatActive && (
            <button
              onClick={leaveQueue}
              className="px-6 py-3 text-white bg-yellow-500 rounded-lg hover:bg-yellow-600 transition-colors"
            >
              Leave Queue
            </button>
          )}
          {isChatActive && (
            <>
              <button
                onClick={nextChat}
                className="px-6 py-3 text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Next Chat
              </button>
              <button
                onClick={endChat}
                className="px-6 py-3 text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
              >
                End Chat
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default dynamic(() => Promise.resolve(VideoChat), {
  ssr: false
});