const {JSDOM}=require('jsdom');
const {readFileSync}=require('node:fs');
const assert=require('node:assert/strict');
const {test}=require('node:test');
const html=readFileSync(require('node:path').resolve(__dirname,'../preview-single-file.html'),'utf8');
const key='ybpl.my-presets.v1';
function app(initial=null) {
 const dom=new JSDOM(html,{url:'https://test.example/bike-pressure-lab/',runScripts:'dangerously',beforeParse(w){w.confirm=()=>true;if(initial!==null)w.localStorage.setItem(key,initial);}});
 const w=dom.window,d=w.document,$=id=>d.getElementById(id),click=id=>$(id).click();
 function input(id,value){$(id).value=value;$(id).dispatchEvent(new w.Event('input',{bubbles:true}));}
 function choose(id,value){$(id).value=value;$(id).dispatchEvent(new w.Event('change',{bubbles:true}));}
 async function importText(text){const input=$('presetFile');Object.defineProperty(input,'files',{configurable:true,value:[{size:text.length,text:async()=>text}]});input.dispatchEvent(new w.Event('change'));await new Promise(r=>setImmediate(r));}
 return {w,d,$,click,input,choose,importText};
}
test('edit completion is the only commit; collapse keeps draft; reload retains all settings',()=>{
 const a=app();assert.equal(a.$('presetPanel').open,false);a.choose('tire','billyBonkers20');a.input('frontWidth','49.7');a.input('rearWidth','50.2');a.input('rimWidth','25');a.input('maxPsi','60');
 a.click('presetCreate');a.input('preset-name-0','내 메인 자전거');assert.equal(a.w.localStorage.getItem(key),null);
 a.$('presetPanel').open=false;assert.equal(a.w.localStorage.getItem(key),null);a.$('presetPanel').open=true;assert.equal(a.$('preset-name-0').value,'내 메인 자전거');
 a.click('presetDone');const stored=a.w.localStorage.getItem(key);assert(stored);assert(!a.$('presetPanel').open);assert(a.$('presetPending').hidden);
 const b=app(stored);assert.equal(b.$('presetCount').textContent,'1 / 9');b.d.querySelector('[data-action="load"]').click();
 for(const [id,value] of Object.entries({frontWidth:'49.7',rearWidth:'50.2',rimWidth:'25',maxPsi:'60',tire:'billyBonkers20',manualWidth:'50',widthPreset:'50.8000',wheel:'406'}))assert.equal(b.$(id).value,value);
 assert.notEqual(b.$('frontPsi').textContent,'—');a.w.close();b.w.close();
});
test('nine-slot cap, sequential names, deletion and rename can be cancelled before commit',()=>{
 const a=app();for(let i=0;i<9;i++)a.click('presetCreate');assert(a.$('presetCreate').disabled);a.click('presetCreate');assert.equal(a.d.querySelectorAll('.preset-card').length,9);assert.equal(a.$('preset-name-8').value,'마이 프리셋 9');a.click('presetDone');
 const saved=a.w.localStorage.getItem(key);a.input('preset-name-0','temporary');a.d.querySelector('[data-action="delete"]').click();assert.equal(a.d.querySelectorAll('.preset-card').length,8);assert.equal(a.w.localStorage.getItem(key),saved);a.click('presetCancel');assert.equal(a.d.querySelectorAll('.preset-card').length,9);assert.equal(a.$('preset-name-0').value,'마이 프리셋 1');a.w.close();
});
test('overwrite requires explicit action and completion; delete-all survives reload',()=>{
 const a=app();a.click('presetCreate');a.click('presetDone');a.input('rider','90');a.d.querySelector('[data-action="overwrite"]').click();assert.equal(JSON.parse(a.w.localStorage.getItem(key)).presets[0].settings.rider,'70');a.click('presetDone');assert.equal(JSON.parse(a.w.localStorage.getItem(key)).presets[0].settings.rider,'90');a.d.querySelector('[data-action="delete"]').click();a.click('presetDone');assert.deepEqual(JSON.parse(a.w.localStorage.getItem(key)).presets,[]);a.w.close();
});
test('storage failure preserves draft, reports failure, and never says saved',()=>{
 const a=app();a.click('presetCreate');a.$('presetPanel').open=true;
 a.w.Storage.prototype.setItem=()=>{throw new a.w.DOMException('quota','QuotaExceededError')};
 a.click('presetDone');assert.equal(a.$('presetPanel').open,true);assert(!a.$('presetPending').hidden);assert.match(a.$('presetNotice').textContent,/저장하지 못했습니다/);assert.equal(a.d.querySelectorAll('.preset-card').length,1);a.w.close();
});
test('malformed/oversized import is atomic; valid import still needs completion',async()=>{
 const a=app();a.click('presetCreate');a.click('presetDone');const saved=a.w.localStorage.getItem(key);
 await a.importText('{broken');assert.equal(a.d.querySelectorAll('.preset-card').length,1);assert.equal(a.w.localStorage.getItem(key),saved);
 await a.importText('x'.repeat(128*1024+1));assert.match(a.$('presetNotice').textContent,/128KB/);
 await a.importText(saved);assert.equal(a.d.querySelectorAll('.preset-card').length,2);assert.equal(a.w.localStorage.getItem(key),saved);a.click('presetDone');assert.equal(JSON.parse(a.w.localStorage.getItem(key)).presets.length,2);
 const eight={...JSON.parse(saved),presets:Array.from({length:8},()=>JSON.parse(saved).presets[0])};await a.importText(JSON.stringify(eight));assert.equal(a.d.querySelectorAll('.preset-card').length,2);assert.match(a.$('presetNotice').textContent,/남은 자리는 7개/);a.w.close();
});
test('another tab changing storage cannot be silently overwritten',()=>{
 const a=app();a.click('presetCreate');a.w.localStorage.setItem(key,JSON.stringify({app:'bike-pressure-lab',schemaVersion:1,presets:[]}));a.click('presetDone');assert.match(a.$('presetNotice').textContent,/다른 창/);assert.equal(JSON.parse(a.w.localStorage.getItem(key)).presets.length,0);a.w.close();
});
test('names are displayed as text and optional empty values clear previously loaded measurements',()=>{
 const a=app();a.click('presetCreate');a.input('preset-name-0','<img src=x onerror=alert(1)>');a.click('presetDone');assert.equal(a.d.querySelectorAll('#presetList img').length,0);
 a.input('frontWidth','32');a.input('maxPsi','30');a.d.querySelector('[data-action="load"]').click();assert.equal(a.$('frontWidth').value,'');assert.equal(a.$('maxPsi').value,'');a.w.close();
});

test('Billy Bonkers applies 20-inch, nominal 2.00-inch, ETRTO 50 mm, and MINI VELO once per product entry',()=>{
 const a=app();
 a.choose('tire','billyBonkers20');
 assert.equal(a.$('wheel').value,'406');
 assert.equal(a.$('widthStandard').value,'decimal');
 assert.equal(a.$('widthPreset').value,'50.8000');
 assert.equal(a.$('manualWidth').value,'50');
 assert.equal(a.$('widthResolved').value,'50.0 mm');
 assert.equal(a.d.querySelector('input[name="bike"]:checked').value,'minivelo');
 a.input('manualWidth','49.5');a.d.querySelector('input[value="road"]').click();
 a.choose('tire','billyBonkers20');
 assert.equal(a.$('manualWidth').value,'49.5');
 assert.equal(a.d.querySelector('input[name="bike"]:checked').value,'road');
 a.choose('tire','cst');a.choose('tire','billyBonkers20');
 assert.equal(a.$('manualWidth').value,'50');
 assert.equal(a.d.querySelector('input[name="bike"]:checked').value,'minivelo');
 a.w.close();
});

test('switching from Billy to 700x28C removes stale widths and calculates the 90kg road setup',()=>{
 const a=app();a.choose('tire','billyBonkers20');
 a.input('frontWidth','50');a.input('rearWidth','50');
 a.choose('tire','schwalbeOne');a.choose('wheel','622');
 a.d.querySelector('input[value="road"]').click();
 a.input('rider','78');a.input('cargo','0');a.input('bikeWeight','12');
 a.choose('region','seoul');a.choose('month','8');
 a.choose('widthStandard','c');a.choose('widthPreset','28.0000');
 for(const id of ['manualWidth','frontWidth','rearWidth'])assert.equal(a.$(id).value,'');
 assert.equal(a.$('widthResolved').value,'28.0 mm');
 assert.equal(a.$('frontPsi').textContent,'93.5');
 assert.equal(a.$('rearPsi').textContent,'101.0');
 assert.equal(a.$('tireInfo'),null);
 a.input('frontWidth','29');a.input('rearWidth','30');
 assert.equal(a.$('widthResolved').value,'앞 29.0 / 뒤 30.0 mm');
 a.choose('widthPreset','28.0000');assert.equal(a.$('widthResolved').value,'28.0 mm');
 a.w.close();
});

test('export prepares a reusable download link with validated round-trip data', async()=>{
 const a=app();let blob;let clicked=0;
 a.w.URL.createObjectURL=value=>{blob=value;return 'blob:https://test.example/preset-test';};
 a.w.URL.revokeObjectURL=()=>{};
 a.w.HTMLAnchorElement.prototype.click=function(){clicked++;};
 a.click('presetCreate');a.input('preset-name-0','내 메인 자전거');a.click('presetDone');a.click('presetExport');
 assert.equal(clicked,1);assert.equal(a.$('presetDownload').hidden,false);assert.equal(a.$('presetDownload').download,'bike-pressure-presets.json');
 const text=await new Promise((resolve,reject)=>{const reader=new a.w.FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsText(blob);});
 assert.equal(JSON.parse(text).presets[0].name,'내 메인 자전거');
 assert.equal(JSON.parse(text).presets[0].settings.rider,'70');
 await a.importText(text);assert.equal(a.d.querySelectorAll('.preset-card').length,2);a.w.close();
});
