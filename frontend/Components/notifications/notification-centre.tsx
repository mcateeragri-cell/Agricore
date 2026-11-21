"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, AlertTriangle, ClipboardCheck, Clock3, Mail, RefreshCw } from "lucide-react";
type Notice = { id:string;category:string;title:string;detail:string;priority:string;created_at:string;read:boolean;href:string };
export default function NotificationCentre({ compact = false }: { compact?: boolean }) {
 const [items,setItems]=useState<Notice[]>([]),[error,setError]=useState(""),[open,setOpen]=useState(false);
 const load=useCallback(async()=>{try{const r=await fetch("/api/notifications",{cache:"no-store"});if(!r.ok)throw Error("Notifications unavailable");const j=await r.json();setItems(j.notifications??[]);setError("")}catch{setError("Unable to load notifications")}},[]);
 useEffect(()=>{void load();const t=setInterval(()=>{if(document.visibilityState==="visible")void load()},30000);return()=>clearInterval(t)},[load]);
 async function markRead(id:string){const r=await fetch("/api/notifications",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});if(r.ok)setItems(v=>v.map(n=>n.id===id?{...n,read:true}:n))}
 async function enablePush(){
  try{
   const key=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
   if(!key)throw Error("Push notifications are not configured yet");
   if(!("serviceWorker" in navigator)||!("PushManager" in window))throw Error("Push notifications are not supported on this device");
   const permission=await Notification.requestPermission();if(permission!=="granted")throw Error("Notification permission was not granted");
   const registration=await navigator.serviceWorker.register("/sw.js");
   const bytes=Uint8Array.from(atob(key.replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0));
   const subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});
   const response=await fetch("/api/notifications/subscribe",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(subscription.toJSON())});
   if(!response.ok)throw Error("Unable to register this device");
   setError("Push notifications enabled for this device");
  }catch(e){setError(e instanceof Error?e.message:"Unable to enable push notifications")}
 }
 const unread=items.filter(n=>!n.read).length;
 const icon=(category:string)=>category==="breakdown"?<AlertTriangle className="h-4 w-4 text-red-600"/>:category==="website_enquiry"?<Mail className="h-4 w-4 text-blue-600"/>:category==="daily_check"?<ClipboardCheck className="h-4 w-4 text-amber-600"/>:<Clock3 className="h-4 w-4 text-emerald-600"/>;
 const list=<div className="max-h-[420px] overflow-y-auto">{error&&<p role="alert" className="p-3 text-sm text-red-600">{error}</p>}{items.length===0&&!error&&<p className="p-4 text-sm text-slate-500">No notifications yet.</p>}{items.slice(0,compact?15:40).map(n=><div key={n.id} className={`border-b border-slate-100 p-3 text-sm dark:border-slate-800 ${n.read?"opacity-70":"bg-emerald-50/40 dark:bg-emerald-950/20"}`}><div className="flex items-start gap-2">{icon(n.category)}<div className="min-w-0 flex-1"><Link href={n.href} className="font-semibold hover:underline">{n.title}</Link><p className="mt-1 break-words text-xs text-slate-600 dark:text-slate-300">{n.detail}</p><p className="mt-1 text-xs text-slate-500">{new Date(n.created_at).toLocaleString("en-GB")}{n.priority==="urgent"?" · Urgent":""}</p>{!n.read&&<button onClick={()=>void markRead(n.id)} className="mt-1 text-xs font-semibold text-emerald-700 underline">Mark notification read</button>}</div></div></div>)}</div>;
 if(compact)return <div className="relative"><button aria-label={`Notifications, ${unread} unread`} title="Notifications" onClick={()=>setOpen(!open)} className="relative rounded-xl border border-slate-200 p-2 dark:border-slate-700"><Bell className="h-5 w-5"/>{unread>0&&<span className="absolute -right-2 -top-2 rounded-full bg-red-600 px-1.5 text-xs text-white">{unread>99?"99+":unread}</span>}</button>{open&&<div className="absolute right-0 top-12 z-50 w-[min(90vw,370px)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"><div className="flex items-center justify-between p-3 font-bold">Notifications <button onClick={()=>void load()} aria-label="Refresh"><RefreshCw className="h-4 w-4"/></button></div>{list}</div>}</div>;
 return <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between border-b p-4 dark:border-slate-800"><h2 className="text-lg font-bold">Action centre {unread>0?`(${unread} unread)`:""}</h2><button onClick={()=>void load()} className="flex items-center gap-1 text-sm font-semibold"><RefreshCw className="h-4 w-4"/> Refresh</button></div>{list}<div className="px-3 pt-3"><button onClick={()=>void enablePush()} className="rounded-lg border border-emerald-700 px-3 py-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">Enable mobile / browser push alerts</button></div><p className="p-3 text-xs text-slate-500">Marking a notification read does not close the underlying report or enquiry. Open the record to review or resolve it.</p></section>;
}
