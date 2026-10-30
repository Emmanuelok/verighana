import Platform, {type View} from '../../components/platform';
import {notFound} from 'next/navigation';
import {brand} from '../../lib/brand';
export const dynamic='force-dynamic';
const views:View[]=['services','pricing','institutions','insights','approach','workspace'];
export async function generateMetadata({params}:{params:Promise<{section?:string[]}>}){
  const {section}=await params;
  const titles:Record<string,string>={services:'Research services',pricing:'Services & pricing',institutions:'Research for business & institutions',insights:'Research insights & tools',approach:'Our approach',workspace:'Your research desk'};
  const title=section?.[0]&&titles[section[0]]?titles[section[0]]+' — Fullview Signature — by Avalon Group':'Fullview Signature — by Avalon Group — Big questions. Brighter futures.';
  const path=section?.[0]?'/'+section[0]:'/';
  return {title,alternates:{canonical:path},openGraph:{title,url:path,siteName:brand.title,description:brand.description,type:'website',images:[{url:'/brand/og-fullview-signature.png?v=panorama-2',width:1200,height:630,alt:brand.title+'. Research. In full view.'}]},...(section?.[0]==='workspace'?{robots:{index:false,follow:false}}:{})};
}
export default async function Page({params}:{params:Promise<{section?:string[]}>}){
  const {section}=await params;
  if(section&&(section.length!==1||!views.includes(section[0] as View)))notFound();
  const view=(section?.[0]||'home') as View;
  return <Platform view={view} viewer={null}/>;
}
