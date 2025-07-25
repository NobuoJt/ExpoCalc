# Copilot Instructions for ExpoCalc

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a camera exposure calculator web application built with React, TypeScript, and Vite. The application allows users to interactively calculate and display exposure values including:

- EV (Exposure Value) and brightness descriptions
- AV (Aperture Value / f-stop)
- TV (Time Value / Shutter Speed)
- ISO sensitivity

## Features
- Interactive controls for 4 exposure parameters
- Multiple calculation modes:
    - 3 inputs → 1 output calculation
    - 2 inputs → 2 outputs (1D table)
    - 1 input → 3 outputs (2D table)
- Configurable step sizes (1 stop, 1/2 stop, 1/3 stop)
- Adjustable value ranges (min/max limits)
    - default ranges for each parameter
        - EV: -6 to 16
        - AV: 0.6 (F1.2) to 9 (F22)
        - TV: -3.3 (10s) to 13 (8192s)
        - ISO: 0 (iso100) to 10 (iso102400)
    - brightness descriptions for EV values

    ```csv
        明るさの目安,EV値,照度
        真夏のビーチ,EV16,164kLux
        快晴,EV15,81.9kLux
        晴れ,EV14,41.0kLux
        薄日,EV13,20.5kLux
        曇り,EV12,10.2kLux
        雨曇り,EV11,5.12kLux
        陳列棚,EV10,2.56kLux
        明るい部屋,EV9,1.28kLux
        エレベータ,EV8,640Lux
        体育館,EV7,320Lux
        廊下,EV6,160Lux
        休憩室,EV5,80Lux
        暗い室内,EV4,40Lux
        観客席,EV3,20Lux
        映画館,EV2,10Lux
        日没後,EV1,5Lux
        薄明り,EV0,2.5Lux
        深夜屋内,EV-1,1.25Lux
        月夜,EV-2,0.63Lux
        おぼろ月夜,EV-3,0.31Lux
        星空,EV-4,0.16Lux
    ```

## Code Style Guidelines
- Use TypeScript for type safety
- Follow React functional component patterns with hooks
- Use CSS modules or styled-components for styling
- Implement responsive design for mobile and desktop
- Focus on clean, readable code with proper type definitions

## 修正用用語定義

以下、
    - 「EV 12」や「f/5.6(カメラで表示される近似値)」のことを一般表現
    - 「f/5.657...」のことを厳密表現
    - 「EV=12」や「AV=5」のことを統一表現
と便宜的に呼ぶことにする。

「一般表現」
    - 一般表現に当てはまるような表を生成するロジックを組んでおきたい。 
        - 基準, 基準+1/3, 基準+1/2, 基準+2/3, 基準+1, 基準+1+1/3, 基準+1+1/2, 基準+1+2/3, 基準+2, ...
    - 例：絞り 2ケタに抑える
        1.0, 1.1, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.5, 2.8, 3.2, 3.5, 4.0, 4.5, 5.0, 5.6, 
        6.3, 7.1, 8.0, 9.0, 10, 11, 13, 14, 16, 18, 20, 22, 25, 28, 32
    - 例：シャッター速度
        180, 120, 90, 60, 50, 40, 30, 25, 20, 15, 13, 10, 8, 6, 5, 4, 3, 2.5, 2, 1.6, 1.3, 1,
        1/1.3, 1/1.6, 1/2, 1/2.5, 1/3, 1/4, 1/5, 1/6, 1/8, 1/10, 1/13, 1/15, 1/20, 1/25, 1/30, 
        1/40, 1/50, 1/60, 1/80, 1/100, 1/125, 1/160, 1/200, 1/250, 1/320, 1/400, 1/500, 1/640, 
        1/800, 1/1000, 1/1250, 1/1600, 1/2000, 1/2500, 1/3200, 1/4000, 1/5000, 1/6400, 1/8000, 1/10000, 1/12800
    - 例：iso感度
        50, 64, 80, 100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600, 
        2000, 2500, 3200, 4000, 5000, 6400, 8000, 10000, 12800, 16000, 20000, 25600, 
        32000, 40000, 51200, 64000, 80000, 102400, 128000, 160000, 200000, 256000, 320000, 400000, 512000
    

## 修正用

- 全体
    - 横幅をとってもいい。 ✅
    - レスポンシブで余裕があるなら2カラムがちょうどいいかも。 ✅
    - 想定する最低横幅は400px。
        - common-valueとstrict-valueは縮小して、必ず横並びとする。
    - 表は第1列と第1行を固定してスクロールできるように。 ✅
    - 配置順(1カラム) ✅
        - 計算モード
        - 露出パラメータ
        - 表
        - 設定(折りたたみ)
        - 目安表(折りたたみ)
    - 配置順(2カラム) ✅
        - 左カラム
            - 計算モード
            - 露出パラメータ
            - 設定(折りたたみ)
            - 目安表(折りたたみ)
        - 右カラム
            - 表
    - デフォルト値
        - 計算モードは「単一計算」
        - EV値計算
            - AV値は「f/5.6」
            - TV値は「1/125」
            - iso値は「iso100」
        - 段数は「1段」
        - 値の範囲
            - EV: -6 ～ 16
            - AV: 1 ～ 9
            - TV: -1 ～ 13
            - ISO: 0 ～ 9

- 「設定」や「露出パラメータ」
    - input要素を上下(EV,AV...)で揃えたい。 ✅
    　　- 「EV:」の文字は左揃え、input要素からプラスマイナスボタンは右揃え。 ✅
    - EV値、TV値などのinput要素は幅を半分くらいに。 ✅
    - 明るさの言語的表現をEVと同じ行に配置したい。 ✅
    - 「値の範囲」の部分にも一般表現を添えたい。 ✅
        - TVの部分は「遅～速」の順番。
    - +1/3段を3回行った場合にもとの+1段になるよう、精度を保たせたい。(一般表現の表を生成するロジックとの対応) ✅
    - それぞれの要素に対してプラスマイナス1段、1/2段、1/3段できるボタンを追加。合計6こ。 ✅
        - マイナスは赤色、プラスは青色、1段は濃くする。 ✅
        - 例えば0.0(1), 0.33(1/3), 0.5(1/2), 0.66(2/3), 1(1)があった場合、
            - 現在値が(n/3)のときに1/2段分の変更をさせない ✅
            - 現在値が(n/2)のときに1/3段分の変更をさせない ✅
            - 扱うすべての値において、統一表現で、dを任意の整数としたときに以下の範囲に収まらなかった場合、その値に近似する。
                - d+0, d+1/3, d+1/2, d+2/3 
        - すべてのボタンが収まるように親要素の幅を調整 ✅
    - 一般表現での入力を受け付けたい。 ✅
        - 「EV」「f/」「1/」「iso」などは補完する。 ✅
    - 一般表現で表現できない値の入力、出力がある場合に警告を出す。 ✅
        - Alertダイアログではなく、ユーザーの行動を妨げない形での警告。 ✅
    - 固定パラメーターにした値はさわれないように。 ✅
    - 「単一計算」時にもEVの部分を触れるように。 ✅
        - 4要素のうちin3,out1をどう割り振るかは計算ボタンで分ける。 ✅
    - そもそも固定パラメータ1,2の選択も「露出パラメータ」内のラジオボタンで行う。 ✅
    - 「設定」エリア ✅
        - 一般表現での表記は幅を取るので新しい行から開始。 ✅
    - div.section.value-inputsからdiv.step-buttonsがはみ出ている。 ✅
    - value-inputは一般表現での表記。入力対応。 ✅
        - 一般表現での入力を受け付けたい。 ✅
        - 「2.8」だけでも入力できるように「EV」「f/」「1/」「iso」などは補完する。 ✅
    - strict-valueは表示用の厳密表現値。入力不可。露出はEVではなくluxで表示。common-valueと同じくdisable表示。
        - strict-valueは表示用の厳密表現値。入力不可。露出はEVではなくluxで表示。
    - common-valueはEV値、TV値など。数値のみ。入力対応。 ✅
- 「露出パラメータ」は右のカラムに配置。 ✅ (左カラムに配置)

- 展開・縮小可能なEV-明るさ目安表を挿入。 ✅
    
- 単一計算モード(3入力→1出力)
    - 計算結果のセクションは作らない
        - 計算ボタンはいらない。リアルタイムに更新する。
        - プラスマイナスのボタンプッシュでもリアルタイムに計算。
        - 出力値は、対象となる露出パラメータのvalue-inputを一時的に入力不可としそこに表示する。
        - 出力値となる部分は背景色やフォントスタイルで強調する。
        - 出力値となる部分のボタンは無効化。
            - 行自体も薄めに強調。
    - 2カラム幅でも1カラムに
    - 計算対象パラメータはラジオボタンではなく、div.value-input-rowのクリックで選択。

- 計算履歴を残したい。 (TODO)
- 「表」
    - パラメータを固定させる。 ✅
    - 露出パラメータで指定した値は強調させる。 (TODO)
        - 4要素のうち部分一致でもその部分を強調。
        - 4要素全体一致はより強調。
    - 固定されたパラメータは判別できるようなスタイルで表示する。それは強調ではない。 (TODO)
    - 表の中でクリックした要素を選択して次の固定パラメータに用いる。 (TODO)
    - 「2次元表」 ✅
        - 2次元表とは行と列で2次元を表現する。
        
## ２次元表のイメージ(正確ではない)

表外部表示：
iso100, F値+SS→露出, 1stop

表：
|F値-シャッタースピード|1|1/2|
|-|-|-|
|f/1|EV 0|EV 1|
|f/1.4|EV 1|EV 2|
