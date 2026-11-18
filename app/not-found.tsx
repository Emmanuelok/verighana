import {ArrowRight} from 'lucide-react';
import {FieldHeader, FieldFooter} from '../components/field-shell';

export default function NotFound() {
  return <div className="site-shell"><a className="skip-link" href="#main">Skip to content</a>
    <FieldHeader current=""/><main id="main" className="field-recovery">
      <small>404 / Page unavailable</small><h1>Page not found.</h1>
      <p>Explore the service catalogue or use the menu to find your research desk.</p>
      <a href="/services">Browse services <ArrowRight size={17}/></a>
    </main><FieldFooter/></div>;
}
