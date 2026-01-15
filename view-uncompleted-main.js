/**
 * 担当: 「未コンプ」ビューの描画フロー制御（オーケストレーター）
 * 依存関係: logic-uncompleted.js, view-uncompleted-table.js, view-uncompleted-details.js, view-uncompleted-ui.js
 */

/**
 * 未コンプビューの初期化および描画のメインエントリポイント
 */
function createAndDisplayUncompletedSeedView(initialSeed, gacha, tableRows, thresholds, initialLastRollId, displaySeed, params) {
    // 1. データ計算の実行 (logic-uncompleted.js)
    const { 
        Nodes, highlightInfo, maxNodes, 
        tenPullCyclesData, expectedFeaturedCounts 
    } = calculateUncompletedData(initialSeed, gacha, tableRows, thresholds, initialLastRollId, params);

    // URLパラメータから現在の設定値を計算
    const ngVal = parseInt(params.get('ng'), 10);
    const initialFs = parseInt(params.get('fs'), 10) || 0;
    const guaranteedCycle = gacha.guaranteedCycle || 30;
    let initialNg = !isNaN(ngVal) && ngVal > 0 ? ngVal : guaranteedCycle;

    // 2. 計算過程の詳細表示をレンダリング (view-uncompleted-details.js)
    renderUncompletedDetails(Nodes, highlightInfo, maxNodes, tenPullCyclesData, gacha, initialLastRollId, params);
    
    // 3. メインテーブルのレンダリング (view-uncompleted-table.js)
    renderUncompletedMainTable(Nodes, highlightInfo, tenPullCyclesData, expectedFeaturedCounts, tableRows, displaySeed, initialNg, initialFs, guaranteedCycle);

    // 4. UI操作用ロジック（トグルボタン等）の初期化 (view-uncompleted-ui.js)
    if (typeof setupDetailsToggleLogic === 'function') {
        setupDetailsToggleLogic();
    }
}