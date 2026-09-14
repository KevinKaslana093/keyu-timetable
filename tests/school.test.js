import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSchoolPayload} from '../web/school.js';
const payload=entries=>({format:'keyu-school-v1',entries});
test('school page retains different weeks and rooms across two time blocks',()=>{
 const r=parseSchoolPayload(payload([{day:3,name:'虚构海洋学',text:'虚构海洋学\n时间：(1-2节)3-7周(单),10-14周(双)\n地点：实验楼 A1\n教师：示例老师\n时间：(3-4节)15-18周\n地点：实验楼 B2\n教师：另一老师'}]));
 assert.equal(r.courses.length,2);assert.deepEqual(r.courses[0].weeks,[3,5,7,10,12,14]);assert.equal(r.courses[1].room,'实验楼 B2');assert.equal(r.courses[1].teacher,'另一老师');
});
test('school import deduplicates table echoes and rejects invalid timing',()=>{
 const e={day:1,name:'课程甲',text:'课程甲\n(1-2节)3-5周\n地点：A1'};
 assert.equal(parseSchoolPayload(payload([e,e])).courses.length,1);
 assert.throws(()=>parseSchoolPayload(payload([{...e,text:'课程甲(1-2节)未知周数'}])));
 assert.throws(()=>parseSchoolPayload(payload([{...e,text:'课程甲(1-2节)3-5周\n(3-4节)未知'}])));
 assert.throws(()=>parseSchoolPayload(payload([{...e,day:8}])));
});
