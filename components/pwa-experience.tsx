'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowRight, Check, RefreshCw, WifiOff } from 'lucide-react';
import { Dialog } from './research-context';

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export function PwaExperience() {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [instructions, setInstructions] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [offline, setOffline] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [update, setUpdate] = useState<ServiceWorkerRegistration | null>(null);
  const [updating, setUpdating] = useState(false);
  const applyUpdate = useRef(false);

  useEffect(() => {
    const displayMode = window.matchMedia('(display-mode: standalone)');
    const installed = () => setStandalone(displayMode.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    const connectivity = () => setOffline(!navigator.onLine);
    const prompt = (event: Event) => { event.preventDefault(); setInstallEvent(event as InstallEvent); };
    const onInstalled = () => { setStandalone(true); setInstallEvent(null); setInstructions(false); };
    installed(); connectivity();
    setIsIos(/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
    displayMode.addEventListener('change', installed);
    window.addEventListener('online', connectivity);
    window.addEventListener('offline', connectivity);
    window.addEventListener('beforeinstallprompt', prompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      displayMode.removeEventListener('change', installed);
      window.removeEventListener('online', connectivity);
      window.removeEventListener('offline', connectivity);
      window.removeEventListener('beforeinstallprompt', prompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    let alive = true;
    const cleanup: Array<() => void> = [];
    const controllerChanged = () => { if (applyUpdate.current) window.location.reload(); };
    navigator.serviceWorker.addEventListener('controllerchange', controllerChanged);
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).then(registration => {
      if (!alive) return;
      navigator.serviceWorker.ready.then(() => { if (alive) setOfflineReady(true); });
      if (registration.waiting) setUpdate(registration);
      const onUpdate = () => {
        const worker = registration.installing;
        if (!worker) return;
        const onState = () => {
          if (alive && worker.state === 'installed' && navigator.serviceWorker.controller) setUpdate(registration);
        };
        worker.addEventListener('statechange', onState);
        cleanup.push(() => worker.removeEventListener('statechange', onState));
      };
      registration.addEventListener('updatefound', onUpdate);
      cleanup.push(() => registration.removeEventListener('updatefound', onUpdate));
      onUpdate();
    }).catch(() => { if (alive) setOfflineReady(false); });
    return () => { alive = false; cleanup.forEach(fn => fn()); navigator.serviceWorker.removeEventListener('controllerchange', controllerChanged); };
  }, []);

  async function install() {
    if (!installEvent) { setInstructions(true); return; }
    try { await installEvent.prompt(); await installEvent.userChoice; }
    catch { setInstructions(true); }
    finally { setInstallEvent(null); }
  }

  return <>
    {!standalone && <section className="pwa-install-band" aria-label="Install Fullview Signature">
      <div className="wrap pwa-install-inner">
        <img className="pwa-install-icon" src="/brand/icon-192.png" width="56" height="56" alt="" />
        <div className="pwa-install-copy"><h2>A fuller view. Always close.</h2><p>Add Fullview Signature to your home screen. Keep the service catalogue and your saved estimate close, even between connections.</p>{offlineReady && <span className="pwa-readiness" role="status"><Check size={14} aria-hidden="true" /> Offline catalogue ready</span>}</div>
        <button className="button" onClick={install}><ArrowDownToLine size={18} aria-hidden="true" /> Install Fullview</button>
      </div>
    </section>}
    {instructions && <Dialog title="FULLVIEW SIGNATURE APP" onClose={() => setInstructions(false)}>
      <div className="pwa-instructions"><img src="/brand/icon-192.png" width="64" height="64" alt="" style={{ borderRadius: 16 }} /><h2>Your research.<br /><em>One tap away.</em></h2>
        {isIos ? <><p>Open this website in Safari, then:</p><ol><li>Tap the <strong>Share</strong> button.</li><li>Choose <strong>Add to Home Screen</strong>.</li><li>Tap <strong>Add</strong> to keep Fullview on your device.</li></ol></> : <><p>Open your browser menu and choose <strong>Install app</strong> or <strong>Add to Home Screen</strong>. On a desktop, an install icon may appear beside the address bar.</p><p>If your browser does not offer installation, you can still use every online feature here.</p></>}
        <div className="muted-info"><Check size={16} aria-hidden="true" /> No app store download. The offline catalogue becomes available after your first connected visit. Open the public research desk while online. Briefs are saved on your device; saving does not send an inquiry.</div>
        <button className="button full" onClick={() => setInstructions(false)}>Continue exploring <ArrowRight size={17} aria-hidden="true" /></button>
      </div>
    </Dialog>}
    {offline && <div className="pwa-status" role="status"><WifiOff size={18} aria-hidden="true" /><span>You’re offline.</span>{offlineReady && <a href="/offline.html">Open saved catalogue</a>}</div>}
    {update && !offline && <div className="pwa-status pwa-status-update" role="status"><RefreshCw size={17} aria-hidden="true" /><span>A fresh version is ready.</span><button disabled={updating} onClick={() => { applyUpdate.current = true; setUpdating(true); update.waiting?.postMessage({ type: 'SKIP_WAITING' }); }}>{updating ? 'Updating…' : 'Update app'}</button></div>}
  </>;
}
