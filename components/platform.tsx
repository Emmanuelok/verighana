'use client';

import {ArrowRight} from 'lucide-react';
import {ServiceCatalogue,PricingPage,InstitutionsPage,InsightsPage,ApproachPage} from './research-pages';
import {Workspace,type Viewer} from './workspace';
import {BundleCatalogue} from './bundle-catalogue';
import {EditorialHome} from './home-editorial';

export type View='home'|'services'|'bundles'|'pricing'|'institutions'|'insights'|'approach'|'workspace';
const pages={home:EditorialHome,services:ServiceCatalogue,bundles:BundleCatalogue,pricing:PricingPage,institutions:InstitutionsPage,insights:InsightsPage,approach:ApproachPage};

export default function Platform({view='home',viewer=null}:{view?:View;viewer?:Viewer|null}){
  const Page=view==='workspace'?null:pages[view];
  return <div className={'site-shell view-'+view}>
    <main id="main">{Page?<Page/>:<Workspace viewer={viewer}/>}</main>
  </div>;
}

export function CallToAction(){
  return <aside className="st-next"><div><h2>Discuss your research</h2><p>Outline your question, timing and the support you need.</p></div><a href="/workspace">Prepare a brief <ArrowRight size={18}/></a></aside>;
}
