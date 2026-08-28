import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

function minsTbilisi(){
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tbilisi',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date());
  const h=Number(parts.find(x=>x.type==='hour')?.value||0),m=Number(parts.find(x=>x.type==='minute')?.value||0);
  return h*60+m;
}
function tm(v:any){if(!v)return null;const a=String(v).split(':');return Number(a[0]||0)*60+Number(a[1]||0)}
function quiet(p:any){if(!p?.quiet_hours_enabled)return false;const s=tm(p.quiet_hours_start),e=tm(p.quiet_hours_end);if(s==null||e==null||s===e)return false;const n=minsTbilisi();return s<e?(n>=s&&n<e):(n>=s||n<e)}
function category(t:any){
  const x=String(t||'').toLowerCase();
  if(x.includes('valuation_crm_test'))return 'always';
  if(x.includes('valuation_crm_followup'))return 'valuation_crm_followups';
  if(x.includes('valuation_crm_lead'))return 'valuation_crm_leads';
  if(x.includes('order'))return 'orders';
  if(x.includes('booking')||x.includes('appointment'))return 'bookings';
  if(x.includes('message')||x.includes('chat'))return 'messages';
  if(x.includes('claim'))return 'claims';
  if(x.includes('marketing')||x.includes('promo'))return 'marketing';
  return 'messages';
}

Deno.serve(async(req:Request)=>{
 const headers={"content-type":"application/json; charset=utf-8","cache-control":"no-store"};
 if(req.method!=="POST"&&req.method!=="GET")return new Response(JSON.stringify({ok:false,error:"method_not_allowed"}),{status:405,headers});
 try{
  const url=Deno.env.get("SUPABASE_URL")!,key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:cfg,error:ce}=await sb.rpc("push_vapid_config_service_v12"); if(ce||!cfg?.[0])throw ce||new Error("push config missing");
  const c=cfg[0];webpush.setVapidDetails(c.subject,c.public_key,c.private_key);
  const cutoff=new Date(Date.now()-24*3600*1000).toISOString();
  const {data:notes,error:ne}=await sb.from("user_notifications").select("id,user_id,notification_type,title,body,entity_type,entity_id,business_id,metadata,created_at").is("push_sent_at",null).gte("created_at",cutoff).order("created_at",{ascending:true}).limit(50);if(ne)throw ne;
  const ids=[...new Set((notes||[]).map((n:any)=>n.user_id).filter(Boolean))];
  const prefMap=new Map<string,any>();
  if(ids.length){const {data:prefs}=await sb.from("notification_preferences").select("user_id,orders,bookings,messages,claims,marketing,valuation_crm_leads,valuation_crm_followups,quiet_hours_enabled,quiet_hours_start,quiet_hours_end").in("user_id",ids);for(const p of prefs||[])prefMap.set(p.user_id,p)}
  let delivered=0,disabled=0,failed=0,skippedPreference=0,deferredQuiet=0,noDevices=0;
  for(const n of notes||[]){
   const p=prefMap.get(n.user_id)||{orders:true,bookings:true,messages:true,claims:true,marketing:false,valuation_crm_leads:true,valuation_crm_followups:true,quiet_hours_enabled:false};
   const cat=category(n.notification_type);
   if(cat!=='always'&&p[cat]===false){await sb.from("user_notifications").update({push_sent_at:new Date().toISOString(),push_status:'skipped_preference',push_delivered_count:0,push_last_error:null}).eq("id",n.id);skippedPreference++;continue}
   if(quiet(p)){await sb.from("user_notifications").update({push_status:'deferred_quiet',push_last_error:null}).eq("id",n.id);deferredQuiet++;continue}
   const {data:subs}=await sb.from("push_subscriptions").select("id,endpoint,p256dh,auth").eq("user_id",n.user_id).eq("enabled",true).limit(10);
   if(!(subs||[]).length){await sb.from("user_notifications").update({push_sent_at:new Date().toISOString(),push_status:'no_devices',push_delivered_count:0,push_last_error:null}).eq("id",n.id);noDevices++;continue}
   let success=0,disabledForNote=0,failedForNote=0;
   for(const s of subs||[]){try{await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}},JSON.stringify({title:n.title||"Хашури",body:n.body||"",icon:"./icon.svg",badge:"./icon.svg",data:{notification_id:n.id,type:n.notification_type,entity_type:n.entity_type,entity_id:n.entity_id,business_id:n.business_id,url:n.metadata?.url||null}}),{TTL:300,urgency:(cat==='messages'||cat==='valuation_crm_leads'||cat==='valuation_crm_followups')?'high':'normal'});success++;delivered++;await sb.from("push_subscriptions").update({last_seen_at:new Date().toISOString()}).eq("id",s.id)}catch(e:any){const st=Number(e?.statusCode||e?.status||0);if(st===404||st===410){await sb.from("push_subscriptions").update({enabled:false,updated_at:new Date().toISOString()}).eq("id",s.id);disabled++;disabledForNote++}else{failed++;failedForNote++}}}
   if(success>0)await sb.from("user_notifications").update({push_sent_at:new Date().toISOString(),push_status:'delivered',push_delivered_count:success,push_last_error:failedForNote?('partial_failure:'+failedForNote):null}).eq("id",n.id);
   else if(disabledForNote>0&&failedForNote===0){await sb.from("user_notifications").update({push_sent_at:new Date().toISOString(),push_status:'no_devices',push_delivered_count:0,push_last_error:'expired_subscription'}).eq("id",n.id);noDevices++}
   else await sb.from("user_notifications").update({push_status:'retrying',push_delivered_count:0,push_last_error:'failed:'+failedForNote}).eq("id",n.id);
  }
  return new Response(JSON.stringify({ok:true,pending:(notes||[]).length,delivered,disabled,failed,skipped_preference:skippedPreference,deferred_quiet:deferredQuiet,no_devices:noDevices}),{status:200,headers});
 }catch(e:any){return new Response(JSON.stringify({ok:false,error:e?.message||String(e)}),{status:500,headers})}
});
