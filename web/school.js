import {course,COLORS} from './core.js';
export function parseSchoolPayload(data){
  if(data?.format!=='keyu-school-v1'||!Array.isArray(data.entries)||data.entries.length>1000)throw Error('教务页面数据格式不受支持');
  const courses=[],notes=[],keys=new Set();
  const normalize=x=>String(x||'').replace(/[（]/g,'(').replace(/[）]/g,')').replace(/[－—–~～]/g,'-').replace(/：/g,':');
  for(const [index,entry] of data.entries.entries()){
    const text=normalize(entry.text);if(text.length>20000)throw Error('课程内容过长');
    const periods=[...text.matchAll(/\(\s*(\d{1,2})(?:\s*-\s*(\d{1,2}))?\s*节\s*\)\s*([\d\s,，、\-周单双()]+)/g)];
    if(!periods.length){if(text.includes('周'))notes.push(text.trim());else throw Error(`第 ${index+1} 条课程的节次未识别，请使用 PDF 导入`);continue;}
    const count=[...text.matchAll(/\d\s*节\s*\)/g)].length;
    if(count!==periods.length)throw Error(`第 ${index+1} 条课程有未识别时段，已停止导入`);
    let name=normalize(entry.name).trim()||text.slice(0,periods[0].index).replace(/时间\s*:\s*$/,'').trim();
    if(!name||name.length>120)throw Error(`第 ${index+1} 条课程名称无法确定，请使用 PDF 导入`);
    const label=(source,keys)=>{const m=source.match(new RegExp('(?:'+keys+')\\s*:\\s*([^\\n/]+)'));return m?m[1].trim():'';};
    periods.forEach((p,i)=>{
      const tail=text.slice(p.index+p[0].length,periods[i+1]?.index??text.length);
      const room=label(tail,'地点|上课地点|教室|场地'),teacher=label(tail,'教师|老师|任课教师');
      const c=course({name,day:+entry.day,start:+p[1],end:+(p[2]||p[1]),weeks:p[3].trim(),room,teacher,color:COLORS[courses.length%COLORS.length]});
      const key=JSON.stringify([c.name,c.day,c.start,c.end,c.weeks,c.room,c.teacher]);
      if(!keys.has(key)){keys.add(key);courses.push(c);}
    });
  }
  if(!courses.length)throw Error('没有识别到按节次安排的课程，请确认学期与页面，或改用 PDF 导入');
  return {courses,notes:[...new Set(notes)]};
}
