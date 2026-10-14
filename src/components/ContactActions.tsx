import React,{useState} from 'react';
import {Phone,MessageCircle} from 'lucide-react';
import {contactLinks} from '../commercial';
export function ContactActions({phone}:{phone:string}){
 const [country,setCountry]=useState('1');const links=contactLinks(phone,country);
 return <div className="contact-actions flex flex-wrap items-center gap-2"><label className="text-xs flex items-center gap-1">País <select aria-label="Código de país del teléfono" className="rounded-lg border p-2 bg-white text-slate-900" value={country} onChange={e=>setCountry(e.target.value)}><option value="1">+1 EE. UU.</option><option value="52">+52 México</option><option value="54">+54 Argentina</option><option value="34">+34 España</option><option value="57">+57 Colombia</option><option value="58">+58 Venezuela</option></select></label>{links?<><a className="inline-flex gap-2 items-center min-h-11 rounded-xl px-3 bg-emerald-700 text-white font-semibold" href={links.call}><Phone size={16}/>Llamar</a><a className="inline-flex gap-2 items-center min-h-11 rounded-xl px-3 bg-green-700 text-white font-semibold" href={links.whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle size={16}/>WhatsApp</a></>:<span className="text-xs">Revisa el teléfono antes de contactar.</span>}</div>;
}
