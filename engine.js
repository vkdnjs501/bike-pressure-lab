import { CONSTANTS, DATA, PRESSURE_GUIDE } from "./data.js";

const {
  PSI_TO_BAR,
  PSI_TO_KPA,
  BAR_TO_PSI,
  ATM_PSI,
  KELVIN_OFFSET,
  REFERENCE_TEMP_C
} = CONSTANTS;

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
export const isFiniteNumber = value => Number.isFinite(value);
export const roundHalf = value => Math.round(value * 2) / 2;

function interpolateLinear(x, xs, ys) {
  if (xs.length !== ys.length || xs.length < 2) {
    throw new Error("Invalid interpolation table");
  }

  if (x <= xs[0]) return ys[0];
  if (x >= xs[xs.length - 1]) return ys[ys.length - 1];

  for (let i = 0; i < xs.length - 1; i++) {
    if (x >= xs[i] && x <= xs[i + 1]) {
      const ratio = (x - xs[i]) / (xs[i + 1] - xs[i]);
      return ys[i] + (ys[i + 1] - ys[i]) * ratio;
    }
  }

  return ys[ys.length - 1];
}

/*
  Interpolates Schwalbe's published width × load guide.

  Width and weight outside the published table are not freely extrapolated.
  We clamp to the nearest published edge, then apply only a mild extension
  factor. This prevents the old model's extreme pressure collapse at 2"+ widths.
*/
export function guidePressureBar(widthMm, totalWeightKg) {
  const widths = PRESSURE_GUIDE.widthsMm;
  const weights = PRESSURE_GUIDE.weightsKg;

  const clampedWidth = clamp(widthMm, widths[0], widths[widths.length - 1]);
  const clampedWeight = clamp(totalWeightKg, weights[0], weights[weights.length - 1]);

  const pressureAtEachWidth = widths.map(width =>
    interpolateLinear(clampedWeight, weights, PRESSURE_GUIDE.bar[width])
  );

  let pressureBar = interpolateLinear(clampedWidth, widths, pressureAtEachWidth);

  // Mild extension only outside source table.
  if (widthMm < widths[0]) {
    pressureBar *= Math.pow(widths[0] / widthMm, 0.45);
  } else if (widthMm > widths[widths.length - 1]) {
    pressureBar *= Math.pow(widths[widths.length - 1] / widthMm, 0.45);
  }

  if (totalWeightKg < weights[0]) {
    pressureBar *= Math.pow(totalWeightKg / weights[0], 0.55);
  } else if (totalWeightKg > weights[weights.length - 1]) {
    pressureBar *= Math.pow(totalWeightKg / weights[weights.length - 1], 0.55);
  }

  return pressureBar;
}

export function climateFor(regionKey, monthIndex) {
  const region = DATA.regions[regionKey] ?? DATA.regions.seoul;
  const profile = DATA.climate2025.profiles[region.profile] ?? DATA.climate2025.profiles.capital;
  return profile[monthIndex];
}

export function thermalCorrect(gaugePsi, rideTempC) {
  const absolutePressure = gaugePsi + ATM_PSI;
  const correctedAbsolute =
    absolutePressure *
    ((rideTempC + KELVIN_OFFSET) / (REFERENCE_TEMP_C + KELVIN_OFFSET));

  return Math.max(0, correctedAbsolute - ATM_PSI);
}

function diameterCorrection(wheelBsd) {
  // Schwalbe notes that smaller-diameter wheels require higher pressure.
  // Keep this intentionally mild; width/load remain the dominant variables.
  return clamp(Math.pow(622 / wheelBsd, 0.08), 0.97, 1.08);
}

function rimCorrection(widthMm, rimWidth) {
  if (!isFiniteNumber(rimWidth)) return 1;

  const nominal = Math.max(15, widthMm * 0.55);
  const delta = clamp((rimWidth - nominal) / nominal, -0.25, 0.25);
  return 1 - delta * 0.06;
}

function cst26x210ReferenceBand(input) {
  const isCstWire = input.tireKey === "cst";
  const is26 = input.wheel >= 550 && input.wheel <= 565;
  const widths = [input.frontWidth, input.rearWidth];
  const is210 = widths.every(width => width >= 51 && width <= 57);

  if (isCstWire && is26 && is210) {
    return {
      minPsi: 40,
      maxPsi: 65,
      label: "CST 26×2.10 Wire reference"
    };
  }

  return null;
}

export function validateInput(input) {
  const inRange = (value, min, max) => isFiniteNumber(value) && value >= min && value <= max;
  const optionalInRange = (value, min, max) => !isFiniteNumber(value) || inRange(value, min, max);
  const supportedWheels = new Set([305, 355, 406, 457, 507, 559, 584, 622]);

  return (
    inRange(input.rider, 20, 180) &&
    inRange(input.cargo, 0, 80) &&
    inRange(input.bikeWeight, 5, 40) &&
    inRange(input.width, 20, 80) &&
    inRange(input.frontWidth, 20, 80) &&
    inRange(input.rearWidth, 20, 80) &&
    supportedWheels.has(input.wheel) &&
    optionalInRange(input.rimWidth, 13, 45) &&
    optionalInRange(input.maxPsi, 20, 180) &&
    Number.isInteger(input.month) && input.month >= 0 && input.month <= 11 &&
    Boolean(input.bike && input.tire && input.surface && input.special && DATA.regions[input.regionKey])
  );
}

export function computePressure(input) {
  const totalWeight = input.rider + input.cargo + input.bikeWeight;
  const climate = climateFor(input.regionKey, input.month);
  const rideTemp = climate + input.special.tempDelta;
  const wheelFactor = diameterCorrection(input.wheel);

  const frontGuidePsi = guidePressureBar(input.frontWidth, totalWeight) * BAR_TO_PSI;
  const rearGuidePsi = guidePressureBar(input.rearWidth, totalWeight) * BAR_TO_PSI;

  let frontBase =
    frontGuidePsi *
    input.bike.baseFactor *
    input.bike.splitFront *
    input.tire.factor *
    input.surface.factor *
    input.special.factor *
    wheelFactor *
    rimCorrection(input.frontWidth, input.rimWidth);

  let rearBase =
    rearGuidePsi *
    input.bike.baseFactor *
    input.bike.splitRear *
    input.tire.factor *
    input.surface.factor *
    input.special.factor *
    wheelFactor *
    rimCorrection(input.rearWidth, input.rimWidth);

  let front = thermalCorrect(frontBase, rideTemp);
  let rear = thermalCorrect(rearBase, rideTemp);

  const referenceBand = cst26x210ReferenceBand(input);

  // Apply known/reference operating floor only when we have a matching reference.
  if (referenceBand) {
    front = Math.max(front, referenceBand.minPsi);
    rear = Math.max(rear, referenceBand.minPsi);
  }

  let limited = false;
  let appliedMaxPsi = null;

  // User-entered manufacturer limit has highest priority.
  if (isFiniteNumber(input.maxPsi) && input.maxPsi > 0) {
    appliedMaxPsi = input.maxPsi;
  } else if (referenceBand) {
    appliedMaxPsi = referenceBand.maxPsi;
  }

  if (isFiniteNumber(appliedMaxPsi)) {
    if (front > appliedMaxPsi) { front = appliedMaxPsi; limited = true; }
    if (rear > appliedMaxPsi) { rear = appliedMaxPsi; limited = true; }
  }

  front = roundHalf(front);
  rear = roundHalf(rear);

  const rawAverage = (frontBase + rearBase) / 2;
  const finalAverage = (front + rear) / 2;

  return {
    totalWeight,
    climate,
    rideTemp,
    front,
    rear,
    limited,
    appliedMaxPsi,
    referenceBand,
    sourceGuide: {
      frontPsi: frontGuidePsi,
      rearPsi: rearGuidePsi,
      frontBar: frontGuidePsi / BAR_TO_PSI,
      rearBar: rearGuidePsi / BAR_TO_PSI,
      source: "Schwalbe general tire pressure guide",
      method: "width × load interpolation"
    },
    correctedBase: {
      frontPsi: frontBase,
      rearPsi: rearBase
    },
    representative: finalAverage,
    splitPct: front > 0 ? ((rear / front) - 1) * 100 : 0,
    diameterFactor: wheelFactor,
    thermalDelta: finalAverage - rawAverage,
    model: "Schwalbe load-width interpolation v2",
    conversions: {
      frontBar: front * PSI_TO_BAR,
      rearBar: rear * PSI_TO_BAR,
      frontKpa: front * PSI_TO_KPA,
      rearKpa: rear * PSI_TO_KPA,
      representativeBar: finalAverage * PSI_TO_BAR,
      representativeKpa: finalAverage * PSI_TO_KPA
    }
  };
}
