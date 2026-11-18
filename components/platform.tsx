'use client';

import {FieldHome} from './field-home';
import {ServiceCatalogue, PricingPage} from './field-catalogue';
import {InstitutionsPage, InsightsPage, ApproachPage} from './field-editorial';
import {FieldHeader, FieldFooter} from './field-shell';
import {Workspace, type Viewer} from './workspace';
import {BundleCatalogue} from './bundle-catalogue';
import {PwaExperience} from './pwa-experience';

export type View = 'home'|'services'|'bundles'|'pricing'|'institutions'|'insights'|'approach'|'workspace';
const pages = {home:FieldHome, services:ServiceCatalogue, bundles:BundleCatalogue, pricing:PricingPage, institutions:InstitutionsPage, insights:InsightsPage, approach:ApproachPage};

export default function Platform({view='home', viewer=null}:{view?:View; viewer?:Viewer|null}) {
  const Page = view === 'workspace' ? null : pages[view];
  return <div className={`site-shell view-${view}`}>
    <a className="skip-link" href="#main">Skip to content</a>
    <FieldHeader current={view}/>
    <main id="main">{Page ? <Page/> : <Workspace viewer={viewer}/>}</main>
    <PwaExperience/>
    <FieldFooter/>
  </div>;
}
