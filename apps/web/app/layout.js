export const metadata = {
  title: 'TechPulse',
  description: 'Live tech intelligence dashboard powered by the TechPulse Worker aggregate API.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
