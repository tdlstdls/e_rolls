/**
 * 担当: 「コンプ済み」ビューにおける最適ルート探索（ビームサーチ）とシミュレーションUI
 * 依存関係: logic-common.js, utils.js
 */

/**
 * 修正版ビームサーチ（動的計画法）による最適ルート探索
 * 10連確定枠の「サイクル開始レアリティ＋当該ロールスロット」ロジックを完全に反映
 */
function runGachaBeamSearchCorrected(Nodes, initialLastRollId, totalTickets, gacha, thresholds, initialNg, targetLayers = []) {
    const gCycle = gacha.guaranteedCycle || 30;
    const uFlag = gacha.uberGuaranteedFlag;
    const lFlag = gacha.legendGuaranteedFlag;

    /**
     * 内部ヘルパー: 単一ロールのシミュレーション
     * nodeInitが渡された場合は、10連サイクル内の確定枠として計算する
     */
    const simulateSingleRoll = (startIdx, lastId, rollNum, currentNg, nodeInit = null) => {
        const node = Nodes[startIdx - 1];
        if (!node) return null;
        
        const isGuar = !isNaN(initialNg) && currentNg > 0 && (uFlag || lFlag) && (rollNum >= initialNg) && ((rollNum - initialNg) % 10 === 0);
        
        if (isGuar && nodeInit) {
            // 【10連確定枠ロジック】レアリティはサイクル開始時(nodeInit)、スロットは現在(node)
            const poolG = gacha.rarityItems[nodeInit.rarityGId] || [];
            if (poolG.length === 0) return null;

            const slotG = node.seed1 % poolG.length;
            const itemIdG = poolG[slotG];
            return { 
                itemId: itemIdG, 
                itemName: getItemNameSafe(itemIdG), 
                useSeeds: 1, 
                rarity: itemMaster[itemIdG]?.rarity || 0, 
                nextNg: gCycle,
                isGuaranteed: true 
            };
        } else if (isGuar) {
            // 単発ルート等での確定
            return { 
                itemId: node.itemGId, 
                itemName: node.itemGName, 
                useSeeds: 2, 
                rarity: itemMaster[node.itemGId]?.rarity || 0, 
                nextNg: gCycle,
                isGuaranteed: true
            };
        } else {
            // 通常枠
            const isMatch = (node.itemId !== -1 && node.itemId === lastId);
            const isRR = (node.rarityId === 1 && node.poolSize > 1 && isMatch) || node.reRerollFlag;
            
            let finalId = node.itemId;
            let finalName = node.itemName;

            if (isRR) {
                const pool = gacha.rarityItems[node.rarityId] || [];
                const filtered = pool.filter(id => id !== node.itemId);
                if (filtered.length > 0) {
                    const slot = node.seed3 % Math.max(1, filtered.length);
                    finalId = filtered[slot];
                    finalName = getItemNameSafe(finalId);
                }
            }
            const nextNg = (currentNg <= 1) ? gCycle : currentNg - 1;
            return { 
                itemId: finalId, 
                itemName: finalName, 
                useSeeds: isRR ? 3 : 2, 
                rarity: itemMaster[finalId]?.rarity || 0, 
                nextNg,
                isGuaranteed: false
            };
        }
    };

    let dp = new Array(totalTickets + 1).fill(null).map(() => new Map());
    dp[0].set(`1_${initialLastRollId}_${initialNg}`, {
        nodeIdx: 1, 
        lastId: initialLastRollId, 
        currentNg: initialNg,
        layerCounts: new Array(targetLayers.length).fill(0),
        ubers: 0, 
        legends: 0, 
        path: [], 
        rollCount: 1
    });

    const calculateScore = (state) => {
        let score = 0;
        for (let i = 0; i < state.layerCounts.length; i++) {
            score += state.layerCounts[i] * Math.pow(1000, targetLayers.length - i + 1);
        }
        return score + (state.ubers * 10) + state.legends;
    };

    for (let t = 0; t < totalTickets; t++) {
        const states = Array.from(dp[t].values())
            .sort((a, b) => calculateScore(b) - calculateScore(a))
            .slice(0, 200);

        for (let state of states) {
            // 1. 単発
            const resS = simulateSingleRoll(state.nodeIdx, state.lastId, state.rollCount, state.currentNg);
            if (resS) {
                const newLayerCounts = [...state.layerCounts];
                targetLayers.forEach((ids, idx) => { if (ids.includes(resS.itemId)) newLayerCounts[idx]++; });
                const nextState = {
                    nodeIdx: state.nodeIdx + resS.useSeeds, 
                    lastId: resS.itemId, 
                    currentNg: resS.nextNg,
                    layerCounts: newLayerCounts, 
                    ubers: state.ubers + (resS.rarity === 3 ? 1 : 0),
                    legends: state.legends + (resS.rarity === 4 ? 1 : 0),
                    path: state.path.concat({ 
                        type: 'single', 
                        item: resS.itemName, 
                        addr: Nodes[state.nodeIdx - 1]?.address || '---',
                        isGuar: resS.isGuaranteed 
                    }),
                    rollCount: state.rollCount + 1
                };
                const key = `${nextState.nodeIdx}_${nextState.lastId}_${nextState.currentNg}`;
                if (!dp[t + 1].has(key) || calculateScore(dp[t + 1].get(key)) < calculateScore(nextState)) {
                    dp[t + 1].set(key, nextState);
                }
            }

            // 2. 10連
            if (t + 10 <= totalTickets) {
                const nodeInit = Nodes[state.nodeIdx - 1];
                if (nodeInit) {
                    let curIdx = state.nodeIdx + 1, curLastId = state.lastId, curNg = state.currentNg, curRoll = state.rollCount;
                    let itemsInfo = [], ubers = 0, legends = 0, addLayer = new Array(targetLayers.length).fill(0), validCycle = true;
                    for (let j = 0; j < 10; j++) {
                        if (!Nodes[curIdx - 1]) { validCycle = false; break; }
                        const res = simulateSingleRoll(curIdx, curLastId, curRoll, curNg, nodeInit);
                        if (!res) { validCycle = false; break; }
                        itemsInfo.push({ name: res.itemName, isGuar: res.isGuaranteed });
                        targetLayers.forEach((ids, idx) => { if (ids.includes(res.itemId)) addLayer[idx]++; });
                        if (res.rarity === 3) ubers++;
                        if (res.rarity === 4) legends++;
                        curIdx += res.useSeeds; curLastId = res.itemId; curNg = res.nextNg; curRoll++;
                    }
                    if (validCycle) {
                        const nextStateTen = {
                            nodeIdx: curIdx, 
                            lastId: curLastId, 
                            currentNg: curNg,
                            layerCounts: state.layerCounts.map((c, idx) => c + addLayer[idx]),
                            ubers: state.ubers + ubers, 
                            legends: state.legends + legends,
                            path: state.path.concat({ 
                                type: 'ten', 
                                items: itemsInfo, 
                                addr: nodeInit.address 
                            }),
                            rollCount: curRoll
                        };
                        const keyTen = `${nextStateTen.nodeIdx}_${nextStateTen.lastId}_${nextStateTen.currentNg}`;
                        if (!dp[t + 10].has(keyTen) || calculateScore(dp[t + 10].get(keyTen)) < calculateScore(nextStateTen)) {
                            dp[t + 10].set(keyTen, nextStateTen);
                        }
                    }
                }
            }
        }
    }
    let best = null;
    for (let i = totalTickets; i >= 0; i--) {
        for (let state of dp[i].values()) {
            if (!best || calculateScore(state) > calculateScore(best)) best = state;
        }
        if (best) break;
    }
    return best;
}

/**
 * シミュレーション用UIの構築
 */
function setupPathSimulationUI(Nodes, gacha, thresholds, initialLastRollId, initialNg) {
    const detailsControls = document.getElementById('details-controls');
    let simGroup = document.getElementById('sim-ui-group');
    let resultDisplay = document.getElementById('sim-result-text');

    /**
     * アイテム彩色ヘルパー
     * シミュレーション結果エリアでは、レアリティに応じた彩色を常に行う
     */
    const getColoredItemHtml = (name) => {
        const itemEntry = Object.values(itemMaster).find(it => it.name === name);
        if (!itemEntry) return name;
        // 超激レア: 太字赤
        if (itemEntry.rarity === 3) return `<span style="color: #d9534f; font-weight: bold;">${name}</span>`;
        // 伝説レア: 太字青
        if (itemEntry.rarity === 4) return `<span style="color: #0000ff; font-weight: bold;">${name}</span>`;
        return name;
    };

    if (!simGroup) {
        simGroup = document.createElement('div');
        simGroup.id = 'sim-ui-group';
        simGroup.style = 'display:block; margin-left:12px; padding:10px; background:#eef6ff; border-radius:6px; border:1px solid #bdd7ff;';
        simGroup.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
                <div>
                    <label style="font-size: 0.7rem;">チケット:</label>
                    <input type="number" id="simTicketInput" value="30" min="1" max="1000" style="width:50px; padding:4px; border:1px solid #ccc; border-radius:4px;">
                </div>
                <div id="selectedTargetStatus" style="font-size:0.7rem; color:#0056b3; font-weight:bold; background:#fff; padding:4px 8px; border-radius:4px; border:1px solid #bdd7ff;">階層: 1</div>
                <button id="runSimBtn" style="background-color:#28a745; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer;">開始</button>
                <button id="copySimResultBtn" style="background-color:#6c757d; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer;">コピー</button>
            </div>
            <div id="targetLayersContainer"></div>
            <button id="addPriorityLayerBtn" style="margin-top:8px; font-size:0.7rem; padding:4px 8px; cursor:pointer;">＋ 次順位を追加</button>
        `;
        detailsControls.appendChild(simGroup);

        const layersContainer = document.getElementById('targetLayersContainer');
        const createLayerUI = (priority) => {
            const wrapper = document.createElement('div');
            wrapper.style.marginTop = '10px';
            wrapper.innerHTML = `<div style="font-size:0.7rem; font-weight:bold; margin-bottom:3px;">【第 ${priority} 優先ターゲット】</div>`;
            const area = document.createElement('div');
            area.className = 'layer-selection-area';
            area.style = 'display:flex; flex-wrap:wrap; gap:8px; background:#fff; padding:6px; border-radius:4px; border:1px solid #ccc; max-height:100px; overflow-y:auto;';
            const targetPool = [];
            Object.keys(gacha.rarityItems).forEach(rid => { if (gacha.rarityItems[rid]) targetPool.push(...gacha.rarityItems[rid]); });
            Array.from(new Set(targetPool)).forEach(id => {
                const item = itemMaster[id]; if (!item) return;
                const label = document.createElement('label'); label.style = 'font-size:0.7rem; display:flex; align-items:center; cursor:pointer;';
                let col = item.rarity === 2 ? '#c0a000' : (item.rarity === 3 ? '#d9534f' : (item.rarity === 4 ? '#0000ff' : '#333'));
                label.innerHTML = `<input type="checkbox" class="layer-target-checkbox" value="${id}" style="margin-right:3px;"><span style="color: ${col};">${item.name}</span>`;
                area.appendChild(label);
            });
            wrapper.appendChild(area); layersContainer.appendChild(wrapper);
            document.getElementById('selectedTargetStatus').textContent = `階層: ${layersContainer.children.length}`;
        };
        createLayerUI(1);
        document.getElementById('addPriorityLayerBtn').onclick = () => createLayerUI(layersContainer.children.length + 1);

        resultDisplay = document.createElement('div');
        resultDisplay.id = 'sim-result-text';
        resultDisplay.style = 'margin-top:20px; padding:15px; border:1px dashed #28a745; background-color:#fafffa; white-space:pre-wrap; font-family:monospace; font-size:0.8rem; display:none;';
        document.getElementById('result-container').appendChild(resultDisplay);
    }

    document.getElementById('runSimBtn').onclick = () => {
        const tickets = parseInt(document.getElementById('simTicketInput').value);
        if (isNaN(tickets) || tickets <= 0) return alert("枚数を入力してください");

        const layers = document.querySelectorAll('.layer-selection-area');
        const targetLayers = Array.from(layers).map(area => {
            const checked = area.querySelectorAll('.layer-target-checkbox:checked');
            return Array.from(new Set(Array.from(checked).map(cb => parseInt(cb.value))));
        });
        const result = runGachaBeamSearchCorrected(Nodes, initialLastRollId, tickets, gacha, thresholds, initialNg, targetLayers);
        const display = document.getElementById('sim-result-text');
        if (!result) {
            display.textContent = "条件に合うルートが見つかりませんでした。";
            window.lastSimText = "";
        } else {
            display.innerHTML = "";
            const hdr = document.createElement('div');
            hdr.style = 'font-weight: bold; margin-bottom: 10px;';
            let statusT = result.layerCounts.map((c, i) => `P${i + 1}:${c}`).join(', ');
            hdr.textContent = `【最適ルート】(${statusT}, 超激:${result.ubers}, 伝説:${result.legends})`;
            display.appendChild(hdr);

            let plainText = `【最適ルートシミュレーション結果】(${statusT}, 超激:${result.ubers}, 伝説:${result.legends})\n\n`;
            let path = result.path, i = 0;
            while (i < path.length) {
                const rowC = document.createElement('div');
                rowC.style = 'display:flex; gap:5px; margin-bottom:4px;';
                const cb = document.createElement('input'); cb.type = 'checkbox'; cb.style.marginTop = '4px';
                const span = document.createElement('span');
                let rh = "", rHtml = "", rp = "";
                if (path[i].type === 'single') {
                    let j = i, iHtml = [], iP = [];
                    while (j < path.length && path[j].type === 'single') {
                        // アイテム彩色を適用
                        iHtml.push(getColoredItemHtml(path[j].item));
                        iP.push(path[j].item);
                        j++;
                    }
                    rh = `[単発ロール] ${j - i} Roll / ${path[i].addr} => `;
                    rHtml = iHtml.join('、');
                    rp = rh + iP.join('、');
                    i = j;
                } else {
                    rh = `[10連ロール] / ${path[i].addr} => `;
                    // 各アイテムに彩色を適用
                    rHtml = path[i].items.map(info => getColoredItemHtml(info.name)).join('、');
                    rp = rh + path[i].items.map(info => info.name).join('、');
                    i++;
                }
                span.innerHTML = rh + rHtml;
                plainText += rp + "\n";
                cb.onchange = () => {
                    span.style.color = cb.checked ? '#888' : '';
                    span.style.textDecoration = cb.checked ? 'line-through' : '';
                };
                rowC.appendChild(cb); rowC.appendChild(span); display.appendChild(rowC);
            }
            window.lastSimText = plainText;
        }
        display.style.display = 'block';
    };
    document.getElementById('copySimResultBtn').onclick = () => {
        if (window.lastSimText && navigator.clipboard) {
            navigator.clipboard.writeText(window.lastSimText).then(() => {
                alert("結果をコピーしました");
            });
        }
    };
}