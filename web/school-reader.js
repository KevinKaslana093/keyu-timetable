// Read course table text only, never forms, cookies or page scripts.
export function extractSchoolDocument(doc) {
  const dayOf=text=>{const m=String(text).replace(/[\s\u200b\ufeff]/g,'').match(/^(?:星期|周)([一二三四五六日天])(?:$|[（(\d])/);return m?Math.min('一二三四五六日天'.indexOf(m[1])+1,7):0;};
  const entries=[],seen=new Set();
  const cellDay=cell=>dayOf(cell.textContent)||[...cell.querySelectorAll('span,div,b,font')].map(n=>dayOf(n.textContent)).find(Boolean)||0;
  const appendCard=(card,day)=>{
    if(new Set([...card.querySelectorAll('.title,.timetable_title')].map(n=>n.textContent.trim()).filter(Boolean)).size>1)throw Error('同一课程块中出现多个课程名称，已停止读取以免混淆。请复制诊断反馈或使用 PDF 导入。');
    const copy=card.cloneNode(true);
    copy.querySelectorAll('script,style,input,textarea,select,button,[hidden]').forEach(n=>n.remove());
    for(const [selector,label] of [['.glyphicon-time','时间：'],['.glyphicon-map-marker','地点：'],['.glyphicon-user','教师：']])copy.querySelectorAll(selector).forEach(n=>n.replaceWith(doc.createTextNode('\n'+label)));
    copy.querySelectorAll('br').forEach(n=>n.replaceWith(doc.createTextNode('\n')));
    copy.querySelectorAll('p,div,li,tr').forEach(n=>{n.prepend(doc.createTextNode('\n'));n.append(doc.createTextNode('\n'));});
    const text=copy.textContent.trim();if(!text||!/[节周]/.test(text))return;
    const title=card.querySelector('.title,.timetable_title,h3,h4,h5,strong');
    entries.push({day,name:title?.textContent.trim()||'',text});
  };
  const cardsIn=cell=>{const cards=[...cell.querySelectorAll('.timetable_con')].filter(c=>!c.querySelector('.timetable_con'));return cards.length?cards:[cell];};
  for(const table of doc.querySelectorAll('table')){
    const rows=[...table.rows].filter(r=>r.closest('table')===table);
    const heads=rows.find(r=>new Set([...r.cells].map(cellDay).filter(Boolean)).size>=5);
    if(!heads)continue;
    const grid=[],headers=new Map();
    rows.forEach((row,y)=>{grid[y]??=[];let x=0;for(const cell of row.cells){while(grid[y][x])x++;const w=Math.min(cell.colSpan||1,20),h=Math.min(cell.rowSpan||1,100);
      for(let dy=0;dy<h;dy++){grid[y+dy]??=[];for(let dx=0;dx<w;dx++)grid[y+dy][x+dx]=cell;}
      if(row===heads&&cellDay(cell))for(let dx=0;dx<w;dx++)headers.set(x+dx,cellDay(cell));
      x+=w;
    }});
    for(let y=rows.indexOf(heads)+1;y<rows.length;y++)for(const [x,day] of headers){
      const cell=grid[y]?.[x];if(!cell||seen.has(cell)||cell.closest('table')!==table)continue;seen.add(cell);
      for(const card of cardsIn(cell))appendCard(card,day);
    }
  }
  // Some responsive school pages put headers and course bodies in separate tables.
  // Use rendered column bounds only when structural extraction found no courses.
  if(!entries.length&&doc.defaultView){
    const groups=[];
    for(const node of doc.querySelectorAll('th,td,[role=columnheader],span,div')){
      const day=dayOf(node.textContent);if(!day||node.textContent.length>60)continue;
      const r=node.getBoundingClientRect();if(r.width<5||r.height<5)continue;
      let group=groups.find(g=>Math.abs(g.y-r.top)<8);if(!group){group={y:r.top,days:new Map()};groups.push(group);}
      const previous=group.days.get(day);if(!previous||r.width>previous.width)group.days.set(day,{left:r.left,right:r.right,width:r.width});
    }
    const candidates=groups.filter(g=>g.days.size>=5).sort((a,b)=>b.y-a.y);
    const cards=[...doc.querySelectorAll('.timetable_con')].filter(c=>!c.querySelector('.timetable_con'));
    for(const card of cards){
      const r=card.getBoundingClientRect();if(r.width<1||r.height<1)continue;
      const group=candidates.find(g=>g.y<=r.top);if(!group){if(/[节周]/.test(card.textContent))throw Error('部分课程无法对应到星期列，已停止读取以避免遗漏。请复制诊断或使用 PDF 导入。');continue;}
      const center=(r.left+r.right)/2,matches=[...group.days].filter(([,b])=>center>=b.left&&center<=b.right);
      if(matches.length===1)appendCard(card,matches[0][0]);
      else if(/[节周]/.test(card.textContent))throw Error('已看到课程，但无法确定部分课程的星期列。请用 PDF 导入，并复制诊断反馈。');
    }
  }
  if(!entries.length)throw Error('当前页面未匹配到课程单元格。如果已经能看到课表，这是页面结构适配失败，请复制诊断反馈；不必重复登录。');
  if(entries.length>1000)throw Error('课程条目过多，请只打开一个学期的个人课表。');
  return {format:'keyu-school-v1',entries};
}

// Visit nested same-origin frames, without reading form values, scripts or cookies.
export function readSchoolPage(root){
  const stack=[{win:root,depth:0}],visited=new Set(),stats={version:'1.1.1',documents:0,blockedFrames:0,tables:0,nestedTables:0,weekdayCells:0,cards:0,maxDepth:0},errors=[];
  while(stack.length){
    const {win,depth}=stack.shift();if(visited.has(win)||depth>6)continue;visited.add(win);
    try{
      const doc=win.document;stats.documents++;stats.maxDepth=Math.max(depth,stats.maxDepth);stats.tables+=doc.querySelectorAll('table').length;stats.nestedTables+=doc.querySelectorAll('table table').length;stats.weekdayCells+=[...doc.querySelectorAll('th,td')].filter(n=>/^(星期|周)[一二三四五六日天]/.test(n.textContent.replace(/\s/g,''))).length;stats.cards+=doc.querySelectorAll('.timetable_con').length;
      try{return extractSchoolDocument(doc);}catch(e){errors.push(String(e.message));}
      for(let i=0;i<win.frames.length;i++)stack.push({win:win.frames[i],depth:depth+1});
    }catch{stats.blockedFrames++;}
  }
  return {error:errors[0]||'课表内嵌页面无法读取，请使用学校输出的 PDF 导入。',diagnostic:JSON.stringify(stats)};
}
