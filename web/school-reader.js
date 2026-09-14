// Read course table text only, never forms, cookies or page scripts.
export function extractSchoolDocument(doc) {
  const dayOf=text=>{const m=String(text).replace(/\s/g,'').match(/^(?:星期|周)([一二三四五六日天])$/);return m?Math.min('一二三四五六日天'.indexOf(m[1])+1,7):0;};
  const entries=[],seen=new Set();
  for(const table of doc.querySelectorAll('table')){
    const rows=[...table.rows].filter(r=>r.closest('table')===table);
    const heads=rows.find(r=>[...r.cells].filter(c=>dayOf(c.textContent)).length>=5);
    if(!heads)continue;
    const grid=[],headers=new Map();
    rows.forEach((row,y)=>{grid[y]??=[];let x=0;for(const cell of row.cells){while(grid[y][x])x++;const w=Math.min(cell.colSpan||1,20),h=Math.min(cell.rowSpan||1,100);
      for(let dy=0;dy<h;dy++){grid[y+dy]??=[];for(let dx=0;dx<w;dx++)grid[y+dy][x+dx]=cell;}
      if(row===heads&&dayOf(cell.textContent))for(let dx=0;dx<w;dx++)headers.set(x+dx,dayOf(cell.textContent));
      x+=w;
    }});
    for(let y=rows.indexOf(heads)+1;y<rows.length;y++)for(const [x,day] of headers){
      const cell=grid[y]?.[x];if(!cell||seen.has(cell)||cell.closest('table')!==table)continue;seen.add(cell);
      // A nested table is processed on its own, not twice through the outer cell.
      if(cell.querySelector('table'))continue;
      const cards=[...cell.querySelectorAll('.timetable_con')].filter(c=>!c.parentElement.closest('.timetable_con'));
      for(const card of cards.length?cards:[cell]){
        const copy=card.cloneNode(true);
        copy.querySelectorAll('script,style,input,textarea,select,button').forEach(n=>n.remove());
        for(const [selector,label] of [['.glyphicon-time','时间：'],['.glyphicon-map-marker','地点：'],['.glyphicon-user','教师：']])copy.querySelectorAll(selector).forEach(n=>n.replaceWith(doc.createTextNode('\n'+label)));
        copy.querySelectorAll('br').forEach(n=>n.replaceWith(doc.createTextNode('\n')));
        copy.querySelectorAll('p,div,li').forEach(n=>{n.prepend(doc.createTextNode('\n'));n.append(doc.createTextNode('\n'));});
        const text=copy.textContent.trim();if(!text||!/[节周]/.test(text))continue;
        const title=card.querySelector('.title,.timetable_title,h3,h4,h5,strong');
        entries.push({day,name:title?.textContent.trim()||'',text});
      }
    }
  }
  if(!entries.length)throw Error('未找到课程表。请登录后打开“个人课表查询”，选择学期并查询，切换“表格”后再读取。');
  if(entries.length>1000)throw Error('课程条目过多，请只打开一个学期的个人课表。');
  return {format:'keyu-school-v1',entries};
}
