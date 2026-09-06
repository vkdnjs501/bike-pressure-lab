import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSettings, normalizePresets, packPresets, parsePresets, mergePresets, presetName, PRESET_LIMIT, PRESET_STORAGE_KEY } from '../presets.js';
const settings = {
  rider:'72', cargo:'10', bikeWeight:'12', wheel:'406', wheelIndex:2,
  widthStandard:'decimal', widthPreset:'50.8000', manualWidth:'50',
  frontWidth:'49.7', rearWidth:'50.2', rimWidth:'25', maxPsi:'60',
  tire:'billyBonkers20', bikeKey:'minivelo', surface:'cycle', special:'dry', region:'seoul', month:'9'
};
const item = (name='내 메인 자전거') => ({name, settings:{...settings}});

test('all form choices and optional measured values survive a file round trip', () => {
  assert.deepEqual(parsePresets(packPresets([item()])),[item()]);
  assert.deepEqual(normalizeSettings(settings),settings);
  const empty = {...settings, manualWidth:'', frontWidth:'', rearWidth:'', rimWidth:'', maxPsi:''};
  assert.deepEqual(normalizeSettings(empty),empty);
});

test('zero to nine presets, integer defaults, and atomic import capacity', () => {
  assert.deepEqual(parsePresets(packPresets([])),[]);
  const nine = Array.from({length:9}, () => item(''));
  assert.equal(parsePresets(packPresets(nine)).length,PRESET_LIMIT);
  assert.equal(presetName(nine[8],8),'마이 프리셋 9');
  assert.throws(()=>packPresets([...nine,item()]));
  assert.throws(()=>mergePresets(nine,[item()]));
  assert.equal(nine.length,9);
  assert.equal(mergePresets(nine.slice(0,8),[item()]).length,9);
  assert.equal(PRESET_STORAGE_KEY,'ybpl.my-presets.v1');
});

test('model and range validation prevents unsafe restored settings', () => {
  for (const change of [{wheel:'559',wheelIndex:5},{maxPsi:'29'},{rider:'999'},{rimWidth:'999'},{month:'12'},{rider:'72junk'},{rider:''},{manualWidth:'Infinity'},{surface:'unknown'},{bikeKey:'__proto__'},{tire:'constructor'},{widthStandard:'fraction',widthPreset:'50.8000'}]) {
    assert.throws(()=>normalizeSettings({...settings,...change}),JSON.stringify(change));
  }
});

test('duplicate BSD dropdown values keep their actual selected label index', () => {
  for(const wheelIndex of [6,7]) assert.equal(normalizeSettings({...settings,tire:'cst',wheel:'622',wheelIndex}).wheelIndex,wheelIndex);
  assert.throws(()=>normalizeSettings({...settings,wheelIndex:7}));
});

test('invalid, oversized, and future-version files never partially import', () => {
  for (const value of ['{bad','null','[]','x'.repeat(128*1024+1),JSON.stringify({app:'other',schemaVersion:1,presets:[]}),JSON.stringify({app:'bike-pressure-lab',schemaVersion:2,presets:[]}),JSON.stringify({app:'bike-pressure-lab',schemaVersion:1,presets:[item(),{name:'broken'}]})]) assert.throws(()=>parsePresets(value));
});

test('bounded names, own schema values, and unknown coefficient stripping', () => {
  assert.throws(()=>normalizePresets([item('가'.repeat(41))]));
  assert.throws(()=>normalizePresets([item('bad\nname')]));
  assert.equal(normalizePresets([item('  내 메인 자전거  ')])[0].name,'내 메인 자전거');
  const rebuilt=normalizeSettings({...settings,factor:0.01,script:'alert(1)'});
  assert(!Object.hasOwn(rebuilt,'factor'));
  assert(!Object.hasOwn(rebuilt,'script'));
});
