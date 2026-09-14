// Copy DOM collections by index: legacy pages may replace/remove DOM iterators.
function nodes(collection){const out=[];for(let i=0;i<collection.length;i++)out.push(collection[i]);return out;}
// Read course table text only, never forms, cookies or page scripts.
export function extractSchoolDocument(doc) {
  const dayOf=text=>{const m=String(text).replace(/[\s\u200b\ufeff]/g,'').match(/^(?:星期|周)([一二三四五六日天])(?:$|[（(\d])/);return m?Math.min('一二三四五六日天'.indexOf(m[1])+1,7):0;};
  const entries=[],seen=new Set();
  const cellDay=cell=>dayOf(cell.textContent)||nodes(cell.querySelectorAll('span,div,b,font')).map(n=>dayOf(n.textContent)).find(Boolean)||0;
  const appendCard=(card,day)=>{
    if(new Set(nodes(card.querySelectorAll('.title,.timetable_title')).map(n=>n.textContent.trim()).filter(Boolean)).size>1)throw Error('同一课程块中出现多个课程名称，已停止读取以免混淆。请复制诊断反馈或使用 PDF 导入。');
    const copy=card.cloneNode(true);
    nodes(copy.querySelectorAll('script,style,input,textarea,select,button,[hidden]')).forEach(n=>n.remove());
    for(const [selector,label] of [['.glyphicon-time','时间：'],['.glyphicon-map-marker','地点：'],['.glyphicon-user','教师：']])nodes(copy.querySelectorAll(selector)).forEach(n=>n.replaceWith(doc.createTextNode('\n'+label)));
    nodes(copy.querySelectorAll('br')).forEach(n=>n.replaceWith(doc.createTextNode('\n')));
    nodes(copy.querySelectorAll('p,div,li,tr')).forEach(n=>{n.prepend(doc.createTextNode('\n'));n.append(doc.createTextNode('\n'));});
    const text=copy.textContent.trim();if(!text||!/[节周]/.test(text))return;
    const title=card.querySelector('.title,.timetable_title,h3,h4,h5,strong');
    entries.push({day,name:title?.textContent.trim()||'',text});
  };
  const cardsIn=cell=>{const cards=nodes(cell.querySelectorAll('.timetable_con')).filter(c=>!c.querySelector('.timetable_con'));return cards.length?cards:[cell];};
  for(const table of nodes(doc.querySelectorAll('table'))){
    const rows=nodes(table.rows).filter(r=>r.closest('table')===table);
    const heads=rows.find(r=>new Set(nodes(r.cells).map(cellDay).filter(Boolean)).size>=5);
    if(!heads)continue;
    const grid=[],headers=new Map();
    rows.forEach((row,y)=>{grid[y]??=[];let x=0;for(const cell of nodes(row.cells)){while(grid[y][x])x++;const w=Math.min(cell.colSpan||1,20),h=Math.min(cell.rowSpan||1,100);
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
    for(const node of nodes(doc.querySelectorAll('th,td,[role=columnheader],span,div'))){
      const day=dayOf(node.textContent);if(!day||node.textContent.length>60)continue;
      const r=node.getBoundingClientRect();if(r.width<5||r.height<5)continue;
      let group=groups.find(g=>Math.abs(g.y-r.top)<8);if(!group){group={y:r.top,days:new Map()};groups.push(group);}
      const previous=group.days.get(day);if(!previous||r.width>previous.width)group.days.set(day,{left:r.left,right:r.right,width:r.width});
    }
    const candidates=groups.filter(g=>g.days.size>=5).sort((a,b)=>b.y-a.y);
    const cards=nodes(doc.querySelectorAll('.timetable_con')).filter(c=>!c.querySelector('.timetable_con'));
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

// Only a SecurityError while accessing a frame document counts as blocked.
export function readSchoolPage(root){
  const stack=[{win:root,depth:0}],visited=new Set(),framePages=[],stats={version:'1.1.3',documents:0,blockedFrames:0,tables:0,nestedTables:0,weekdayCells:0,cards:0,maxDepth:0,frameElements:0,frameOrigins:[],readerErrors:[]},errors=[];
  const fault=(stage,e)=>{const names=['Error','TypeError','SecurityError','ReferenceError','SyntaxError','RangeError'];stats.readerErrors.push({stage,type:names.includes(e?.name)?e.name:'UnknownError'});};
  while(stack.length){
    const {win,depth}=stack.shift();if(visited.has(win)||depth>6)continue;visited.add(win);
    let doc;
    try{doc=win.document;}catch(e){if(e?.name==='SecurityError')stats.blockedFrames++;else fault('document',e);continue;}
    stats.documents++;stats.maxDepth=Math.max(depth,stats.maxDepth);
    // Diagnostic failures must never prevent actual extraction or frame discovery.
    for(const [key,selector] of [['tables','table'],['nestedTables','table table'],['cards','.timetable_con'],['frameElements','iframe,frame']]){
      try{stats[key]+=doc.querySelectorAll(selector).length;}catch(e){fault(key,e);}
    }
    try{const cells=doc.querySelectorAll('th,td');for(let i=0;i<cells.length;i++)if(/^(星期|周)[一二三四五六日天]/.test(String(cells[i].textContent||'').replace(/\s/g,'')))stats.weekdayCells++;}catch(e){fault('weekdayCells',e);}
    try{return extractSchoolDocument(doc);}catch(e){errors.push(String(e.message));fault('extract',e);}
    try{for(const frame of nodes(doc.querySelectorAll('iframe,frame'))){
      let blocked=false;try{void frame.contentWindow.document;}catch(e){blocked=e?.name==='SecurityError';}
      if(!blocked)continue;
      try{
        const url=new URL(frame.getAttribute('src')||'',doc.baseURI),r=frame.getBoundingClientRect(),style=win.getComputedStyle(frame);
        if(!['http:','https:'].includes(url.protocol))continue;
        if(!stats.frameOrigins.includes(url.origin))stats.frameOrigins.push(url.origin);
        if(frame.hasAttribute('src')&&!frame.hasAttribute('srcdoc')&&r.width>=160&&r.height>=100&&style.display!=='none'&&style.visibility!=='hidden'&&style.opacity!=='0'&&!url.username&&!url.password&&url.hostname.endsWith('.scut.edu.cn')&&!framePages.some(p=>p.url===url.href))framePages.push({url:url.href,area:r.width*r.height});
      }catch(e){fault('frameSource',e);}
    }}catch(e){fault('frameElements',e);}
    try{for(let i=0;i<win.frames.length;i++)stack.push({win:win.frames[i],depth:depth+1});}catch(e){fault('frameTraversal',e);}
  }
  const runtime=stats.readerErrors.some(e=>e.type!=='Error');
  return {error:runtime?'读取组件遇到页面兼容性错误。请复制诊断反馈，或先使用 PDF 导入。':errors[0]||'课表内嵌页面无法读取，请使用学校输出的 PDF 导入。',diagnostic:JSON.stringify(stats),framePages:framePages.sort((a,b)=>b.area-a.area).slice(0,8).map(p=>p.url)};
}
