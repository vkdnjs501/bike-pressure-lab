import { DATA } from "./data.js";
import { validateInput } from "./engine.js";

export const PRESET_STORAGE_KEY = "ybpl.my-presets.v1";
export const PRESET_LIMIT = 9;
export const PRESET_FIELDS = [
  "rider", "cargo", "bikeWeight", "wheel", "widthStandard", "widthPreset",
  "tire", "surface", "special", "region", "month", "manualWidth",
  "frontWidth", "rearWidth", "rimWidth", "maxPsi"
];
const WHEEL_VALUES = ["305", "355", "406", "457", "507", "559", "622", "622", "584"];
const FILE_LIMIT = 128 * 1024;
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const clonePresets = value => value.map(item => ({ name: item.name, settings: { ...item.settings } }));
export const presetName = (item, index) => item.name || `마이 프리셋 ${index + 1}`;

// Rebuild from a fixed schema; files never supply coefficients or executable code.
export function normalizeSettings(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("프리셋의 입력값 형식을 확인하세요.");
  const settings = {};
  for (const key of [...PRESET_FIELDS, "bikeKey"]) {
    if (!own(value, key) || typeof value[key] !== "string" || value[key].length > 64) throw new Error("프리셋에 필요한 입력값이 없거나 올바르지 않습니다.");
    settings[key] = value[key];
  }
  if (!Number.isInteger(value.wheelIndex) || WHEEL_VALUES[value.wheelIndex] !== settings.wheel) throw new Error("저장한 휠 규격을 확인하세요.");
  settings.wheelIndex = value.wheelIndex;
  for (const [field, options] of [["bikeKey", DATA.bikes], ["tire", DATA.tires], ["surface", DATA.surfaces], ["special", DATA.specials], ["region", DATA.regions], ["widthStandard", DATA.widths]]) {
    if (!own(options, settings[field])) throw new Error("이 버전에서 지원하지 않는 선택값이 있습니다.");
  }
  if (!DATA.widths[settings.widthStandard].some(([, mm]) => mm.toFixed(4) === settings.widthPreset)) throw new Error("타이어 폭 규격을 확인하세요.");
  const numberValue = (key, optional = false) => {
    const text = settings[key];
    if (optional && text === "") return NaN;
    if (text.trim() === "" || !Number.isFinite(Number(text))) throw new Error("숫자 입력값을 확인하세요.");
    return Number(text);
  };
  const width = settings.manualWidth === "" ? Number(settings.widthPreset) : numberValue("manualWidth");
  const input = {
    rider: numberValue("rider"), cargo: numberValue("cargo"), bikeWeight: numberValue("bikeWeight"),
    wheel: Number(settings.wheel), width,
    frontWidth: settings.frontWidth === "" ? width : numberValue("frontWidth"),
    rearWidth: settings.rearWidth === "" ? width : numberValue("rearWidth"),
    rimWidth: numberValue("rimWidth", true), maxPsi: numberValue("maxPsi", true),
    bike: DATA.bikes[settings.bikeKey], tireKey: settings.tire, tire: DATA.tires[settings.tire],
    surface: DATA.surfaces[settings.surface], special: DATA.specials[settings.special],
    regionKey: settings.region, month: numberValue("month")
  };
  if (!validateInput(input)) throw new Error("입력 범위와 타이어·휠 조합을 확인한 뒤 다시 저장하세요.");
  return settings;
}

export function normalizePresets(items) {
  if (!Array.isArray(items) || items.length > PRESET_LIMIT) throw new Error("프리셋은 최대 9개까지 저장할 수 있습니다.");
  return items.map(item => {
    if (!item || typeof item.name !== "string" || item.name.length > 40 || /[\u0000-\u001f\u007f]/.test(item.name)) throw new Error("자전거 이름은 40자 이내로 입력하세요.");
    return { name: item.name.trim(), settings: normalizeSettings(item.settings) };
  });
}

export function packPresets(items) {
  return JSON.stringify({ app: "bike-pressure-lab", schemaVersion: 1, presets: normalizePresets(items) });
}

export function parsePresets(text) {
  if (typeof text !== "string" || text.length > FILE_LIMIT) throw new Error("프리셋 파일은 128KB 이하만 가져올 수 있습니다.");
  let value;
  try { value = JSON.parse(text); } catch { throw new Error("올바른 프리셋 파일이 아닙니다."); }
  if (!value || value.app !== "bike-pressure-lab" || value.schemaVersion !== 1) throw new Error("이 버전의 Bike Pressure Lab 프리셋 파일을 선택하세요.");
  return normalizePresets(value.presets);
}

export function mergePresets(current, incoming) {
  if (current.length + incoming.length > PRESET_LIMIT) throw new Error(`남은 자리는 ${PRESET_LIMIT - current.length}개입니다. 파일의 ${incoming.length}개를 모두 추가할 수 없습니다.`);
  return normalizePresets([...current, ...incoming]);
}

export function initPresets({ capture, restore }) {
  const el = id => document.getElementById(id);
  const panel = el("presetPanel");
  const list = el("presetList");
  let saved = [];
  let draft = [];
  let baseline = null;
  let selectedIndex = -1;
  let editorIndex = -1;
  let dirty = false;
  let importBusy = false;
  let unreadable = false;
  let downloadUrl = null;

  function notice(message, warning = false) {
    const node = el("presetNotice");
    node.textContent = message;
    node.hidden = !message;
    node.classList.toggle("warn", warning);
  }

  function updateControls() {
    dirty = JSON.stringify(draft) !== JSON.stringify(saved);
    el("presetCount").textContent = `${draft.length} / ${PRESET_LIMIT}`;
    el("presetPending").hidden = !dirty;
    el("presetCreate").disabled = draft.length >= PRESET_LIMIT || importBusy;
    el("presetCapacity").hidden = draft.length < PRESET_LIMIT;
    el("presetExport").disabled = draft.length === 0;
    el("presetCancel").disabled = !dirty;
    el("presetDone").disabled = importBusy;
    el("presetImport").disabled = importBusy;
    el("presetEmpty").hidden = draft.length > 0;
  }

  function button(text, action, index, className = "preset-button") {
    const node = document.createElement("button");
    node.type = "button";
    node.className = className;
    node.textContent = text;
    node.dataset.action = action;
    node.dataset.index = String(index);
    return node;
  }

  function render() {
    list.replaceChildren(...draft.map((item, index) => {
      const card = document.createElement("div");
      card.className = "preset-card";
      card.classList.toggle("is-active", index === selectedIndex);
      const row = document.createElement("div");
      row.className = "preset-row";
      const load = button("", "load", index, "preset-load");
      load.setAttribute("aria-label", `${presetName(item, index)} 불러오기`);
      const title = document.createElement("strong");
      title.textContent = presetName(item, index);
      const info = document.createElement("small");
      const s = item.settings;
      const width = s.manualWidth || String(Number(s.widthPreset));
      info.textContent = `${DATA.tires[s.tire].label} · ${width} mm`;
      load.append(title, info);
      const edit = button("편집", "edit", index);
      edit.setAttribute("aria-label", `${presetName(item, index)} 편집`);
      edit.setAttribute("aria-expanded", String(editorIndex === index));
      edit.setAttribute("aria-controls", `preset-editor-${index}`);
      row.append(load, edit);
      const editor = document.createElement("div");
      editor.className = "preset-editor";
      editor.id = `preset-editor-${index}`;
      editor.hidden = editorIndex !== index;
      const label = document.createElement("label");
      label.htmlFor = `preset-name-${index}`;
      label.textContent = `자전거 이름 ${index + 1}`;
      const name = document.createElement("input");
      name.id = label.htmlFor;
      name.type = "text";
      name.maxLength = 40;
      name.value = presetName(item, index);
      name.dataset.index = String(index);
      name.autocomplete = "off";
      const actions = document.createElement("div");
      actions.className = "preset-actions";
      actions.append(button("현재 값으로 갱신", "overwrite", index), button("내보내기", "export", index), button("삭제", "delete", index, "preset-button preset-delete"));
      editor.append(label, name, actions);
      card.append(row, editor);
      return card;
    }));
    updateControls();
  }

  function focusName() {
    const input = el(`preset-name-${editorIndex}`);
    if (input) { input.focus(); input.select(); }
  }

  function download(items) {
    const blob = new Blob([packPresets(items)], { type: "application/json" });
    const previousUrl = downloadUrl;
    downloadUrl = URL.createObjectURL(blob);
    const anchor = el("presetDownload");
    anchor.href = downloadUrl;
    anchor.hidden = false;
    anchor.click();
    if (previousUrl) setTimeout(() => URL.revokeObjectURL(previousUrl), 30000);
    notice("파일 저장을 요청했습니다. 다운로드가 시작되지 않으면 ‘프리셋 파일 받기’를 눌러 주세요.");
  }

  function finish() {
    if (importBusy) return;
    if (!dirty) {
      panel.open = false;
      el("presetSummary").focus();
      return;
    }
    let text;
    try { text = packPresets(draft); }
    catch (error) { notice(error.message, true); return; }
    try {
      const current = window.localStorage.getItem(PRESET_STORAGE_KEY);
      if (current !== baseline) throw new Error("다른 창에서 저장 내용이 바뀌었습니다. 편집 중인 목록을 내보낸 뒤 새로고침해 주세요.");
      if (unreadable && !window.confirm("기존 저장 정보를 읽을 수 없습니다. 지금 편집한 목록으로 교체할까요?")) return;
      window.localStorage.setItem(PRESET_STORAGE_KEY, text);
      baseline = text;
      saved = parsePresets(text);
      draft = clonePresets(saved);
      unreadable = false;
      editorIndex = -1;
      render();
      panel.open = false;
      notice(`프리셋 ${saved.length}개를 저장했습니다.`);
      el("presetSummary").focus();
    } catch (error) {
      notice(error instanceof Error && error.message.includes("다른 창") ? error.message : "기기에 저장하지 못했습니다. 편집 내용은 열어 둔 화면에 남아 있으니 파일로 내보내 주세요.", true);
    }
  }

  el("presetCreate").addEventListener("click", () => {
    if (draft.length >= PRESET_LIMIT || importBusy) return;
    try {
      const settings = normalizeSettings(capture());
      draft.push({ name: "", settings });
      editorIndex = draft.length - 1;
      render();
      focusName();
      notice("현재 입력값을 담았습니다. 이름을 정한 뒤 편집 완료를 눌러 저장하세요.");
    } catch (error) { notice(error.message, true); }
  });

  list.addEventListener("input", event => {
    const node = event.target;
    if (!(node instanceof HTMLInputElement)) return;
    const index = Number(node.dataset.index);
    if (!draft[index]) return;
    draft[index].name = node.value.trim() === `마이 프리셋 ${index + 1}` ? "" : node.value;
    const row = node.closest(".preset-card").querySelector(".preset-row");
    row.querySelector("strong").textContent = presetName(draft[index], index);
    row.querySelector(".preset-load").setAttribute("aria-label", `${presetName(draft[index], index)} 불러오기`);
    updateControls();
  });

  list.addEventListener("click", event => {
    const target = event.target.closest("button[data-action]");
    if (!target || !list.contains(target)) return;
    const index = Number(target.dataset.index);
    const item = draft[index];
    if (!item) return;
    try {
      switch (target.dataset.action) {
        case "load":
          restore(normalizeSettings(item.settings));
          selectedIndex = index;
          render();
          list.querySelectorAll(".preset-load")[index].focus();
          notice(`${presetName(item, index)} 설정을 불러와 다시 계산했습니다.`);
          break;
        case "edit":
          editorIndex = editorIndex === index ? -1 : index;
          render();
          if (editorIndex >= 0) focusName();
          else list.querySelectorAll('[data-action="edit"]')[index].focus();
          break;
        case "overwrite": {
          const settings = normalizeSettings(capture());
          if (!window.confirm(`${presetName(item, index)}의 입력값을 현재 값으로 바꿀까요? 편집 완료를 누르면 저장됩니다.`)) return;
          item.settings = settings;
          render();
          notice("현재 입력값으로 바꿨습니다. 편집 완료를 눌러 저장하세요.");
          break;
        }
        case "delete":
          if (!window.confirm(`${presetName(item, index)}을 삭제할까요? 편집 완료 전에는 변경 취소로 되돌릴 수 있습니다.`)) return;
          draft.splice(index, 1);
          selectedIndex = selectedIndex === index ? -1 : selectedIndex > index ? selectedIndex - 1 : selectedIndex;
          editorIndex = -1;
          render();
          el("presetCreate").focus();
          notice("삭제를 반영하려면 편집 완료를 누르세요.");
          break;
        case "export": download([{ ...item, name: presetName(item, index) }]); break;
      }
    } catch (error) { notice(error.message, true); }
  });

  el("presetCancel").addEventListener("click", () => {
    if (dirty && !window.confirm("저장하지 않은 프리셋 변경사항을 취소할까요?")) return;
    draft = clonePresets(saved);
    selectedIndex = -1;
    editorIndex = -1;
    render();
    notice("마지막으로 저장한 프리셋 목록으로 되돌렸습니다.");
  });
  el("presetDone").addEventListener("click", finish);
  el("presetExport").addEventListener("click", () => {
    try { download(draft); } catch (error) { notice(error.message, true); }
  });
  el("presetImport").addEventListener("click", () => {
    el("presetFile").value = "";
    el("presetFile").click();
  });
  el("presetFile").addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (!file || importBusy) return;
    importBusy = true;
    updateControls();
    try {
      if (file.size > FILE_LIMIT) throw new Error("프리셋 파일은 128KB 이하만 가져올 수 있습니다.");
      const incoming = parsePresets(await file.text());
      if (incoming.length === 0) throw new Error("파일에 저장된 프리셋이 없습니다.");
      draft = mergePresets(draft, incoming);
      editorIndex = -1;
      render();
      notice(`${incoming.length}개를 추가했습니다. 편집 완료를 눌러 저장하세요.`);
    } catch (error) { notice(error.message || "파일을 읽지 못했습니다.", true); }
    finally { importBusy = false; updateControls(); event.target.value = ""; }
  });
  panel.addEventListener("toggle", () => {
    if (!panel.open && dirty) notice("저장하지 않은 편집 내용이 있습니다. 다시 펼쳐 편집 완료를 눌러 주세요.", true);
  });
  window.addEventListener("beforeunload", event => {
    if (dirty) { event.preventDefault(); event.returnValue = ""; }
  });
  window.addEventListener("storage", event => {
    if (event.key !== PRESET_STORAGE_KEY && event.key !== null) return;
    if (dirty) { notice("다른 창의 저장 내용이 바뀌었습니다. 편집한 목록을 먼저 내보내 주세요.", true); return; }
    try {
      const text = window.localStorage.getItem(PRESET_STORAGE_KEY);
      saved = text === null ? [] : parsePresets(text);
      baseline = text;
      unreadable = false;
      draft = clonePresets(saved);
      selectedIndex = -1;
      editorIndex = -1;
      render();
    } catch { notice("다른 창의 저장 정보를 읽지 못했습니다. 새로고침해 주세요.", true); }
  });

  try {
    baseline = window.localStorage.getItem(PRESET_STORAGE_KEY);
    saved = baseline === null ? [] : parsePresets(baseline);
    draft = clonePresets(saved);
  } catch {
    unreadable = baseline !== null;
    notice("저장 정보를 읽지 못했습니다. 프리셋 파일이 있다면 가져오기를 이용하세요.", true);
  }
  render();
}
