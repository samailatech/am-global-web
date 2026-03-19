import { useEffect, useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { SessionProvider } from 'next-auth/react';
import logoImage from '../public/images/logo.jpg';
import loadingLogo from '../public/images/logo1.jpg';
import '../styles/globals.css';

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const finishLoading = () => {
      window.setTimeout(() => setIsLoading(false), 900);
    };

    if (document.readyState === 'complete') {
      finishLoading();
      return undefined;
    }

    window.addEventListener('load', finishLoading);

    return () => window.removeEventListener('load', finishLoading);
  }, []);

  return (
    <SessionProvider session={session}>
      <>
        <Head>
          <link rel="icon" href={logoImage.src} />
        </Head>
        {isLoading ? (
          <div className="app-loader" aria-label="Loading AM Global Data">
            <div className="app-loader__ring">
              <div className="app-loader__image-wrap">
                <Image src={loadingLogo} alt="AM Global Data logo" priority />
              </div>
            </div>
          </div>
        ) : (
          <Component {...pageProps} />
        )}
      </>
    </SessionProvider>
  );
}
