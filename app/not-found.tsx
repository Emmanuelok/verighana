import {ArrowRight} from 'lucide-react';
export default function NotFound() {
  return <main className="st-recovery"><small>404</small><h1>Page not found.</h1><p>Find a research service or return to the studio.</p><a href="/services">Explore services <ArrowRight size={18}/></a><a href="/">Back to Fullview</a></main>;
}
