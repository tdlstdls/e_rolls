/**
 * 担当: シミュレーションの全体統括
 * 修正: ハイライトのトグル管理機能、およびセル単位の精密なルート保存ロジックを追加
 */

/**
 * シミュレーション表示エリアの初期化
 */
function initializeSimulationView(gacha) {
    const simContainer = document.getElementById('sim-ui-container');
    if (!simContainer) return;

    // 初期化フラグとハイライト表示フラグの設定
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
        if (result) {
            // セル単位の精密なハイライト用アドレスを抽出
            viewData.highlightedRoute = result.path.flatMap(p => {
                if (p.type === 'single') return [p.targetCell];
                if (p.type === 'ten') return p.targetCells;
                return [];
            });
            // 結果が出たらハイライトを強制的にONにする
            viewData.showSimHighlight = true;
        } else {
            viewData.highlightedRoute = [];
        }
        
        updateHighlightButtonText();
        
        // メインテーブルの再描画
        if (typeof runSimulationAndDisplay === 'function') {
            runSimulationAndDisplay();
        }
    }

    // 結果の表示
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
}