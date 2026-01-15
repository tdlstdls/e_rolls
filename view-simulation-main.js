/**
 * 担当: シミュレーションの全体統括
 */

function initializeSimulationView(gacha) {
    const simContainer = document.getElementById('sim-ui-container');
    if (!simContainer) return;

    simContainer.innerHTML = '';
    simContainer.dataset.initialized = 'true';

    const simGroup = createSimUIGroup(gacha);
    const resultDisplay = createResultDisplay();

    simContainer.append(simGroup, resultDisplay);

    document.getElementById('runSimBtn').onclick = runSimulation;
    document.getElementById('copySimResultBtn').onclick = copySimResult;

    createLayerUI(gacha, 1);
}

function getSimulationParams() {
    const tickets = parseInt(document.getElementById('simTicketInput').value);
    if (isNaN(tickets) || tickets <= 0) {
        alert("チケット枚数を正しく入力してください。");
        return null;
    }

    const layers = document.querySelectorAll('.layer-selection-area');
    const targetLayers = Array.from(layers).map(area => {
        const checked = area.querySelectorAll('.layer-target-checkbox:checked');
        return Array.from(new Set(Array.from(checked).map(cb => parseInt(cb.value))));
    });

    return { tickets, targetLayers };
}

function runSimulation() {
    if (!viewData.calculatedData) {
        alert("表示データがありません。まず「更新」ボタンを押してください。");
        return;
    }
    
    const params = getSimulationParams();
    if (!params) return;

    const { Nodes, thresholds } = viewData.calculatedData;
    const { gacha, initialLastRollId } = viewData;
    const initialNg = new URLSearchParams(window.location.search).get('ng') || 'none';

    const result = runGachaSearch(
        Nodes, initialLastRollId, params.tickets, gacha, 
        thresholds, initialNg, params.targetLayers
    );
    
    displaySimulationResult(result);
}

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
