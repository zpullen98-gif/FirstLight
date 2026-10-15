/* Route, reading-aid, source mapping and state-preservation checks. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
const ctx=vm.createContext({console,Date,Math,JSON,Number,String,Object,Array,setTimeout(){},clearTimeout(){},window:{addEventListener(){}},document:{addEventListener(){},getElementById:()=>null,querySelector:()=>null},location:{hash:''},FL_ACTS:{},FL_VIEWS:{},esc:s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'),render(){},announce(){}});
for(const f of ['store','data-anthology','data-dawn-cast','data-dawn-writers','data-poets','data-canterbury','anthology','ui-dawn-cast','ui-dawn-writers','ui-poets','ui-canterbury'])vm.runInContext(fs.readFileSync(path.join(root,'js',f+'.js'),'utf8'),ctx);
const g=ctx.CANTERBURY_GUIDE,before=JSON.stringify(ctx.FL),content=JSON.stringify(g),ids=new Set();
ok(g.tales.length===24&&g.frames.length===2,'All 24 tales plus two framing pieces');
ok(g.lessons.length===6&&g.glossary.length>=20,'Six lessons and a useful glossary');
ok(g.edition&&g.orderNote&&g.sources.length>=2,'Edition, order and sources identified');
ok(!/—|&mdash;| -- /.test(content),'House prose punctuation');
for(const item of [...g.frames,...g.tales]){
 ok(/^[a-z0-9-]+$/.test(item.id)&&!ids.has(item.id),'Unique safe tale route '+item.id);ids.add(item.id);
 for(const field of ['title','teller','genre','status','locator','connection'])ok(typeof item[field]==='string'&&item[field].length>0,'Tale field '+item.id+' '+field);
 for(const field of ['summary','meaning','notice'])ok(Array.isArray(item[field])&&item[field].length>=2&&item[field].every(s=>typeof s==='string'&&s.length>15),'Substantive reading guidance '+item.id+' '+field);
 ok(/^https:\/\/www\.gutenberg\.org\/.+#/.test(item.sourceUrl),'Original anchored text '+item.id);
 ok(ctx.poetRoute('chaucer/canterbury/tale/'+item.id).valid,'Tale route accepted '+item.id);
 const rendered=ctx.poetRender('chaucer/canterbury/tale/'+item.id);
 ok(rendered.includes(ctx.esc(item.title))&&rendered.includes('What happens, in plain English')&&rendered.includes('What to make of it'),'Summary distinct from interpretation '+item.id);
 for(const id of item.relatedWorkIds||[])ok(ctx.poetById('chaucer').works.some(w=>w.id===id),'Valid existing passage link '+id);
}
for(const lesson of g.lessons){
 ok(!ids.has(lesson.id),'Distinct lesson '+lesson.id);ids.add(lesson.id);
 ok(lesson.locator&&lesson.why&&lesson.chunks.length&&lesson.understanding.length>=2&&lesson.questions.length>=2,'Lesson structure '+lesson.id);
 for(const chunk of lesson.chunks){
  ok(chunk.original.length>20&&chunk.modern.length>20&&chunk.original!==chunk.modern,'Original and learning translation distinct '+lesson.id);
  ok(Array.isArray(chunk.wordNotes)&&chunk.wordNotes.every(n=>n.word&&n.meaning),'Local vocabulary '+lesson.id);
 }
 ok(ctx.poetRoute('chaucer/canterbury/lesson/'+lesson.id).valid,'Lesson resolves '+lesson.id);
 const rendered=ctx.poetRender('chaucer/canterbury/lesson/'+lesson.id);
 ok(rendered.includes('lang="enm"')&&rendered.includes('In current English')&&rendered.includes('original learning translation'),'Original language and commentary clearly labelled '+lesson.id);
 for(const id of lesson.relatedWorkIds||[])ok(ctx.poetById('chaucer').works.some(w=>w.id===id),'Lesson returns to existing passages '+id);
}
for(const item of g.glossary)ok(item.word&&item.meaning&&item.note,'Complete glossary entry '+item.word);
for(const step of g.path){ok(step.title&&step.note,'Reading path step');if(step.taleId)ok(g.tales.concat(g.frames).some(t=>t.id===step.taleId),'Path tale resolves');if(step.lessonId)ok(g.lessons.some(l=>l.id===step.lessonId),'Path lesson resolves');}
for(const mode of ['','tales','lessons','words'])ok(ctx.poetRoute('chaucer/canterbury'+(mode?'/'+mode:'')).valid,'Section resolves '+mode);
for(const route of ['shakespeare/canterbury','chaucer/canterbury/unknown','chaucer/canterbury/tale/missing','chaucer/canterbury/lesson/missing','chaucer/canterbury/words/extra','chaucer/canterbury/tale/'+g.tales[0].id+'/extra'])ok(ctx.poetRender(route).includes('That study page could not be found.'),'Malformed route recovers '+route);
ok(ctx.poetRender('chaucer').includes('Begin the Canterbury journey'),'Chaucer starts with invitation');
ok(!ctx.poetRender('shakespeare').includes('Begin the Canterbury journey'),'Shakespeare study unaffected');
const allChaucerIds=ctx.DAWN_WRITERS.find(p=>p.id===ctx.poetById('chaucer').writerId).quoteIds;
ok(allChaucerIds.length===110,'Complete Chaucer shelf reviewed');
for(const q of allChaucerIds.map(ctx.dawnById)){
 const card=ctx.dawnCard(q);
 ok(card.indexOf('In plain English.')<card.indexOf('<details'),'Meaning visible without opening details '+q.id);
 ok(card.includes(ctx.esc(q.text)),'Original retained '+q.id);
}
ctx.canterburyQuery='';ok(ctx.canterburyMatches().length===24,'All tales found');
ctx.canterburyQuery='Prioress';ok(ctx.canterburyMatches().some(t=>/Prioress/.test(t.title)),'Find a teller');
ctx.canterburyQuery='<script>nothingmatches';const empty=ctx.canterburyTales();ok(empty.includes('No tales match')&&!empty.includes('value="<script>'),'Escaped empty query');
ctx.canterburyQuery='';
const hostile=JSON.parse(JSON.stringify(g.lessons[0]));hostile.title='<script>bad</script>';hostile.chunks[0].original='<img src=x onerror=bad()>';hostile.chunks[0].modern='<iframe>bad';
const safe=ctx.canterburyLesson(hostile);ok(!safe.includes('<script>')&&!safe.includes('<img src=')&&!safe.includes('<iframe>'),'Source and explanation escaped');
ok(!ctx.canterburyExternal('javascript:alert(1)','unsafe').includes('<a '),'Unsafe external link rejected');
for(const html of [ctx.canterburyBegin(),ctx.canterburyTales(),ctx.canterburyLessons(),ctx.canterburyWords(),...g.lessons.map(ctx.canterburyLesson),...g.tales.concat(g.frames).map(ctx.canterburyTale)])for(const match of html.matchAll(/href="#\/poets\/([^"#]+)"/g))ok(ctx.poetRoute(match[1]).valid,'Rendered internal link resolves '+match[1]);
const index=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
for(const f of ['js/data-canterbury.js','js/ui-canterbury.js'])ok(index.includes(f)&&sw.includes(f),'Loaded and available offline '+f);
ok(JSON.stringify(ctx.FL)===before,'No personal record mutations');ok(JSON.stringify(g)===content,'Reading leaves content immutable');
console.log('Canterbury companion: 24 tales, six lessons, '+checks+' checks passed.');
