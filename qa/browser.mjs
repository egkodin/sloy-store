import { writeFile } from 'node:fs/promises';
export const wait = ms => new Promise(r=>setTimeout(r,ms));
export async function connect() {
 const socket=new WebSocket('ws://127.0.0.1:9222/devtools/browser');
 await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
 let id=0;let session;const pending=new Map();const errors=[];
 socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(!p)return;pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params);});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;const timer=setTimeout(()=>{pending.delete(n);reject(new Error(`CDP timeout: ${method}`));},20000);pending.set(n,{resolve,reject,timer});socket.send(JSON.stringify({id:n,method,params,...(session?{sessionId:session}:{})}));});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result?.value;};
 const navigate=async path=>{await send('Page.navigate',{url:`${process.env.SHOP_URL || 'http://127.0.0.1:5173'}${path}`});let ready=false;for(let i=0;i<100;i++){await wait(100);if(await evaluate('!!document.querySelector("main")')){ready=true;break;}}if(!ready)throw new Error(`Page did not render: ${path}`);for(let i=0;i<100;i++){if(await evaluate('[...document.images].every(i=>i.complete)'))break;await wait(100);}await wait(250);};
 const screenshot=async name=>{const r=await send('Page.captureScreenshot',{format:'png'});await writeFile(new URL(`${name}.png`,import.meta.url),Buffer.from(r.data,'base64'));};
 const viewport=(width,height)=>send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<760});
 const click=async selector=>{await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing element: '+${JSON.stringify(selector)});e.click();})()`);await wait(180);};
 const fill=async(selector,value)=>{await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`);await wait(120);};
 const target=await send('Target.createTarget',{url:'about:blank'});
 session=(await send('Target.attachToTarget',{targetId:target.targetId,flatten:true})).sessionId;
 await send('Runtime.enable');await send('Page.enable');
 return {send,evaluate,navigate,screenshot,viewport,click,fill,errors,close:()=>socket.close()};
}
if(process.argv[2]==='inspect') {
 const b=await connect();try{await b.viewport(1440,1000);await b.navigate('/');console.log(await b.evaluate('({title:document.title,text:document.body.innerText.slice(0,1600),images:[...document.images].map(i=>({src:i.getAttribute("src"),ok:i.complete&&i.naturalWidth>0})),width:innerWidth,overflow:document.documentElement.scrollWidth})'));await b.screenshot('desktop-home');console.log('Errors',b.errors);}finally{b.close();}
}
