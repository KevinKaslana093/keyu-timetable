export const DAYS = ['一','二','三','四','五','六','日'];
export const COLORS = ['#6378df','#329889','#bd8053','#a06abb','#508fae','#bf667a'];
export const DEFAULT_SLOTS = ['08:00-08:45','08:55-09:40','10:00-10:45','10:55-11:40','14:00-14:45','14:55-15:40','16:00-16:45','16:55-17:40','19:00-19:45','19:55-20:40','20:50-21:35','21:45-22:30'];
export function uid(){return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;}
export function parseWeeks(value){
  const s=String(value).replace(/[\s周第()（）]/g,'').replace(/[，、;]/g,',').replace(/[~～—–至]/g,'-');
  if(!s) throw Error('周数不能为空');
  const out=new Set();
  for(const part of s.split(',')){
    const m=part.match(/^(\d{1,2})(?:-(\d{1,2}))?([单双])?$/);
    if(!m) throw Error(`无法识别周数「${part}」，示例：3-12、15-18 或 3-17单`);
    const a=+m[1],b=+(m[2]||m[1]);
    if(a<1||b>60||a>b) throw Error('周数必须在 1—60 内，起始周不能大于结束周');
    for(let w=a;w<=b;w++) if(!m[3]||(m[3]==='单'?w%2===1:w%2===0)) out.add(w);
  }
  if(!out.size) throw Error('周数筛选结果为空');
  return [...out].sort((a,b)=>a-b);
}
export function formatWeeks(ws){
  const sorted=[...new Set(ws)].sort((a,b)=>a-b),r=[];
  for(let i=0;i<sorted.length;i++){let a=sorted[i],b=a;while(sorted[i+1]===b+1)b=sorted[++i];r.push(a===b?`${a}`:`${a}-${b}`);}
  return r.join('、');
}
export function course(raw){
  const c={id:raw.id||uid(),name:String(raw.name||'').trim(),day:Number(raw.day),start:Number(raw.start),end:Number(raw.end),weeks:Array.isArray(raw.weeks)?[...new Set(raw.weeks.map(Number))].sort((a,b)=>a-b):parseWeeks(raw.weeks),room:String(raw.room||''),teacher:String(raw.teacher||''),note:String(raw.note||''),color:/^#[0-9a-f]{6}$/i.test(raw.color)?raw.color:COLORS[0]};
  if(!c.name||c.name.length>120)throw Error('课程名称需为 1—120 字');
  if(!Number.isInteger(c.day)||c.day<1||c.day>7)throw Error(`${c.name}：星期应为 1—7`);
  if(!Number.isInteger(c.start)||!Number.isInteger(c.end)||c.start<1||c.end>16||c.start>c.end)throw Error(`${c.name}：节数应为 1—16，起始节不能大于结束节`);
  if(!c.weeks.length||c.weeks.some(w=>!Number.isInteger(w)||w<1||w>60))throw Error(`${c.name}：周数应为 1—60`);
  return c;
}
export function emptySchedule(){return {id:uid(),name:'我的课表',startDate:'',totalWeeks:22,slots:[...DEFAULT_SLOTS],courses:[],adjustments:{},notes:[],reminder:15};}
export function validateSchedule(s){
  if(!s||!Array.isArray(s.courses)||s.courses.length>1000)throw Error('不是有效课表（最多 1000 条课程）');
  const out={...emptySchedule(),...s,courses:s.courses.map(course)};
  if(out.startDate&&dayOf(out.startDate)!==1)throw Error('第 1 周起始日必须是周一');
  if(!Number.isInteger(+out.totalWeeks)||out.totalWeeks<1||out.totalWeeks>60)throw Error('学期周数应为 1—60');
  if(!Array.isArray(out.slots)||out.slots.length<1||out.slots.length>16)throw Error('时间表应有 1—16 节');
  let end='00:00';
  out.slots.forEach((x,i)=>{if(!/^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/.test(x)||x.slice(0,5)>=x.slice(6)||x.slice(0,5)<end)throw Error(`第 ${i+1} 节时间无效或与前一节重叠`);end=x.slice(6);});
  if(out.courses.some(c=>c.end>out.slots.length||c.weeks.some(w=>w>out.totalWeeks)))throw Error('有课程超出节数或学期周数，请先增加设置');
  if(!out.adjustments||typeof out.adjustments!=='object'||Array.isArray(out.adjustments))throw Error('调休数据无效');
  for(const [date,source] of Object.entries(out.adjustments)){dateNumber(date);if(source!==null)dateNumber(source);}
  if(!Array.isArray(out.notes)||out.notes.some(n=>typeof n!=='string'))throw Error('备注格式无效');
  if(![0,5,10,15,20,30,60].includes(+out.reminder))throw Error('提醒时间无效');
  out.reminder=+out.reminder;return out;
}
export function dateNumber(s){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s))throw Error('日期格式应为 YYYY-MM-DD');
  const [y,m,d]=s.split('-').map(Number),t=Date.UTC(y,m-1,d);
  if(new Date(t).toISOString().slice(0,10)!==s)throw Error('无效日期');return t/86400000;
}
export function addDays(s,n){return new Date((dateNumber(s)+n)*86400000).toISOString().slice(0,10);}
export function dayOf(s){return (new Date(dateNumber(s)*86400000).getUTCDay()+6)%7+1;}
export function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function weekOf(s,date){return s.startDate?Math.floor((dateNumber(date)-dateNumber(s.startDate))/7)+1:1;}
export function onDate(s,date){
  if(!s.startDate)return [];
  const source=Object.hasOwn(s.adjustments,date)?s.adjustments[date]:date;
  if(source===null)return [];
  const week=weekOf(s,source),day=dayOf(source);
  return s.courses.filter(c=>c.day===day&&c.weeks.includes(week)).sort((a,b)=>a.start-b.start);
}
export function events(s){
  if(!s.startDate)throw Error('请先设置第 1 周周一日期');
  const dates=new Set(Array.from({length:s.totalWeeks*7},(_,i)=>addDays(s.startDate,i)));
  Object.keys(s.adjustments).forEach(d=>dates.add(d));
  return [...dates].sort().flatMap(date=>onDate(s,date).map(c=>({...c,date,from:s.slots[c.start-1].slice(0,5),to:s.slots[c.end-1].slice(6)})));
}
export function conflicts(s){
  const result=[];
  for(let i=0;i<s.courses.length;i++)for(let j=i+1;j<s.courses.length;j++){
    const a=s.courses[i],b=s.courses[j];
    if(a.day===b.day&&a.start<=b.end&&b.start<=a.end&&a.weeks.some(w=>b.weeks.includes(w)))result.push(`${a.name} / ${b.name}（周${DAYS[a.day-1]}）`);
  }return result;
}
export function csvRows(text){
  const rows=[];let row=[],cell='',quoted=false;
  text=text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';}else cell+=c;}
  if(quoted)throw Error('CSV 引号未闭合');row.push(cell);if(row.some(x=>x.trim()))rows.push(row);return rows;
}
export function parseCSV(text){
  const rows=csvRows(text),expected=['课程名称','星期','开始节数','结束节数','老师','地点','周数'];
  if(!rows.length||expected.some((h,i)=>rows[0][i]?.trim()!==h))throw Error('请使用 WakeUp 七列表头：'+expected.join('，'));
  return rows.slice(1).map((r,i)=>{try{if(r.length!==7)throw Error('必须有 7 列，含逗号的字段请用双引号包围');return course({name:r[0],day:r[1],start:r[2],end:r[3],teacher:r[4],room:r[5],weeks:r[6],color:COLORS[i%COLORS.length]});}catch(e){throw Error(`第 ${i+2} 行：${e.message}`);}});
}
export function exportCSV(s){return '\uFEFF'+[['课程名称','星期','开始节数','结束节数','老师','地点','周数'],...s.courses.map(c=>[c.name,c.day,c.start,c.end,c.teacher||'无',c.room||'无',formatWeeks(c.weeks)])].map(r=>r.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\r\n');}
const escapeICS=s=>String(s).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
function fold(s){let lines=[],line='',bytes=0;for(const ch of s){const n=new TextEncoder().encode(ch).length;if(bytes+n>73){lines.push(line);line=' ';bytes=1;}line+=ch;bytes+=n;}return [...lines,line].join('\r\n');}
export function exportICS(s){
  const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const utc=(d,t)=>new Date(`${d}T${t}:00+08:00`).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Keyu//Timetable//ZH','CALSCALE:GREGORIAN','X-WR-CALNAME:'+escapeICS(s.name)];
  for(const e of events(s))lines.push('BEGIN:VEVENT',`UID:${s.id}-${e.id}-${e.date}@keyu.local`,`DTSTAMP:${stamp}`,`DTSTART:${utc(e.date,e.from)}`,`DTEND:${utc(e.date,e.to)}`,`SUMMARY:${escapeICS(e.name)}`,`LOCATION:${escapeICS(e.room)}`,`DESCRIPTION:${escapeICS([e.teacher,e.note].filter(Boolean).join('\n'))}`,'BEGIN:VALARM',`TRIGGER:-PT${s.reminder}M`,'ACTION:DISPLAY',`DESCRIPTION:${escapeICS(e.name)}`,'END:VALARM','END:VEVENT');
  lines.push('END:VCALENDAR');return lines.map(fold).join('\r\n')+'\r\n';
}
// Coordinate-aware SCUT exported table parser. Carries columns and course names across pages.
export function parseScutPages(pages){
  const headers=pages[0].items.filter(i=>/^星期[一二三四五六日天]$/.test(i.str.replace(/\s/g,''))).sort((a,b)=>a.x-b.x);
  if(headers.length!==7)throw Error('未识别到七列星期表头。请上传教务系统“输出 PDF”的文字版课表，不支持截图型 PDF。');
  const centers=headers.map(i=>i.x+i.width/2),step=(centers[6]-centers[0])/6,cols=Array.from({length:7},()=>[]),notes=[];
  for(let p=0;p<pages.length;p++){
    const items=pages[p].items,localHead=items.filter(i=>/^星期[一二三四五六日天]$/.test(i.str.replace(/\s/g,''))),top=localHead.length?Math.max(...localHead.map(i=>i.y))+3:0;
    const practice=items.find(i=>i.str.includes('实践课程'));
    const bottom=practice?practice.y-2:pages[p].height;
    if(practice){notes.push(items.filter(i=>Math.abs(i.y-practice.y)<3).sort((a,b)=>a.x-b.x).map(i=>i.str).join('').trim());}
    for(let d=0;d<7;d++){
      const lines=[];
      const candidates=items.filter(i=>i.y>top&&i.y<bottom&&i.x>=centers[d]-step/2&&i.x<centers[d]+step/2&&i.str.trim());
      candidates.sort((a,b)=>a.y-b.y||a.x-b.x);
      for(const i of candidates){let line=lines.find(l=>Math.abs(l.y-i.y)<2);if(!line){line={y:i.y,items:[]};lines.push(line);}line.items.push(i);}
      cols[d].push(lines.map(l=>l.items.sort((a,b)=>a.x-b.x).map(i=>i.str).join('')).join(''));
    }
  }
  const courses=[];let rawCount=0;
  cols.forEach((parts,d)=>{
    const text=parts.join('').replace(/\s/g,'').replace(/[（]/g,'(').replace(/[）]/g,')').replace(/：/g,':');
    const matches=[...text.matchAll(/\((\d{1,2})(?:-(\d{1,2}))?节\)([^/]+)\/校区:/g)];
    const intervalCount=[...text.matchAll(/\(\d{1,2}(?:-\d{1,2})?节\)/g)].length;
    if(intervalCount!==matches.length)throw Error(`周${DAYS[d]}存在未识别的课程时段，已停止导入以避免遗漏`);
    rawCount+=matches.length;let lastName='',prev=0;
    matches.forEach((m,i)=>{
      const prefix=text.slice(prev,m.index),tail=prefix.split(/\/学分:\d+(?:\.\d+)?/).pop();
      if(tail&&!tail.includes('/'))lastName=tail;
      const segment=text.slice(m.index+m[0].length,matches[i+1]?.index??text.length);
      const field=key=>segment.match(new RegExp('/'+key+':([^/]+)'))?.[1]||'';
      if(!lastName)throw Error(`周${DAYS[d]}有课程名称无法识别，请检查原始 PDF`);
      courses.push(course({name:lastName,day:d+1,start:+m[1],end:+(m[2]||m[1]),weeks:m[3],room:field('场地'),teacher:field('教师'),color:COLORS[courses.length%COLORS.length]}));
      prev=m.index+m[0].length;
    });
  });
  if(!courses.length)throw Error('没有找到可导入的课程。该 PDF 格式尚未适配。');
  if(courses.length!==rawCount)throw Error('解析结果不完整');
  return {courses,notes};
}
