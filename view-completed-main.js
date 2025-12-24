/**
 * 担当: 「コンプ済み」ビューの全体制御とメイン結果テーブルの描画
 * 依存関係: logic-completed.js, view-completed-details-render.js, view-completed-path-sim.js
 */

function createAndDisplayCompletedSeedView(initialSeed, gacha, tableRows, thresholds, initialLastRollId, displaySeed, params, initialNg) {
    const { Nodes, highlightInfo, maxNodeIndex } = calculateCompletedData(
        initialSeed, gacha, tableRows, thresholds, initialLastRollId, initialNg
    );
    const totalSeedsNeeded = maxNodeIndex * 5 + 100;
    const SEED_LIST = generateSeedList(initialSeed, totalSeedsNeeded);
    const gCycle = gacha.guaranteedCycle || 30;

    if (typeof renderCompletedDetails === 'function') {
        renderCompletedDetails(Nodes, SEED_LIST, gacha, tableRows, thresholds, initialLastRollId, initialNg, maxNodeIndex);
    }

    let table = `<table style="table-layout: fixed;"
class="${currentHighlightMode === 'single' ? 'mode-single' : (currentHighlightMode === 'multi' ? 'mode-multi' : '')}"><thead>`;
    table += `<tr><th id="forceRerollToggle" class="col-no" style="cursor: pointer;">${window.forceRerollMode ? '☑' : '□'}</th><th>A</th><th>AG</th><th>B</th><th>BG</th></tr>`;
    table += '</thead><tbody>';

    for (let r = 1; r <= tableRows; r++) {
        const nodeIdxA = (r - 1) * 2 + 1, nodeIdxB = (r - 1) * 2 + 2;
        const nodeA = Nodes[nodeIdxA - 1], nodeB = Nodes[nodeIdxB - 1];
        if (!nodeA || !nodeB) break;
        table += `<tr><td class="col-no" style="text-align: center;">${r}</td>`;
        
        const renderCell = (node, suffix) => {
            const address = node.address + suffix;
            const info = highlightInfo.get(address);
            const isGuaranteed = (suffix === 'G');
            
            // AG/BG列なら必ずitemGId（超激レア以上）、通常列ならitemIdを使用
            const itemId = isGuaranteed ? node.itemGId : node.itemId;
            const itemName = isGuaranteed ? node.itemGName : node.itemName;
            let cellContent = '---';

            // NG（Next Guaranteed）更新ロジック
            const offset = Math.floor((node.index - 1) / 2);
            let nextNgVal;
            if (isNaN(initialNg) || initialNg === 'none') {
                nextNgVal = 'none';
            } else {
                if (isGuaranteed) {
                    nextNgVal = gCycle;
                } else {
                    const ngInt = parseInt(initialNg, 10);
                    nextNgVal = ((ngInt - 2 - offset) % gCycle + gCycle) % gCycle + 1;
                }
            }

            // フォントスタイル判定: 確定枠は黒、通常枠はレアリティ彩色
            let cssClass = '';
            if (!isGuaranteed && itemId !== -1) {
                const itemData = itemMaster[itemId];
                if (itemData) {
                    if (itemData.rarity === 3) cssClass = 'featuredItem-text';
                    else if (itemData.rarity === 4) cssClass = 'legendItem-text';
                }
            }

            const createClickable = (name, seed, lr, ng, cls) => {
                return `<span class="clickable-item ${cls}" data-seed="${seed}" data-lr="${lr}" data-ng="${ng}" data-comp="true">${name}</span>`;
            };

            if (itemId !== -1) {
                // 再抽選判定（10連ルートの判定結果を優先、確定枠は再抽選なし）
                let showReRoll = false;
                if (!isGuaranteed) {
                    if (info) {
                        if (info.single && info.s_reRoll) showReRoll = true;
                        if (info.ten && info.t_reRoll) showReRoll = true;
                    }
                    if (!showReRoll && (node.reRollFlag || (window.forceRerollMode && node.rarityId === 1 && node.poolSize > 1))) {
                        showReRoll = true;
                    }
                }

                if (showReRoll) {
                    let rrId = node.reRollItemId;
                    let rrName = node.reRollItemName;
                    
                    if (rrId === -1 || rrId === undefined) {
                        const pool = gacha.rarityItems[node.rarityId] || [];
                        const fPool = pool.filter(id => id !== node.itemId);
                        if (fPool.length > 0) {
                            const poolDiv = Math.max(1, node.poolSize - 1);
                            rrId = fPool[node.seed3 % poolDiv];
                            rrName = getItemNameSafe(rrId);
                        }
                    }

                    let rrCss = '';
                    const rrItemData = itemMaster[rrId];
                    if (rrItemData && rrItemData.rarity === 3) rrCss = 'featuredItem-text';
                    else if (rrItemData && rrItemData.rarity === 4) rrCss = 'legendItem-text';

                    const rrNextAddr = getAddressStringGeneric(node.index + 3, 2);
                    const itemPart = createClickable(node.itemName, node.seed2, node.itemId, nextNgVal, cssClass);
                    const rerollPart = createClickable(rrName, node.seed3, rrId, nextNgVal, rrCss);
                    
                    cellContent = `${itemPart}<br>(${rrNextAddr})${rerollPart}`;
                } else {
                    const seedToUse = isGuaranteed ? node.seed1 : node.seed2;
                    cellContent = createClickable(itemName, seedToUse, itemId, nextNgVal, cssClass);
                }
            }
            
            let cls = determineHighlightClass(info);
            return { html: `<td${cls ? ' class="' + cls + '"' : ''} style="text-align: center;">${cellContent}</td>` };
        };
        table += renderCell(nodeA, '').html + renderCell(nodeA, 'G').html + renderCell(nodeB, '').html + renderCell(nodeB, 'G').html + '</tr>';
    }
    table += '</tbody></table>';
    document.getElementById('result-table-container').innerHTML = table;

    if (typeof setupPathSimulationUI === 'function') {
        setupPathSimulationUI(Nodes, gacha, thresholds, initialLastRollId, initialNg);
    }
}