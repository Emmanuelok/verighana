'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="not-found"><span className="eyebrow">FULLVIEW SIGNATURE | BY VERIDANTH</span><h1>A brief pause<br/><em>in the inquiry.</em></h1><p>We could not load this page. Please try again.</p><button className="button" onClick={reset}>Try again →</button></main>}
