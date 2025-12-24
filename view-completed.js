/**
 * 担当: 「コンプ済み」ビューのメインテーブルおよび計算詳細のHTML描画
 * 依存関係: logic-completed.js (計算データの取得), utils.js (リンク生成の利用)
 */

function createAndDisplayCompletedSeedView(initialSeed, gacha, tableRows, thresholds, initialLastRollId, displaySeed, params, initialNg) {
    const { Nodes, highlightInfo, maxNodeIndex } = calculateCompletedData(
        initialSeed, gacha, tableRows, thresholds, initialLastRollId, initialNg
    );
    let detailsHtml = generateMasterInfoHtml(gacha);
    detailsHtml += '<h2>＜ノード計算詳細 (No.1～)＞</h2>';
    
    let lastRollText = 'Null';
    if (initialLastRollId && itemMaster[initialLastRollId]) {
        const item = itemMaster[initialLastRollId];
        lastRollText = `${item.name}(rarity:${item.rarity}, itemID:${initialLastRollId})`;
    }
    detailsHtml += `LastRoll：${lastRollText}<br><br>`;

    detailsHtml += '<table style="table-layout: fixed; width: auto; font-size: 9px; border-collapse: collapse;"><thead>';
    detailsHtml += '<tr style="background-color: #f2f2f2;">';
    detailsHtml += '<th style="border: 1px solid #ccc; padding: 5px;">No.</th>';
    detailsHtml += '<th style="border: 1px solid #ccc; padding: 5px;">Address</th>'; 
    detailsHtml += '<th style="border: 1px solid #ccc; padding: 5px;">Seed</th>';
    detailsHtml += '<th style="border: 1px solid #ccc; padding: 5px;">rarity</th>';
    detailsHtml += '<th style="border: 1px solid #ccc; padding: 5px;">Item</th>';
    detailsHtml += '<th style="border: 1px solid #ccc; padding: 5px;">Reroll</th>';
    detailsHtml += '<th style="border: 1px solid #ccc; padding: 5px;">ReRollFlag</th>';
    detailsHtml += '<th style="border: 1px solid #ccc; padding: 5px;">re-ReRollFlag</th>';
    detailsHtml += '<th style="border: 1px solid #ccc; padding: 5px;">rarityG</th>';
    detailsHtml += '<th style="border: 1px solid #ccc; padding: 5px;">uberG</th>'; 
    detailsHtml += '<th style="border: 1px solid #ccc; padding: 5px;">legendG</th>';
    detailsHtml += '<th style="border: 1px solid #ccc; padding: 5px;">Single<br>(next)</th>';
    detailsHtml += '<th style="border: 1px solid #ccc; padding: 5px;">TenPull<br>(next)</th>';
    detailsHtml += '</tr></thead><tbody>'; 
    
    let tableRowsDataHtml = []; 
    for (let i = 1; i <= maxNodeIndex; i++) {
        const node = Nodes[i-1];
        if (!node) continue;
        
        let singleDisplay = '';
        if (node.singleRoll !== null) {
            const rollNum = node.singleRoll.toString();
            if (node.singleUseSeeds !== null && node.singleNextAddr) {
                const nextIndex = node.index + node.singleUseSeeds;
                singleDisplay = `Roll${rollNum}<br><span style="font-size: 80%;">${node.index}+${node.singleUseSeeds}=${nextIndex}(${node.singleNextAddr})</span>`;
            } else { singleDisplay = rollNum; }
        }

        let tenPullDisplay = '';
        if (node.tenPullMark !== null) {
            const rollMark = node.tenPullMark.toString();
            if (node.tenPullMark === 'r') {
                if (node.tenPullUseSeeds !== null && node.tenPullNextAddr) {
                    const nextIndex = node.index + node.tenPullUseSeeds;
                    tenPullDisplay = `${rollMark}<br><span style="font-size: 80%;">${node.index}+${node.tenPullUseSeeds}=${nextIndex}(${node.tenPullNextAddr})</span>`;
                } else { tenPullDisplay = rollMark; }
            } else if (node.tenPullUseSeeds !== null && node.tenPullNextAddr) {
                 const nextIndex = node.index + node.tenPullUseSeeds;
                 let displayRollNum = rollMark;
                 if (typeof node.tenPullMark === 'number' || (typeof node.tenPullMark === 'string' && !node.tenPullMark.startsWith('↖'))) {
                     displayRollNum = `Roll${rollMark}`;
                 } else if (typeof node.tenPullMark === 'string' && node.tenPullMark.startsWith('↖')) {
                     const gRollNum = rollMark.slice(1).replace('g', '');
                     const gNode = Nodes[node.index - 2]; 
                     if (gNode) { displayRollNum = `Roll${gRollNum}g(${gNode.address}G)`; } else { displayRollNum = `Roll${rollMark}`; }
                 }
                 tenPullDisplay = `${displayRollNum}<br><span style="font-size: 80%;">${node.index}+${node.tenPullUseSeeds}=${nextIndex}(${node.tenPullNextAddr})</span>`;
            } else { tenPullDisplay = rollMark; }
        }
        
        const itemInfo = highlightInfo.get(node.address);
        const baseCls = determineHighlightClass(itemInfo);
        let itemClsForNormal = '', itemClsForReroll = '';
        if (itemInfo) {
            const usedNormal = (itemInfo.single && !itemInfo.s_reRoll) || (itemInfo.ten && !itemInfo.t_reRoll);
            const usedReroll = (itemInfo.single && itemInfo.s_reRoll) || (itemInfo.ten && itemInfo.t_reRoll);
            if (usedNormal) itemClsForNormal = baseCls;
            if (usedReroll) itemClsForReroll = baseCls;
        }
        const itemClsAttr = itemClsForNormal ? ` class="${itemClsForNormal}"` : '';
        const rerollClsAttr = itemClsForReroll ? ` class="${itemClsForReroll}"` : '';

        let itemContent = (node.itemId !== -1) ? `${node.itemName}<br><span style="font-size: 80%;">${node.seed2}%${node.poolSize}=${node.slot}</span>` : '-';
        const reRollDivisor = node.poolSize > 1 ? node.poolSize - 1 : 0;
        let rerollContent = (node.reRollItemId !== -1) ? `${node.reRollItemName}<br><span style="font-size: 80%;">${node.seed3}%${reRollDivisor}=${node.reRollSlot}</span>` : '-';

        const guaranteedInfo = highlightInfo.get(node.address + 'G');
        const guaranteedCls = determineHighlightClass(guaranteedInfo);
        let uberGClsAttr = '', legendGClsAttr = '';
        if (guaranteedInfo && guaranteedCls) {
            if (node.rarityGId === '3' && node.itemGId !== -1) uberGClsAttr = ` class="${guaranteedCls}"`;
            else if (node.rarityGId === '4' && node.itemGId !== -1) legendGClsAttr = ` class="${guaranteedCls}"`;
        }
        let uberGContent = (node.rarityGId === '3' && node.itemGId !== -1) ? `${node.itemGName}<br><span style="font-size: 80%;">${node.seed2}%${node.poolGSize}=${node.slotG}</span>` : '-';
        let legendGContent = (node.rarityGId === '4' && node.itemGId !== -1) ? `${node.itemGName}<br><span style="font-size: 80%;">${node.seed2}%${node.poolGSize}=${node.slotG}</span>` : '-';
        
        let isConsecutiveDupe = false;
        if (i > 3) {
            const pNodeRe = Nodes[i-4];
            if (pNodeRe && node.rarityId === 1 && pNodeRe.reRollFlag && node.itemId === pNodeRe.reRollItemId) { isConsecutiveDupe = true; }
        }
        let prevItemName = (i <= 2) ? getItemNameSafe(initialLastRollId) : (Nodes[i - 3]?.reRollFlag ? (Nodes[i - 3].reRollItemName || '---') : (Nodes[i - 3]?.itemName || '---'));
        let reRollFlagContent = (node.reRollFlag ? 'true' : 'false') + `<br><span style="font-size: 80%;">${node.itemName}vs${prevItemName}</span>`;
        let prevReRollItemName = (i > 3) ? (Nodes[i-4]?.reRollFlag ? (Nodes[i-4].reRollItemName || '---') : (Nodes[i-4]?.itemName || '---')) : '---';
        let reReRollFlagContent = (isConsecutiveDupe ? 'true' : 'false') + `<br><span style="font-size: 80%;">${node.itemName}vs${prevReRollItemName}</span>`;
        let rarityGContent = (node.rarityGId || '-') + `<br><span style="font-size: 80%;">${node.roll1}</span>`; 

        let rowHtml = '<tr>';
        rowHtml += `<td style="border: 1px solid #ccc; padding: 5px; text-align: center;">${node.index}</td>`;
        rowHtml += `<td style="border: 1px solid #ccc; padding: 5px; text-align: center;">${node.address}</td>`;
        rowHtml += `<td style="border: 1px solid #ccc; padding: 5px; text-align: right; font-family: monospace;">${node.seed1}</td>`;
        rowHtml += `<td style="border: 1px solid #ccc; padding: 5px; text-align: center;">${node.rarityId}<br><span style="font-size: 80%;">${node.roll1}</span></td>`;
        rowHtml += `<td style="border: 1px solid #ccc; padding: 5px; text-align: center;"${itemClsAttr}>${itemContent}</td>`;
        rowHtml += `<td style="border: 1px solid #ccc; padding: 5px; text-align: center;"${rerollClsAttr}>${rerollContent}</td>`;
        rowHtml += `<td style="border: 1px solid #ccc; padding: 5px; text-align: center;">${reRollFlagContent}</td>`;
        rowHtml += `<td style="border: 1px solid #ccc; padding: 5px; text-align: center;">${reReRollFlagContent}</td>`;
        rowHtml += `<td style="border: 1px solid #ccc; padding: 5px; text-align: center;">${rarityGContent}</td>`;
        rowHtml += `<td style="border: 1px solid #ccc; padding: 5px; text-align: center;"${uberGClsAttr}>${uberGContent}</td>`;
        rowHtml += `<td style="border: 1px solid #ccc; padding: 5px; text-align: center;"${legendGClsAttr}>${legendGContent}</td>`;
        rowHtml += `<td style="border: 1px solid #ccc; padding: 5px; text-align: center;">${singleDisplay}</td>`;
        rowHtml += `<td style="border: 1px solid #ccc; padding: 5px; text-align: center;">${tenPullDisplay}</td>`;
        rowHtml += '</tr>';
        tableRowsDataHtml.push(rowHtml);
    }
    
    let table = `<table style="table-layout: fixed;" class="${currentHighlightMode === 'single' ? 'mode-single' : (currentHighlightMode === 'multi' ? 'mode-multi' : '')}"><thead>`;
    table += `<tr><th id="forceRerollToggle" class="col-no" style="cursor: pointer;">${window.forceRerollMode ? '☑' : '□'}</th><th>A</th><th>AG</th><th>B</th><th>BG</th></tr>`;
    table += '</thead><tbody>';
    for (let r = 1; r <= tableRows; r++) {
        const nodeIdxA = (r - 1) * 2 + 1, nodeIdxB = (r - 1) * 2 + 2;
        const nodeA = Nodes[nodeIdxA - 1], nodeB = Nodes[nodeIdxB - 1];
        if (!nodeA || !nodeB) break;
        table += `<tr><td class="col-no">${r}</td>`;
        const renderCell = (node, suffix) => {
            const address = node.address + suffix, info = highlightInfo.get(address), isGuaranteed = (suffix === 'G');
            const itemId = isGuaranteed ? node.itemGId : node.itemId, itemName = isGuaranteed ? node.itemGName : node.itemName, itemRarity = itemMaster[itemId]?.rarity;
            let cellContent = '---';
            if (itemId !== -1) {
                const isTenDark = info && info.ten && (info.tenRoll % 10 === 0);
                let showReRoll = (info && !isGuaranteed && ((info.single && info.s_reRoll) || (info.ten && info.t_reRoll))) || (!isGuaranteed && (node.reRollFlag || (window.forceRerollMode && node.rarityId === 1 && node.poolSize > 1)));
                const seedForSingle = showReRoll ? node.seed3 : node.seed2;
                if (isTenDark && !isGuaranteed) {
                    const hrefSingle = generateItemLink(seedForSingle, itemId, initialNg, r, true);
                    const seedForTen = (node.tenPullUseSeeds === 3) ? node.seed3 : node.seed2;
                    const hrefTen = generateItemLink(seedForTen, itemId, initialNg, r, true);
                    let cssClass = (itemRarity === 4) ? 'legendItem-text' : (itemRarity >= 3 ? 'featuredItem-text' : '');
                    cellContent = `<a href="${hrefSingle}"${cssClass ? ' class="'+cssClass+'"' : ''}>${itemName}</a><br>単発:<a href="${hrefSingle}">${node.singleNextAddr || '---'}</a><br>10連:<a href="${hrefTen}">${node.tenPullNextAddr || '---'}</a>`;
                } else {
                    const href = generateItemLink(seedForSingle, itemId, initialNg, r, true);
                    let nameHtml = `<a href="${href}">${itemName}</a>`;
                    if (!isGuaranteed) {
                        const css = (itemRarity === 4) ? 'legendItem-text' : (itemRarity >= 3 ? 'featuredItem-text' : '');
                        if (css) nameHtml = `<span class="${css}">${nameHtml}</span>`;
                    }
                    if (showReRoll) {
                        const rrId = node.reRollItemId, hrefRe = generateItemLink(node.seed3, rrId, initialNg, r, true);
                        let rrNameHtml = `<a href="${hrefRe}">${node.reRollItemName}</a>`;
                        const rrRarity = itemMaster[rrId]?.rarity;
                        if (rrRarity === 4) rrNameHtml = `<span class="legendItem-text">${rrNameHtml}</span>`;
                        else if (rrRarity >= 3) rrNameHtml = `<span class="featuredItem-text">${rrNameHtml}</span>`;
                        const hrefNorm = generateItemLink(node.seed2, node.itemId, initialNg, r, true);
                        cellContent = `<a href="${hrefNorm}">${node.itemName}</a><br>${node.reRollNextAddress})${rrNameHtml}`;
                    } else { cellContent = nameHtml; }
                }
            }
            let cls = determineHighlightClass(info);
            return { html: `<td${cls ? ' class=\"'+cls+'\"' : ''}>${cellContent}</td>` };
        };
        table += renderCell(nodeA, '').html; table += renderCell(nodeA, 'G').html;
        table += renderCell(nodeB, '').html; table += renderCell(nodeB, 'G').html;
        table += '</tr>';
    }
    table += '</tbody></table>';
    document.getElementById('result-table-container').innerHTML = table;

    const detailsControls = document.getElementById('details-controls');
    let simGroup = document.getElementById('sim-ui-group');
    if (!simGroup) {
        simGroup = document.createElement('div');
        simGroup.id = 'sim-ui-group';
        simGroup.style.display = 'block';
        simGroup.style.marginLeft = '12px';
        simGroup.style.padding = '10px';
        simGroup.style.background = '#eef6ff';
        simGroup.style.borderRadius = '6px';
        simGroup.style.border = '1px solid #bdd7ff';
        
        const controlRow = document.createElement('div');
        controlRow.style.display = 'flex';
        controlRow.style.alignItems = 'center';
        controlRow.style.gap = '10px';
        controlRow.style.marginBottom = '8px';
        controlRow.innerHTML = `
            <div>
                <label style="font-size: 0.7rem;">チケット:</label>
                <input type="number" id="simTicketInput" value="30" min="1" max="1000" style="width: 50px; padding: 4px; border: 1px solid #ccc; border-radius: 4px;">
            </div>
            <div id="selectedTargetStatus" style="font-size: 0.7rem; color: #0056b3; font-weight: bold; background: #fff; padding: 4px 8px; border-radius: 4px; border: 1px solid #bdd7ff;">
                階層: 1
            </div>
            <button id="runSimBtn" style="background-color: #28a745; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">シミュレーション開始</button>
            <button id="copySimResultBtn" style="background-color: #6c757d; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">コピー</button>
        `;
        simGroup.appendChild(controlRow);

        const layersContainer = document.createElement('div');
        layersContainer.id = 'targetLayersContainer';
        simGroup.appendChild(layersContainer);

        const addLayerBtn = document.createElement('button');
        addLayerBtn.id = 'addPriorityLayerBtn';
        addLayerBtn.textContent = '＋ 次順位を追加';
        addLayerBtn.style.marginTop = '8px';
        addLayerBtn.style.fontSize = '0.7rem';
        addLayerBtn.style.padding = '4px 8px';
        addLayerBtn.style.cursor = 'pointer';
        simGroup.appendChild(addLayerBtn);

        // 先に DOM に追加しておく（getElementById が動くようにするため）
        detailsControls.appendChild(simGroup);

        const createLayerUI = (priority) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'priority-layer-wrapper';
            wrapper.style.marginTop = '10px';
            wrapper.innerHTML = `<div style="font-size: 0.7rem; font-weight: bold; margin-bottom: 3px;">【第 ${priority} 優先ターゲット】</div>`;
            
            const area = document.createElement('div');
            area.className = 'layer-selection-area';
            area.dataset.priority = priority;
            area.style.display = 'flex'; area.style.flexWrap = 'wrap'; area.style.gap = '8px';
            area.style.background = '#fff'; area.style.padding = '6px'; area.style.borderRadius = '4px';
            area.style.border = '1px solid #ccc'; area.style.maxHeight = '100px'; area.style.overflowY = 'auto';

            const targetPool = [];
            Object.keys(gacha.rarityItems).sort((a,b) => parseInt(a)-parseInt(b)).forEach(rid => {
                if (gacha.rarityItems[rid]) targetPool.push(...gacha.rarityItems[rid]);
            });

            Array.from(new Set(targetPool)).forEach(id => {
                const item = itemMaster[id];
                if (!item) return;
                const label = document.createElement('label');
                label.style.fontSize = '0.7rem'; label.style.display = 'flex'; label.style.alignItems = 'center'; label.style.cursor = 'pointer';
                let color = '#333';
                if (item.rarity === 2) color = '#c0a000';
                else if (item.rarity === 3) color = '#d9534f';
                else if (item.rarity === 4) color = '#0000ff';
                label.innerHTML = `<input type="checkbox" class="layer-target-checkbox" value="${id}" style="margin-right: 3px;"><span style="color: ${color};">${item.name}</span>`;
                area.appendChild(label);
            });
            wrapper.appendChild(area);
            layersContainer.appendChild(wrapper);
            
            const status = document.getElementById('selectedTargetStatus');
            if (status) status.textContent = `階層: ${layersContainer.children.length}`;
        };

        createLayerUI(1);

        addLayerBtn.onclick = () => {
            createLayerUI(layersContainer.children.length + 1);
        };

        const resultDisplay = document.createElement('div');
        resultDisplay.id = 'sim-result-text';
        resultDisplay.style.marginTop = '20px'; resultDisplay.style.padding = '15px'; resultDisplay.style.border = '1px dashed #28a745';
        resultDisplay.style.backgroundColor = '#fafffa'; resultDisplay.style.whiteSpace = 'pre-wrap';
        resultDisplay.style.fontFamily = 'monospace'; resultDisplay.style.fontSize = '0.8rem'; resultDisplay.style.display = 'none';
        document.getElementById('result-container').appendChild(resultDisplay);
    }

    const getColoredItemHtml = (name) => {
        const itemEntry = Object.values(itemMaster).find(it => it.name === name);
        if (!itemEntry) return name;
        if (itemEntry.rarity === 3) return `<span style="color: #ff0000; font-weight: bold;">${name}</span>`;
        if (itemEntry.rarity === 4) return `<span style="color: #0000ff; font-weight: bold;">${name}</span>`;
        return name;
    };

    document.getElementById('runSimBtn').onclick = () => {
        const tickets = parseInt(document.getElementById('simTicketInput').value);
        if (isNaN(tickets) || tickets <= 0) return alert("有効な枚数を入力してください");
        
        const layers = document.querySelectorAll('.layer-selection-area');
        const targetLayers = Array.from(layers).map(area => {
            const checked = area.querySelectorAll('.layer-target-checkbox:checked');
            return Array.from(new Set(Array.from(checked).map(cb => parseInt(cb.value))));
        });

        const result = runGachaBeamSearch(Nodes, initialLastRollId, tickets, gacha, thresholds, initialNg, targetLayers);
        const display = document.getElementById('sim-result-text');
        
        if (!result) {
            display.textContent = "条件に合うルートが見つかりませんでした。";
            window.lastSimText = ""; 
        } else {
            display.innerHTML = ""; 
            const headerDiv = document.createElement('div');
            headerDiv.style.fontWeight = 'bold'; headerDiv.style.marginBottom = '10px';
            let targetStatusText = result.layerCounts.map((c, i) => `P${i+1}:${c}`).join(', ');
            headerDiv.textContent = `【最適ルート】(${targetStatusText}, 超激レア:${result.ubers}, 伝説レア:${result.legends})`;
            display.appendChild(headerDiv);

            let plainText = `【最適ルートシミュレーション結果】(${targetStatusText}, 超激レア:${result.ubers}, 伝説レア:${result.legends})\n\n`;
            let path = result.path;
            let i = 0;
            while (i < path.length) {
                const rowContainer = document.createElement('div');
                rowContainer.className = 'sim-row';
                rowContainer.style.display = 'flex'; rowContainer.style.alignItems = 'flex-start'; rowContainer.style.gap = '5px'; rowContainer.style.marginBottom = '4px';
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox'; checkbox.style.marginTop = '4px';
                const textSpan = document.createElement('span');
                textSpan.className = 'sim-text-content';
                let rowHeader = "", rowItemsHtml = "", rowPlain = "";
                if (path[i].type === 'single') {
                    let j = i, itemsHtml = [], itemsPlain = [];
                    while (j < path.length && path[j].type === 'single') {
                        itemsHtml.push(getColoredItemHtml(path[j].item));
                        itemsPlain.push(path[j].item);
                        j++;
                    }
                    rowHeader = `[単発]${j - i}ロール/${path[i].addr}～\n=> `;
                    rowItemsHtml = itemsHtml.join('、');
                    rowPlain = rowHeader + itemsPlain.join('、');
                    i = j;
                } else {
                    rowHeader = `[10連]/${path[i].addr}～\n=> `;
                    rowItemsHtml = path[i].items.map(name => getColoredItemHtml(name)).join('、');
                    rowPlain = rowHeader + path[i].items.join('、');
                    i++;
                }
                textSpan.innerHTML = rowHeader + rowItemsHtml;
                plainText += rowPlain + "\n";
                checkbox.onchange = () => {
                    if (checkbox.checked) {
                        textSpan.style.color = '#888'; textSpan.style.textDecoration = 'line-through';
                    } else {
                        textSpan.style.color = ''; textSpan.style.textDecoration = '';
                    }
                };
                rowContainer.appendChild(checkbox); rowContainer.appendChild(textSpan);
                display.appendChild(rowContainer);
            }
            window.lastSimText = plainText; 
        }
        display.style.display = 'block';
    };

    document.getElementById('copySimResultBtn').onclick = () => {
        if (!window.lastSimText) return alert("シミュレーションを先に実行してください");
        navigator.clipboard.writeText(window.lastSimText).then(() => {
            alert("結果をクリップボードにコピーしました！");
        });
    };

    const detailsDiv = document.getElementById('calculation-details');
    detailsDiv.innerHTML = detailsHtml + tableRowsDataHtml.join('') + '</tbody></table>';
    const toggleBtn = document.getElementById('toggleDetailsBtn');
    detailsControls.style.display = 'flex';
    toggleBtn.onclick = () => {
        if (detailsDiv.style.display === 'none') {
            detailsDiv.style.display = 'block';
            toggleBtn.textContent = '計算過程を非表示';
        } else {
            detailsDiv.style.display = 'none';
            toggleBtn.textContent = '計算過程を表示';
        }
    };
}