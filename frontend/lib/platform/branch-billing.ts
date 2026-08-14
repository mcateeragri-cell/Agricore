import "server-only";
import { enterpriseBranchStripePriceId, stripeRequest } from "@/lib/platform/stripe";
import { loadBillingStatus } from "@/lib/platform/billing";

export async function syncEnterpriseBranchBilling(companyId:string){
 const billing=await loadBillingStatus(companyId);
 if(billing.plan.slug!=="enterprise"||!billing.subscription.stripeSubscriptionId)return;
 const quantity=Math.max(0,billing.branchBilling.additionalBranches);
 const priceId=enterpriseBranchStripePriceId();
 const sub=await stripeRequest<any>(`/subscriptions/${encodeURIComponent(billing.subscription.stripeSubscriptionId)}`);
 const items=Array.isArray(sub.items?.data)?sub.items.data:[];
 const existing=items.find((item:any)=>item?.price?.id===priceId);
 const itemPayload:any[]=[];
 if(quantity>0){ if(existing?.id)itemPayload.push({id:existing.id,quantity}); else itemPayload.push({price:priceId,quantity}); }
 else if(existing?.id)itemPayload.push({id:existing.id,deleted:true});
 await stripeRequest(`/subscriptions/${encodeURIComponent(billing.subscription.stripeSubscriptionId)}`,{method:"POST",body:{items:itemPayload,proration_behavior:"always_invoice",metadata:{company_id:companyId,plan_slug:"enterprise",active_branches:billing.usage.branches}}});
}
