'use client';

export type NotificationSummary={resource_id:string;state:string;attempts:number;error_code:string|null;leaseExpired:boolean;retryAllowed:boolean;manualReviewRequired:boolean};

export function notificationLabel(state:string|null,leaseExpired=false){
 if(state==='sending'&&leaseExpired)return 'Sending attempt expired; delivery result is uncertain';
 return ({pending:'Waiting for a sending attempt',sending:'Sending attempt in progress',accepted:'Accepted by the email provider; inbox delivery is not confirmed',failed:'Sending failed; staff attention required',unknown:'Sending result is uncertain; review before retrying'} as Record<string,string>)[state??'pending']??'Delivery state unavailable';
}

export function NotificationFollowUp({notifications,busy,onCheck}:{notifications:NotificationSummary[];busy:boolean;onCheck:(resourceId:string)=>void}){
 return <section className="operations-card" aria-labelledby="notifications-heading"><h2 id="notifications-heading">Team email follow-up</h2><p>Check / retry leaves an active attempt alone. An expired attempt may retry within its original limits, only to the configured Fullview inquiry mailbox. Provider acceptance does not prove inbox delivery.</p><div className="operations-stack">{notifications.map(item=><div key={item.resource_id} className="operations-message"><p><strong>{notificationLabel(item.state,item.leaseExpired)}</strong></p><p className="fine-print">Reference {item.resource_id} · Attempts: {item.attempts}{item.error_code?` · ${item.error_code}`:''}</p>{item.manualReviewRequired&&<p className="fine-print">The retry limit or sending window has ended. No further automated send is permitted; review the delivery outcome separately.</p>}<button type="button" className="text-link" disabled={busy||(item.state!=='sending'&&!item.retryAllowed)} onClick={()=>onCheck(item.resource_id)}>{item.state==='sending'?'Check / retry team email':'Retry team email'}</button></div>)}</div></section>;
}
