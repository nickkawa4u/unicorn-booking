export const metadata = { title: 'Unicorn Badminton' };
export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
