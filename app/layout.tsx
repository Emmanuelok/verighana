import type { Metadata, Viewport } from "next";
import {brand} from "../lib/brand";
import "./globals.css";
import "./redesign.css";
import "./readability.css";
import "./service-gallery.css";
import "./brand.css";
import "./mobile-navigation.css";
import "./workspace.css";
import "./bundles.css";
import "./operations.css";
import "./account.css";
import "./research-editorial.css";
import "./desk-editorial.css";
import "./signature.css";
import "./studio-system.css";
import "./studio-home.css";
import "./studio-catalogue.css";
import "./studio-editorial.css";
import "./studio-desks.css";
import {ResearchProvider} from "../components/research-context";
import {StudioHeader, StudioFooter} from "../components/studio-shell";
import {PwaExperience} from "../components/pwa-experience";

export const viewport: Viewport = {width:'device-width',initialScale:1,viewportFit:'cover',themeColor:brand.theme};
export const metadata: Metadata = {
  metadataBase: new URL('https://fvsignature.com'),
  applicationName: brand.name,
  title: 'Fullview Signature by Veridanth Group | Independent Research Studio',
  description: brand.description,
  manifest: '/manifest.webmanifest',
  appleWebApp: {capable:true,title:'Fullview',statusBarStyle:'default'},
  openGraph: {
    siteName: brand.title,
    title: brand.title,
    description: brand.description,
    images: [{url:'/brand/optical-studio-share.jpg',width:1200,height:630,alt:'Fullview Signature by Veridanth Group — Independent research studio'}],
    type:'website',
  },
  twitter: {card:'summary_large_image',title:brand.title,description:brand.description,images:['/brand/optical-studio-share.jpg']},
  icons: {
    icon: [{url:'/favicon.svg?v=mono-v8',type:'image/svg+xml'},{url:'/favicon.ico?v=mono-v8',sizes:'any'}],
    shortcut: '/favicon.ico?v=mono-v8',
    apple: [{url:'/brand/apple-touch-icon.png?v=mono-v8',sizes:'180x180'}],
  },
};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body className="antialiased st-app"><ResearchProvider>
    <a className="st-skip" href="#studio-content">Skip to content</a><StudioHeader/>
    <div id="studio-content" tabIndex={-1}>{children}</div><PwaExperience/><StudioFooter/>
  </ResearchProvider></body></html>;
}
