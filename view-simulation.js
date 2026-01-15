/**
 * 担当: シミュレーションUIの構築、ターゲット選択管理、および結果の描画
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

    const simGroup = document.createElement('div');
    simGroup.id = 'sim-ui-group';
    simGroup.style.padding = '15px';
    simGroup.style.background = '#eef6ff';
    simGroup.style.borderRadius = '8px';
    simGroup.style.border = '1px solid #bdd7ff';
    simGroup.style.marginTop = '10px';

    // 上部コントロール行（チケット、開始、コピー）
    const controlRow = document.createElement('div');
    controlRow.style.display = 'flex';
    controlRow.style.alignItems = 'center';
    controlRow.style.flexWrap = 'wrap';
    controlRow.style.gap = '15px';
    controlRow.style.marginBottom = '12px';
    
    controlRow.innerHTML = `
        <div style="display: flex; align-items: center; gap: 5px;">
            <label style="font-size: 0.8rem; font-weight: bold; color: #555;">チケット:</label>
            <input type="number" id="simTicketInput" value="30" min="1" max="1000" 
                   style="width: 60px; padding: 5px; border: 1px solid #ccc; border-radius: 4px;">
        </div>
        <div id="selectedTargetStatus" style="font-size: 0.75rem; color: #0056b3; font-weight: bold; 
             background: #fff; padding: 5px 10px; border-radius: 4px; border: 1px solid #bdd7ff;">
            階層: 1
        </div>
        <button id="runSimBtn" style="background-color: #28a745; color: white; border: none; 
                padding: 7px 15px; border-radius: 4px; cursor: pointer; font-weight: bold;">
            シミュレーション開始
        </button>
        <button id="copySimResultBtn" style="background-color: #6c757d; color: white; border: none; 
                padding: 7px 15px; border-radius: 4px; cursor: pointer; font-weight: bold;">
            結果をコピー
        </button>
    `;
    simGroup.appendChild(controlRow);

    // ターゲット階層コンテナ
    const layersContainer = document.createElement('div');
    layersContainer.id = 'targetLayersContainer';
    simGroup.appendChild(layersContainer);

    // 階層追加ボタン
    const addLayerBtn = document.createElement('button');
    addLayerBtn.id = 'addPriorityLayerBtn';
    addLayerBtn.textContent = '＋ 次順位の階層を追加';
    addLayerBtn.style.marginTop = '10px';
    addLayerBtn.style.fontSize = '0.75rem';
    addLayerBtn.style.padding = '5px 10px';
    addLayerBtn.style.cursor = 'pointer';
    addLayerBtn.style.backgroundColor = '#fff';
    addLayerBtn.style.border = '1px solid #007bff';
    addLayerBtn.style.color = '#007bff';
    addLayerBtn.style.borderRadius = '4px';
    simGroup.appendChild(addLayerBtn);
    
    simContainer.appendChild(simGroup);

    // 結果表示エリア
    const resultDisplay = document.createElement('div');
    resultDisplay.id = 'sim-result-text';
    resultDisplay.style.marginTop = '15px';
    resultDisplay.style.padding = '15px';
    resultDisplay.style.border = '2px dashed #28a745';
    resultDisplay.style.backgroundColor = '#fafffa';
    resultDisplay.style.whiteSpace = 'pre-wrap';
    resultDisplay.style.fontFamily = 'monospace';
    resultDisplay.style.fontSize = '0.85rem';
    resultDisplay.style.display = 'none';
    resultDisplay.style.borderRadius = '8px';
    simContainer.appendChild(resultDisplay);

    // イベント紐付け
    addLayerBtn.onclick = () => createLayerUI(gacha, layersContainer.children.length + 1);
    document.getElementById('runSimBtn').onclick = runSimulation;
    document.getElementById('copySimResultBtn').onclick = copySimResult;

    // 初期階層を作成
    createLayerUI(gacha, 1);
}

/**
 * 優先ターゲット選択用のUI階層を作成
 */
function createLayerUI(gacha, priority) {
    const layersContainer = document.getElementById('targetLayersContainer');
    if (!layersContainer) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'priority-layer-wrapper';
    wrapper.style.marginTop = '12px';
    wrapper.style.padding = '10px';
    wrapper.style.background = '#fff';
    wrapper.style.border = '1px solid #ccc';
    wrapper.style.borderRadius = '6px';

    wrapper.innerHTML = `<div style="font-size: 0.8rem; font-weight: bold; margin-bottom: 8px; color: #004085;">
        【第 ${priority} 優先ターゲット】
    </div>`;

    const area = document.createElement('div');
    area.className = 'layer-selection-area';
    area.dataset.priority = priority;
    area.style.display = 'flex';
    area.style.flexWrap = 'wrap';
    area.style.gap = '10px';
    area.style.maxHeight = '120px';
    area.style.overflowY = 'auto';
    area.style.padding = '5px';

    populateLayerWithOptions(area, gacha);

    wrapper.appendChild(area);
    layersContainer.appendChild(wrapper);

    const status = document.getElementById('selectedTargetStatus');
    if (status) status.textContent = `階層: ${layersContainer.children.length}`;
}

/**
 * 選択エリアにアイテムのチェックボックスを配置
 */
function populateLayerWithOptions(area, gacha) {
    area.innerHTML = '';
    const targetPool = [];
    
    // 全レアリティのアイテムを収集
    Object.keys(gacha.rarityItems).sort((a, b) => parseInt(b) - parseInt(a)).forEach(rid => {
        if (gacha.rarityItems[rid]) targetPool.push(...gacha.rarityItems[rid]);
    });

    // 重複を除去して描画
    Array.from(new Set(targetPool)).forEach(id => {
        const item = itemMaster[id];
        if (!item) return;

        const label = document.createElement('label');
        label.style.fontSize = '0.75rem';
        label.style.display = 'flex';
        label.style.alignItems = 'center';
        label.style.cursor = 'pointer';
        label.style.background = '#f8f9fa';
        label.style.padding = '2px 6px';
        label.style.borderRadius = '3px';
        label.style.border = '1px solid #eee';

        let color = '#333';
        if (item.rarity === 2) color = '#c0a000'; // 激レア
        else if (item.rarity === 3) color = '#d9534f'; // 超激レア
        else if (item.rarity === 4) color = '#0000ff'; // 伝説レア

        label.innerHTML = `
            <input type="checkbox" class="layer-target-checkbox" value="${id}" style="margin-right: 5px;">
            <span style="color: ${color}; font-weight: ${item.rarity >= 3 ? 'bold' : 'normal'};">${item.name}</span>
        `;
        area.appendChild(label);
    });
}

/**
 * ガチャ切り替え時にUI内のアイテムリストを更新
 */
function updateSimGachaItems(gacha) {
    const layers = document.querySelectorAll('.layer-selection-area');
    layers.forEach(area => populateLayerWithOptions(area, gacha));
}

/**
 * ビームサーチを実行し結果を表示
 */
function runSimulation() {
    if (!viewData.calculatedData) {
        alert("表示データがありません。まず「更新」ボタンを押してガチャ結果を表示してください。");
        return;
    }
    
    const { Nodes, thresholds } = viewData.calculatedData;
    const { gacha, initialLastRollId } = viewData;
    const params = new URLSearchParams(window.location.search);
    const initialNg = params.get('ng') || 'none';

    const tickets = parseInt(document.getElementById('simTicketInput').value);
    if (isNaN(tickets) || tickets <= 0) {
        alert("チケット枚数を正しく入力してください。");
        return;
    }

    // 各階層でチェックされたアイテムIDを取得
    const layers = document.querySelectorAll('.layer-selection-area');
    const targetLayers = Array.from(layers).map(area => {
        const checked = area.querySelectorAll('.layer-target-checkbox:checked');
        return Array.from(new Set(Array.from(checked).map(cb => parseInt(cb.value))));
    });

    // ビームサーチ実行 (logic-completed-search.js)
    const result = runGachaBeamSearchCorrected(Nodes, initialLastRollId, tickets, gacha, thresholds, initialNg, targetLayers);
    
    // ルート情報をviewDataに保存し、メインテーブルの再描画をトリガー
    if (viewData) {
        if (result) {
            viewData.highlightedRoute = result.path.flatMap(p => p.consumed || []);
        } else {
            viewData.highlightedRoute = []; // 見つからなかった場合はリセット
        }
        runSimulationAndDisplay(); // ハイライトを反映させるために再描画
    }

    const display = document.getElementById('sim-result-text');

    if (!result) { 
        display.textContent = "指定されたチケット枚数内でターゲットを獲得できるルートが見つかりませんでした。";
        display.style.display = 'block';
        window.lastSimText = "";
    } else {
        display.innerHTML = "";
        
        // ヘッダー（スコア情報）
        const hdr = document.createElement('div');
        hdr.style.fontWeight = 'bold';
        hdr.style.marginBottom = '12px';
        hdr.style.borderBottom = '1px solid #28a745';
        hdr.style.paddingBottom = '5px';
        
        let statusT = result.layerCounts.map((c, i) => `P${i + 1}:${c}`).join(', ');
        hdr.textContent = `【最適ルート】(獲得数 -> ${statusT} / 超激:${result.ubers} / 伝説:${result.legends})`;
        display.appendChild(hdr);

        let plainText = `【最適ルートシミュレーション結果】(${statusT}, 超激:${result.ubers}, 伝説:${result.legends})\n\n`;
        const path = result.path;
        let i = 0;

        while (i < path.length) {
            const rowC = document.createElement('div');
            rowC.className = 'sim-row';
            rowC.style.display = 'flex';
            rowC.style.gap = '8px';
            rowC.style.marginBottom = '6px';
            rowC.style.alignItems = 'flex-start';

            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.style.marginTop = '3px';
            cb.style.cursor = 'pointer';
            
            const span = document.createElement('span');
            span.style.lineHeight = '1.4';

            let rowHeader = "";
            let rowHtml = "";
            let rowPlain = "";

            const getColoredItemHtml = (name) => {
                const itemEntry = Object.values(itemMaster).find(it => it.name === name);
                if (!itemEntry) return name;
                if (itemEntry.rarity === 3) return `<span style="color: #d9534f; font-weight: bold;">${name}</span>`;
                if (itemEntry.rarity === 4) color = `<span style="color: #0000ff; font-weight: bold;">${name}</span>`;
                return name;
            };

            if (path[i].type === 'single') {
                // 連続する単発をまとめる
                let j = i;
                let itemsHtml = [];
                let itemsPlain = [];
                while (j < path.length && path[j].type === 'single') { 
                    itemsHtml.push(getColoredItemHtml(path[j].item));
                    itemsPlain.push(path[j].item); 
                    j++;
                }
                rowHeader = `<span style="color: #007bff; font-weight: bold;">[単発]</span> ${j - i}ロール (${path[i].addr}～):<br>`;
                rowHtml = "　=> " + itemsHtml.join('、');
                rowPlain = `[単発] ${j - i}ロール (${path[i].addr}～) => ` + itemsPlain.join('、');
                i = j;
            } else {
                // 10連
                rowHeader = `<span style="color: #c0a000; font-weight: bold;">[10連]</span> (${path[i].addr}～):<br>`;
                rowHtml = "　=> " + path[i].items.map(n => getColoredItemHtml(n)).join('、');
                rowPlain = `[10連] (${path[i].addr}～) => ` + path[i].items.join('、');
                i++;
            }

            span.innerHTML = rowHeader + rowHtml;
            plainText += rowPlain + "\n";

            // 消し込み（打ち消し線）機能
            cb.onchange = () => { 
                span.style.color = cb.checked ? '#aaa' : '#333';
                span.style.textDecoration = cb.checked ? 'line-through' : 'none'; 
            };

            rowC.appendChild(cb);
            rowC.appendChild(span);
            display.appendChild(rowC);
        }
        
        window.lastSimText = plainText;
        display.style.display = 'block';
    }
}

/**
 * シミュレーション結果をクリップボードにコピー
 */
function copySimResult() {
    if (window.lastSimText && navigator.clipboard) {
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
    } else {
        alert("コピーする結果がありません。先にシミュレーションを実行してください。");
    }
}