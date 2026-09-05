export const CONSTANTS = Object.freeze({
  PSI_TO_BAR: 0.0689476,
  PSI_TO_KPA: 6.89476,
  BAR_TO_PSI: 14.5037738,
  ATM_PSI: 14.6959,
  KELVIN_OFFSET: 273.15,
  REFERENCE_TEMP_C: 20
});

/*
  PRESSURE GUIDE MODEL v2
  -----------------------
  Base guide is derived from Schwalbe's published general pressure table:
  tire width × rider/load reference (60 / 85 / 110 kg).

  We use total system weight as a conservative load proxy because this app
  explicitly collects rider + cargo + bicycle weight.

  The table is stored in bar and interpolated bilinearly in engine.js.
*/
export const PRESSURE_GUIDE = Object.freeze({
  weightsKg: [60, 85, 110],
  widthsMm: [25, 28, 32, 37, 40, 47, 50, 55, 60],
  bar: {
    25: [6.0, 7.0, 8.0],
    28: [5.5, 6.5, 7.5],
    32: [4.5, 5.5, 6.5],
    37: [4.0, 5.0, 6.0],
    40: [3.5, 4.5, 6.0],
    47: [3.0, 4.0, 5.0],
    50: [2.5, 4.0, 5.0],
    55: [2.0, 3.0, 4.0],
    60: [2.0, 3.0, 4.0]
  }
});

export const DATA = Object.freeze({
  climate2025: {
    nationwide: [-0.2,-0.5,7.6,13.1,16.8,22.9,27.1,27.1,23.0,16.6,8.5,2.4],

    /*
      Compact KMA-based regional climate profiles.
      The UI exposes 17 first-level administrative areas, while internally
      several areas share one broad KMA climate profile to keep the app light.
    */
    profiles: {
      capital:   [-1.0,-0.8,7.1,13.5,17.4,23.4,27.4,27.2,22.8,15.8,7.6,1.3],
      gangwon:   [-2.3,-2.0,5.6,11.6,15.7,21.4,25.2,25.3,20.8,13.7,5.6,-0.5],
      chungbuk:  [-1.7,-1.6,6.6,12.8,16.7,22.8,26.8,26.8,22.3,15.3,6.8,0.4],
      chungnam:  [-0.9,-1.1,6.8,12.8,16.7,22.7,26.7,26.7,22.4,15.6,7.4,1.1],
      jeonbuk:   [0.0,-0.5,7.1,13.0,16.8,22.8,26.9,26.9,22.8,16.1,8.1,2.0],
      jeonnam:   [1.8,1.2,8.6,14.1,17.7,23.2,27.1,27.4,23.7,17.4,10.0,4.2],
      gyeongbuk: [0.1,-0.4,7.9,13.8,17.6,23.7,27.7,27.6,23.2,16.4,8.1,1.8],
      gyeongnam: [2.2,1.5,9.1,14.6,18.0,23.5,27.2,27.5,23.8,17.7,10.4,4.7],
      jeju:      [7.1,6.4,11.2,15.6,18.4,23.2,27.5,28.1,24.8,19.3,13.8,8.6]
    }
  },

  regions: {
    seoul:     { profile:"capital",   label:"서울특별시", default:true },
    busan:     { profile:"gyeongnam", label:"부산광역시" },
    daegu:     { profile:"gyeongbuk", label:"대구광역시" },
    incheon:   { profile:"capital",   label:"인천광역시" },
    gwangju:   { profile:"jeonnam",   label:"광주광역시" },
    daejeon:   { profile:"chungnam",  label:"대전광역시" },
    ulsan:     { profile:"gyeongnam", label:"울산광역시" },
    sejong:    { profile:"chungnam",  label:"세종특별자치시" },
    gyeonggi:  { profile:"capital",   label:"경기도" },
    gangwon:   { profile:"gangwon",   label:"강원특별자치도" },
    chungbuk:  { profile:"chungbuk",  label:"충청북도" },
    chungnam:  { profile:"chungnam",  label:"충청남도" },
    jeonbuk:   { profile:"jeonbuk",   label:"전북특별자치도" },
    jeonnam:   { profile:"jeonnam",   label:"전라남도" },
    gyeongbuk: { profile:"gyeongbuk", label:"경상북도" },
    gyeongnam: { profile:"gyeongnam", label:"경상남도" },
    jeju:      { profile:"jeju",      label:"제주특별자치도 · 제주시 기준" }
  },

  /*
    splitFront / splitRear:
    small front-rear recommendation separation.
    This replaces the older near-linear axle-load multiplier that created
    unrealistically large front/rear gaps.
  */
  bikes: {
    minivelo: { name: "MINI VELO",       baseFactor: 1.03, splitFront: .95, splitRear: 1.05 },
    road:     { name: "ROAD",            baseFactor: 1.00, splitFront: .96, splitRear: 1.04 },
    gravel:   { name: "GRAVEL",          baseFactor: .96, splitFront: .95, splitRear: 1.05 },
    hardtail: { name: "FRONT SHOCK MTB", baseFactor: .93, splitFront: .94, splitRear: 1.06 },
    fullsus:  { name: "FULL-SUS MTB",    baseFactor: .91, splitFront: .94, splitRear: 1.06 },
    hybrid:   { name: "HYBRID",          baseFactor: 1.00, splitFront: .96, splitRear: 1.04 }
  },

  /*
    Brand/model selection now only applies a very small casing-style correction.
    We no longer use large arbitrary brand pressure factors.
  */
  tires: {
    cst:           { factor: 1.00, label: "CST 보급형 · Wire", casing: "wire" },
    swallow:       { factor: 1.00, label: "Swallow 보급형 · Wire", casing: "wire" },
    kenda:         { factor: 1.00, label: "Kenda 보급형 · Wire", casing: "wire" },
    schwalbeOne:   { factor: .99,  label: "Schwalbe One · Folding", casing: "folding" },
    marathonRacer: { factor: .99,  label: "Marathon Racer", casing: "folding" },
    chaoyangMtb:   { factor: 1.00, label: "Chaoyang MTB · Wire", casing: "wire" }
  },

  surfaces: {
    normal:   { factor: 1.00, label: "일반도로" },
    rough:    { factor: .96,  label: "거친 아스팔트" },
    smooth:   { factor: 1.02, label: "매끈한 아스팔트" },
    cycle:    { factor: .99,  label: "자전거도로" },
    gravel:   { factor: .91,  label: "비포장" },
    mountain: { factor: .86,  label: "산악" }
  },

  specials: {
    dry:  { factor: 1.00, tempDelta:  0, label: "건조" },
    wet:  { factor: .97,  tempDelta: -1, label: "젖은 노면" },
    cold: { factor: .98,  tempDelta: -3, label: "찬 노면" },
    hot:  { factor: .99,  tempDelta:  8, label: "뜨거운 노면" }
  },

  widths: {
    c: [
      ["23C",23],["25C",25],["28C",28],["32C",32],["35C",35],["38C",38],["40C",40]
    ],
    decimal: [
      ['1.125"',1.125*25.4],['1.50"',1.50*25.4],['1.75"',1.75*25.4],
      ['1.95"',1.95*25.4],['2.10"',2.10*25.4],['2.20"',2.20*25.4],
      ['2.25"',2.25*25.4],['2.40"',2.40*25.4],['2.50"',2.50*25.4]
    ],
    fraction: [
      ['1-1/8"',(1+1/8)*25.4],['1-1/4"',(1+1/4)*25.4],['1-3/8"',(1+3/8)*25.4]
    ]
  }
});
