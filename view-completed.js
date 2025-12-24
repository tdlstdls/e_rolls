/**
 * 担当: 「コンプ済み」ビューのメインテーブルおよび計算詳細のHTML描画
 * 依存関係: logic-completed.js (計算データの取得), utils.js (リンク生成の利用)
 */

function createAndDisplayCompletedSeedView(initialSeed, gacha, tableRows, thresholds, initialLastRollId, displaySeed, params, initialNg) {
    const { Nodes, highlightInfo, maxNodeIndex } = calculateCompletedData(
        initialSeed, gacha, tableRows, thresholds, initialLastRollId, initialNg
    );

    // 全体のシードリストを再取得（実行前SEED表示用）
    const totalSeedsNeeded = maxNodeIndex * 5 + 100;
    const SEED_LIST = generateSeedList(initialSeed, totalSeedsNeeded);

    // --- 詳細情報の構築 (calculation-details用) ---
    let detailsHtml = generateMasterInfoHtml(gacha);

    // 共通のトグル関数
    const toggleScript = `
        window.toggleTableSection = function(id, btnId) {
            const body = document.getElementById(id);
            const btn = document.getElementById(btnId);
            if (body) {
                if (body.tagName === 'TBODY') body.style.display = 'table-row-group';
                else body.style.display = 'block';
                if (btn) btn.style.display = 'none';
            }
        };
    `;

    // ヘルパー: テーブル生成（30行制限付き / 中央揃え設定）
    const createTableWithLimit = (idPrefix, headers, rowDataArray, title) => {
        let html = `<h2>${title}</h2>`;
        html += '<table style="table-layout: auto; width: auto; min-width: 100%; font-size: 9px; border-collapse: collapse;"><thead>';
        html += '<tr style="background-color: #f2f2f2;">';
        headers.forEach(h => {
            html += `<th style="border: 1px solid #ccc; padding: 5px; white-space: nowrap; text-align: center;">${h}</th>`;
        });
        html += '</tr></thead>';

        let visibleRows = '<tbody>';
        let hiddenRows = `<tbody id="${idPrefix}-more" style="display: none;">`;
        rowDataArray.forEach((row, idx) => {
            if (idx < 30) visibleRows += row;
            else hiddenRows += row;
        });
        html += visibleRows + '</tbody>' + hiddenRows + '</tbody></table>';
        if (rowDataArray.length > 30) {
            html += `<div id="${idPrefix}-btn" style="color: #007bff; cursor: pointer; text-decoration: underline; font-size: 10px; margin: 5px 0;"
                onclick="toggleTableSection('${idPrefix}-more', '${idPrefix}-btn')">続きを表示 (${rowDataArray.length - 30}行)</div>`;
        }
        return html + '<br>';
    };

    const rarityNames = ["ノーマル", "レア", "激レア", "超激レア", "伝説レア"];
    const gCycle = gacha.guaranteedCycle || 30;

    // ヘルパー: インデックスから番地文字列を取得
    const getAddress = (n) => getAddressStringGeneric(n, 2);

    // 1. step1(1) 通常抽選アイテム算出
    const headers1 = ["No.", "Address", "Seed[n]", "Seed[n+1]", "rarity計算", "rarity", "Slot計算", "Item", "next guar", "最終Seed"];
    const rows1 = Nodes.map(node => {
        const threshold = thresholds[node.rarityId];
        const rarityCalc = `${node.seed1} % 10000 = ${node.roll1} ＜ ${threshold}`;
        const rarityNameNum = `${rarityNames[node.rarityId]}(${node.rarityId})`;
        const slotCalc = node.itemId !== -1 ? `${node.seed2} % ${node.poolSize} = ${node.slot}` : '-';
        const seed1Col = `Seed[${node.index}]<br>${node.seed1}`;
        const seed2Col = `Seed[${node.index + 1}]<br>${node.seed2}`;

        let ngText = "---";
        if (!isNaN(initialNg) && initialNg > 0) {
            const offset = Math.floor((node.index - 1) / 2);
            let bNG = ((initialNg - 1 - offset) % gCycle + gCycle) % gCycle + 1;
            let aNG = ((initialNg - 2 - offset) % gCycle + gCycle) % gCycle + 1;
            ngText = `${bNG} → ${aNG}`;
        }

        return `<tr>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center;">${node.index}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center;">${node.address}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; font-family: monospace; white-space: nowrap;">${seed1Col}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; font-family: monospace; white-space: nowrap;">${seed2Col}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; white-space: nowrap;">${rarityCalc}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; white-space: nowrap;">${rarityNameNum}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; white-space: nowrap;">${slotCalc}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center;">${node.itemId !== -1 ? node.itemName : '-'}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; white-space: nowrap;">${ngText}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; font-family: monospace;">${node.seed2}</td>
        </tr>`;
    });
    detailsHtml += createTableWithLimit("sec-step1-1", headers1, rows1, "ノード計算詳細 (No.1～)<br>＜step1(1) 通常抽選アイテム算出（再抽選前）＞");

    // 2. step1(2) 確定アイテム算出
    const headers2 = ["No.", "Address", "Seed[n]", "Seed[n+1]", "rarityG計算", "rarityG", "SlotG計算", "Item", "next guar", "最終Seed"];
    const rows2 = Nodes.map(node => {
        let ngText = "---";
        if (!isNaN(initialNg) && initialNg > 0) {
            const offset = Math.floor((node.index - 1) / 2);
            let bNG = ((initialNg - 1 - offset) % gCycle + gCycle) % gCycle + 1;
            let aNG = ((initialNg - 2 - offset) % gCycle + gCycle) % gCycle + 1;
            ngText = `${bNG} → ${aNG}`;
        }
        const uFlag = gacha.uberGuaranteedFlag, lFlag = gacha.legendGuaranteedFlag;
        const uThres = gacha.uberGuaranteedThreshold || 500, lThres = gacha.legendGuaranteedThreshold || 200;
        let rGCalc = "---", rGName = "-";
        if (uFlag && lFlag) {
            const total = uThres + lThres, res = node.seed1 % total;
            const isUber = (node.rarityGId === 3);
            rGCalc = `${node.seed1} % ${total} = ${res} (${isUber ? '0～' + (uThres - 1) : uThres + '～' + (total - 1)})`;
            rGName = isUber ? `超激レア(3)` : `伝説レア(4)`;
        } else if (uFlag) {
            rGCalc = `${node.seed1} % ${uThres} = ${node.seed1 % uThres} ＜ ${uThres}`;
            rGName = `超激レア(3)`;
        } else if (lFlag) {
            rGCalc = `${node.seed1} % ${lThres} = ${node.seed1 % lThres} ＜ ${lThres}`;
            rGName = `伝説レア(4)`;
        }
        const slotGCalc = node.itemGId !== -1 ? `${node.seed2} % ${node.poolGSize} = ${node.slotG}` : '-';
        return `<tr>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center;">${node.index}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center;">${node.address}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; font-family: monospace; white-space: nowrap;">Seed[${node.index}]<br>${node.seed1}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; font-family: monospace; white-space: nowrap;">Seed[${node.index + 1}]<br>${node.seed2}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; white-space: nowrap;">${rGCalc}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; white-space: nowrap;">${rGName}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; white-space: nowrap;">${slotGCalc}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center;">${node.itemGId !== -1 ? node.itemGName : '-'}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; white-space: nowrap;">${ngText}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; font-family: monospace;">${node.seed2}</td>
        </tr>`;
    });
    detailsHtml += createTableWithLimit("sec-step1-2", headers2, rows2, "＜step1(2) 確定アイテム算出（再抽選前）＞");

    // 3. step2 再抽選判定
    const headers3 = ["No.", "Address", "Seed[n]", "Seed[n+3]", "rarity計算", "rarity判定", "現アイテム", "前アイテム", "一致判定", "再抽選判定", "Slot計算", "再抽選後アイテム", "next guar", "最終Seed"];
    const rows3 = Nodes.map((node, i) => {
        const threshold = thresholds[node.rarityId];
        const rCalc = `${node.seed1} % 10000 <br> = ${node.roll1} ＜ ${threshold}`;
        const isRare = (node.rarityId === 1), r判定 = `${rarityNames[node.rarityId]}(${node.rarityId})<br>${isRare ? '該当' : '不該当'}`;
        const prevNode = (i >= 2) ? Nodes[i - 3] : null;
        const prevItemName = prevNode ? (prevNode.reRollFlag ? prevNode.reRollItemName : prevNode.itemName) : getItemNameSafe(initialLastRollId);
        const isMatch = (node.itemName === prevItemName), isReroll = (isRare && node.poolSize > 1 && isMatch);
        const rerollSlotCalc = node.reRollFlag ? `${node.seed3} <br> % ${node.poolSize - 1} = ${node.reRollSlot}` : '-';
        let ngText = "---";
        if (!isNaN(initialNg) && initialNg > 0) {
            const offset = Math.floor((node.index - 1) / 2), bNG = ((initialNg - 1 - offset) % gCycle + gCycle) % gCycle + 1, aNG = ((initialNg - 2 - offset) % gCycle + gCycle) % gCycle + 1;
            ngText = `${bNG} → ${aNG}`;
        }
        const seedN3 = Nodes[node.index + 2]?.seed1 || '---';
        return `<tr>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center;">${node.index}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center;">${node.address}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; font-family: monospace; white-space: nowrap;">Seed[${node.index}]<br>${node.seed1}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; font-family: monospace; white-space: nowrap;">Seed[${node.index + 3}]<br>${seedN3}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; white-space: nowrap;">${rCalc}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; white-space: nowrap;">${r判定}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center;">${node.address}<br>${node.itemName}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center;">${prevNode ? prevNode.address + '<br>' : ''}${prevItemName}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center;">${isMatch ? '一致' : '不一致'}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center;"><b>${isReroll ? '実行' : 'なし'}</b></td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; white-space: nowrap;">${rerollSlotCalc}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center;">${node.reRollFlag ? node.reRollItemName : '-'}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; white-space: nowrap;">${ngText}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; font-family: monospace;">${node.reRollFlag ? node.seed3 : node.seed2}</td>
        </tr>`;
    });
    detailsHtml += createTableWithLimit("sec-step2", headers3, rows3, "＜step2 再抽選判定及び再抽選アイテム算出＞");

    // 4. step3 再々抽選判定
    const headers4 = ["No.", "Address", "Seed[n]", "Seed[n+2]", "rarity計算", "rarity判定", "現アイテム", "前アイテム(ReRollのみ)", "一致判定", "再々抽選判定", "Slot計算", "再々抽選後アイテム", "next guar", "最終Seed"];
    const rows4 = Nodes.map((node, i) => {
        const threshold = thresholds[node.rarityId], rCalc = `${node.seed1} % 10000 <br> = ${node.roll1} ＜ ${threshold}`;
        const isRare = (node.rarityId === 1), r判定 = `${rarityNames[node.rarityId]}(${node.rarityId})<br>${isRare ? '該当' : '不該当'}`;
        const pNode = (i >= 3) ? Nodes[i - 4] : null, prevRerollItem = (pNode && pNode.reRollFlag) ? pNode.reRollItemName : '---';
        const isMatch = (prevRerollItem !== '---' && node.itemName === prevRerollItem), isReReroll = (isRare && isMatch);
        
        const poolDivisor = Math.max(1, node.poolSize - 1);
        const calculatedSlot = node.seed3 % poolDivisor;
        const rerRerollSlotCalc = isReReroll ? `${node.seed3} <br> % ${poolDivisor} = ${calculatedSlot}` : "-";
        
        let reRerollName = "-";
        if (isReReroll) {
            const pool = gacha.rarityItems[node.rarityId] || [];
            const filteredPool = pool.filter(id => id !== node.itemId);
            if (filteredPool.length > 0) {
                reRerollName = getItemNameSafe(filteredPool[calculatedSlot % filteredPool.length]);
            }
        }

        let ngText = "---";
        if (!isNaN(initialNg) && initialNg > 0) {
            const offset = Math.floor((node.index - 1) / 2), bNG = ((initialNg - 1 - offset) % gCycle + gCycle) % gCycle + 1, aNG = ((initialNg - 2 - offset) % gCycle + gCycle) % gCycle + 1;
            ngText = `${bNG} → ${aNG}`;
        }
        const seedN2 = node.seed3;
        return `<tr>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center;">${node.index}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center;">${node.address}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; font-family: monospace; white-space: nowrap;">Seed[${node.index}]<br>${node.seed1}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; font-family: monospace; white-space: nowrap;">Seed[${node.index + 2}]<br>${seedN2}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; white-space: nowrap;">${rCalc}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; white-space: nowrap;">${r判定}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center;">${node.address}<br>${node.itemName}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center;">${(pNode && pNode.reRollFlag) ? pNode.address + '<br>' : ''}${prevRerollItem}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center;">${isMatch ? '一致' : '不一致'}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center;"><b>${isReReroll ? '実行' : 'なし'}</b></td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; white-space: nowrap;">${rerRerollSlotCalc}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center;">${reRerollName}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; white-space: nowrap;">${ngText}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; font-family: monospace;">${node.reRollFlag ? node.seed3 : node.seed2}</td>
        </tr>`;
    });
    detailsHtml += createTableWithLimit("sec-step3", headers4, rows4, "＜step3 再々抽選判定及び再々抽選アイテム算出＞");

    // 5. 単発ルート（ハイライト）計算 - テキスト形式
    detailsHtml += '<h2>＜単発ルート（ハイライト）計算＞</h2>';
    let sIdx = 1, sRoll = 1, sNgTracker = initialNg;
    let sLastItemInfo = { addr: 'LastRoll', name: getItemNameSafe(initialLastRollId) };
    let sDetailsText = '<div id="sec-route-s-text" style="font-size: 12px; line-height: 1.6; font-family: monospace; background: #fdfdfd; padding: 15px; border: 1px solid #ddd;">';
    let sVisibleText = '', sHiddenText = '<div id="sec-route-s-more" style="display: none;">';
    while (sIdx <= maxNodeIndex && sRoll <= tableRows) {
        const node = Nodes[sIdx - 1];
        if (!node) break;
        const isGuaranteedRoll = !isNaN(initialNg) && initialNg > 0 && (gacha.uberGuaranteedFlag || gacha.legendGuaranteedFlag) && (sRoll >= initialNg) && ((sRoll - initialNg) % 10 === 0);
        let block = `<strong>Roll ${sRoll}${isGuaranteedRoll ? '[Guar]' : ''}</strong><br>`;
        block += `実行前SEED：Seed[${sIdx - 1}] ${SEED_LIST[sIdx - 1]}<br>`;
        if (isGuaranteedRoll) {
            block += `レアリティ計算：Seed[${sIdx}] ${node.seed1} % ${node.gDivisor} = ${node.gRoll} → ${node.rarityGName}(${node.rarityGId})<br>`;
            const beforeNg = sNgTracker; sNgTracker = gCycle;
            block += `スロット計算：Seed[${sIdx + 1}] ${node.seed2} % ${node.poolGSize} = ${node.slotG} ${node.itemGName}(${node.itemGId}) nextGuar ${beforeNg}→${sNgTracker} 最終Seed ${node.seed2}<br>`;
            sLastItemInfo = { addr: node.address + 'G', name: node.itemGName };
            sIdx += 2;
        } else {
            const thres = thresholds[node.rarityId];
            block += `レアリティ計算：Seed[${sIdx}] ${node.seed1} % 10000 = ${node.roll1} ＜ ${thres} → ${rarityNames[node.rarityId]}(${node.rarityId})<br>`;
            const beforeNg = sNgTracker;
            sNgTracker = (sNgTracker <= 1) ? gCycle : sNgTracker - 1;
            block += `スロット計算：Seed[${sIdx + 1}] ${node.seed2} % ${node.poolSize} = ${node.slot} ${node.itemName}(${node.itemId}) nextGuar ${beforeNg}→${sNgTracker} 最終Seed ${node.seed2}<br>`;
            const isMatch = (node.itemName === sLastItemInfo.name), isReroll = (node.rarityId === 1 && node.poolSize > 1 && isMatch);
            block += `再抽選判定：レアリティ判定 ${rarityNames[node.rarityId]}(${node.rarityId})→${node.rarityId === 1 ? '該当' : '不該当'} 現アイテム ${node.address})${node.itemName} 前アイテム ${sLastItemInfo.addr})${sLastItemInfo.name}  →${isMatch ? '一致' : '不一致'} 再抽選判定 ${isReroll ? '実行' : 'なし'}<br>`;
            const pNode = (sIdx >= 3) ? Nodes[sIdx - 4] : null; 
            const prevRerollItem = (pNode && pNode.reRollFlag) ? pNode.reRollItemName : '---';
            const isMatchRe = (prevRerollItem !== '---' && node.itemName === prevRerollItem);
            const isReReroll = (node.rarityId === 1 && isMatchRe);
            block += `再々抽選判定：レアリティ判定 ${rarityNames[node.rarityId]}(${node.rarityId})→${node.rarityId === 1 ? '該当' : '不該当'} 現アイテム ${node.address})${node.itemName} 前アイテム ${pNode ? pNode.address : '---'})${prevRerollItem}  →${isMatchRe ? '一致' : '不一致'} 再抽選判定 ${isReReroll ? '実行' : 'なし'}<br>`;
            if (isReroll || isReReroll) {
                block += `再抽選スロット計算：Seed[${sIdx + 2}] ${node.seed3} % ${node.poolSize - 1} = ${node.reRollSlot} ${node.reRollItemName}(${node.reRollItemId}) nextGuar ${beforeNg}→${sNgTracker} 最終Seed ${node.seed3}<br>`;
                sLastItemInfo = { addr: node.address, name: node.reRollItemName };
                sIdx += 3;
            } else {
                sLastItemInfo = { addr: node.address, name: node.itemName };
                sIdx += 2;
            }
        }
        block += `----------------------------------------------------------------------------------------------------<br>`;
        if (sRoll <= 30) sVisibleText += block; else sHiddenText += block;
        sRoll++;
    }
    sDetailsText += sVisibleText + sHiddenText + '</div></div>';
    if (sRoll > 31) sDetailsText += `<div id="sec-route-s-btn" style="color: #007bff; cursor: pointer; text-decoration: underline; font-size: 11px; margin: 10px 0;"
        onclick="toggleTableSection('sec-route-s-more', 'sec-route-s-btn')">続きを表示 (${sRoll - 31}ロール)</div>`;
    detailsHtml += sDetailsText + '<br>';

    // 6. 10連ルート（ハイライト）計算 - テキスト形式
    detailsHtml += '<h2>＜10連ルート（ハイライト）計算＞</h2>';
    let tIdx = 1, tRoll = 1, cycleCount = 1, tNgTracker = initialNg;
    let tLastItemInfo = { addr: 'LastRoll', name: getItemNameSafe(initialLastRollId) };
    let tDetailsText = '<div id="sec-route-t-text" style="font-size: 12px; line-height: 1.6; font-family: monospace; background: #f5faff; padding: 15px; border: 1px solid #b8d4f5;">';
    let tVisibleText = '', tHiddenText = '<div id="sec-route-t-more" style="display: none;">';
    while (tIdx <= maxNodeIndex && tRoll <= tableRows) {
        let cycleBlock = `<strong>【サイクル ${cycleCount}】</strong><br>`;
        cycleBlock += `実行前Seed：Seed[${tIdx - 1}] ${SEED_LIST[tIdx - 1]}<br>`;

        const nodeInit = Nodes[tIdx - 1];
        if (!nodeInit) break;
        const uFlag = gacha.uberGuaranteedFlag, lFlag = gacha.legendGuaranteedFlag;
        const uRate = uFlag ? (gacha.rarityRates['3'] || 500) : 0, lRate = lFlag ? (gacha.rarityRates['4'] || 200) : 0;
        const totalG = uRate + lRate;
        if (totalG > 0) {
            const gRem = nodeInit.seed1 % totalG;
            const gRarityId = (gRem < uRate) ? '3' : '4';
            cycleBlock += `確定枠のレアリティ判定：Seed[${tIdx}] ${nodeInit.seed1} % ${totalG} = ${gRem} ＜ ${uRate} → ${rarityNames[gRarityId]}(${gRarityId}) 最終Seed ${nodeInit.seed1}<br>`;
        }
        cycleBlock += `====================================================================================================<br>`;
        
        tIdx++;
        for (let j = 0; j < 10; j++) {
            if (tRoll > tableRows || tIdx > maxNodeIndex) break;
            const node = Nodes[tIdx - 1];
            const isGuaranteedSlot = !isNaN(initialNg) && initialNg > 0 && (uFlag || lFlag) && (tRoll >= initialNg) && ((tRoll - initialNg) % 10 === 0);
            if (isGuaranteedSlot) {
                // 確定枠アイテム算出の修正: レアリティはサイクル開始時(nodeInit)、スロットはこのロール(node)のシード
                const poolG = gacha.rarityItems[nodeInit.rarityGId] || [];
                const slotG = node.seed1 % Math.max(1, poolG.length);
                const itemIdG = poolG[slotG];
                const itemNameG = getItemNameSafe(itemIdG);

                cycleBlock += `<strong>Roll ${tRoll}[Guar]</strong><br>`;
                cycleBlock += `実行前Seed：Seed[${tIdx - 1}] ${SEED_LIST[tIdx - 1]}<br>`;
                cycleBlock += `レアリティ計算：サイクルの初期シードで算出済み→${nodeInit.rarityGName}(${nodeInit.rarityGId})<br>`;
                const beforeNg = tNgTracker; tNgTracker = gCycle;
                cycleBlock += `スロット計算：Seed[${tIdx}] ${node.seed1} % ${poolG.length} = ${slotG} ${itemNameG}(${itemIdG}) nextGuar ${beforeNg}→${tNgTracker} 最終Seed ${node.seed1}<br>`;
                tLastItemInfo = { addr: node.address + 'G', name: itemNameG };
                tIdx += 1;
            } else {
                cycleBlock += `<strong>Roll ${tRoll}</strong><br>`;
                cycleBlock += `実行前Seed：Seed[${tIdx - 1}] ${SEED_LIST[tIdx - 1]}<br>`;
                const thres = thresholds[node.rarityId];
                cycleBlock += `レアリティ計算：Seed[${tIdx}] ${node.seed1} % 10000 = ${node.roll1} ＜ ${thres} → ${rarityNames[node.rarityId]}(${node.rarityId})<br>`;
                const beforeNg = tNgTracker;
                tNgTracker = (tNgTracker <= 1) ? gCycle : sNgTracker - 1;
                cycleBlock += `スロット計算：Seed[${tIdx + 1}] ${node.seed2} % ${node.poolSize} = ${node.slot} ${node.itemName}(${node.itemId}) nextGuar ${beforeNg}→${tNgTracker} 最終Seed ${node.seed2}<br>`;
                const isMatch = (node.itemName === tLastItemInfo.name), isReroll = (node.rarityId === 1 && node.poolSize > 1 && isMatch);
                cycleBlock += `再抽選判定：レアリティ判定 ${rarityNames[node.rarityId]}(${node.rarityId})→${node.rarityId === 1 ? '該当' : '不該当'} 現アイテム ${node.address})${node.itemName} 前アイテム ${tLastItemInfo.addr})${tLastItemInfo.name}  →${isMatch ? '一致' : '不一致'} 再抽選判定 ${isReroll ? '実行' : 'なし'}<br>`;
                const pNode = (tIdx >= 3) ? Nodes[tIdx - 4] : null; 
                const prevRerollItem = (pNode && pNode.reRollFlag) ? pNode.reRollItemName : '---';
                const isMatchRe = (prevRerollItem !== '---' && node.itemName === prevRerollItem);
                const isReReroll = (node.rarityId === 1 && isMatchRe);
                cycleBlock += `再々抽選判定：レアリティ判定 ${rarityNames[node.rarityId]}(${node.rarityId})→${node.rarityId === 1 ? '該当' : '不該当'} 現アイテム ${node.address})${node.itemName} 前アイテム ${pNode ? pNode.address : '---'})${prevRerollItem}  →${isMatchRe ? '一致' : '不一致'} 再抽選判定 ${isReReroll ? '実行' : 'なし'}<br>`;
                if (isReroll || isReReroll) {
                    cycleBlock += `再抽選スロット計算：Seed[${tIdx + 2}] ${node.seed3} % ${node.poolSize - 1} = ${node.reRollSlot} ${node.reRollItemName}(${node.reRollItemId}) nextGuar ${beforeNg}→${tNgTracker} 最終Seed ${node.seed3}<br>`;
                    tLastItemInfo = { addr: node.address, name: node.reRollItemName };
                    tIdx += 3;
                } else {
                    tLastItemInfo = { addr: node.address, name: node.itemName };
                    tIdx += 2;
                }
            }
            cycleBlock += `----------------------------------------------------------------------------------------------------<br>`;
            tRoll++;
        }
        if (cycleCount <= 3) tVisibleText += cycleBlock; else tHiddenText += cycleBlock;
        cycleCount++;
    }
    tDetailsText += tVisibleText + tHiddenText + '</div></div>';
    if (cycleCount > 4) tDetailsText += `<div id="sec-route-t-btn" style="color: #007bff; cursor: pointer; text-decoration: underline; font-size: 11px; margin: 10px 0;"
        onclick="toggleTableSection('sec-route-t-more', 'sec-route-t-btn')">続きを表示 (残り ${cycleCount - 4}サイクル)</div>`;
    detailsHtml += tDetailsText;

    detailsHtml += `<script>${toggleScript}</script>`;

    // --- メイン表示テーブルの構築 ---
    let table = `<table style="table-layout: fixed;"
        class="${currentHighlightMode === 'single' ? 'mode-single' : (currentHighlightMode === 'multi' ? 'mode-multi' : '')}"><thead>`;
    table += `<tr><th id="forceRerollToggle" class="col-no" style="cursor: pointer;">${window.forceRerollMode ? '☑' : '□'}</th><th>A</th><th>AG</th><th>B</th><th>BG</th></tr>`;
    table += '</thead><tbody>';
    for (let r = 1; r <= tableRows; r++) {
        const nodeIdxA = (r - 1) * 2 + 1, nodeIdxB = (r - 1) * 2 + 2;
        const nodeA = Nodes[nodeIdxA - 1], nodeB = Nodes[nodeIdxB - 1];
        if (!nodeA || !nodeB) break;
        table += `<tr><td class="col-no" style="text-align: center;">${r}</td>`;
        
        // セル描画用ヘルパー
        const renderCell = (node, suffix) => {
            const address = node.address + suffix, info = highlightInfo.get(address), isGuaranteed = (suffix === 'G');
            const itemId = isGuaranteed ? node.itemGId : node.itemId, itemName = isGuaranteed ? node.itemGName : node.itemName;
            let cellContent = '---';
            if (itemId !== -1) {
                // Step 2 または Step 3 が発生しているか判定
                let showReRoll = (info && !isGuaranteed && ((info.single && info.s_reRoll) || (info.ten && info.t_reRoll))) ||
                    (!isGuaranteed && (node.reRollFlag || node.reRerollFlag || (window.forceRerollMode && node.rarityId === 1 && node.poolSize > 1)));
                
                const seedToUse = showReRoll ? node.seed3 : node.seed2;
                const href = generateItemLink(seedToUse, itemId, initialNg, r, true);
                if (showReRoll) {
                    // 再抽選後アイテムおよび遷移先の取得
                    let rrId = node.reRollItemId;
                    let rrName = node.reRollItemName;
                    
                    if (rrId === -1 && (node.reRollFlag || node.reRerollFlag)) {
                        const poolDiv = Math.max(1, node.poolSize - 1);
                        const calcSlot = node.seed3 % poolDiv;
                        const pool = gacha.rarityItems[node.rarityId] || [];
                        const fPool = pool.filter(id => id !== node.itemId);
                        if (fPool.length > 0) {
                            rrId = fPool[calcSlot % fPool.length];
                            rrName = getItemNameSafe(rrId);
                        }
                    }

                    const rrNextAddr = getAddress(node.index + 3); // 3シード消費後の遷移先番地
                    const hrefRe = generateItemLink(node.seed3, rrId, initialNg, r, true);
                    const hrefNorm = generateItemLink(node.seed2, node.itemId, initialNg, r, true);
                    cellContent = `<a href="${hrefNorm}">${node.itemName}</a><br>(${rrNextAddr})<a href="${hrefRe}">${rrName}</a>`;
                } else {
                    cellContent = `<a href="${href}">${itemName}</a>`;
                }
            }
            
            let cls = determineHighlightClass(info);
            return { html: `<td${cls ? ' class="' + cls + '"' : ''} style="text-align: center;">${cellContent}</td>` };
        };
        table += renderCell(nodeA, '').html + renderCell(nodeA, 'G').html + renderCell(nodeB, '').html + renderCell(nodeB, 'G').html + '</tr>';
    }
    table += '</tbody></table>';
    document.getElementById('result-table-container').innerHTML = table;

    // --- ビームサーチロジック（Step 3 & 10連確定枠修正版） ---
    function runGachaBeamSearchCorrected(Nodes, initialLastRollId, totalTickets, gacha, thresholds, initialNg, targetLayers = []) {
        const gCycle = gacha.guaranteedCycle || 30;
        const uFlag = gacha.uberGuaranteedFlag;
        const lFlag = gacha.legendGuaranteedFlag;

        const simulateSingleRoll = (startIdx, lastId, rollNum, currentNg, nodeInit = null) => {
            const node = Nodes[startIdx - 1];
            if (!node) return null;
            const isGuar = !isNaN(initialNg) && currentNg > 0 && (uFlag || lFlag) && (rollNum >= initialNg) && ((rollNum - initialNg) % 10 === 0);
            
            if (isGuar && nodeInit) {
                // 確定枠の計算修正: レアリティはサイクル開始時、スロットは現在のロールノード
                const poolG = gacha.rarityItems[nodeInit.rarityGId] || [];
                const slotG = node.seed1 % Math.max(1, poolG.length);
                const itemIdG = poolG[slotG];
                return { itemId: itemIdG, itemName: getItemNameSafe(itemIdG), useSeeds: 1, rarity: itemMaster[itemIdG]?.rarity || 0, nextNg: gCycle };
            } else if (isGuar) {
                return { itemId: node.itemGId, itemName: node.itemGName, useSeeds: 2, rarity: itemMaster[node.itemGId]?.rarity || 0, nextNg: gCycle };
            } else {
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
                return { itemId: finalId, itemName: finalName, useSeeds: isRR ? 3 : 2, rarity: itemMaster[finalId]?.rarity || 0, nextNg };
            }
        };

        let dp = new Array(totalTickets + 1).fill(null).map(() => new Map());
        dp[0].set(`1_${initialLastRollId}_${initialNg}`, {
            nodeIdx: 1, lastId: initialLastRollId, currentNg: initialNg,
            layerCounts: new Array(targetLayers.length).fill(0),
            ubers: 0, legends: 0, path: [], rollCount: 1
        });

        const calculateScore = (state) => {
            let score = 0;
            for (let i = 0; i < state.layerCounts.length; i++) {
                score += state.layerCounts[i] * Math.pow(1000, targetLayers.length - i + 1);
            }
            return score + (state.ubers * 10) + state.legends;
        };

        for (let t = 0; t < totalTickets; t++) {
            const states = Array.from(dp[t].values()).sort((a, b) => calculateScore(b) - calculateScore(a)).slice(0, 200);
            for (let state of states) {
                const resS = simulateSingleRoll(state.nodeIdx, state.lastId, state.rollCount, state.currentNg);
                if (resS) {
                    const newLayerCounts = [...state.layerCounts];
                    targetLayers.forEach((ids, idx) => { if (ids.includes(resS.itemId)) newLayerCounts[idx]++; });
                    const nextState = {
                        nodeIdx: state.nodeIdx + resS.useSeeds, lastId: resS.itemId, currentNg: resS.nextNg,
                        layerCounts: newLayerCounts, ubers: state.ubers + (resS.rarity === 3 ? 1 : 0),
                        legends: state.legends + (resS.rarity === 4 ? 1 : 0),
                        path: state.path.concat({ type: 'single', item: resS.itemName, addr: Nodes[state.nodeIdx - 1].address }),
                        rollCount: state.rollCount + 1
                    };
                    const key = `${nextState.nodeIdx}_${nextState.lastId}_${nextState.currentNg}`;
                    if (!dp[t + 1].has(key) || calculateScore(dp[t + 1].get(key)) < calculateScore(nextState)) dp[t + 1].set(key, nextState);
                }

                if (t + 10 <= totalTickets) {
                    const nodeInit = Nodes[state.nodeIdx - 1];
                    if (nodeInit) {
                        let curIdx = state.nodeIdx + 1, curLastId = state.lastId, curNg = state.currentNg, curRoll = state.rollCount;
                        let items = [], ubers = 0, legends = 0, addLayer = new Array(targetLayers.length).fill(0), validCycle = true;
                        for (let j = 0; j < 10; j++) {
                            if (!Nodes[curIdx - 1]) { validCycle = false; break; }
                            const res = simulateSingleRoll(curIdx, curLastId, curRoll, curNg, nodeInit);
                            if (!res) { validCycle = false; break; }
                            items.push(res.itemName);
                            targetLayers.forEach((ids, idx) => { if (ids.includes(res.itemId)) addLayer[idx]++; });
                            if (res.rarity === 3) ubers++; if (res.rarity === 4) legends++;
                            curIdx += res.useSeeds; curLastId = res.itemId; curNg = res.nextNg; curRoll++;
                        }
                        if (validCycle) {
                            const nextStateTen = {
                                nodeIdx: curIdx, lastId: curLastId, currentNg: curNg,
                                layerCounts: state.layerCounts.map((c, idx) => c + addLayer[idx]),
                                ubers: state.ubers + ubers, legends: state.legends + legends,
                                path: state.path.concat({ type: 'ten', items: items, addr: nodeInit.address }),
                                rollCount: curRoll
                            };
                            const keyTen = `${nextStateTen.nodeIdx}_${nextStateTen.lastId}_${nextStateTen.currentNg}`;
                            if (!dp[t + 10].has(keyTen) || calculateScore(dp[t + 10].get(keyTen)) < calculateScore(nextStateTen)) dp[t + 10].set(keyTen, nextStateTen);
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

    // シミュレーションUI
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
        controlRow.style.display = 'flex'; controlRow.style.alignItems = 'center'; controlRow.style.gap = '10px'; controlRow.style.marginBottom = '8px';
        controlRow.innerHTML = `
            <div>
                <label style="font-size: 0.7rem;">チケット:</label>
                <input type="number" id="simTicketInput" value="30" min="1" max="1000" style="width: 50px; padding: 4px; border: 1px solid #ccc; border-radius: 4px;">
            </div>
            <div id="selectedTargetStatus" style="font-size: 0.7rem; color: #0056b3; font-weight: bold; background: #fff; padding: 4px 8px; 
            border-radius: 4px; border: 1px solid #bdd7ff;">階層: 1</div>
            <button id="runSimBtn" style="background-color: #28a745; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">シミュレーション開始</button>
            <button id="copySimResultBtn" style="background-color: #6c757d; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">コピー</button>
        `;
        simGroup.appendChild(controlRow);
        const layersContainer = document.createElement('div'); layersContainer.id = 'targetLayersContainer'; simGroup.appendChild(layersContainer);
        const addLayerBtn = document.createElement('button'); addLayerBtn.id = 'addPriorityLayerBtn'; addLayerBtn.textContent = '＋ 次順位を追加';
        addLayerBtn.style.marginTop = '8px'; addLayerBtn.style.fontSize = '0.7rem'; addLayerBtn.style.padding = '4px 8px'; addLayerBtn.style.cursor = 'pointer';
        simGroup.appendChild(addLayerBtn); detailsControls.appendChild(simGroup);
        const createLayerUI = (priority) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'priority-layer-wrapper'; wrapper.style.marginTop = '10px';
            wrapper.innerHTML = `<div style="font-size: 0.7rem; font-weight: bold; margin-bottom: 3px;">【第 ${priority} 優先ターゲット】</div>`;
            const area = document.createElement('div'); area.className = 'layer-selection-area'; area.dataset.priority = priority;
            area.style.display = 'flex'; area.style.flexWrap = 'wrap'; area.style.gap = '8px';
            area.style.background = '#fff'; area.style.padding = '6px';
            area.style.borderRadius = '4px'; area.style.border = '1px solid #ccc'; area.style.maxHeight = '100px'; area.style.overflowY = 'auto';
            const targetPool = [];
            Object.keys(gacha.rarityItems).sort((a, b) => parseInt(a) - parseInt(b)).forEach(rid => { if (gacha.rarityItems[rid]) targetPool.push(...gacha.rarityItems[rid]); });
            Array.from(new Set(targetPool)).forEach(id => {
                const item = itemMaster[id]; if (!item) return;
                const label = document.createElement('label'); label.style.fontSize = '0.7rem'; label.style.display = 'flex'; label.style.alignItems = 'center'; label.style.cursor = 'pointer';
                let col = '#333'; if (item.rarity === 2) col = '#c0a000'; else if (item.rarity === 3) col = '#d9534f'; else if (item.rarity === 4) col = '#0000ff';
                label.innerHTML = `<input type="checkbox" class="layer-target-checkbox" value="${id}" style="margin-right: 3px;"><span style="color: ${col};">${item.name}</span>`;
                area.appendChild(label);
            });
            wrapper.appendChild(area); layersContainer.appendChild(wrapper);
            const status = document.getElementById('selectedTargetStatus'); if (status) status.textContent = `階層: ${layersContainer.children.length}`;
        };
        createLayerUI(1);
        addLayerBtn.onclick = () => createLayerUI(layersContainer.children.length + 1);
        const resultDisplay = document.createElement('div'); resultDisplay.id = 'sim-result-text';
        resultDisplay.style.marginTop = '20px'; resultDisplay.style.padding = '15px';
        resultDisplay.style.border = '1px dashed #28a745';
        resultDisplay.style.backgroundColor = '#fafffa'; resultDisplay.style.whiteSpace = 'pre-wrap'; resultDisplay.style.fontFamily = 'monospace'; resultDisplay.style.fontSize = '0.8rem'; resultDisplay.style.display = 'none';
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
        if (isNaN(tickets) || tickets <= 0) return alert("枚数を入力してください");
        const layers = document.querySelectorAll('.layer-selection-area');
        const targetLayers = Array.from(layers).map(area => {
            const checked = area.querySelectorAll('.layer-target-checkbox:checked');
            return Array.from(new Set(Array.from(checked).map(cb => parseInt(cb.value))));
        });
        
        // 修正版ビームサーチを実行
        const result = runGachaBeamSearchCorrected(Nodes, initialLastRollId, tickets, gacha, thresholds, initialNg, targetLayers);
        const display = document.getElementById('sim-result-text');
        
        if (!result) { 
            display.textContent = "条件に合うルートが見つかりませんでした。";
            window.lastSimText = ""; 
        } else {
            display.innerHTML = "";
            const hdr = document.createElement('div'); hdr.style.fontWeight = 'bold'; hdr.style.marginBottom = '10px';
            let statusT = result.layerCounts.map((c, i) => `P${i + 1}:${c}`).join(', ');
            hdr.textContent = `【最適ルート】(${statusT}, 超激レア:${result.ubers}, 伝説レア:${result.legends})`;
            display.appendChild(hdr);
            
            let plainText = `【最適ルートシミュレーション結果】(${statusT}, 超激レア:${result.ubers}, 伝説レア:${result.legends})\n\n`;
            let path = result.path, i = 0;
            while (i < path.length) {
                const rowC = document.createElement('div');
                rowC.className = 'sim-row'; rowC.style.display = 'flex'; rowC.style.gap = '5px'; rowC.style.marginBottom = '4px';
                const cb = document.createElement('input'); cb.type = 'checkbox';
                cb.style.marginTop = '4px';
                const span = document.createElement('span'); span.className = 'sim-text-content';
                let rh = "", rHtml = "", rp = "";
                
                if (path[i].type === 'single') {
                    let j = i, iHtml = [], iP = [];
                    while (j < path.length && path[j].type === 'single') { 
                        iHtml.push(getColoredItemHtml(path[j].item)); 
                        iP.push(path[j].item); 
                        j++;
                    }
                    rh = `[単発]${j - i}ロール/${path[i].addr}～\n=> `;
                    rHtml = iHtml.join('、'); rp = rh + iP.join('、'); i = j;
                } else {
                    rh = `[10連]/${path[i].addr}～\n=> `;
                    rHtml = path[i].items.map(n => getColoredItemHtml(n)).join('、'); 
                    rp = rh + path[i].items.join('、'); i++;
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

    const detailsDiv = document.getElementById('calculation-details'); detailsDiv.innerHTML = detailsHtml;
    const toggleBtn = document.getElementById('toggleDetailsBtn'); detailsControls.style.display = 'flex';
    toggleBtn.onclick = () => {
        const isH = detailsDiv.style.display === 'none';
        detailsDiv.style.display = isH ? 'block' : 'none';
        toggleBtn.textContent = isH ? '計算過程を非表示' : '計算過程を表示';
    };
}