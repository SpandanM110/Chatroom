import Head from 'next/head';
import Script from 'next/script';
import VideoChat from '../components/VideoChat';

export default function Home() {
  return (
    <div
      className="
        min-h-screen
        flex
        flex-col
        bg-gradient-to-br
        from-black
        via-red-900
        to-black
        text-gray-100
      "
    >
      {/* Next.js Head */}
      <Head>
        <title>Co-megle</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* PeerJS Script */}
      <Script
        src="https://unpkg.com/peerjs@1.3.1/dist/peerjs.min.js"
        strategy="lazyOnload"
      />

      {/* Header */}
      <header
        className="
          relative
          z-10
          bg-black/60
          backdrop-blur-sm
          shadow-sm
        "
      >
        <div
          className="
            max-w-7xl
            mx-auto
            py-4
            px-4
            sm:py-6
            sm:px-6
            lg:px-8
          "
        >
          <h1
            className="
              text-2xl
              sm:text-3xl
              md:text-5xl
              font-bold
              leading-tight
            "
          >
            <span className="text-red-500">Co-megle</span>: Random Video Chats for College Students
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main
        className="
          flex-grow
          flex
          items-center
          justify-center
          py-6
          px-4
          sm:py-8
          sm:px-6
          lg:px-8
        "
      >
        <div
          className="
            max-w-5xl
            w-full
            space-y-6
            sm:space-y-8
            md:space-y-10
          "
        >
          {/* Video Chat Container */}
          <div
            className="
              bg-white/5
              backdrop-blur-md
              shadow-2xl
              rounded-lg
              p-4
              sm:p-6
              md:p-8
            "
          >
            <VideoChat />
          </div>
        </div>
      </main>

      {/* Footer (Optional) */}
      <footer
        className="
          bg-black/60
          backdrop-blur-sm
          py-4
          text-center
          text-sm
        "
      >
        <p className="text-gray-400">
          &copy; {new Date().getFullYear()} Co-megle. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
