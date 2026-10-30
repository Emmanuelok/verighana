import type { Metadata } from "next";
import "./globals.css";
import "./redesign.css";
import "./readability.css";
import "./service-gallery.css";

export const metadata: Metadata = {
  metadataBase: new URL('https://verighana-two.vercel.app'),
  title: "Veridanth Research Ghana — Big questions. Brighter futures.",
  description: "Explore 100 research services for students, academics, government, public and private institutions, schools, universities, businesses and NGOs. Clear scopes, Ghana cedi planning rates and a personal research desk.",
  openGraph: {
    title: 'Veridanth Research Ghana — Big questions. Brighter futures.',
    description: 'Research support for every ambition. Rooted in Ghana. Thinking beyond boundaries.',
    images: [{url:'/media/og-veridanth.jpg',width:1200,height:630,alt:'Veridanth Research Ghana — Big questions. Brighter futures.'}],
    type:'website',
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
