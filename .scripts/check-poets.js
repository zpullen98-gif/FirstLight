/* Study navigation, source mappings, safe rendering and record preservation.
   Exact textual evidence is held in the study audit. Run with an optional public root. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
let checks=0;const ok=(value,message)=>{assert.ok(value,message);checks++;};
const nodes={},announcements=[];
const ctx=vm.createContext({console,Date,Math,JSON,Number,String,Object,Array,setTimeout(){},clearTimeout(){},window:{addEventListener(){}},document:{addEventListener(){},getElementById:id=>nodes[id]||null,querySelector:()=>null},location:{hash:''},FL_ACTS:{},FL_VIEWS:{},esc:s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'),render(){},announce:s=>announcements.push(s)});
const load=f=>vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
['js/store.js','js/data-anthology.js','js/data-dawn-cast.js','js/data-dawn-writers.js','js/data-poets.js','js/anthology.js','js/ui-dawn-cast.js','js/ui-dawn-writers.js','js/ui-poets.js','js/ui-anthology.js'].forEach(load);
const before=JSON.stringify(ctx.FL),dataBefore=JSON.stringify([ctx.DAWN_POETS,ctx.DAWN_WRITERS,ctx.DAWN_QUOTES]);
ok(ctx.DAWN_POETS.length===2,'Two studies');
ok(ctx.DAWN_QUOTES.length===1133,'200 added source selections');
const allIds=new Set(),allTexts=new Set();
for(const p of ctx.DAWN_POETS){
 ok(['shakespeare','chaucer'].includes(p.id),'Known author route');
 ok(p.quoteIds.length===100 && new Set(p.quoteIds).size===100,p.name+' has exactly 100 fresh selections');
 ok(p.works.length>=15,p.name+' covers a broad range of works or sections');
 ok(new Set(p.works.map(w=>w.id)).size===p.works.length,p.name+' work IDs are unique');
 const writer=ctx.dawnWriter(p.writerId);
 ok(writer.quoteIds.length===110 && writer.previousQuoteIds.length===10,p.name+' preserves the earlier ten alongside the new hundred');
 ok(p.quoteIds.every(id=>writer.quoteIds.includes(id)),p.name+' shares entries with the anthology');
 ok(writer.previousQuoteIds.every(id=>!p.quoteIds.includes(id)),p.name+' additions do not reuse the previous shelf');
 ok((ctx.FL_VIEWS.anthology.render('writer-'+p.writerId).match(/data-quote-id=/g)||[]).length===10,p.name+' earlier shelf remains readable');
 ok(ctx.FL_VIEWS.anthology.render('writer-'+p.writerId).includes('#/poets/'+p.id),p.name+' earlier shelf links the full study');
 ok(ctx.dawnWriterIndex().includes('href="#/poets/'+p.id+'"'),p.name+' author card opens the dedicated study');
 for(const w of p.works){
  ok(/^[a-z0-9-]+$/.test(w.id)&&w.title&&w.genre&&w.edition&&w.orientation&&w.note,'Complete work metadata '+w.id);
  ok(/^https:\/\//.test(w.url)&&new URL(w.url).hostname&&w.access==='Free full text','Free linked edition '+w.id);
  ok(w.questions.length>=2&&w.questions.every(q=>typeof q==='string'&&q.length>15),'Work-specific questions '+w.id);
  ok(p.quoteIds.some(id=>ctx.dawnById(id).studyWorkId===w.id),'Each linked work is represented '+w.id);
  const route=ctx.poetRoute(p.id+'/work/'+w.id);
  ok(route.valid && route.work.id===w.id,'Work route resolves '+w.id);
  ok(ctx.poetRows(p,route.work).every(q=>q.studyWorkId===w.id),'Work filter is exact '+w.id);
 }
 for(const id of p.quoteIds){
  const q=ctx.dawnById(id);ok(q&&!allIds.has(id),'Distinct new reference '+id);allIds.add(id);
  const text=ctx.dawnNorm(q.text);ok(!allTexts.has(text),'Distinct new wording '+id);allTexts.add(text);
  ok(q.author===p.name&&q.daily===false&&q.kind==='words'&&q.collection==='stage','Author and library-only scope '+id);
  ok(p.works.some(w=>w.id===q.studyWorkId),'Passage has a work '+id);
  ok(q.themes.length>0&&q.themes.length<=2&&q.themes.every(t=>ctx.POET_THEMES.includes(t)),'Named themes '+id);
  ok(q.studyPrompt&&q.studyPrompt.length>15&&q.context&&q.locator&&q.sources.length,'Study and evidence '+id);
  if(p.id==='chaucer')ok(q.gloss&&q.gloss.length>10,'Chaucer has a reading aid '+id);
  const card=ctx.dawnCard(q);ok(card.includes('Study this passage')&&card.includes('#/poets/'+p.id+'/work/'+q.studyWorkId),'Study card and return link '+id);
  if(q.gloss)ok(card.includes('An original reading aid, not a quotation'),'Gloss is distinguished from text '+id);
  ok(!/—|&mdash;| -- /.test(JSON.stringify(q)),'Dash-free new content '+id);
 }
 ok(p.path.length>=4&&p.path.every(step=>p.works.some(w=>w.id===step.workId)&&step.title&&step.note),'Reading path uses real works '+p.id);
 const page=ctx.poetRender(p.id);ok((page.match(/data-quote-id=/g)||[]).length===12,'Study begins with twelve passages '+p.id);
 ok((ctx.poetRender(p.id+'/works').match(/class="poet-work-card"/g)||[]).length===p.works.length,'Every free edition is listed '+p.id);
 ok(ctx.poetRender(p.id+'/path').includes('Carry a question into the day'),'Reading path prompts reflection '+p.id);
 const state=ctx.poetState(p.id);
 for(const theme of ctx.POET_THEMES){state.theme=theme;ok(ctx.poetRows(p,null).every(q=>q.themes.includes(theme)),'Theme filter '+p.id+' '+theme);}
 state.theme='all';state.query=ctx.dawnById(p.quoteIds[0]).text;
 ok(ctx.poetRows(p,null).some(q=>q.id===p.quoteIds[0]),'Exact passage searchable '+p.id);
 state.query='<script>impossible-query';const empty=ctx.poetRender(p.id);ok(empty.includes('No passages match')&&!empty.includes('value="<script>'),'Safe empty search '+p.id);
 state.query='';state.limit=24;ok((ctx.poetRender(p.id).match(/data-quote-id=/g)||[]).length===24,'Pagination '+p.id);state.limit=12;
}
ok(allIds.size===200,'Two hundred distinct additions');
for(const collaborator of ['Middleton','Peele','Wilkins']){
 const q=ctx.DAWN_QUOTES.find(q=>(q.authorCredit||'').includes(collaborator));
 ok(q&&ctx.dawnSearchText(q).includes(collaborator),'Visible collaborator is searchable '+collaborator);
}
for(const route of ['nobody','shakespeare/unknown','shakespeare/work/absent','chaucer/path/extra','__proto__'])ok(ctx.poetRender(route).includes('That study page could not be found.'),'Unknown route recovery '+route);
ok(ctx.poetState('__proto__')===null,'Unknown author cannot mutate filter prototype');
ok(ctx.poetRender().includes('A practice of close reading'),'Study has a starting point');
const hostile={...ctx.dawnById(ctx.DAWN_POETS[1].quoteIds[0]),gloss:'<img src=x onerror=bad()>',studyPrompt:'<script>bad</script>',themes:['<iframe>bad']};
const hostileCard=ctx.dawnCard(hostile);ok(!hostileCard.includes('<script>')&&!hostileCard.includes('<img src=')&&!hostileCard.includes('<iframe>'),'Study commentary escaped');
ok(!ctx.poetTextLink({url:'javascript:alert(1)',title:'<script>bad</script>'},'<img src=x>').includes('<a '),'Unsafe external URL rejected');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8'),app=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
for(const file of ['js/data-poets.js','js/ui-poets.js','css/house-poets.css'])ok(index.includes(file)&&sw.includes(file),'Loaded and offline '+file);
ok(/\['mind'[^\n]*'poets'/.test(app),'Dedicated study tab under Mind');
ok(app.includes("['anthology', 'poets'].indexOf(next.view)"),'Study subroutes move focus and reset scroll');
ok(JSON.stringify(ctx.FL)===before,'Study browsing does not write personal records');
ok(JSON.stringify([ctx.DAWN_POETS,ctx.DAWN_WRITERS,ctx.DAWN_QUOTES])===dataBefore,'Study does not change source data');
console.log('The Poets’ Study: 200 fresh passages; '+checks+' checks passed.');
