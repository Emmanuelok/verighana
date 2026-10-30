import type { Metadata, Viewport } from "next";
import {brand} from "../lib/brand";
import "./globals.css";
import "./redesign.css";
import "./readability.css";
import "./service-gallery.css";
import "./brand.css";

export const viewport: Viewport = {width:'device-width',initialScale:1,themeColor:brand.theme};
export const metadata: Metadata = {
  metadataBase: new URL('https://verighana-two.vercel.app'),
  applicationName: brand.name,
  title: 'Fullview Signature — by Veridanth | Research. In full view.',
  description: brand.description,
  manifest: '/manifest.webmanifest',
  appleWebApp: {capable:true,title:'Fullview',statusBarStyle:'default'},
  openGraph: {
    siteName: brand.title,
    title: brand.title,
    description: brand.description,
    images: [{url:'/brand/og-fullview-signature.png',width:1200,height:630,alt:'Fullview Signature — by Veridanth. Research. In full view.'}],
    type:'website',
  },
  twitter: {card:'summary_large_image',title:brand.title,description:brand.description,images:['/brand/og-fullview-signature.png']},
  icons: {
    icon: [{url:'/favicon.svg',type:'image/svg+xml'},{url:'/favicon.ico',sizes:'any'}],
    shortcut: '/favicon.ico',
    apple: [{url:'/brand/apple-touch-icon.png',sizes:'180x180'}],
  },
};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body className="antialiased">{children}</body></html>;
}
