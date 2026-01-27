<<<<<<< HEAD
/**
 * 担当: シミュレーションの全体統括
 * 修正: ハイライト情報を Map 形式（アドレス -> 種別）で保存するように変更
 */

/**
 * シミュレーション表示エリアの初期化
 */
function initializeSimulationView(gacha) {
    const simContainer = document.getElementById('sim-ui-container');
    if (!simContainer) return;

    // ハイライト表示フラグの初期化
    if (viewData.showSimHighlight === undefined) {
        viewData.showSimHighlight = true; 
    }

    simContainer.innerHTML = '';
    simContainer.dataset.initialized = 'true';

    // UIパーツの生成（view-simulation-ui.jsに依存）
    const simGroup = createSimUIGroup(gacha);
    const resultDisplay = createResultDisplay();

    simContainer.append(simGroup, resultDisplay);

    // イベントの紐付け
    document.getElementById('runSimBtn').onclick = runSimulation;
    document.getElementById('copySimResultBtn').onclick = copySimResult;
    document.getElementById('toggleHighlightBtn').onclick = toggleHighlightMode;

    // ボタンの初期テキスト設定
    updateHighlightButtonText();
}

/**
 * UIからパラメータを取得
 */
function getSimulationParams() {
    const ticketsInput = document.getElementById('simTicketInput');
    const tickets = parseInt(ticketsInput.value);
    
    if (isNaN(tickets) || tickets <= 0) {
        alert("チケット枚数を正しく入力してください。");
        return null;
    }

    return { tickets };
}

/**
 * シミュレーションの実行
 */
function runSimulation() {
    if (!viewData.calculatedData) {
        alert("表示データがありません。まず「更新」ボタンを押してください。");
        return;
    }
    
    const params = getSimulationParams();
    if (!params) return;

    const { Nodes, thresholds } = viewData.calculatedData;
    const { gacha, initialLastRollId } = viewData;
    const currentParams = new URLSearchParams(window.location.search);
    const initialNg = currentParams.get('ng') || 'none';

    // 最適ルート探索の実行
    const result = runGachaSearch(
        Nodes, 
        initialLastRollId, 
        params.tickets, 
        gacha, 
        thresholds, 
        initialNg
    );

    // ルート情報を保存
    if (viewData) {
        // Mapを使用して、どのアドレスにどの種類のハイライトを適用するかを保持
        // キー: アドレス(例: "A1", "B22G"), 値: 種別(例: "single", "ten-normal", "ten-guar")
        viewData.highlightedRoute = new Map();
        
        if (result) {
            result.path.forEach(p => {
                if (p.type === 'single') {
                    // targetCell: { addr, type }
                    viewData.highlightedRoute.set(p.targetCell.addr, p.targetCell.type);
                } else if (p.type === 'ten') {
                    // targetCells: Array<{ addr, type }>
                    p.targetCells.forEach(cell => {
                        viewData.highlightedRoute.set(cell.addr, cell.type);
                    });
                }
            });
            // 結果が出たらハイライトを強制的にONにする
            viewData.showSimHighlight = true;
        }
        
        updateHighlightButtonText();
        
        // メインテーブルの再描画
        if (typeof runSimulationAndDisplay === 'function') {
            runSimulationAndDisplay();
        }
    }

    // 結果の表示 (view-simulation-result.js)
    if (typeof displaySimulationResult === 'function') {
        displaySimulationResult(result);
    }
}

/**
 * ハイライト表示のON/OFFを切り替える
 */
function toggleHighlightMode() {
    viewData.showSimHighlight = !viewData.showSimHighlight;
    
    updateHighlightButtonText();

    // メインテーブルの再描画
    if (typeof runSimulationAndDisplay === 'function') {
        runSimulationAndDisplay();
    }
}

/**
 * ハイライト切替ボタンのテキストを更新
 */
function updateHighlightButtonText() {
    const btn = document.getElementById('toggleHighlightBtn');
    if (!btn) return;
    
    if (viewData.showSimHighlight) {
        btn.textContent = 'ハイライト: ON';
        btn.style.backgroundColor = '#007bff';
    } else {
        btn.textContent = 'ハイライト: OFF';
        btn.style.backgroundColor = '#6c757d';
    }
}

/**
 * 結果コピー
 */
function copySimResult() {
    if (!window.lastSimText || !navigator.clipboard) {
        alert("コピーする結果がありません。");
        return;
    }
    
    navigator.clipboard.writeText(window.lastSimText).then(() => {
        const btn = document.getElementById('copySimResultBtn');
        const originalText = btn.textContent;
        btn.textContent = 'コピー完了！';
        btn.style.backgroundColor = '#28a745';
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.backgroundColor = '#6c757d';
        }, 1500);
    });
=======
/**
 * 担当: シミュレーションの全体統括
 * 修正: ハイライト情報を Map 形式（アドレス -> 種別）で保存するように変更
 */

/**
 * シミュレーション表示エリアの初期化
 */
function initializeSimulationView(gacha) {
    const simContainer = document.getElementById('sim-ui-container');
    if (!simContainer) return;

    // ハイライト表示フラグの初期化
    if (viewData.showSimHighlight === undefined) {
        viewData.showSimHighlight = true; 
    }

    simContainer.innerHTML = '';
    simContainer.dataset.initialized = 'true';

    // UIパーツの生成（view-simulation-ui.jsに依存）
    const simGroup = createSimUIGroup(gacha);
    const resultDisplay = createResultDisplay();

    simContainer.append(simGroup, resultDisplay);

    // イベントの紐付け
    document.getElementById('runSimBtn').onclick = runSimulation;
    document.getElementById('copySimResultBtn').onclick = copySimResult;
    document.getElementById('toggleHighlightBtn').onclick = toggleHighlightMode;

    // ボタンの初期テキスト設定
    updateHighlightButtonText();
}

/**
 * UIからパラメータを取得
 */
function getSimulationParams() {
    const ticketsInput = document.getElementById('simTicketInput');
    const tickets = parseInt(ticketsInput.value);
    
    if (isNaN(tickets) || tickets <= 0) {
        alert("チケット枚数を正しく入力してください。");
        return null;
    }

    return { tickets };
}

/**
 * シミュレーションの実行
 */
function runSimulation() {
    if (!viewData.calculatedData) {
        alert("表示データがありません。まず「更新」ボタンを押してください。");
        return;
    }
    
    const params = getSimulationParams();
    if (!params) return;

    const { Nodes, thresholds } = viewData.calculatedData;
    const { gacha, initialLastRollId } = viewData;
    const currentParams = new URLSearchParams(window.location.search);
    const initialNg = currentParams.get('ng') || 'none';

    // 最適ルート探索の実行
    const result = runGachaSearch(
        Nodes, 
        initialLastRollId, 
        params.tickets, 
        gacha, 
        thresholds, 
        initialNg
    );

    // ルート情報を保存
    if (viewData) {
        // Mapを使用して、どのアドレスにどの種類のハイライトを適用するかを保持
        // キー: アドレス(例: "A1", "B22G"), 値: 種別(例: "single", "ten-normal", "ten-guar")
        viewData.highlightedRoute = new Map();
        
        if (result) {
            result.path.forEach(p => {
                if (p.type === 'single') {
                    // targetCell: { addr, type }
                    viewData.highlightedRoute.set(p.targetCell.addr, p.targetCell.type);
                } else if (p.type === 'ten') {
                    // targetCells: Array<{ addr, type }>
                    p.targetCells.forEach(cell => {
                        viewData.highlightedRoute.set(cell.addr, cell.type);
                    });
                }
            });
            // 結果が出たらハイライトを強制的にONにする
            viewData.showSimHighlight = true;
        }
        
        updateHighlightButtonText();
        
        // メインテーブルの再描画
        if (typeof runSimulationAndDisplay === 'function') {
            runSimulationAndDisplay();
        }
    }

    // 結果の表示 (view-simulation-result.js)
    if (typeof displaySimulationResult === 'function') {
        displaySimulationResult(result);
    }
}

/**
 * ハイライト表示のON/OFFを切り替える
 */
function toggleHighlightMode() {
    viewData.showSimHighlight = !viewData.showSimHighlight;
    
    updateHighlightButtonText();

    // メインテーブルの再描画
    if (typeof runSimulationAndDisplay === 'function') {
        runSimulationAndDisplay();
    }
}

/**
 * ハイライト切替ボタンのテキストを更新
 */
function updateHighlightButtonText() {
    const btn = document.getElementById('toggleHighlightBtn');
    if (!btn) return;
    
    if (viewData.showSimHighlight) {
        btn.textContent = 'ハイライト: ON';
        btn.style.backgroundColor = '#007bff';
    } else {
        btn.textContent = 'ハイライト: OFF';
        btn.style.backgroundColor = '#6c757d';
    }
}

/**
 * 結果コピー
 */
function copySimResult() {
    if (!window.lastSimText || !navigator.clipboard) {
        alert("コピーする結果がありません。");
        return;
    }
    
    navigator.clipboard.writeText(window.lastSimText).then(() => {
        const btn = document.getElementById('copySimResultBtn');
        const originalText = btn.textContent;
        btn.textContent = 'コピー完了！';
        btn.style.backgroundColor = '#28a745';
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.backgroundColor = '#6c757d';
        }, 1500);
    });
>>>>>>> 5e0b83a616ebb5025e499b3f5d1bd2d23519dcb9
}