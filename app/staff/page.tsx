import {FieldHeader, FieldFooter} from '../../components/field-shell';
import {OperationsDashboard} from '../../components/operations-dashboard';
export const dynamic = 'force-dynamic';
export const metadata = {title: 'Staff workspace — Fullview Signature', robots: {index: false, follow: false}};
// Records are loaded only through APIs that verify the current session and staff role.
export default function StaffPage() {
  return <div className="site-shell wf-page wf-operations wf-staff">
    <a className="skip-link" href="#main">Skip to workspace</a>
    <FieldHeader current="staff"/>
    <OperationsDashboard mode="staff"/>
    <FieldFooter/>
  </div>;
}
