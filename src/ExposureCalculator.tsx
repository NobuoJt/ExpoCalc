import React, { useState, useEffect } from 'react';
import type { ExposureValues, StepConfig, RangeConfig } from './exposureUtils';
import {
  calculateMissingValue,
  getEVDescription,
  formatShutterSpeed,
  formatFNumber,
  formatISO,
  generateSteps,
  parseCommonFNumber,
  parseCommonShutterSpeed,
  parseCommonISO,
  isNearCommonValue,
  formatCommonFNumber,
  formatCommonShutterSpeed,
  formatCommonISO,
  evToLux,
  formatLux,
  isValueInRange,
  getRangeWarning
} from './exposureUtils';
import './ExposureCalculator.css';

type CalculationMode = 'single' | 'table1D' | 'table2D' | 'matrix2D';

const ExposureCalculator: React.FC = () => {
  const [mode, setMode] = useState<CalculationMode>('single');
  const [values, setValues] = useState<ExposureValues>({
    ev: 12,
    av: 5,
    tv: 7,
    iso: 0
  });
  
  const [fixedParams, setFixedParams] = useState<Record<keyof ExposureValues, boolean>>({
    ev: false,
    av: true,
    tv: true,
    iso: true
  });
  
  const [stepConfig, setStepConfig] = useState<StepConfig>({
    stepSize: 1
  });
  
  const [ranges, setRanges] = useState<RangeConfig>({
    ev: { min: -6, max: 16 },
    av: { min: 0, max: 9 },
    tv: { min: -3, max: 13 },
    iso: { min: 0, max: 10 }
  });

  const [selectedParam1, setSelectedParam1] = useState<keyof ExposureValues>('av');
  const [selectedParam2, setSelectedParam2] = useState<keyof ExposureValues>('tv');

  // パラメータ1が変更された時、パラメータ2が重複しないようにする
  useEffect(() => {
    if (selectedParam1 === selectedParam2) {
      const allParams: (keyof ExposureValues)[] = ['ev', 'av', 'tv', 'iso'];
      const availableParams = allParams.filter(param => param !== selectedParam1);
      if (availableParams.length > 0) {
        setSelectedParam2(availableParams[0]);
      }
    }
  }, [selectedParam1, selectedParam2]);
  const [calculatedParam, setCalculatedParam] = useState<keyof ExposureValues>('ev');
  const [showEVTable, setShowEVTable] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDetailedValues, setShowDetailedValues] = useState(false);
  const [showUnifiedValues, setShowUnifiedValues] = useState(false);
  const [inputWarnings, setInputWarnings] = useState<Record<keyof ExposureValues, string>>({
    ev: '', av: '', tv: '', iso: ''
  });

  // 固定パラメータの数を数える
  const fixedCount = Object.values(fixedParams).filter(Boolean).length;

  // 入力値が変更された際にリアルタイム計算を実行
  const handleValueChange = (param: keyof ExposureValues, inputValue: string) => {
    let newValue: number | null = null;
    let warning = '';

    // 一般表現からの変換を試行
    if (param === 'av' && inputValue.toLowerCase().includes('f')) {
      newValue = parseCommonFNumber(inputValue);
      if (newValue === null) warning = 'f値の形式が正しくありません (例: f/2.8)';
    } else if (param === 'tv' && (inputValue.includes('/') || inputValue.toLowerCase().includes('s'))) {
      newValue = parseCommonShutterSpeed(inputValue);
      if (newValue === null) warning = 'シャッター速度の形式が正しくありません (例: 1/125, 2s)';
    } else if (param === 'iso' && inputValue.toLowerCase().includes('iso')) {
      newValue = parseCommonISO(inputValue);
      if (newValue === null) warning = 'ISO感度の形式が正しくありません (例: ISO400)';
    } else {
      // 数値として解析
      const parsed = parseFloat(inputValue);
      if (!isNaN(parsed)) newValue = parsed;
    }

    if (newValue !== null) {
      const newValues = { ...values, [param]: newValue };
      setValues(newValues);
      
      // 単一計算モードの場合はリアルタイム計算
      if (mode === 'single' && param !== calculatedParam) {
        try {
          const knownValues: Partial<ExposureValues> = { ...newValues };
          delete knownValues[calculatedParam];
          
          const result = calculateMissingValue(knownValues, calculatedParam);
          setValues(prev => ({ ...prev, [calculatedParam]: result }));
        } catch (error) {
          console.error('リアルタイム計算エラー:', error);
        }
      }
      
      // 範囲チェック
      if (!isValueInRange(param, newValue, ranges)) {
        warning = getRangeWarning(param, newValue, ranges);
      }
      // 一般表現での警告チェック（範囲警告がない場合のみ）
      else if (!isNearCommonValue(param, newValue)) {
        warning = `この値は一般的なカメラ設定値ではありません`;
      }
    }

    setInputWarnings(prev => ({ ...prev, [param]: warning }));
  };

  // 計算モードに応じて固定パラメータを自動調整
  useEffect(() => {
    if (mode === 'single' && fixedCount !== 3) {
      // 3 inputs → 1 output: 3つを固定
      const newFixed = { ...fixedParams };
      newFixed[calculatedParam] = false;
      Object.keys(newFixed).forEach(key => {
        if (key !== calculatedParam) {
          newFixed[key as keyof ExposureValues] = true;
        }
      });
      setFixedParams(newFixed);
    } else if (mode === 'table1D' && fixedCount !== 2) {
      // 2 inputs → 2 outputs: 2つを固定
      const newFixed = { ev: false, av: false, tv: false, iso: false };
      newFixed[selectedParam1] = true;
      newFixed[selectedParam2] = true;
      setFixedParams(newFixed);
    } else if (mode === 'table2D' && fixedCount !== 1) {
      // 1 input → 3 outputs: 1つを固定
      const newFixed = { ev: false, av: false, tv: false, iso: false };
      newFixed[selectedParam1] = true;
      setFixedParams(newFixed);
    }
  }, [mode, calculatedParam, selectedParam1, selectedParam2, fixedCount, fixedParams]);

  // 1D テーブル生成
  const generate1DTable = () => {
    const steps1 = generateSteps(ranges[selectedParam1].min, ranges[selectedParam1].max, stepConfig.stepSize);
    const steps2 = generateSteps(ranges[selectedParam2].min, ranges[selectedParam2].max, stepConfig.stepSize);
    
    const table: Array<{ param1: number; param2: number; results: Partial<ExposureValues>; hasValidValues: boolean }> = [];
    
    for (const val1 of steps1) {
      for (const val2 of steps2) {
        try {
          const testValues = { ...values };
          testValues[selectedParam1] = val1;
          testValues[selectedParam2] = val2;
          
          const remainingParams = Object.keys(values).filter(
            key => key !== selectedParam1 && key !== selectedParam2
          ) as Array<keyof ExposureValues>;
          
          const results: Partial<ExposureValues> = { ...testValues };
          
          for (const param of remainingParams) {
            results[param] = calculateMissingValue(testValues, param);
          }
          
          // 範囲チェック：計算された値がすべて範囲内にあるかチェック
          let hasValidValues = false;
          for (const param of remainingParams) {
            if (results[param] !== undefined && isValueInRange(param, results[param]!, ranges)) {
              hasValidValues = true;
              break;
            }
          }
          
          // 少なくとも1つの値が範囲内にある行のみを含める
          if (hasValidValues) {
            table.push({ param1: val1, param2: val2, results, hasValidValues });
          }
        } catch {
          // 計算できない組み合わせはスキップ
        }
      }
    }
    
    return table;
  };

  // 2D テーブル生成
  const generate2DTable = () => {
    const steps = generateSteps(ranges[selectedParam1].min, ranges[selectedParam1].max, stepConfig.stepSize);
    const remainingParams = Object.keys(values).filter(
      key => key !== selectedParam1
    ) as Array<keyof ExposureValues>;
    
    const table: Array<{ fixedValue: number; results: Partial<ExposureValues>; hasValidValues: boolean }> = [];
    
    for (const val of steps) {
      try {
        const testValues = { ...values };
        testValues[selectedParam1] = val;
        
        const results: Partial<ExposureValues> = { ...testValues };
        
        for (const param of remainingParams) {
          results[param] = calculateMissingValue(testValues, param);
        }
        
        // 範囲チェック：計算された値がすべて範囲内にあるかチェック
        let hasValidValues = false;
        for (const param of remainingParams) {
          if (results[param] !== undefined && isValueInRange(param, results[param]!, ranges)) {
            hasValidValues = true;
            break;
          }
        }
        
        // 少なくとも1つの値が範囲内にある行のみを含める
        if (hasValidValues) {
          table.push({ fixedValue: val, results, hasValidValues });
        }
      } catch {
        // 計算できない値はスキップ
      }
    }
    
    return table;
  };

  // 真の2次元表生成（マトリックス形式）
  const generate2DMatrixTable = () => {
    const fixedParam = selectedParam1;
    const fixedValue = values[fixedParam];
    
    // 残りの3つのパラメータから2つを選んで行・列にする
    const remainingParams = Object.keys(values).filter(key => key !== fixedParam) as Array<keyof ExposureValues>;
    const rowParam = remainingParams[0];
    const colParam = remainingParams[1];
    const resultParam = remainingParams[2];
    
    const rowSteps = generateSteps(ranges[rowParam].min, ranges[rowParam].max, stepConfig.stepSize);
    const colSteps = generateSteps(ranges[colParam].min, ranges[colParam].max, stepConfig.stepSize);
    
    const matrix: Array<Array<{ value: number | null; isValid: boolean }>> = [];
    
    for (const rowValue of rowSteps.slice(0, 20)) { // 行数制限
      const row: Array<{ value: number | null; isValid: boolean }> = [];
      
      for (const colValue of colSteps.slice(0, 15)) { // 列数制限
        try {
          const testValues = { ...values };
          testValues[fixedParam] = fixedValue;
          testValues[rowParam] = rowValue;
          testValues[colParam] = colValue;
          
          const result = calculateMissingValue(testValues, resultParam);
          row.push({ value: result, isValid: true });
        } catch {
          row.push({ value: null, isValid: false });
        }
      }
      
      matrix.push(row);
    }
    
    return {
      matrix,
      rowParam,
      colParam,
      resultParam,
      rowSteps: rowSteps.slice(0, 20),
      colSteps: colSteps.slice(0, 15),
      fixedParam,
      fixedValue
    };
  };

  const formatValue = (param: keyof ExposureValues, value: number) => {
    switch (param) {
      case 'ev':
        return `EV ${value.toFixed(1)}`;
      case 'av':
        return formatFNumber(value);
      case 'tv':
        return formatShutterSpeed(value);
      case 'iso':
        return formatISO(value);
    }
  };

  const formatStrictValue = (param: keyof ExposureValues, value: number) => {
    switch (param) {
      case 'ev':
        return formatLux(evToLux(value));
      case 'av':
        return formatFNumber(value);
      case 'tv':
        return formatShutterSpeed(value);
      case 'iso':
        return formatISO(value);
    }
  };

  const getParamLabel = (param: keyof ExposureValues) => {
    switch (param) {
      case 'ev': return 'EV (露出値)';
      case 'av': return 'AV (絞り値)';
      case 'tv': return 'TV (シャッター速度)';
      case 'iso': return 'ISO (感度)';
    }
  };

  // ステップ調整関数
  const adjustValue = (param: keyof ExposureValues, step: number) => {
    const currentValue = values[param];
    const newValue = currentValue + step;
    
    // 範囲チェック
    const range = ranges[param];
    if (newValue < range.min || newValue > range.max) return;
    
    const newValues = { ...values, [param]: newValue };
    setValues(newValues);
    
    // 単一計算モードの場合はリアルタイム計算
    if (mode === 'single' && param !== calculatedParam) {
      try {
        const knownValues: Partial<ExposureValues> = { ...newValues };
        delete knownValues[calculatedParam];
        
        const result = calculateMissingValue(knownValues, calculatedParam);
        setValues(prev => ({ ...prev, [calculatedParam]: result }));
        
        // 計算結果の範囲チェック
        if (!isValueInRange(calculatedParam, result, ranges)) {
          setInputWarnings(prev => ({ 
            ...prev, 
            [calculatedParam]: getRangeWarning(calculatedParam, result, ranges)
          }));
        } else {
          setInputWarnings(prev => ({ ...prev, [calculatedParam]: '' }));
        }
      } catch (error) {
        console.error('ステップ調整時のリアルタイム計算エラー:', error);
      }
    }
  };

  // ステップボタンが無効かどうかチェック
  const isStepDisabled = (param: keyof ExposureValues, step: number) => {
    const currentValue = values[param];
    const newValue = currentValue + step;
    const range = ranges[param];
    
    // 範囲外チェック
    if (newValue < range.min || newValue > range.max) return true;
    
    // 精度チェック（1/3ステップと1/2ステップの競合を避ける）
    const remainder = Math.abs(currentValue % 1);
    const isThirdStep = Math.abs(remainder - 1/3) < 0.01 || Math.abs(remainder - 2/3) < 0.01;
    const isHalfStep = Math.abs(remainder - 0.5) < 0.01;
    
    if (isThirdStep && Math.abs(step) === 0.5) return true;
    if (isHalfStep && Math.abs(step) === 1/3) return true;
    
    return false;
  };

  // 一般表現での表示を取得
  const getCommonValueDisplay = (param: keyof ExposureValues, value: number): string => {
    switch (param) {
      case 'av': return formatCommonFNumber(value);
      case 'tv': return formatCommonShutterSpeed(value);
      case 'iso': return formatCommonISO(value);
      default: return '';
    }
  };

  // 範囲の一般表現表示
  const getRangeDisplay = (param: keyof ExposureValues, range: { min: number; max: number }): string => {
    switch (param) {
      case 'ev':
        return `${getEVDescription(range.min).split(' ')[0]} ～ ${getEVDescription(range.max).split(' ')[0]}`;
      case 'av':
        return `${formatCommonFNumber(range.min)} ～ ${formatCommonFNumber(range.max)}`;
      case 'tv':
        return `${formatCommonShutterSpeed(range.max)} ～ ${formatCommonShutterSpeed(range.min)}`;
      case 'iso':
        return `${formatCommonISO(range.min)} ～ ${formatCommonISO(range.max)}`;
      default:
        return '';
    }
  };

  return (
    <div className="exposure-calculator">
      <h1>露出計算機</h1>
      
      <div className={`main-content ${mode === 'single' ? 'single-mode' : ''}`}>
        {/* 左のカラム：コントロール */}
        <div className="controls-column">
          {/* モード選択 */}
          <div className="section mode-selector">
            <h2>計算モード</h2>
            <label>
              <input
                type="radio"
                value="single"
                checked={mode === 'single'}
                onChange={(e) => setMode(e.target.value as CalculationMode)}
              />
              3入力 → 1出力
            </label>
            <label>
              <input
                type="radio"
                value="table1D"
                checked={mode === 'table1D'}
                onChange={(e) => setMode(e.target.value as CalculationMode)}
              />
              1次元表 (2入力 → 2出力)
            </label>
            <label>
              <input
                type="radio"
                value="table2D"
                checked={mode === 'table2D'}
                onChange={(e) => setMode(e.target.value as CalculationMode)}
              />
              2次元表 (1入力 → 3出力)
            </label>
            <label>
              <input
                type="radio"
                value="matrix2D"
                checked={mode === 'matrix2D'}
                onChange={(e) => setMode(e.target.value as CalculationMode)}
              />
              マトリックス表 (行×列の2次元表)
            </label>
          </div>

          {/* 露出パラメータ */}
          <div className="section value-inputs">
            <h2>露出パラメータ</h2>
            
            {/* モードに応じた固定パラメータ選択 */}
            {mode === 'single' && (
                null
            )}

            {mode === 'table1D' && (
              <div className="param-selection">
                <h3>固定パラメータ選択</h3>
                <label>
                  パラメータ1:
                  <select value={selectedParam1} onChange={(e) => setSelectedParam1(e.target.value as keyof ExposureValues)}>
                    <option value="ev">EV (露出値)</option>
                    <option value="av">AV (絞り値)</option>
                    <option value="tv">TV (シャッター速度)</option>
                    <option value="iso">ISO (感度)</option>
                  </select>
                </label>
                <label>
                  パラメータ2:
                  <select value={selectedParam2} onChange={(e) => setSelectedParam2(e.target.value as keyof ExposureValues)}>
                    <option value="ev" disabled={selectedParam1 === 'ev'}>EV (露出値)</option>
                    <option value="av" disabled={selectedParam1 === 'av'}>AV (絞り値)</option>
                    <option value="tv" disabled={selectedParam1 === 'tv'}>TV (シャッター速度)</option>
                    <option value="iso" disabled={selectedParam1 === 'iso'}>ISO (感度)</option>
                  </select>
                </label>
              </div>
            )}

            {(mode === 'table2D' || mode === 'matrix2D') && (
              <div className="param-selection">
                <h3>固定パラメータ選択</h3>
                <label>
                  固定パラメータ:
                  <select value={selectedParam1} onChange={(e) => setSelectedParam1(e.target.value as keyof ExposureValues)}>
                    <option value="ev">EV (露出値)</option>
                    <option value="av">AV (絞り値)</option>
                    <option value="tv">TV (シャッター速度)</option>
                    <option value="iso">ISO (感度)</option>
                  </select>
                </label>
                {mode === 'matrix2D' && (
                  <div className="param-note">
                    ※ 残り3つのパラメータから自動的に行・列・結果が決定されます
                  </div>
                )}
              </div>
            )}

            {/* パラメータ値入力 */}
            <div className="click-instruction">
              {mode === 'single' && (
                <>
                  計算対象にしたいパラメータの行をクリックしてください（入力欄やボタン以外）
                  <br />
                </>
              )}
              <button 
                className="toggle-detailed-values"
                onClick={() => setShowDetailedValues(!showDetailedValues)}
              >
                {showDetailedValues ? '詳細値を非表示' : '詳細値を表示'}
              </button>
            </div>
            {Object.entries(values).map(([param, value]) => {
              const isInputParam = mode === 'single' ? param !== calculatedParam : 
                                  mode === 'table1D' ? (param === selectedParam1 || param === selectedParam2) :
                                  (mode === 'table2D' || mode === 'matrix2D') ? param === selectedParam1 : false;
              
              const isOutputParam = mode === 'single' && param === calculatedParam;
              
              const handleRowClick = (e: React.MouseEvent) => {
                // input, button, select要素からのクリックは無視
                const target = e.target as HTMLElement;
                if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.tagName === 'SELECT') {
                  return;
                }
                
                // step-buttons コンテナからのクリックも無視
                if (target.className?.includes('step-buttons') || target.className?.includes('strict-value')) {
                  return;
                }
                
                if (mode === 'single') {
                  setCalculatedParam(param as keyof ExposureValues);
                }
              };

              const handleLabelClick = () => {
                if (mode === 'single') {
                  setCalculatedParam(param as keyof ExposureValues);
                }
              };
              
              const isOutOfRange = !isValueInRange(param as keyof ExposureValues, value, ranges);
              
              return (
                <div 
                  key={param} 
                  className={`parameter-row ${isOutputParam ? 'output-param' : ''} ${mode === 'single' ? 'clickable' : ''} ${isOutOfRange ? 'out-of-range' : ''}`}
                  onClick={handleRowClick}
                >
                  <div className={`value-input-row ${showDetailedValues ? 'detailed' : ''}`}>
                    <label className="param-label" onClick={handleLabelClick}>{getParamLabel(param as keyof ExposureValues)}:</label>
                    {isOutputParam ? (
                      <div className="output-display">
                        {param === 'ev' ? getEVDescription(value).split(' ')[0] : getCommonValueDisplay(param as keyof ExposureValues, value)}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={param === 'ev' ? getEVDescription(value).split(' ')[0] : getCommonValueDisplay(param as keyof ExposureValues, value)}
                        onChange={(e) => handleValueChange(param as keyof ExposureValues, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        disabled={!isInputParam && mode !== 'single'}
                        className="value-input"
                        placeholder={param === 'ev' ? 'EV値' : param === 'av' ? 'f/2.8' : param === 'tv' ? '1/125' : 'ISO400'}
                      />
                    )}
                    {showDetailedValues && (
                      <div className="detailed-values">
                        {isOutputParam ? (
                          <div className="output-display">
                            {value.toFixed(3)}
                          </div>
                        ) : (
                          <input
                            type="number"
                            value={value.toFixed(3)}
                            onChange={(e) => {
                              const newValue = parseFloat(e.target.value);
                              if (!isNaN(newValue)) {
                                const newValues = { ...values, [param]: newValue };
                                setValues(newValues);
                                
                                // 範囲チェック
                                let warning = '';
                                if (!isValueInRange(param as keyof ExposureValues, newValue, ranges)) {
                                  warning = getRangeWarning(param as keyof ExposureValues, newValue, ranges);
                                }
                                setInputWarnings(prev => ({ ...prev, [param]: warning }));
                                
                                // 単一計算モードでリアルタイム計算
                                if (mode === 'single' && param !== calculatedParam) {
                                  try {
                                    const knownValues: Partial<ExposureValues> = { ...newValues };
                                    delete knownValues[calculatedParam];
                                    
                                    const result = calculateMissingValue(knownValues, calculatedParam);
                                    setValues(prev => ({ ...prev, [calculatedParam]: result }));
                                    
                                    // 計算結果の範囲チェック
                                    if (!isValueInRange(calculatedParam, result, ranges)) {
                                      setInputWarnings(prev => ({ 
                                        ...prev, 
                                        [calculatedParam]: getRangeWarning(calculatedParam, result, ranges)
                                      }));
                                    } else {
                                      setInputWarnings(prev => ({ ...prev, [calculatedParam]: '' }));
                                    }
                                  } catch (error) {
                                    console.error('数値入力時のリアルタイム計算エラー:', error);
                                  }
                                }
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            step={0.001}
                            disabled={!isInputParam && mode !== 'single'}
                            className="common-value"
                          />
                        )}
                        <div className="strict-value" onClick={(e) => e.stopPropagation()}>
                          {formatStrictValue(param as keyof ExposureValues, value)}
                        </div>
                      </div>
                    )}
                    <div className="step-buttons" onClick={(e) => e.stopPropagation()}>
                      <button 
                        className={`step-button minus full-stop ${isStepDisabled(param as keyof ExposureValues, -1) || isOutputParam ? 'disabled' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          adjustValue(param as keyof ExposureValues, -1);
                        }}
                        disabled={isStepDisabled(param as keyof ExposureValues, -1) || isOutputParam}
                      >-1</button>
                      <button 
                        className={`step-button minus ${isStepDisabled(param as keyof ExposureValues, -0.5) || isOutputParam ? 'disabled' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          adjustValue(param as keyof ExposureValues, -0.5);
                        }}
                        disabled={isStepDisabled(param as keyof ExposureValues, -0.5) || isOutputParam}
                      >-½</button>
                      <button 
                        className={`step-button minus ${isStepDisabled(param as keyof ExposureValues, -1/3) || isOutputParam ? 'disabled' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          adjustValue(param as keyof ExposureValues, -1/3);
                        }}
                        disabled={isStepDisabled(param as keyof ExposureValues, -1/3) || isOutputParam}
                      >-⅓</button>
                      <button 
                        className={`step-button plus ${isStepDisabled(param as keyof ExposureValues, 1/3) || isOutputParam ? 'disabled' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          adjustValue(param as keyof ExposureValues, 1/3);
                        }}
                        disabled={isStepDisabled(param as keyof ExposureValues, 1/3) || isOutputParam}
                      >+⅓</button>
                      <button 
                        className={`step-button plus ${isStepDisabled(param as keyof ExposureValues, 0.5) || isOutputParam ? 'disabled' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          adjustValue(param as keyof ExposureValues, 0.5);
                        }}
                        disabled={isStepDisabled(param as keyof ExposureValues, 0.5) || isOutputParam}
                      >+½</button>
                      <button 
                        className={`step-button plus full-stop ${isStepDisabled(param as keyof ExposureValues, 1) || isOutputParam ? 'disabled' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          adjustValue(param as keyof ExposureValues, 1);
                        }}
                        disabled={isStepDisabled(param as keyof ExposureValues, 1) || isOutputParam}
                      >+1</button>
                    </div>
                  </div>
                  {inputWarnings[param as keyof ExposureValues] && (
                    <div className={`input-warning ${isOutOfRange ? 'out-of-range' : ''}`}>
                      {inputWarnings[param as keyof ExposureValues]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 設定（折りたたみ可能） */}
          <div className="section collapsible-section">
            <button 
              className="collapsible-header"
              onClick={() => setShowSettings(!showSettings)}
            >
              設定 
              <span>{showSettings ? '▼' : '▶'}</span>
            </button>
            {showSettings && (
              <div className="collapsible-content">
                <div className="step-config">
                  <label>
                    段数:
                    <select
                      value={stepConfig.stepSize}
                      onChange={(e) => setStepConfig({ stepSize: parseFloat(e.target.value) })}
                    >
                      <option value={1}>1段 (1 stop)</option>
                      <option value={1/2}>1/2段 (1/2 stop)</option>
                      <option value={1/3}>1/3段 (1/3 stop)</option>
                    </select>
                  </label>
                </div>

                <div className="range-config">
                  <h3>値の範囲</h3>
                  {Object.entries(ranges).map(([param, range]) => (
                    <div key={param} className="range-input">
                      <label>{getParamLabel(param as keyof ExposureValues)}:</label>
                      <input
                        type="number"
                        value={range.min}
                        onChange={(e) => setRanges(prev => ({
                          ...prev,
                          [param]: { ...prev[param as keyof RangeConfig], min: parseFloat(e.target.value) }
                        }))}
                        step={stepConfig.stepSize}
                      />
                      <span>～</span>
                      <input
                        type="number"
                        value={range.max}
                        onChange={(e) => setRanges(prev => ({
                          ...prev,
                          [param]: { ...prev[param as keyof RangeConfig], max: parseFloat(e.target.value) }
                        }))}
                        step={stepConfig.stepSize}
                      />
                      <div className="range-display">
                        {getRangeDisplay(param as keyof ExposureValues, range)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* EV-明るさ目安表 */}
          <div className="section ev-reference-table">
            <button 
              className="ev-reference-toggle"
              onClick={() => setShowEVTable(!showEVTable)}
            >
              EV-明るさ目安表 {showEVTable ? '▼' : '▶'}
            </button>
            {showEVTable && (
              <div className="ev-reference-content">
                <table>
                  <thead>
                    <tr>
                      <th>EV値</th>
                      <th>明るさの目安</th>
                      <th>照度</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      [16, "真夏のビーチ", "164kLux"],
                      [15, "快晴", "81.9kLux"],
                      [14, "晴れ", "41.0kLux"],
                      [13, "薄日", "20.5kLux"],
                      [12, "曇り", "10.2kLux"],
                      [11, "雨曇り", "5.12kLux"],
                      [10, "陳列棚", "2.56kLux"],
                      [9, "明るい部屋", "1.28kLux"],
                      [8, "エレベータ", "640Lux"],
                      [7, "体育館", "320Lux"],
                      [6, "廊下", "160Lux"],
                      [5, "休憩室", "80Lux"],
                      [4, "暗い室内", "40Lux"],
                      [3, "観客席", "20Lux"],
                      [2, "映画館", "10Lux"],
                      [1, "日没後", "5Lux"],
                      [0, "薄明り", "2.5Lux"],
                      [-1, "深夜屋内", "1.25Lux"],
                      [-2, "月夜", "0.63Lux"],
                      [-3, "おぼろ月夜", "0.31Lux"],
                      [-4, "星空", "0.16Lux"]
                    ].map(([ev, desc, lux]) => (
                      <tr key={ev}>
                        <td>EV {ev}</td>
                        <td>{desc}</td>
                        <td>{lux}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* 右のカラム：計算結果・表示エリア */}
        <div className="results-column">
          {mode !== 'single' && (
            <div className="section table-section">
              <h2>計算結果</h2>
              
              {mode === 'table1D' && (
              <div className="table-1d">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3>
                    1次元表 - {formatValue(selectedParam1, values[selectedParam1])}, {formatValue(selectedParam2, values[selectedParam2])}
                    {((selectedParam1 === 'ev') || (selectedParam2 === 'ev')) && (
                      <span> ({getEVDescription(values.ev).split(' ')[0] })</span>
                    )}
                  </h3>
                  <button 
                    className="toggle-detailed-values"
                    onClick={() => setShowUnifiedValues(!showUnifiedValues)}
                  >
                    {showUnifiedValues ? '詳細値を非表示' : '詳細値を表示'}
                  </button>
                </div>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        {Object.keys(values).filter(key => key !== selectedParam1 && key !== selectedParam2).map(param => (
                          <th key={param}>{getParamLabel(param as keyof ExposureValues)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {generate1DTable().slice(0, 50).map((row, index) => (
                        <tr key={index}>
                          {Object.keys(values).filter(key => key !== selectedParam1 && key !== selectedParam2).map(param => {
                            const value = row.results[param as keyof ExposureValues];
                            const isOutOfRange = value !== undefined && !isValueInRange(param as keyof ExposureValues, value, ranges);
                            
                            return (
                              <td key={param} className={isOutOfRange ? 'out-of-range-cell' : ''}>
                                {value !== undefined ? (
                                  <>
                                    {formatValue(param as keyof ExposureValues, value)}
                                    {showUnifiedValues && (
                                      <div className="unified-value">({param.toUpperCase()}={value.toFixed(1)})</div>
                                    )}
                                    {isOutOfRange && (
                                      <div className="range-warning-cell">範囲外</div>
                                    )}
                                  </>
                                ) : 'N/A'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {mode === 'table2D' && (
              <div className="table-2d">
                <h3>2次元表 (固定: {formatValue(selectedParam1, values[selectedParam1])})</h3>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>{getParamLabel(selectedParam1)}</th>
                        {Object.keys(values).filter(key => key !== selectedParam1).map(param => (
                          <th key={param}>{getParamLabel(param as keyof ExposureValues)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {generate2DTable().slice(0, 30).map((row, index) => (
                        <tr key={index}>
                          <td>{formatValue(selectedParam1, row.fixedValue)}</td>
                          {Object.keys(values).filter(key => key !== selectedParam1).map(param => {
                            const value = row.results[param as keyof ExposureValues];
                            const isOutOfRange = value !== undefined && !isValueInRange(param as keyof ExposureValues, value, ranges);
                            
                            return (
                              <td key={param} className={isOutOfRange ? 'out-of-range-cell' : ''}>
                                {value !== undefined ? (
                                  <>
                                    {formatValue(param as keyof ExposureValues, value)}
                                    {isOutOfRange && (
                                      <div className="range-warning-cell">範囲外</div>
                                    )}
                                  </>
                                ) : 'N/A'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {mode === 'matrix2D' && (() => {
              const matrixData = generate2DMatrixTable();
              return (
                <div className="table-matrix">
                  <h3>マトリックス表</h3>
                  <div className="matrix-info">
                    固定: {formatValue(matrixData.fixedParam, matrixData.fixedValue)} | 
                    行: {getParamLabel(matrixData.rowParam)} | 
                    列: {getParamLabel(matrixData.colParam)} | 
                    結果: {getParamLabel(matrixData.resultParam)}
                  </div>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>{getParamLabel(matrixData.rowParam)} \ {getParamLabel(matrixData.colParam)}</th>
                          {matrixData.colSteps.map((colValue, index) => (
                            <th key={index}>{formatValue(matrixData.colParam, colValue)}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {matrixData.matrix.map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            <td className="row-header">
                              {formatValue(matrixData.rowParam, matrixData.rowSteps[rowIndex])}
                            </td>
                            {row.map((cell, colIndex) => (
                              <td key={colIndex} className={cell.isValid ? '' : 'invalid-cell'}>
                                {cell.isValid && cell.value !== null 
                                  ? formatValue(matrixData.resultParam, cell.value)
                                  : 'N/A'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExposureCalculator;
