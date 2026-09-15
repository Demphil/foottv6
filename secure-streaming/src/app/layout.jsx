import "./style.css";

export const metadata = {
  title: "KoraLive Secure Player",
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
