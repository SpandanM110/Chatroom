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

      socketRef.current = io('https://chatroom-production-f787.up.railway.app');
      
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
    <div
      className="
        min-h-screen 
        flex 
        items-center 
        justify-center 
        bg-gradient-to-br 
        from-black 
        to-gray-900 
        p-4
      "
    >
      {/* Main Card Container */}
      <div
        className="
          w-full 
          max-w-4xl 
          bg-black/80 
          rounded-lg 
          shadow-2xl 
          p-6 
          sm:p-8 
          md:p-10
        "
      >
        {/* Remote Video / Placeholder */}
        <div className="relative aspect-video w-full">
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full rounded-lg object-cover"
            />
          ) : (
            <div
              className="
                w-full 
                h-full 
                bg-gray-800 
                rounded-lg 
                flex 
                items-center 
                justify-center
              "
            >
              <p className="text-white text-base sm:text-lg md:text-xl">
                {isSearching
                  ? "Searching for partner..."
                  : "Start a chat to connect"}
              </p>
            </div>
          )}
  
          {localStream && (
            <div
              className="
                absolute 
                top-3 
                right-3 
                w-1/4 
                md:w-1/5 
                aspect-video 
                rounded-lg 
                overflow-hidden 
                shadow-md
              "
            >
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
  
        {/* Button Controls */}
        <div
          className="
            mt-6 
            flex 
            flex-wrap 
            justify-center 
            gap-4
          "
        >
          {/* Not started or in queue */}
          {!localStream && !isInQueue && (
            <button
              onClick={joinQueue}
              className="
                px-6 
                py-3 
                bg-blue-500 
                rounded-lg 
                text-white 
                hover:bg-blue-600 
                transition-colors 
                font-semibold
              "
            >
              Start Random Chat
            </button>
          )}
  
          {/* In queue but not yet in a chat */}
          {isInQueue && !isChatActive && (
            <button
              onClick={leaveQueue}
              className="
                px-6 
                py-3 
                bg-yellow-500 
                rounded-lg 
                text-white 
                hover:bg-yellow-600 
                transition-colors 
                font-semibold
              "
            >
              Leave Queue
            </button>
          )}
  
          {/* Chat is active: show Next & End buttons */}
          {isChatActive && (
            <>
              <button
                onClick={nextChat}
                className="
                  px-6 
                  py-3 
                  bg-blue-500 
                  rounded-lg 
                  text-white 
                  hover:bg-blue-600 
                  transition-colors 
                  font-semibold
                "
              >
                Next Chat
              </button>
              <button
                onClick={endChat}
                className="
                  px-6 
                  py-3 
                  bg-red-500 
                  rounded-lg 
                  text-white 
                  hover:bg-red-600 
                  transition-colors 
                  font-semibold
                "
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