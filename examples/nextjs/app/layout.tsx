export const metadata = { title: 'banklogos — Next.js example' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, padding: 24, background: '#f7f7f5' }}>
        {children}
      </body>
    </html>
  );
}
