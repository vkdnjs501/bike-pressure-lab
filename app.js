import { DATA } from "./data.js";
import { computePressure, validateInput, climateFor, isFiniteNumber, productInputError } from "./engine.js";
import { initPresets, PRESET_FIELDS } from "./presets.js";

const $ = id => document.getElementById(id);
const DOM = {};
const CALCULATION_COOLDOWN_MS = 300;
let lastManualCalculationAt = -Infinity;
let previousTireKey = null;

const IDS = [
  "rider","cargo","bikeWeight","wheel","widthStandard","widthPreset","widthResolved",
  "tireInfo","tire","surface","special","region","month","climateInfo",
  "manualWidth","frontWidth","rearWidth","rimWidth","maxPsi","calculate","resultTitle",
  "resultMeta","status","frontPsi","rearPsi","frontSub","rearSub","tempMetric",
  "weightMetric","wheelMetric","thermalMetric","logicText","referenceText","safetyText",
  "convPsi","convBar","convKpa","bikeChoices"
];

function cacheDom() {
  IDS.forEach(id => DOM[id] = $(id));
  DOM.bikeRadios = [...document.querySelectorAll('input[name="bike"]')];
}

function number(el) {
  return Number.parseFloat(el.value);
}

function selectedBikeKey() {
  return DOM.bikeRadios.find(radio => radio.checked)?.value ?? "road";
}

function createOption(value, label, selected = false) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  option.selected = selected;
  return option;
}

function setupMonths() {
  const currentMonth = new Date().getMonth();
  DOM.month.replaceChildren(
    ...Array.from({ length: 12 }, (_, index) =>
      createOption(index, `${index + 1}월`, index === currentMonth)
    )
  );
}

function populateWidthPresets() {
  const standard = DOM.widthStandard.value;
  const items = DATA.widths[standard] ?? DATA.widths.c;

  DOM.widthPreset.replaceChildren(
    ...items.map(([label, mm], index) =>
      createOption(mm.toFixed(4), label, standard === "c" ? label === "28C" : index === 0)
    )
  );

  updateResolvedWidth();
}

function baseWidthMm() {
  const manual = number(DOM.manualWidth);
  return isFiniteNumber(manual) && manual > 0 ? manual : number(DOM.widthPreset);
}

function updateResolvedWidth() {
  const width = baseWidthMm();
  DOM.widthResolved.value = isFiniteNumber(width) ? `${width.toFixed(1)} mm` : "—";
}

function setBikeChoice(bikeKey) {
  DOM.bikeRadios.forEach(radio => {
    radio.checked = radio.value === bikeKey;
    radio.closest(".choice").classList.toggle("active", radio.checked);
  });
}

function applyBillyBonkersDefaults() {
  DOM.wheel.value = "406";
  DOM.widthStandard.value = "decimal";
  populateWidthPresets();
  // 2.00 inches is the selectable nominal size; the exact SKU is ETRTO 50-406.
  DOM.widthPreset.value = (2 * 25.4).toFixed(4);
  DOM.manualWidth.value = String(DATA.tires.billyBonkers20.widthMm);
  DOM.frontWidth.value = "";
  DOM.rearWidth.value = "";
  setBikeChoice("minivelo");
  updateResolvedWidth();
}

function syncTireProduct() {
  const tireKey = DOM.tire.value;
  const selected = tireKey === "billyBonkers20";
  const enteredBillyBonkers = selected && previousTireKey !== tireKey;
  DOM.tireInfo.hidden = !selected;
  if (enteredBillyBonkers) applyBillyBonkersDefaults();
  previousTireKey = tireKey;
  calculateAndRender();
}

function updateClimateInfo() {
  const monthIndex = Number(DOM.month.value);
  const regionKey = DOM.region.value;
  const region = DATA.regions[regionKey] ?? DATA.regions.seoul;
  const temp = climateFor(regionKey, monthIndex);

  DOM.climateInfo.textContent =
    `${region.label} · 2025년 ${monthIndex + 1}월 기후기준 ${temp.toFixed(1)}℃ · ` +
    `KMA 광역 기후 프로필 연동`;
}

function readInputs() {
  const bikeKey = selectedBikeKey();
  const width = baseWidthMm();

  return {
    rider: number(DOM.rider),
    cargo: number(DOM.cargo),
    bikeWeight: number(DOM.bikeWeight),
    width,
    wheel: number(DOM.wheel),
    wheelLabel: DOM.wheel.selectedOptions[0]?.textContent ?? "",
    bikeKey,
    bike: DATA.bikes[bikeKey],
    tireKey: DOM.tire.value,
    tire: DATA.tires[DOM.tire.value],
    surface: DATA.surfaces[DOM.surface.value],
    special: DATA.specials[DOM.special.value],
    regionKey: DOM.region.value,
    month: Number(DOM.month.value),
    frontWidth: isFiniteNumber(number(DOM.frontWidth)) ? number(DOM.frontWidth) : width,
    rearWidth: isFiniteNumber(number(DOM.rearWidth)) ? number(DOM.rearWidth) : width,
    rimWidth: number(DOM.rimWidth),
    maxPsi: number(DOM.maxPsi)
  };
}

function renderStatus(label, warning = false) {
  DOM.status.textContent = label;
  DOM.status.classList.toggle("warn", warning);
}


function renderResult(input, result) {
  DOM.frontPsi.textContent = result.front.toFixed(1);
  DOM.rearPsi.textContent = result.rear.toFixed(1);

  DOM.resultTitle.textContent =
    `${input.bike.name} · ${input.wheelLabel} · ` +
    `${input.frontWidth === input.rearWidth ? input.frontWidth : `${input.frontWidth}/${input.rearWidth}`} mm`;

  DOM.resultMeta.textContent =
    `${result.totalWeight.toFixed(1)} kg System · ${input.surface.label} · ` +
    `${input.special.label} · Rear +${result.splitPct.toFixed(1)}%`;

  DOM.tempMetric.textContent = `${result.climate.toFixed(1)}℃`;
  DOM.weightMetric.textContent = `${result.totalWeight.toFixed(1)}kg`;
  DOM.wheelMetric.textContent = `×${result.diameterFactor.toFixed(3)}`;
  DOM.thermalMetric.textContent = `${result.thermalDelta.toFixed(1)} PSI`;

  DOM.logicText.textContent =
    `공식 기준표 → 보정 → 온도 → 허용범위 순서로 계산합니다. ` +
    `${result.model}에서 총중량 ${result.totalWeight.toFixed(1)} kg과 ` +
    `앞/뒤 폭 ${input.frontWidth}/${input.rearWidth} mm를 먼저 보간하고, ` +
    `${input.wheelLabel}, ${input.bike.name}, ${input.tire.label}, ${input.surface.label}를 ` +
    `완만하게 보정한 뒤 ${result.rideTemp.toFixed(1)}℃ 조건으로 온도 보정합니다.`;

  const guideFront = result.sourceGuide.frontPsi.toFixed(1);
  const guideRear = result.sourceGuide.rearPsi.toFixed(1);
  const correctedFront = result.correctedBase.frontPsi.toFixed(1);
  const correctedRear = result.correctedBase.rearPsi.toFixed(1);

  DOM.referenceText.textContent =
    `Schwalbe 폭×하중 기준표 보간값: 앞 ${guideFront} / 뒤 ${guideRear} PSI. ` +
    `휠·차종·타이어·노면 보정 후 온도보정 직전 값은 ` +
    `앞 ${correctedFront} / 뒤 ${correctedRear} PSI입니다.`;

  DOM.safetyText.classList.toggle("warn", result.limited);

  if (result.limited) {
    DOM.safetyText.textContent =
      `적용 MAX ${result.appliedMaxPsi.toFixed(0)} PSI를 초과한 계산값을 안전상한으로 제한했습니다.`;
    renderStatus("MAX LIMITED", true);
  } else if (result.referenceBand && !isFiniteNumber(input.maxPsi)) {
    DOM.safetyText.textContent =
      `${result.referenceBand.label}: ${result.referenceBand.minPsi}–${result.referenceBand.maxPsi} PSI 참조 범위가 적용되었습니다. ` +
      `실제 타이어 측면 표기가 있으면 그 값을 최우선으로 사용하세요.`;
    renderStatus("CALCULATED");
  } else {
    DOM.safetyText.textContent = isFiniteNumber(input.maxPsi)
      ? `제조사 MAX ${input.maxPsi.toFixed(0)} PSI 이내입니다.`
      : "정확한 모델·사이즈별 자동 참조 범위가 없는 조합입니다. 실제 타이어 측면의 MIN/MAX PSI를 확인하고, 고급 설정의 제조사 MAX PSI에 입력하세요.";
    renderStatus("CALCULATED");
  }

  if (input.tireKey === "billyBonkers20") {
    DOM.safetyText.textContent = `빌리봉커 20×2.00 공식 범위 30–65 PSI · 적용 범위 30–${result.appliedMaxPsi} PSI. ` +
      (result.raisedToMinimum ? "MIN 미만 계산값을 30 PSI로 올렸습니다. " : "") +
      (result.limited ? "MAX 초과 계산값을 상한으로 제한했습니다. " : "") +
      "실제 타이어 측면과 림의 제한도 확인하세요. 일반 주행 참고 계산이며 점프·착지용 설정은 아닙니다.";
    DOM.safetyText.classList.toggle("warn", result.limited || result.raisedToMinimum);
    renderStatus(result.limited ? "MAX LIMITED" : result.raisedToMinimum ? "MIN LIMITED" : "CALCULATED", result.limited || result.raisedToMinimum);
  }

  DOM.convPsi.textContent = result.representative.toFixed(1);
  DOM.convBar.textContent = result.conversions.representativeBar.toFixed(2);
  DOM.convKpa.textContent = Math.round(result.conversions.representativeKpa);

  DOM.frontSub.textContent =
    `${result.conversions.frontBar.toFixed(2)} bar · ${Math.round(result.conversions.frontKpa)} kPa`;
  DOM.rearSub.textContent =
    `${result.conversions.rearBar.toFixed(2)} bar · ${Math.round(result.conversions.rearKpa)} kPa`;
}

function calculateAndRender() {
  const input = readInputs();

  if (!validateInput(input)) {
    renderStatus("CHECK INPUT", true);
    ["frontPsi", "rearPsi", "frontSub", "rearSub", "convPsi", "convBar", "convKpa"].forEach(id => DOM[id].textContent = "—");
    DOM.safetyText.textContent = productInputError(input) ?? "입력값의 허용범위를 확인하세요.";
    DOM.safetyText.classList.add("warn");
    return;
  }

  renderResult(input, computePressure(input));
  updateClimateInfo();
}

function handleCalculateClick() {
  const now = performance.now();
  if (now - lastManualCalculationAt < CALCULATION_COOLDOWN_MS) return;
  lastManualCalculationAt = now;
  calculateAndRender();
}

function syncBikeChoice(target) {
  const choice = target.closest(".choice");
  if (!choice) return;
  setBikeChoice(choice.querySelector('input[name="bike"]').value);
}

function bindEvents() {
  DOM.bikeChoices.addEventListener("click", event => syncBikeChoice(event.target));
  DOM.widthStandard.addEventListener("change", populateWidthPresets);
  DOM.widthPreset.addEventListener("change", updateResolvedWidth);
  DOM.manualWidth.addEventListener("input", updateResolvedWidth);
  DOM.region.addEventListener("change", updateClimateInfo);
  DOM.month.addEventListener("change", updateClimateInfo);
  DOM.tire.addEventListener("change", syncTireProduct);
  DOM.calculate.addEventListener("click", handleCalculateClick);
}

function registerServiceWorker() {
  if (window.location.protocol === "file:") return;
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // 개발/로컬 환경에서는 Service Worker 등록 실패를 앱 동작과 분리합니다.
    });
  });
}

function capturePresetSettings() {
  const settings = {};
  for (const id of PRESET_FIELDS) {
    if (DOM[id].validity?.badInput) throw new Error("숫자 입력값을 확인하세요.");
    settings[id] = DOM[id].value;
  }
  settings.bikeKey = selectedBikeKey();
  settings.wheelIndex = DOM.wheel.selectedIndex;
  return settings;
}

function restorePresetSettings(settings) {
  DOM.widthStandard.value = settings.widthStandard;
  populateWidthPresets();
  for (const id of PRESET_FIELDS) DOM[id].value = settings[id];
  // 700C and the legacy 28.5-inch option share BSD 622: retain the exact label.
  DOM.wheel.selectedIndex = settings.wheelIndex;
  setBikeChoice(settings.bikeKey);
  // Restoring a model must retain saved measured widths, not apply new defaults.
  DOM.tireInfo.hidden = settings.tire !== "billyBonkers20";
  previousTireKey = settings.tire;
  updateResolvedWidth();
  updateClimateInfo();
  calculateAndRender();
}

function init() {
  cacheDom();
  setupMonths();
  populateWidthPresets();
  previousTireKey = DOM.tire.value;
  updateClimateInfo();
  bindEvents();
  calculateAndRender();
  initPresets({ capture: capturePresetSettings, restore: restorePresetSettings });
  registerServiceWorker();
}

init();
