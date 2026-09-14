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
const originalFixture='<input type="password" value="never-import-this"><table><tr><th>节次</th>'+[...'一二三四五六日'].map(d=>'<th>星期'+d+'</th>').join('')+'</tr><tr><td>1-2</td><td><div class="timetable_con"><span class="title">虚构海洋学</span><p><i class="glyphicon-time"></i>(1-2节)3-7周(单)</p><p><i class="glyphicon-map-marker"></i>实验楼 A1</p><p><i class="glyphicon-user"></i>示例老师</p></div></td>'+('<td></td>'.repeat(6))+'</tr></table>';
const escapeAttr=x=>x.replaceAll('&','&amp;').replaceAll('"','&quot;');
const nestedTable=originalFixture.replace('<td><div class="timetable_con">','<td><table><tr><td><div class="timetable_con">').replace('</div></td>','</div></td></tr></table></td>').replaceAll(/<th>星期(.)<\/th>/g,'<th><span>星期$1</span><small>(9月14日)</small></th>');
const inner='https://jw.scut.edu.cn/kbcx/keyu-fixture-inner?ticket=fictional-secret';
const fixture='<iframe style="width:900px;height:900px" src="'+inner+'"></iframe>';
const innerFixture='<iframe srcdoc="'+escapeAttr('<iframe srcdoc="'+escapeAttr(nestedTable)+'"></iframe>')+'"></iframe>';
school.handlers.set('Fetch.requestPaused',async p=>{await school.call('Fetch.fulfillRequest',{requestId:p.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/html; charset=utf-8'}],body:Buffer.from(p.request.url===inner?innerFixture:fixture).toString('base64')});});
await school.call('Fetch.enable',{patterns:[{urlPattern:'*://*.scut.edu.cn/kbcx/keyu-fixture*',requestStage:'Request'}]});
await school.call('Page.navigate',{url:'http://xsjw2018.jw.scut.edu.cn/kbcx/keyu-fixture'});
await wait(()=>school.evaluate("document.querySelector('iframe')?.getAttribute('src')?.includes('keyu-fixture-inner')"));
assert.equal(await school.evaluate("document.querySelector('iframe').contentDocument"),null,'Must reproduce a real cross-origin boundary');
function tapText(text){adb('shell','rm','-f','/sdcard/keyu-test.xml');adb('shell','uiautomator','dump','/sdcard/keyu-test.xml');const xml=adb('shell','cat','/sdcard/keyu-test.xml');const tag=xml.match(new RegExp('<node[^>]*text="'+text+'"[^>]*>'))?.[0];assert.ok(tag,'Native button missing: '+text);const b=tag.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/).slice(1).map(Number);adb('shell','input','tap',String((b[0]+b[2])>>1),String((b[1]+b[3])>>1));}
tapText('读取当前课表');
await delay(1000);
const failure=await school.evaluate('KeyuSchoolReader.readSchoolPage(window)');
const diagnostic=JSON.parse(failure.diagnostic);
assert.equal(diagnostic.blockedFrames,1);assert.equal(diagnostic.documents,1);assert.equal(diagnostic.weekdayCells,0);assert.equal(diagnostic.cards,0);
assert.deepEqual(failure.framePages,[inner]);assert.ok(!failure.diagnostic.includes('fictional-secret'));assert.ok(!failure.diagnostic.includes('ticket'));
tapText('打开课表内页');
await wait(()=>school.evaluate("location.host==='jw.scut.edu.cn'&&document.querySelector('iframe')?.contentDocument.querySelector('iframe')?.contentDocument.body?.textContent.includes('虚构海洋学')"));
assert.equal(await school.evaluate('typeof KeyuNative'),'undefined');
await delay(500);
// Reproduce legacy DOM collections lacking iteration and NodeList.forEach.
await school.evaluate("(function visit(w){Object.defineProperty(w.NodeList.prototype,Symbol.iterator,{value:undefined,configurable:true});Object.defineProperty(w.HTMLCollection.prototype,Symbol.iterator,{value:undefined,configurable:true});w.NodeList.prototype.forEach=undefined;for(let i=0;i<w.frames.length;i++)visit(w.frames[i]);})(window)");
tapText('读取当前课表');
await wait(()=>main.evaluate("document.querySelector('#import-form')!==null"));
assert.equal(await main.evaluate("document.querySelectorAll('#modal tbody tr').length"),1);
assert.ok(!(await main.evaluate("document.querySelector('#modal').textContent")).includes('never-import-this'));
await main.evaluate("document.querySelector('[name=importCampus]').value='university';document.querySelector('#import-form').requestSubmit()");
const state=JSON.parse(await main.evaluate('KeyuNative.getState()'));const schedule=state.schedules.find(s=>s.id===state.active);
assert.equal(schedule.courses[0].name,'虚构海洋学');assert.equal(schedule.slots[0],'08:50-09:35');assert.equal(schedule.courses[0].teacher,'示例老师');
fs.writeFileSync('android-smoke-output/school-import.png',execFileSync('adb',['exec-out','screencap','-p']));
console.log('PASS real cross-origin boundary -> privacy-safe diagnostic -> trusted school inner-page navigation -> depth-2 frame and nested table DOM -> native callback -> preview -> campus selection -> private persistence. No native bridge in either school origin. No real school login performed.');
main.close();school.close();
