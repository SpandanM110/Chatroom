import Head from 'next/head';
import Script from 'next/script';
import VideoChat from '../components/VideoChat';

const Home = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>Random Video Chat</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Script 
        src="https://unpkg.com/peerjs@1.3.1/dist/peerjs.min.js" 
        strategy="lazyOnload" 
      />
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold leading-tight text-gray-900">Random Video Chat</h1>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <VideoChat />
        </div>
      </main>
    </div>
  );
};

export default Home;
