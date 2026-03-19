import { Head, Html, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.6.0/dist/css/bootstrap.min.css"
          integrity="sha384-MmXA1YB9tQdx5T8pE0lz3KxUp7GP2F1vY0p1Ncs3wFs9z3zx1RX1pNQ03+JwQ8gB"
          crossOrigin="anonymous"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
