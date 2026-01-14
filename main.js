/**
 * 担当: アプリケーションの起動、URLパラメータ管理、DOMイベントリスナーの制御
 */

// --- グローバル変数 ---
const DEFAULT_PARAMS = {
    gacha: '45',
    seed: '12345',
    ng: 'none',
    fs: 'none',
    lr: null,
    comp: false,
    tx: false,
    roll: 100,
    displaySeed: '0',
    displaySim: '0' 
};

let currentHighlightMode = 'all'; 
let activeGachaId;
let forceRerollMode = false;

window.activeGachaId = activeGachaId;
window.forceRerollMode = forceRerollMode;

/**
 * シミュレーション実行および表示のメインディスパッチャー
 */
function runSimulationAndDisplay(options = {}) {
    const { hideSeedInput = false, uiOverrides = {} } = options;
    const params = new URLSearchParams(window.location.search);
    
    // 最新のガチャIDを取得
    const gachaIds = Object.keys(gachaMaster).map(Number);
    const latestGachaId = Math.max(...gachaIds).toString();

    // 現在のパラメータを取得、未設定ならデフォルトを適用
    const p = {};
    ['gacha', 'seed', 'ng', 'fs', 'lr', 'comp', 'tx', 'roll', 'displaySeed', 'displaySim'].forEach(k => {
        p[k] = params.get(k);
    });

    if (!p.gacha || !gachaMaster[p.gacha]) p.gacha = latestGachaId;
    if (!p.seed) p.seed = DEFAULT_PARAMS.seed;
    if (!p.roll) p.roll = DEFAULT_PARAMS.roll;
    if (!p.ng) p.ng = DEFAULT_PARAMS.ng;
    if (!p.displaySeed) p.displaySeed = DEFAULT_PARAMS.displaySeed;
    if (!p.displaySim) p.displaySim = DEFAULT_PARAMS.displaySim;

    // UI操作による上書き設定
    if (uiOverrides.seed !== undefined) p.seed = uiOverrides.seed;
    if (uiOverrides.guaranteedRolls !== undefined) p.ng = uiOverrides.guaranteedRolls;
    if (uiOverrides.featuredStock !== undefined) p.fs = uiOverrides.featuredStock;
    if (uiOverrides.isComplete !== undefined) p.comp = uiOverrides.isComplete ? 'true' : 'false';
    if (uiOverrides.displaySeed !== undefined) p.displaySeed = uiOverrides.displaySeed;
    if (uiOverrides.displaySim !== undefined) p.displaySim = uiOverrides.displaySim;
    
    activeGachaId = p.gacha;
    window.activeGachaId = activeGachaId;
    const gacha = gachaMaster[p.gacha];
    
    // シミュレーション表示設定の反映
    const simContainer = document.getElementById('sim-ui-container');
    const toggleSimBtn = document.getElementById('toggleSimBtn');
    
    if (p.displaySim === '1') {
        simContainer.style.display = 'block';
        toggleSimBtn.textContent = 'シミュレーションを非表示';
        // UIコンテナの初期化とターゲット情報の更新
        if (typeof initializeSimulationView === 'function') {
            initializeSimulationView(gacha);
        }
    } else {
        simContainer.style.display = 'none';
        toggleSimBtn.textContent = 'シミュレーションを表示';
    }

    // 入力フォームへの反映
    document.getElementById('seedInput').value = p.seed;
    const isComplete = (p.comp === 'true');
    document.getElementById('featuredCompleteCheckbox').checked = isComplete;
    
    // ガチャ設定に応じた目玉・確定枠の表示制御
    if (gacha.featuredItemStock === 0) {
        document.getElementById('featuredCompleteCheckbox').checked = true;
        document.getElementById('featuredCompleteCheckbox').parentElement.classList.add('hidden-control');
    } else {
        document.getElementById('featuredCompleteCheckbox').parentElement.classList.remove('hidden-control');
    }
    
    const isComp = document.getElementById('featuredCompleteCheckbox').checked;
    const stockControl = document.getElementById('stockControl');
    const guaranteedControl = document.getElementById('guaranteedControl');
    const legendDisplay = document.getElementById('legendDisplay');
    const legendCommon = document.getElementById('legendCommon');

    populateFeaturedStockInput(p.gacha, p.fs);

    if (isComp) {
        stockControl.classList.add('hidden-control');
        if (gacha.uberGuaranteedFlag || gacha.legendGuaranteedFlag) {
            guaranteedControl.classList.remove('hidden-control');
            legendDisplay.classList.remove('hidden-control');
            populateGuaranteedRolls(10, p.ng);
        } else {
            guaranteedControl.classList.add('hidden-control');
            legendDisplay.classList.add('hidden-control');
        }
        legendCommon.style.display = 'inline-block';
    } else {
        stockControl.classList.remove('hidden-control');
        guaranteedControl.classList.remove('hidden-control');
        legendDisplay.classList.remove('hidden-control');
        populateGuaranteedRolls(gacha.guaranteedCycle || 30, p.ng);
        legendCommon.style.display = 'none';
    }

    // 直前アイテム表示
    const lastRollDisplay = document.getElementById('lastRollDisplay');
    if (p.lr && itemMaster[p.lr]) {
        lastRollDisplay.textContent = `LastRoll: ${itemMaster[p.lr].name}`;
    } else {
        lastRollDisplay.textContent = '';
    }

    // SEED表示トグルボタンのテキスト更新
    const toggleSeedBtn = document.getElementById('toggleSeedBtn');
    if (p.displaySeed === '1') {
        toggleSeedBtn.textContent = 'SEEDを非表示';
    } else {
        toggleSeedBtn.textContent = 'SEEDを表示';
    }

    // ブラウザのURL履歴を更新
    const newParams = {
        gacha: p.gacha, seed: p.seed, ng: p.ng, fs: p.fs, lr: p.lr,
        comp: isComp ? 'true' : 'false',
        tx: (p.tx === '1' || (!hideSeedInput && !document.getElementById('seedRow').classList.contains('hidden-control'))) ? '1' : '0',
        roll: p.roll, displaySeed: p.displaySeed, displaySim: p.displaySim
    };
    const newQuery = generateUrlQuery(newParams);
    window.history.replaceState({ path: newQuery }, '', `${window.location.pathname}${newQuery}`);

    // 各種ビュー（テーブル描画）の実行
    const seedValue = parseInt(p.seed, 10);
    const lastRollId = p.lr ? parseInt(p.lr, 10) : null;
    const rows = parseInt(p.roll, 10);
    const thresholds = {
        '0': gacha.rarityRates['0'],
        '1': gacha.rarityRates['0'] + gacha.rarityRates['1'],
        '2': gacha.rarityRates['0'] + gacha.rarityRates['1'] + gacha.rarityRates['2'],
        '3': gacha.rarityRates['0'] + gacha.rarityRates['1'] + gacha.rarityRates['2'] + gacha.rarityRates['3'],
        '4': 10000
    };

    if (isComp) {
        createAndDisplayCompletedSeedView(seedValue, gacha, rows, thresholds, lastRollId, p.displaySeed, new URLSearchParams(newQuery), p.ng);
    } else {
        createAndDisplayUncompletedSeedView(seedValue, gacha, rows, thresholds, lastRollId, p.displaySeed, new URLSearchParams(newQuery));
    }
}

/**
 * 確定枠セレクトボックスの生成
 */
function populateGuaranteedRolls(max, currentVal) {
    const input = document.getElementById('guaranteedRollsInput');
    input.innerHTML = '';
    const unsetOption = document.createElement('option');
    unsetOption.value = 'none'; unsetOption.textContent = '未設定'; input.appendChild(unsetOption);
    for (let i = 1; i <= max; i++) {
        const option = document.createElement('option');
        option.value = i; option.textContent = i; input.appendChild(option);
    }
    if (currentVal && input.querySelector(`option[value="${currentVal}"]`)) {
        input.value = currentVal;
    } else {
        input.value = 'none';
    }
}

/**
 * 目玉在庫数セレクトボックスの生成
 */
function populateFeaturedStockInput(gachaId, preferredValue) {
    const gacha = gachaMaster[gachaId];
    const input = document.getElementById('featuredStockInput');
    if (!gacha) return;
    input.innerHTML = '';
    const unsetOption = document.createElement('option');
    unsetOption.value = 'none'; unsetOption.textContent = '-'; input.appendChild(unsetOption);
    for (let i = 1; i <= gacha.featuredItemStock; i++) {
        const option = document.createElement('option');
        option.value = i; option.textContent = i; input.appendChild(option);
    }
    if (preferredValue && preferredValue !== 'none' && input.querySelector(`option[value="${preferredValue}"]`)) {
        input.value = preferredValue;
    } else {
        input.value = 'none';
    }
}

/**
 * SEED入力欄の表示/非表示トグル
 */
function toggleSeedInput() {
    const seedRow = document.getElementById('seedRow');
    if (seedRow.classList.contains('hidden-control')) {
        seedRow.classList.remove('hidden-control');
    } else {
        seedRow.classList.add('hidden-control');
    }
}

// イベントリスナーの設定
document.addEventListener('DOMContentLoaded', () => {
    // ユーティリティによる初期化
    setupGachaRarityItems();

    // 各UI要素のイベント紐付け
    document.getElementById('executeButton').addEventListener('click', () => {
        runSimulationAndDisplay({ hideSeedInput: true, uiOverrides: { seed: document.getElementById('seedInput').value } });
    });
    
    document.getElementById('guaranteedRollsInput').addEventListener('change', (e) => {
        runSimulationAndDisplay({ uiOverrides: { guaranteedRolls: e.target.value } });
    });
    
    document.getElementById('featuredStockInput').addEventListener('change', (e) => {
        runSimulationAndDisplay({ uiOverrides: { featuredStock: e.target.value } });
    });
    
    document.getElementById('featuredCompleteCheckbox').addEventListener('change', () => {
        runSimulationAndDisplay({ uiOverrides: { isComplete: document.getElementById('featuredCompleteCheckbox').checked } });
    });
    
    document.getElementById('toggleSeedBtn').addEventListener('click', () => {
        const params = new URLSearchParams(window.location.search);
        const current = params.get('displaySeed') === '1' ? '0' : '1';
        runSimulationAndDisplay({ uiOverrides: { displaySeed: current } });
    });

    document.getElementById('toggleSimBtn').addEventListener('click', () => {
        const params = new URLSearchParams(window.location.search);
        const current = params.get('displaySim') === '1' ? '0' : '1';
        runSimulationAndDisplay({ uiOverrides: { displaySim: current } });
    });

    document.getElementById('copySeedLink').addEventListener('click', (event) => {
        event.preventDefault();
        const seedToCopy = new URLSearchParams(window.location.search).get('seed');
        if (seedToCopy && navigator.clipboard) {
            navigator.clipboard.writeText(seedToCopy).then(() => {
                const originalText = event.target.textContent;
                event.target.textContent = 'Copied!';
                setTimeout(() => { event.target.textContent = originalText; }, 1500);
            });
        }
    });

    document.getElementById('result-table-container').addEventListener('click', (event) => {
        if (event.target.id === 'forceRerollToggle') {
            window.forceRerollMode = !window.forceRerollMode;
            runSimulationAndDisplay();
        }
    });

    document.getElementById('showSeedInputLink').addEventListener('click', (e) => {
        e.preventDefault();
        toggleSeedInput();
    });

    // ハイライトモードの適用
    const applyHighlightMode = () => {
         const table = document.querySelector('#result-table-container table');
         if (!table) return;
         table.classList.remove('mode-single', 'mode-multi');
         if (currentHighlightMode === 'single') table.classList.add('mode-single');
         if (currentHighlightMode === 'multi') table.classList.add('mode-multi');
    };

    document.getElementById('legendSingle').addEventListener('click', () => {
        if (document.getElementById('featuredCompleteCheckbox').checked) {
            currentHighlightMode = (currentHighlightMode === 'single') ? 'all' : 'single';
            applyHighlightMode();
        }
    });

    document.getElementById('legendMulti').addEventListener('click', () => {
        if (document.getElementById('featuredCompleteCheckbox').checked) {
            currentHighlightMode = (currentHighlightMode === 'multi') ? 'all' : 'multi';
            applyHighlightMode();
        }
    });

    // 初回実行
    runSimulationAndDisplay();
});