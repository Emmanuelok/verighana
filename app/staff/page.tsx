import {OperationsDashboard} from '../../components/operations-dashboard';
export const dynamic = 'force-dynamic';
export const metadata = {title: 'Staff workspace — Fullview Signature', robots: {index: false, follow: false}};
// Records are loaded only through APIs that verify the current session and staff role.
export default function StaffPage() {return <OperationsDashboard mode="staff"/>;}
