import test from 'node:test';
import assert from 'node:assert/strict';
import {CAMPUS_SLOTS,campusForSlots} from '../web/campus.js';
import {course,emptySchedule,validateSchedule,events,exportICS} from '../web/core.js';
test('campus switch changes event and calendar times without changing course slots or dates',()=>{
 const base={...emptySchedule(),startDate:'2026-08-31',courses:[course({name:'测试课',day:1,start:1,end:2,weeks:'3'})]};
 const a=validateSchedule({...base,slots:CAMPUS_SLOTS.university}),b=validateSchedule({...base,slots:CAMPUS_SLOTS.wushan});
 assert.equal(events(a)[0].from,'08:50');assert.equal(events(b)[0].from,'08:00');assert.equal(events(a)[0].date,events(b)[0].date);
 assert.match(exportICS(a),/DTSTART:20260914T005000Z/);assert.match(exportICS(b),/DTSTART:20260914T000000Z/);
 assert.equal(campusForSlots(a.slots),'university');assert.equal(campusForSlots(['08:10-08:55']),'custom');
 assert.equal(CAMPUS_SLOTS.university[10],'20:50-21:35');assert.equal(CAMPUS_SLOTS.wushan[4],'14:30-15:15');
});
