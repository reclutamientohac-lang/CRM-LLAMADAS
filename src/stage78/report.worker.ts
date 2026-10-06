import { calculateReport } from '../businessRules';
self.onmessage = ({data}) => {try { self.postMessage({id:data.id,result:calculateReport(data.data,data.filters,data.dimensions,data.scope)}); }catch(e){self.postMessage({id:data.id,error:String(e)});} };
