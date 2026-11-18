'use client';
import {RefreshCw} from 'lucide-react';
export default function ErrorPage({reset}:{reset:()=>void}) {
  return <main className="st-recovery"><h1>This page couldn’t load.</h1><p>Try loading the page again, or get in touch with the studio.</p><button onClick={reset}>Try again <RefreshCw size={18}/></button><a href="/contact">Contact Fullview</a></main>;
}
