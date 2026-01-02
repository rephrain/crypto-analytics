import './globals.css';

export const metadata = {
  title: 'CryptoMetrics - Real-Time Crypto Market Analytics Dashboard',
  description: 'A Data Engineering portfolio project demonstrating ETL pipelines, real-time data processing, and interactive analytics visualization for cryptocurrency markets.',
  keywords: ['cryptocurrency', 'analytics', 'dashboard', 'data engineering', 'ETL', 'real-time', 'bitcoin', 'ethereum'],
  authors: [{ name: 'Data Engineer Portfolio' }],
  openGraph: {
    title: 'CryptoMetrics - Real-Time Crypto Market Analytics',
    description: 'Live cryptocurrency market analytics with real-time data pipeline',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
