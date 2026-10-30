'use client';

import {useEffect, useRef, useState} from 'react';
import {Download} from 'lucide-react';

/** Mount with a key derived from the document inputs so changed scope clears old files. */
export function PdfDownload({createPdf, filename, label, className = 'button outline full', disabled = false}: {
  createPdf: () => Promise<Uint8Array>;
  filename: string;
  label: string;
  className?: string;
  disabled?: boolean;
}) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const currentUrl = useRef('');
  const mounted = useRef(false);
  const saveLink = useRef<HTMLAnchorElement>(null);
  useEffect(() => { if (url) saveLink.current?.focus(); }, [url]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
    };
  }, []);
  async function prepare() {
    if (busy || disabled) return;
    setBusy(true); setError('');
    try {
      const bytes = await createPdf();
      if (!mounted.current) return;
      const nextUrl = URL.createObjectURL(new Blob([new Uint8Array(bytes)], {type: 'application/pdf'}));
      if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
      currentUrl.current = nextUrl;
      setUrl(nextUrl);
    } catch {
      if (mounted.current) setError('The PDF could not be prepared. Please try again while online. Your selections are still here.');
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  return <div className="pdf-download">
    {url && !disabled ? <><a ref={saveLink} className={className} href={url} download={filename}><Download size={17}/>Save PDF</a><p className="fine-print" role="status">Your PDF is ready. Select Save PDF to keep a copy. Nothing has been sent or booked.</p></> :
      <button type="button" className={className} onClick={() => void prepare()} disabled={busy || disabled} aria-busy={busy}><Download size={17}/>{busy ? 'Preparing PDF…' : label}</button>}
    {error && <p className="muted-info" role="alert">{error}</p>}
  </div>;
}
