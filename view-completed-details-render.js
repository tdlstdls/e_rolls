/**
 * 担当: 「コンプ済み」ビューにおける計算過程詳細（Step1-3およびルートログ）の描画
 * 依存関係: logic-common.js, utils.js
 */

/**
 * 計算詳細画面を構築し、指定のDOM（calculation-details）に挿入する
 */
function renderCompletedDetails(Nodes, SEED_LIST, gacha, tableRows, thresholds, initialLastRollId, initialNg, maxNodeIndex) {
    const rarityNames = ["ノーマル", "レア", "激レア", "超激レア", "伝説レア"];
    const gCycle = gacha.guaranteedCycle || 30;

    // マスター情報の生成
    let detailsHtml = generateMasterInfoHtml(gacha);
    
    // インラインで実行されるトグル関数
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

    /**
     * ヘルパー: 行数制限付きのテーブルHTMLを生成する
     */
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

    // 1. ＜step1(1) 通常抽選アイテム算出（再抽選前）＞
    const headers1 = ["No.", "Address", "Seed[n]", "Seed[n+1]", "rarity計算", "rarity", "Slot計算", "Item", "next guar", "最終Seed"];
    const rows1 = Nodes.map(node => {
        const threshold = thresholds[node.rarityId];
        const rarityCalc = `${node.seed1} % 10000 = ${node.roll1} ＜ ${threshold}`;
        const rarityNameNum = `${rarityNames[node.rarityId]}(${node.rarityId})`;
        const slotCalc = node.itemId !== -1 ? `${node.seed2} % ${node.poolSize} = ${node.slot}` : '-';
        
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
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; font-family: monospace; white-space: nowrap;">Seed[${node.index}]<br>${node.seed1}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; font-family: monospace; white-space: nowrap;">Seed[${node.index + 1}]<br>${node.seed2}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; white-space: nowrap;">${rarityCalc}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; white-space: nowrap;">${rarityNameNum}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; white-space: nowrap;">${slotCalc}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center;">${node.itemId !== -1 ? node.itemName : '-'}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; white-space: nowrap;">${ngText}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; font-family: monospace;">${node.seed2}</td>
        </tr>`;
    });
    detailsHtml += createTableWithLimit("sec-step1-1", headers1, rows1, "ノード計算詳細 (No.1～)<br>＜step1(1) 通常抽選アイテム算出（再抽選前）＞");

    // 2. ＜step1(2) 確定アイテム算出（再抽選前）＞
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
        const uRate = uFlag ? (gacha.rarityRates['3'] || 500) : 0, lRate = lFlag ? (gacha.rarityRates['4'] || 200) : 0;
        const totalG = uRate + lRate;
        let rGCalc = "---", rGName = "-";
        if (totalG > 0) {
            const res = node.seed1 % totalG;
            const isUber = (node.rarityGId === '3');
            rGCalc = `${node.seed1} % ${totalG} = ${res} (${isUber ? '0～' + (uRate - 1) : uRate + '～' + (totalG - 1)})`;
            rGName = isUber ? `超激レア(3)` : `伝説レア(4)`;
        }
        // SlotG計算は node.seed1 (Seed[n]) を使用
        const slotGCalc = node.itemGId !== -1 ? `${node.seed1} % ${node.poolGSize} = ${node.slotG}` : '-';

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
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; font-family: monospace;">${node.seed1}</td>
        </tr>`;
    });
    detailsHtml += createTableWithLimit("sec-step1-2", headers2, rows2, "＜step1(2) 確定アイテム算出（再抽選前）＞");

    // 3. ＜step2 再抽選判定及び再抽選アイテム算出＞
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
        
        return `<tr>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center;">${node.index}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center;">${node.address}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; font-family: monospace; white-space: nowrap;">Seed[${node.index}]<br>${node.seed1}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; font-family: monospace; white-space: nowrap;">Seed[${node.index + 3}]<br>${Nodes[node.index + 2]?.seed1 || '---'}</td>
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

    // 4. ＜step3 再々抽選判定及び再々抽選アイテム算出＞
    const headers4 = ["No.", "Address", "Seed[n]", "Seed[n+2]", "rarity計算", "rarity判定", "現アイテム", "前アイテム(ReRollのみ)", "一致判定", "再々抽選判定", "Slot計算", "再々抽選後アイテム", "next guar", "最終Seed"];
    const rows4 = Nodes.map((node, i) => {
        const threshold = thresholds[node.rarityId], rCalc = `${node.seed1} % 10000 <br> = ${node.roll1} ＜ ${threshold}`;
        const isRare = (node.rarityId === 1), r判定 = `${rarityNames[node.rarityId]}(${node.rarityId})<br>${isRare ? '該当' : '不該当'}`;
        const pNode = (i >= 3) ? Nodes[i - 4] : null, prevRerollItem = (pNode && pNode.reRollFlag) ? pNode.reRollItemName : '---';
        const isMatch = (prevRerollItem !== '---' && node.itemName === prevRerollItem), isReReroll = (isRare && isMatch);
        const poolDiv = Math.max(1, node.poolSize - 1);
        const calcSlot = node.seed3 % poolDiv;
        let reRerollName = "-";
        if (isReReroll) {
            const pool = gacha.rarityItems[node.rarityId] || [];
            const filtered = pool.filter(id => id !== node.itemId);
            if (filtered.length > 0) reRerollName = getItemNameSafe(filtered[calcSlot % filtered.length]);
        }
        let ngText = "---";
        if (!isNaN(initialNg) && initialNg > 0) {
            const offset = Math.floor((node.index - 1) / 2), bNG = ((initialNg - 1 - offset) % gCycle + gCycle) % gCycle + 1, aNG = ((initialNg - 2 - offset) % gCycle + gCycle) % gCycle + 1;
            ngText = `${bNG} → ${aNG}`;
        }
        
        return `<tr>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center;">${node.index}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center;">${node.address}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; font-family: monospace; white-space: nowrap;">Seed[${node.index}]<br>${node.seed1}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; font-family: monospace; white-space: nowrap;">Seed[${node.index + 2}]<br>${node.seed3}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; white-space: nowrap;">${rCalc}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; white-space: nowrap;">${r判定}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center;">${node.address}<br>${node.itemName}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center;">${(pNode && pNode.reRollFlag) ? pNode.address + '<br>' : ''}${prevRerollItem}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center;">${isMatch ? '一致' : '不一致'}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center;"><b>${isReReroll ? '実行' : 'なし'}</b></td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; white-space: nowrap;">${isReReroll ? `${node.seed3} % ${poolDiv} = ${calcSlot}` : '-'}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center;">${reRerollName}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; white-space: nowrap;">${ngText}</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-align: center; font-family: monospace;">${node.reRollFlag ? node.seed3 : node.seed2}</td>
        </tr>`;
    });
    detailsHtml += createTableWithLimit("sec-step3", headers4, rows4, "＜step3 再々抽選判定及び再々抽選アイテム算出＞");

    // 5. ＜単発ルート（ハイライト）計算ログ＞
    detailsHtml += '<h2>＜単発ルート（ハイライト）計算＞</h2>';
    let sIdx = 1, sRoll = 1, sNgTracker = initialNg;
    let sLastInfo = { addr: 'LastRoll', name: getItemNameSafe(initialLastRollId) };
    let sDetailsText = '<div id="sec-route-s-text" style="font-size: 12px; line-height: 1.6; font-family: monospace; background: #fdfdfd; padding: 15px; border: 1px solid #ddd;">';
    let sVisibleText = '', sHiddenText = '<div id="sec-route-s-more" style="display: none;">';

    while (sIdx <= maxNodeIndex && sRoll <= tableRows) {
        const node = Nodes[sIdx - 1]; if (!node) break;
        const isGuar = !isNaN(initialNg) && initialNg > 0 && (gacha.uberGuaranteedFlag || gacha.legendGuaranteedFlag) && (sRoll >= initialNg) && ((sRoll - initialNg) % 10 === 0);
        let block = `<strong>Roll ${sRoll}${isGuar ? '[Guar]' : ''}</strong><br>実行前SEED：Seed[${sIdx - 1}] ${SEED_LIST[sIdx - 1]}<br>`;
        
        if (isGuar) {
            block += `レアリティ計算：Seed[${sIdx}] ${node.seed1} % ${node.gDivisor} = ${node.gRoll} → ${node.rarityGName}(${node.rarityGId})<br>`;
            const b = sNgTracker; sNgTracker = gCycle;
            block += `スロット計算：Seed[${sIdx + 1}] ${node.seed2} % ${node.poolGSize} = ${node.slotG} ${node.itemGName}(${node.itemGId}) nextGuar ${b}→${sNgTracker} 最終Seed ${node.seed2}<br>`;
            // 修正：Slot計算に使用した Seed[sIdx+1] から 2を引いた数値を番地計算に使用
            block += `ハイライト番地：${getAddressStringGeneric((sIdx + 1) - 2, 2)}G<br>`;
            sLastInfo = { addr: node.address + 'G', name: node.itemGName }; sIdx += 2;
        } else {
            const thres = thresholds[node.rarityId];
            block += `レアリティ計算：Seed[${sIdx}] ${node.seed1} % 10000 = ${node.roll1} ＜ ${thres} → ${rarityNames[node.rarityId]}(${node.rarityId})<br>`;
            // 修正：レアリティ計算に使用した Seed[sIdx] をそのまま番地計算に使用
            block += `ハイライト番地：${getAddressStringGeneric(sIdx, 2)}<br>`;
            const b = sNgTracker;
            sNgTracker = (sNgTracker <= 1) ? gCycle : sNgTracker - 1;
            block += `スロット計算：Seed[${sIdx + 1}] ${node.seed2} % ${node.poolSize} = ${node.slot} ${node.itemName}(${node.itemId}) nextGuar ${b}→${sNgTracker} 最終Seed ${node.seed2}<br>`;
            const isMatch = (node.itemName === sLastInfo.name), isRR = (node.rarityId === 1 && node.poolSize > 1 && isMatch);
            block += `再抽選判定：レアリティ判定 ${rarityNames[node.rarityId]}→${node.rarityId === 1 ? '該当' : '不該当'} 一致:${isMatch} → 再抽選:${isRR ? '実行' : 'なし'}<br>`;
            const pNode = (sIdx >= 3) ? Nodes[sIdx - 4] : null, pRRName = (pNode && pNode.reRollFlag) ? pNode.reRollItemName : '---';
            const isMatchRe = (pRRName !== '---' && node.itemName === pRRName), isReRR = (node.rarityId === 1 && isMatchRe);
            block += `再々抽選判定：前々再抽選:${pRRName} 一致:${isMatchRe} → 再抽選:${isReRR ? '実行' : 'なし'}<br>`;
            if (isRR || isReRR) {
                block += `再抽選スロット計算：Seed[${sIdx + 2}] % ${node.poolSize - 1} = ${node.reRollSlot} ${node.reRollItemName} 最終Seed ${node.seed3}<br>`;
                sLastInfo = { addr: node.address, name: node.reRollItemName }; sIdx += 3;
            } else {
                sLastInfo = { addr: node.address, name: node.itemName };
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

    // 6. ＜10連ルート（ハイライト）計算ログ＞
    detailsHtml += '<h2>＜10連ルート（ハイライト）計算＞</h2>';
    let tIdx = 1, tRoll = 1, cycleCount = 1, tNgTracker = initialNg;
    let tLastInfo = { addr: 'LastRoll', name: getItemNameSafe(initialLastRollId) };
    let tDetailsText = '<div id="sec-route-t-text" style="font-size: 12px; line-height: 1.6; font-family: monospace; background: #f5faff; padding: 15px; border: 1px solid #b8d4f5;">';
    let tVisibleText = '', tHiddenText = '<div id="sec-route-t-more" style="display: none;">';
    while (tIdx <= maxNodeIndex && tRoll <= tableRows) {
        let cycleBlock = `<strong>【サイクル ${cycleCount}】</strong><br>実行前Seed：Seed[${tIdx - 1}] ${SEED_LIST[tIdx - 1]}<br>`;
        const nodeInit = Nodes[tIdx - 1]; if (!nodeInit) break;
        const uFlag = gacha.uberGuaranteedFlag, lFlag = gacha.legendGuaranteedFlag;
        const uRate = uFlag ? (gacha.rarityRates['3'] || 500) : 0, lRate = lFlag ? (gacha.rarityRates['4'] || 200) : 0;
        const totalG = uRate + lRate;
        
        if (totalG > 0) {
            const res = nodeInit.seed1 % totalG;
            cycleBlock += `確定枠のレアリティ判定：Seed[${tIdx}] % ${totalG} = ${res} → ${rarityNames[(res < uRate) ? '3' : '4']} 最終Seed ${nodeInit.seed1}<br>`;
        }
        cycleBlock += `====================================================================================================<br>`;
        tIdx++;
        for (let j = 0; j < 10; j++) {
            if (tRoll > tableRows || tIdx > maxNodeIndex) break;
            const node = Nodes[tIdx - 1];
            const isGuar = !isNaN(initialNg) && initialNg > 0 && (uFlag || lFlag) && (tRoll >= initialNg) && ((tRoll - initialNg) % 10 === 0);
            if (isGuar) {
                const poolG = gacha.rarityItems[nodeInit.rarityGId] || [];
                const slotG = node.seed1 % Math.max(1, poolG.length);
                const itemNameG = getItemNameSafe(poolG[slotG]);
                cycleBlock += `<strong>Roll ${tRoll}[Guar]</strong><br>実行前Seed：Seed[${tIdx - 1}] ${SEED_LIST[tIdx - 1]}<br>レアリティ：算出済み→${nodeInit.rarityGName}<br>`;
                const b = tNgTracker; tNgTracker = gCycle;
                cycleBlock += `スロット：Seed[${tIdx}] % ${poolG.length} = ${slotG} ${itemNameG} nextGuar ${b}→${tNgTracker} 最終Seed ${node.seed1}<br>`;
                // 修正：スロット計算に使用した Seed[tIdx] から 2を引いた数値を番地計算に使用
                cycleBlock += `ハイライト番地：${getAddressStringGeneric(tIdx - 2, 2)}G<br>`;
                tLastInfo = { addr: node.address + 'G', name: itemNameG }; tIdx += 1;
            } else {
                cycleBlock += `<strong>Roll ${tRoll}</strong><br>実行前Seed：Seed[${tIdx - 1}] ${SEED_LIST[tIdx - 1]}<br>`;
                const thres = thresholds[node.rarityId];
                cycleBlock += `レアリティ：Seed[${tIdx}] % 10000 = ${node.roll1} ＜ ${thres} → ${rarityNames[node.rarityId]}<br>`;
                // 修正：レアリティ判定に使用した Seed[tIdx] をそのまま番地計算に使用
                cycleBlock += `ハイライト番地：${getAddressStringGeneric(tIdx, 2)}<br>`;
                const b = tNgTracker;
                tNgTracker = (tNgTracker <= 1) ? gCycle : tNgTracker - 1;
                cycleBlock += `スロット：Seed[${tIdx + 1}] % ${node.poolSize} = ${node.slot} ${node.itemName} nextGuar ${b}→${tNgTracker} 最終Seed ${node.seed2}<br>`;
                const isMatch = (node.itemName === tLastInfo.name), isRR = (node.rarityId === 1 && node.poolSize > 1 && isMatch);
                cycleBlock += `再抽選判定：一致:${isMatch} → 再抽選:${isRR ? '実行' : 'なし'}<br>`;
                
                const pNode = (tIdx >= 3) ? Nodes[tIdx - 4] : null, pRRName = (pNode && pNode.reRollFlag) ? pNode.reRollItemName : '---';
                const isMatchRe = (pRRName !== '---' && node.itemName === pRRName), isReRR = (node.rarityId === 1 && isMatchRe);
                cycleBlock += `再々抽選判定：一致:${isMatchRe} → 再抽選:${isReRR ? '実行' : 'なし'}<br>`;
                
                if (isRR || isReRR) {
                    cycleBlock += `再抽選スロット：Seed[${tIdx + 2}] % ${node.poolSize - 1} = ${node.reRollSlot} ${node.reRollItemName} 最終Seed ${node.seed3}<br>`;
                    tLastInfo = { addr: node.address, name: node.reRollItemName }; tIdx += 3;
                } else {
                    tLastInfo = { addr: node.address, name: node.itemName };
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
    detailsHtml += tDetailsText + `<script>${toggleScript}</script>`;

    const detailsDiv = document.getElementById('calculation-details');
    detailsDiv.innerHTML = detailsHtml;

    const toggleBtn = document.getElementById('toggleDetailsBtn');
    document.getElementById('details-controls').style.display = 'flex';
    toggleBtn.onclick = () => {
        const isH = detailsDiv.style.display === 'none';
        detailsDiv.style.display = isH ? 'block' : 'none';
        toggleBtn.textContent = isH ? '計算過程を非表示' : '計算過程を表示';
    };
}