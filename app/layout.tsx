import type { Metadata, Viewport } from "next";
import {brand} from "../lib/brand";
import "./globals.css";
import "./redesign.css";
import "./readability.css";
import "./service-gallery.css";
import "./brand.css";

export const viewport: Viewport = {width:'device-width',initialScale:1,themeColor:brand.theme};
export const metadata: Metadata = {
  metadataBase: new URL('https://fvsignature.com'),
  applicationName: brand.name,
  title: 'Fullview Signature — by Avalon Group | Research. In full view.',
  description: brand.description,
  manifest: '/manifest.webmanifest',
  appleWebApp: {capable:true,title:'Fullview',statusBarStyle:'default'},
  openGraph: {
    siteName: brand.title,
    title: brand.title,
    description: brand.description,
    images: [{url:'/brand/og-fullview-signature.png?v=perspective-4',width:1200,height:630,alt:'Fullview Signature — by Avalon Group. Research. In full view.'}],
    type:'website',
  },
  twitter: {card:'summary_large_image',title:brand.title,description:brand.description,images:['/brand/og-fullview-signature.png?v=perspective-4']},
  icons: {
    icon: [{url:'/favicon.svg?v=perspective-4',type:'image/svg+xml'},{url:'/favicon.ico?v=perspective-4',sizes:'any'}],
    shortcut: '/favicon.ico?v=perspective-4',
    apple: [{url:'/brand/apple-touch-icon.png?v=perspective-4',sizes:'180x180'}],
  },
};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body className="antialiased">{children}</body></html>;
}
