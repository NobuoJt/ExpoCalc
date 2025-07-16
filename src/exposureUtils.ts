// 露出計算のユーティリティ関数

export interface ExposureValues {
  ev: number;
  av: number;
  tv: number;
  iso: number;
}

export interface StepConfig {
  stepSize: number; // 1 = 1 stop, 1/3 = 1/3 stop
}

export interface RangeConfig {
  ev: { min: number; max: number };
  av: { min: number; max: number };
  tv: { min: number; max: number };
  iso: { min: number; max: number };
}

// EV値から明るさの言語的表現を取得
export function getEVDescription(ev: number): string {
  if (ev >= 16) return "真夏のビーチ (164kLux)";
  if (ev >= 15) return "快晴 (81.9kLux)";
  if (ev >= 14) return "晴れ (41.0kLux)";
  if (ev >= 13) return "薄日 (20.5kLux)";
  if (ev >= 12) return "曇り (10.2kLux)";
  if (ev >= 11) return "雨曇り (5.12kLux)";
  if (ev >= 10) return "陳列棚 (2.56kLux)";
  if (ev >= 9) return "明るい部屋 (1.28kLux)";
  if (ev >= 8) return "エレベータ (640Lux)";
  if (ev >= 7) return "体育館 (320Lux)";
  if (ev >= 6) return "廊下 (160Lux)";
  if (ev >= 5) return "休憩室 (80Lux)";
  if (ev >= 4) return "暗い室内 (40Lux)";
  if (ev >= 3) return "観客席 (20Lux)";
  if (ev >= 2) return "映画館 (10Lux)";
  if (ev >= 1) return "日没後 (5Lux)";
  if (ev >= 0) return "薄明り (2.5Lux)";
  if (ev >= -1) return "深夜屋内 (1.25Lux)";
  if (ev >= -2) return "月夜 (0.63Lux)";
  if (ev >= -3) return "おぼろ月夜 (0.31Lux)";
  if (ev >= -4) return "星空 (0.16Lux)";
  return "極度に暗い";
}

// EV値からlux値を計算（近似値）
export function evToLux(ev: number): number {
  // EV値とlux値の関係: lux = 2.5 * 2^EV (近似)
  return 2.5 * Math.pow(2, ev);
}

// lux値をフォーマット
export function formatLux(lux: number): string {
  if (lux >= 1000) {
    return `${(lux / 1000).toFixed(1)}kLux`;
  } else {
    return `${lux.toFixed(1)}Lux`;
  }
}

// AV値からf値を取得
export function avToFNumber(av: number): number {
  return Math.pow(2, av / 2);
}

// f値からAV値を取得
export function fNumberToAV(fNumber: number): number {
  return 2 * Math.log2(fNumber);
}

// TV値からシャッタースピード（秒）を取得
export function tvToShutterSpeed(tv: number): number {
  return 1 / Math.pow(2, tv);
}

// シャッタースピード（秒）からTV値を取得
export function shutterSpeedToTV(shutterSpeed: number): number {
  return Math.log2(1 / shutterSpeed);
}

// ISO値からISO感度を取得
export function isoToSensitivity(iso: number): number {
  return Math.pow(2, iso) * 100;
}

// ISO感度からISO値を取得
export function sensitivityToISO(sensitivity: number): number {
  return Math.log2(sensitivity / 100);
}

// EV = AV + TV - ISO の関係式を使用した計算

// 3つの値から1つの値を計算
export function calculateMissingValue(
  known: Partial<ExposureValues>,
  target: keyof ExposureValues
): number {
  const { ev, av, tv, iso } = known;
  
  switch (target) {
    case 'ev':
      if (av !== undefined && tv !== undefined && iso !== undefined) {
        return av + tv - iso;
      }
      break;
    case 'av':
      if (ev !== undefined && tv !== undefined && iso !== undefined) {
        return ev - tv + iso;
      }
      break;
    case 'tv':
      if (ev !== undefined && av !== undefined && iso !== undefined) {
        return ev - av + iso;
      }
      break;
    case 'iso':
      if (ev !== undefined && av !== undefined && tv !== undefined) {
        return av + tv - ev;
      }
      break;
  }
  
  throw new Error(`Cannot calculate ${target} with provided values`);
}

// シャッタースピードの表示文字列を取得
export function formatShutterSpeed(tv: number): string {
  const speed = tvToShutterSpeed(tv);
  if (speed >= 1) {
    return `${speed.toFixed(1)}s`;
  } else {
    const denominator = Math.round(1 / speed);
    return `1/${denominator}`;
  }
}

// f値の表示文字列を取得
export function formatFNumber(av: number): string {
  const fNumber = avToFNumber(av);
  return `f/${fNumber.toFixed(1)}`;
}

// ISO感度の表示文字列を取得
export function formatISO(iso: number): string {
  const sensitivity = isoToSensitivity(iso);
  return `ISO ${Math.round(sensitivity)}`;
}

// 指定されたステップサイズでの値の配列を生成
export function generateSteps(min: number, max: number, stepSize: number): number[] {
  const steps: number[] = [];
  let step: number;
  
  if (stepSize === 1) {
    step = 1;
  } else if (stepSize === 1/2) {
    step = 0.5;
  } else if (stepSize === 1/3) {
    step = 1/3;
  } else {
    step = stepSize;
  }
  
  for (let value = min; value <= max; value += step) {
    // 精度を保つため、適切な桁数で丸める
    if (step === 1/3) {
      steps.push(Math.round(value * 3) / 3);
    } else if (step === 0.5) {
      steps.push(Math.round(value * 2) / 2);
    } else {
      steps.push(Math.round(value));
    }
  }
  
  return steps;
}

// 一般表現（カメラで実際に表示される値）の定義

// 絞り値の一般表現（f値）
export const COMMON_F_NUMBERS = [
  1.0, 1.1, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.5, 2.8, 3.2, 3.5, 4.0, 4.5, 5.0, 5.6, 
  6.3, 7.1, 8.0, 9.0, 10, 11, 13, 14, 16, 18, 20, 22, 25, 28, 32
];

// シャッタースピードの一般表現（秒）
export const COMMON_SHUTTER_SPEEDS = [
  // 長時間露光
  180, 120, 90, 60, 50, 40, 30, 25, 20, 15, 13, 10, 8, 6, 5, 4, 3, 2.5, 2, 1.6, 1.3, 1,
  // 通常のシャッタースピード（分数）
  1/1.3, 1/1.6, 1/2, 1/2.5, 1/3, 1/4, 1/5, 1/6, 1/8, 1/10, 1/13, 1/15, 1/20, 1/25, 1/30, 
  1/40, 1/50, 1/60, 1/80, 1/100, 1/125, 1/160, 1/200, 1/250, 1/320, 1/400, 1/500, 1/640, 
  1/800, 1/1000, 1/1250, 1/1600, 1/2000, 1/2500, 1/3200, 1/4000, 1/5000, 1/6400, 1/8000, 1/10000, 1/12800
];

// ISO感度の一般表現
export const COMMON_ISO_VALUES = [
  50, 64, 80, 100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600, 
  2000, 2500, 3200, 4000, 5000, 6400, 8000, 10000, 12800, 16000, 20000, 25600, 
  32000, 40000, 51200, 64000, 80000, 102400, 128000, 160000, 200000, 256000, 320000, 400000, 512000
];

// 最も近い一般表現値を取得
export function getNearestCommonFNumber(av: number): number {
  const fNumber = avToFNumber(av);
  return COMMON_F_NUMBERS.reduce((prev, curr) => 
    Math.abs(curr - fNumber) < Math.abs(prev - fNumber) ? curr : prev
  );
}

export function getNearestCommonShutterSpeed(tv: number): number {
  const speed = tvToShutterSpeed(tv);
  return COMMON_SHUTTER_SPEEDS.reduce((prev, curr) => 
    Math.abs(curr - speed) < Math.abs(prev - speed) ? curr : prev
  );
}

export function getNearestCommonISO(iso: number): number {
  const sensitivity = isoToSensitivity(iso);
  return COMMON_ISO_VALUES.reduce((prev, curr) => 
    Math.abs(curr - sensitivity) < Math.abs(prev - sensitivity) ? curr : prev
  );
}

// 一般表現の表示
export function formatCommonFNumber(av: number): string {
  const fNumber = getNearestCommonFNumber(av);
  return `f/${fNumber}`;
}

export function formatCommonShutterSpeed(tv: number): string {
  const speed = getNearestCommonShutterSpeed(tv);
  if (speed >= 1) {
    return `${speed}s`;
  } else {
    const denominator = Math.round(1 / speed);
    return `1/${denominator}`;
  }
}

export function formatCommonISO(iso: number): string {
  const sensitivity = getNearestCommonISO(iso);
  return `ISO ${sensitivity}`;
}

// 一般表現からAV値への変換
export function parseCommonFNumber(input: string): number | null {
  const cleaned = input.replace(/^f\/?/i, '');
  const fNumber = parseFloat(cleaned);
  if (isNaN(fNumber) || fNumber <= 0) return null;
  return fNumberToAV(fNumber);
}

// 一般表現からTV値への変換
export function parseCommonShutterSpeed(input: string): number | null {
  const cleaned = input.replace(/s$/i, '');
  
  if (cleaned.includes('/')) {
    const parts = cleaned.split('/');
    if (parts.length === 2) {
      const numerator = parseFloat(parts[0]);
      const denominator = parseFloat(parts[1]);
      if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
        return shutterSpeedToTV(numerator / denominator);
      }
    }
  } else {
    const speed = parseFloat(cleaned);
    if (!isNaN(speed) && speed > 0) {
      return shutterSpeedToTV(speed);
    }
  }
  
  return null;
}

// 一般表現からISO値への変換
export function parseCommonISO(input: string): number | null {
  const cleaned = input.replace(/^iso\s*/i, '');
  const sensitivity = parseFloat(cleaned);
  if (isNaN(sensitivity) || sensitivity <= 0) return null;
  return sensitivityToISO(sensitivity);
}

// 値が一般表現に近いかチェック
export function isNearCommonValue(param: keyof ExposureValues, value: number, threshold: number = 0.1): boolean {
  switch (param) {
    case 'av': {
      const nearestF = getNearestCommonFNumber(value);
      return Math.abs(avToFNumber(value) - nearestF) < threshold;
    }
    case 'tv': {
      const nearestShutter = getNearestCommonShutterSpeed(value);
      return Math.abs(tvToShutterSpeed(value) - nearestShutter) < threshold;
    }
    case 'iso': {
      const nearestISO = getNearestCommonISO(value);
      return Math.abs(isoToSensitivity(value) - nearestISO) < (nearestISO * 0.05);
    }
    default:
      return true;
  }
}

// 値が範囲内かどうかをチェック
export function isValueInRange(param: keyof ExposureValues, value: number, ranges: RangeConfig): boolean {
  const range = ranges[param];
  return value >= range.min && value <= range.max;
}

// 範囲外の値に対する警告メッセージを生成
export function getRangeWarning(param: keyof ExposureValues, value: number, ranges: RangeConfig): string {
  const range = ranges[param];
  if (value < range.min) {
    return `値が範囲の下限(${range.min})を下回っています`;
  } else if (value > range.max) {
    return `値が範囲の上限(${range.max})を上回っています`;
  }
  return '';
}

// 範囲外の値を範囲内に制限
export function clampToRange(param: keyof ExposureValues, value: number, ranges: RangeConfig): number {
  const range = ranges[param];
  return Math.max(range.min, Math.min(range.max, value));
}

// 2つの固定パラメータから残り2つのパラメータを計算（1次元表用）
// 固定された2つのパラメータから、露出等価を保ちながら残り2つのパラメータを段階的に計算
export function calculateRemainingParameters(
  fixedParams: Partial<ExposureValues>
): { [key in keyof ExposureValues]?: number } {
  const result: Partial<ExposureValues> = { ...fixedParams };
  
  // 固定されたパラメータの組み合わせに応じて計算
  const fixedKeys = Object.keys(fixedParams) as Array<keyof ExposureValues>;
  
  if (fixedKeys.length !== 2) {
    throw new Error('Exactly 2 parameters must be fixed');
  }
  
  // EV = AV + TV - ISO の関係式を使用
  const [fixed1, fixed2] = fixedKeys;
  
  // 固定された2つのパラメータから、残り2つを露出等価を保って計算
  // 基本的には3つ目のパラメータを設定して、4つ目を計算する
  
  if ((fixed1 === 'ev' && fixed2 === 'av') || (fixed1 === 'av' && fixed2 === 'ev')) {
    // EV, AV固定 → TV, ISO計算
    // EV = AV + TV - ISO から TV = EV - AV + ISO
    // ISO = 0を基準として、TVを計算
    const ev = fixedParams.ev!;
    const av = fixedParams.av!;
    const iso = 0; // 基準値
    const tv = ev - av + iso;
    result.tv = tv;
    result.iso = iso;
  } else if ((fixed1 === 'ev' && fixed2 === 'tv') || (fixed1 === 'tv' && fixed2 === 'ev')) {
    // EV, TV固定 → AV, ISO計算
    const ev = fixedParams.ev!;
    const tv = fixedParams.tv!;
    const iso = 0; // 基準値
    const av = ev - tv + iso;
    result.av = av;
    result.iso = iso;
  } else if ((fixed1 === 'ev' && fixed2 === 'iso') || (fixed1 === 'iso' && fixed2 === 'ev')) {
    // EV, ISO固定 → AV, TV計算
    const ev = fixedParams.ev!;
    const iso = fixedParams.iso!;
    // AVとTVは相関関係があるので、一方を変化させると他方も決まる
    // AV = 5を基準として、TVを計算
    const av = 5; // 基準値
    const tv = ev - av + iso;
    result.av = av;
    result.tv = tv;
  } else if ((fixed1 === 'av' && fixed2 === 'tv') || (fixed1 === 'tv' && fixed2 === 'av')) {
    // AV, TV固定 → EV, ISO計算
    const av = fixedParams.av!;
    const tv = fixedParams.tv!;
    const iso = 0; // 基準値
    const ev = av + tv - iso;
    result.ev = ev;
    result.iso = iso;
  } else if ((fixed1 === 'av' && fixed2 === 'iso') || (fixed1 === 'iso' && fixed2 === 'av')) {
    // AV, ISO固定 → EV, TV計算
    const av = fixedParams.av!;
    const iso = fixedParams.iso!;
    const tv = 7; // 基準値
    const ev = av + tv - iso;
    result.ev = ev;
    result.tv = tv;
  } else if ((fixed1 === 'tv' && fixed2 === 'iso') || (fixed1 === 'iso' && fixed2 === 'tv')) {
    // TV, ISO固定 → EV, AV計算
    const tv = fixedParams.tv!;
    const iso = fixedParams.iso!;
    const av = 5; // 基準値
    const ev = av + tv - iso;
    result.ev = ev;
    result.av = av;
  }
  
  return result;
}

// 1次元表用：固定された2つのパラメータから、段階的に変化する残り2つのパラメータの組み合わせを生成
export function generate1DTableData(
  fixedParam1: keyof ExposureValues,
  fixedParam2: keyof ExposureValues,
  baseValues: ExposureValues,
  ranges: RangeConfig,
  stepSize: number
): { variableParams: [keyof ExposureValues, keyof ExposureValues], combinations: ExposureValues[] } {
  // 残りのパラメータを決定
  const allParams: (keyof ExposureValues)[] = ['ev', 'av', 'tv', 'iso'];
  const variableParams = allParams.filter(p => p !== fixedParam1 && p !== fixedParam2) as [keyof ExposureValues, keyof ExposureValues];
  
  if (variableParams.length !== 2) {
    return { variableParams: ['ev', 'av'], combinations: [] };
  }
  
  const [varParam1, varParam2] = variableParams;
  
  // A: 変動パラメータ1について、設定範囲、設定段数のステップで入力パラメータの候補リストを作成
  const varParam1Range = ranges[varParam1];
  const varParam1Steps = generateSteps(varParam1Range.min, varParam1Range.max, stepSize);
  
  // B: それに対応する変動パラメータ2を計算して変動パラメータ1,2のリストを作成
  const listB: Array<{ [K in keyof ExposureValues]: number }> = [];
  for (const val1 of varParam1Steps) {
    try {
      const testValues: Partial<ExposureValues> = {};
      testValues[fixedParam1] = baseValues[fixedParam1];
      testValues[fixedParam2] = baseValues[fixedParam2];
      testValues[varParam1] = val1;
      
      const calculatedVal2 = calculateMissingValue(testValues as ExposureValues, varParam2);
      
      // 範囲チェック
      if (calculatedVal2 >= ranges[varParam2].min && calculatedVal2 <= ranges[varParam2].max) {
        const combination = { ...testValues, [varParam2]: calculatedVal2 } as ExposureValues;
        listB.push(combination);
      }
    } catch {
      // 計算エラーはスキップ
    }
  }
  
  // C: 逆に変動パラメータ2について、設定範囲、設定段数のステップで入力パラメータの候補リストを作成
  const varParam2Range = ranges[varParam2];
  const varParam2Steps = generateSteps(varParam2Range.min, varParam2Range.max, stepSize);
  
  // D: それに対応する変動パラメータ1を計算して変動パラメータ1,2のリストを作成
  const listD: Array<{ [K in keyof ExposureValues]: number }> = [];
  for (const val2 of varParam2Steps) {
    try {
      const testValues: Partial<ExposureValues> = {};
      testValues[fixedParam1] = baseValues[fixedParam1];
      testValues[fixedParam2] = baseValues[fixedParam2];
      testValues[varParam2] = val2;
      
      const calculatedVal1 = calculateMissingValue(testValues as ExposureValues, varParam1);
      
      // 範囲チェック
      if (calculatedVal1 >= ranges[varParam1].min && calculatedVal1 <= ranges[varParam1].max) {
        const combination = { ...testValues, [varParam1]: calculatedVal1 } as ExposureValues;
        listD.push(combination);
      }
    } catch {
      // 計算エラーはスキップ
    }
  }
  
  // E: (B),(D)のリストをパラメータを揃えて合体。重複や範囲外を除外して表を作成
  const combinedList = [...listB, ...listD];
  
  // 重複除外（全パラメータの値が近似している組み合わせを除外）
  const uniqueList: ExposureValues[] = [];
  const tolerance = 0.01; // 許容誤差
  
  for (const combination of combinedList) {
    const isDuplicate = uniqueList.some(existing => {
      return allParams.every(param => 
        Math.abs(combination[param] - existing[param]) < tolerance
      );
    });
    
    if (!isDuplicate) {
      uniqueList.push(combination);
    }
  }
  
  // 変動パラメータ1でソート
  uniqueList.sort((a, b) => a[varParam1] - b[varParam1]);
  
  return { variableParams, combinations: uniqueList };
}

// マトリックス表用：1固定パラメータ、1出力パラメータ、残り2つを行・列に配置
export interface MatrixTableData {
  fixedParam: keyof ExposureValues;
  outputParam: keyof ExposureValues;
  rowParam: keyof ExposureValues;
  colParam: keyof ExposureValues;
  rowValues: number[];
  colValues: number[];
  cellValues: (number | null)[][]; // 行×列のマトリックス、範囲外はnull
}

// マトリックス表のデータを生成
export function generateMatrixTableData(
  fixedParam: keyof ExposureValues,
  outputParam: keyof ExposureValues,
  baseValues: ExposureValues,
  ranges: RangeConfig,
  stepSize: number
): MatrixTableData {
  console.log('=== マトリックス表生成開始 ===');
  console.log('固定パラメータ:', fixedParam, '=', baseValues[fixedParam]);
  console.log('出力パラメータ:', outputParam);
  
  // 残りの2つのパラメータを行・列に配置
  const allParams: (keyof ExposureValues)[] = ['ev', 'av', 'tv', 'iso'];
  const remainingParams = allParams.filter(p => p !== fixedParam && p !== outputParam);
  
  if (remainingParams.length !== 2) {
    console.error('残りパラメータが2つではありません:', remainingParams);
    return {
      fixedParam,
      outputParam,
      rowParam: 'ev',
      colParam: 'av',
      rowValues: [],
      colValues: [],
      cellValues: []
    };
  }
  
  const [rowParam, colParam] = remainingParams as [keyof ExposureValues, keyof ExposureValues];
  console.log('行パラメータ:', rowParam);
  console.log('列パラメータ:', colParam);
  
  // 行・列の値を生成（設定範囲とステップサイズに基づく）
  const rowRange = ranges[rowParam];
  const colRange = ranges[colParam];
  const rowValues = generateSteps(rowRange.min, rowRange.max, stepSize);
  const colValues = generateSteps(colRange.min, colRange.max, stepSize);
  
  console.log(`行値生成: ${rowParam} ${rowRange.min}～${rowRange.max} ステップ${stepSize} → ${rowValues.length}個`);
  console.log(`列値生成: ${colParam} ${colRange.min}～${colRange.max} ステップ${stepSize} → ${colValues.length}個`);
  
  // セルの値を計算（出力パラメータの値）
  const cellValues: (number | null)[][] = [];
  let calculatedCount = 0;
  let rangeOutCount = 0;
  
  for (let rowIndex = 0; rowIndex < rowValues.length; rowIndex++) {
    const row: (number | null)[] = [];
    const rowValue = rowValues[rowIndex];
    
    for (let colIndex = 0; colIndex < colValues.length; colIndex++) {
      const colValue = colValues[colIndex];
      
      try {
        // 3つのパラメータから出力パラメータを計算
        const inputValues: Partial<ExposureValues> = {};
        inputValues[fixedParam] = baseValues[fixedParam];
        inputValues[rowParam] = rowValue;
        inputValues[colParam] = colValue;
        
        const calculatedValue = calculateMissingValue(inputValues as ExposureValues, outputParam);
        
        // 出力パラメータが範囲内かチェック
        const outputRange = ranges[outputParam];
        if (calculatedValue >= outputRange.min && calculatedValue <= outputRange.max) {
          row.push(calculatedValue);
          calculatedCount++;
        } else {
          row.push(null); // 範囲外
          rangeOutCount++;
        }
      } catch {
        row.push(null); // 計算エラー
        rangeOutCount++;
      }
    }
    
    cellValues.push(row);
  }
  
  console.log(`セル計算完了: 有効${calculatedCount}個, 範囲外/エラー${rangeOutCount}個`);
  console.log('=== マトリックス表生成完了 ===');
  
  return {
    fixedParam,
    outputParam,
    rowParam,
    colParam,
    rowValues,
    colValues,
    cellValues
  };
}
