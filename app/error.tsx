'use client';
import {ArrowRight} from 'lucide-react';
import {FieldHeader, FieldFooter} from '../components/field-shell';

export default function ErrorPage({reset}:{reset:()=>void}) {
  return <div className="site-shell"><a className="skip-link" href="#main">Skip to content</a>
    <FieldHeader current=""/><main id="main" className="field-recovery">
      <small>Fullview Signature</small><h1>A brief interruption.</h1>
      <p>We couldn’t load this page. Try reopening it here.</p>
      <button onClick={reset}>Try again <ArrowRight size={17}/></button>
    </main><FieldFooter/></div>;
}
