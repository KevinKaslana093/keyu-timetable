import test from 'node:test';
import assert from 'node:assert/strict';
import {readSchoolPage} from '../web/school-reader.js';

test('diagnostic query errors are not counted as blocked frames and do not skip traversal',()=>{
  const doc={querySelectorAll(selector){if(selector==='th,td')throw new TypeError('private course data must not be copied');return [];}};
  const child={get document(){throw Object.assign(new Error('private frame address'),{name:'SecurityError'});}};
  const result=readSchoolPage({document:doc,frames:[child]}),stats=JSON.parse(result.diagnostic);
  assert.equal(stats.documents,1);assert.equal(stats.blockedFrames,1);
  assert.ok(stats.readerErrors.some(e=>e.stage==='weekdayCells'&&e.type==='TypeError'));
  assert.ok(!result.diagnostic.includes('private'));
  const onlyRoot=JSON.parse(readSchoolPage({document:doc,frames:[]}).diagnostic);
  assert.equal(onlyRoot.blockedFrames,0);
});

test('non-security document errors have their own stage',()=>{
  const root={get document(){throw new TypeError('private');}};
  const stats=JSON.parse(readSchoolPage(root).diagnostic);
  assert.equal(stats.blockedFrames,0);assert.deepEqual(stats.readerErrors,[{stage:'document',type:'TypeError'}]);
});
