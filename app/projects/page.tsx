import {FieldHeader, FieldFooter} from '../../components/field-shell';
import {OperationsDashboard} from '../../components/operations-dashboard';
export const dynamic = 'force-dynamic';
export const metadata = {title: 'Your projects — Fullview Signature', robots: {index: false, follow: false}};
export default function ProjectsPage() {
  return <div className="site-shell wf-page wf-operations wf-client">
    <a className="skip-link" href="#main">Skip to workspace</a>
    <FieldHeader current="projects"/>
    <OperationsDashboard mode="client"/>
    <FieldFooter/>
  </div>;
}
