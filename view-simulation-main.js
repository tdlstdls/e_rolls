/**
 * 担当: シミュレーションの全体統括
 * 修正: アイテム個別選択機能の削除に伴い、パラメータ取得と実行フローを簡略化
 */

/**
 * シミュレーション表示エリアの初期化
 */
function initializeSimulationView(gacha) {
    const simContainer = document.getElementById('sim-ui-container');
    if (!simContainer) return;

    // 既存の内容をクリアして再構築
    simContainer.innerHTML = '';
    simContainer.dataset.initialized = 'true';

    // UIパーツの生成（view-simulation-ui.jsに依存）
    const simGroup = createSimUIGroup(gacha);
    const resultDisplay = createResultDisplay();

    simContainer.append(simGroup, resultDisplay);

    // イベントの紐付け
    document.getElementById('runSimBtn').onclick = runSimulation;
    document.getElementById('copySimResultBtn').onclick = copySimResult;
}

/**
 * UIからシミュレーションに必要なパラメータを取得
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

    // 最適ルート探索の実行 (logic-completed-search.js)
    // 引数から targetLayers を削除
    const result = runGachaSearch(
        Nodes, 
        initialLastRollId, 
        params.tickets, 
        gacha, 
        thresholds, 
        initialNg
    );

    // ルート情報を保存し、メインテーブルの再描画をトリガー（ハイライト用）
    if (viewData) {
        if (result) {
            viewData.highlightedRoute = result.path.flatMap(p => p.consumed || []);
        } else {
            viewData.highlightedRoute = [];
        }
        // main.js の関数を呼び出してテーブル描画を更新
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
 * シミュレーション結果をクリップボードにコピー
 */
function copySimResult() {
    if (!window.lastSimText || !navigator.clipboard) {
        alert("コピーする結果がありません。先にシミュレーションを実行してください。");
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