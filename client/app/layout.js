export const metadata = { title: 'AI Resume Matcher', description: 'Match your resume to any job with LLMs and vector search' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, background: '#f6f7f9', color: '#1a1d21' }}>
        <main style={{ maxWidth: 860, margin: '0 auto', padding: 24 }}>{children}</main>
      </body>
    </html>
  );
}
