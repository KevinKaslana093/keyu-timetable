// Runs exclusively on the disposable CI emulator, using synthetic intercepted HTML.
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const adb=(...args)=>execFileSync('adb',args,{encoding:'utf8'});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(fn){for(let i=0;i<100;i++){try{const v=await fn();if(v)return v;}catch{}await delay(250);}throw Error('Timed out waiting for native school import');}
const pid=adb('shell','pidof','org.keyu.timetable').trim();
adb('forward','tcp:9230','localabstract:webview_devtools_remote_'+pid);
const pages=async()=>await(await fetch('http://127.0.0.1:9230/json')).json();
async function connect(page){const ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let n=0;const requests=new Map(),handlers=new Map();ws.addEventListener('message',async e=>{const m=JSON.parse(e.data);if(m.id){const p=requests.get(m.id);requests.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}else if(handlers.has(m.method))await handlers.get(m.method)(m.params);});const call=(method,params={})=>new Promise((resolve,reject)=>{requests.set(++n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};return {call,evaluate,handlers,close:()=>ws.close()};}
const main=await connect(await wait(async()=>(await pages()).find(p=>p.url.startsWith('https://keyu.local/'))));
await main.evaluate("document.querySelector('[data-view=import]').click();document.querySelector('[data-action=school]').click()");
const school=await connect(await wait(async()=>(await pages()).find(p=>!p.url.startsWith('https://keyu.local/'))));
assert.equal(await school.evaluate('typeof KeyuNative'),'undefined');
const fixture='<input type="password" value="never-import-this"><table><tr><th>节次</th>'+[...'一二三四五六日'].map(d=>'<th>星期'+d+'</th>').join('')+'</tr><tr><td>1-2</td><td><div class="timetable_con"><span class="title">虚构海洋学</span><p><i class="glyphicon-time"></i>(1-2节)3-7周(单)</p><p><i class="glyphicon-map-marker"></i>实验楼 A1</p><p><i class="glyphicon-user"></i>示例老师</p></div></td>'+('<td></td>'.repeat(6))+'</tr></table>';
school.handlers.set('Fetch.requestPaused',async p=>{await school.call('Fetch.fulfillRequest',{requestId:p.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/html; charset=utf-8'}],body:Buffer.from(fixture).toString('base64')});});
await school.call('Fetch.enable',{patterns:[{urlPattern:'http://xsjw2018.jw.scut.edu.cn/kbcx/keyu-fixture',requestStage:'Request'}]});
await school.call('Page.navigate',{url:'http://xsjw2018.jw.scut.edu.cn/kbcx/keyu-fixture'});
await wait(()=>school.evaluate("document.body?.textContent.includes('虚构海洋学')"));
function tapText(text){adb('shell','rm','-f','/sdcard/keyu-test.xml');adb('shell','uiautomator','dump','/sdcard/keyu-test.xml');const xml=adb('shell','cat','/sdcard/keyu-test.xml');const tag=xml.match(new RegExp('<node[^>]*text="'+text+'"[^>]*>'))?.[0];assert.ok(tag,'Native button missing: '+text);const b=tag.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/).slice(1).map(Number);adb('shell','input','tap',String((b[0]+b[2])>>1),String((b[1]+b[3])>>1));}
tapText('读取当前课表');
await wait(()=>main.evaluate("document.querySelector('#import-form')!==null"));
assert.equal(await main.evaluate("document.querySelectorAll('#modal tbody tr').length"),1);
assert.ok(!(await main.evaluate("document.querySelector('#modal').textContent")).includes('never-import-this'));
await main.evaluate("document.querySelector('[name=importCampus]').value='university';document.querySelector('#import-form').requestSubmit()");
const state=JSON.parse(await main.evaluate('KeyuNative.getState()'));const schedule=state.schedules.find(s=>s.id===state.active);
assert.equal(schedule.courses[0].name,'虚构海洋学');assert.equal(schedule.slots[0],'08:50-09:35');assert.equal(schedule.courses[0].teacher,'示例老师');
fs.writeFileSync('android-smoke-output/school-import.png',execFileSync('adb',['exec-out','screencap','-p']));
console.log('PASS native school browser separation, intercepted fictional DOM -> native callback -> preview -> campus selection -> private persistence. No real school login performed.');
main.close();school.close();
