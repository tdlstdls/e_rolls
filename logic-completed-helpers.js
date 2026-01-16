/**
 * 担当: コンプ済みデータの基本計算ロジック、単発/10連ルートの詳細シミュレーション
 * 特殊仕様: 10連ルートの確定枠レアリティ判定(サイクル先頭)とスロット判定(到達時点)を分離
 */

// =================================================================================
// ヘルパー関数: ノード初期化
// =================================================================================

function initializeNodes(SEED_LIST, maxNodeIndex, gacha, thresholds) {
    const Nodes = [];
    const getAddress = (n) => getAddressStringGeneric(n, 2);
    const uFlag = gacha.uberGuaranteedFlag;
    const lFlag = gacha.legendGuaranteedFlag;
    const uRate = uFlag ? (gacha.rarityRates['3'] || 500) : 0;
    const lRate = lFlag ? (gacha.rarityRates['4'] || 200) : 0;
    const gDivisor = uRate + lRate;

    for (let i = 1; i <= maxNodeIndex; i++) {
        const node = {
            index: i,
            address: getAddress(i),
            seed1: SEED_LIST[i],
            seed2: SEED_LIST[i + 1],
            seed3: SEED_LIST[i + 2],
            seed4: SEED_LIST[i + 3],
            prevSeed1: SEED_LIST[i - 1]
        };
        // 通常枠計算
        node.roll1 = node.seed1 % 10000;
        node.rarityId = getRarityFromRoll(node.roll1, thresholds).id;
        const pool = gacha.rarityItems[node.rarityId] || [];
        node.poolSize = pool.length;
        if (pool.length > 0) {
            node.slot = node.seed2 % pool.length;
            node.itemId = pool[node.slot];
            node.itemName = getItemNameSafe(node.itemId);
        } else {
            node.itemId = -1;
            node.itemName = '---';
        }
        // 確定枠基本計算 (通常時/単発用)
        node.gDivisor = gDivisor;
        if (gDivisor > 0) {
            node.gRoll = node.seed1 % gDivisor;
            node.rarityGId = (node.gRoll < uRate) ? '3' : '4';
            node.rarityGName = (node.rarityGId === '3') ? '超激レア' : '伝説レア';
            const poolG = gacha.rarityItems[node.rarityGId] || [];
            node.poolGSize = poolG.length;
            node.slotG = node.seed2 % Math.max(1, poolG.length); 
            node.itemGId = poolG[node.slotG];
            node.itemGName = getItemNameSafe(node.itemGId);
        }
        Nodes.push(node);
    }
    return Nodes;
}

/**
 * 基本的なレア被り判定
 * 1行目(index 0, 1)は initialLastRollId と比較を行う
 * 強制再抽選モード (window.forceRerollMode) を考慮
 */
function calculateRerolls(Nodes, initialLastRollId, gacha) {
    Nodes.forEach((node, i) => {
        // prevNode2は2つ前のノード。存在しない(1行目のA, B列など)場合は initialLastRollId を参照
        const prevNode2 = (i >= 2) ? Nodes[i - 2] : null;
        const prevId2 = prevNode2 ? prevNode2.itemId : (initialLastRollId || -1);
        
        // 通常判定: レア(rarityId=1)かつアイテムIDが直前と一致
        const isDupe = (node.rarityId === 1 && node.poolSize > 1 && node.itemId === prevId2);
        // 強制判定: レアかつ強制モードON
        const isForced = (node.rarityId === 1 && node.poolSize > 1 && window.forceRerollMode);

        node.reRollFlag = isDupe || isForced;
        
        const prevNode3 = (i >= 3) ? Nodes[i - 3] : null;
        const prevRerollId3 = (prevNode3 && (prevNode3.reRollFlag || prevNode3.reRerollFlag)) ? prevNode3.reRollItemId : -1;
        node.reRerollFlag = (node.rarityId === 1 && node.itemId === prevRerollId3);

        if (node.reRollFlag || node.reRerollFlag) {
            const rrPool = (gacha.rarityItems[1] || []).filter(id => id !== node.itemId);
            if (rrPool.length > 0) {
                node.reRollSlot = node.seed3 % rrPool.length;
                node.reRollItemId = rrPool[node.reRollSlot];
                node.reRollItemName = getItemNameSafe(node.reRollItemId);
            }
        }
    });
}

// =================================================================================
// 内部パス計算: 単発ルート
// =================================================================================

function calculateSingleRollRoute(Nodes, tableRows, initialNg, initialLastRollId, gacha, thresholds, SEED_LIST) {
    const singleRouteText = [];
    const rarityNames = ["ノーマル", "レア", "激レア", "超激レア", "伝説レア"];
    const gCycle = gacha.guaranteedCycle || 10;
    let sIdx = 1, sRoll = 1, sLastId = initialLastRollId;
    let sNgTracker = (initialNg === 'none' || isNaN(initialNg)) ? 'none' : parseInt(initialNg, 10);

    while (sIdx <= Nodes.length && sRoll <= tableRows) {
        const node = Nodes[sIdx - 1];
        const isG = (sNgTracker === 1);
        
        let block = `<strong>Roll ${sRoll}${isG ? '[Guar]' : ''}</strong><br>`;
        if (isG) {
            block += `確定枠: Seed[${sIdx}] ${node.seed1} % ${node.gDivisor} → ${node.rarityGName}<br>`;
            block += `アイテム: ${node.itemGName}<br>`;
            sLastId = node.itemGId;
            sIdx += 2;
        } else {
            const isMatch = (node.itemId === sLastId);
            const isRR = (node.rarityId === 1 && node.poolSize > 1 && (isMatch || window.forceRerollMode)) || node.reRerollFlag;
            block += `通常: ${rarityNames[node.rarityId]} → ${isRR ? node.reRollItemName : node.itemName}<br>`;
            sLastId = isRR ? node.reRollItemId : node.itemId;
            sIdx += isRR ? 3 : 2;
        }

        // 1ロールごとにNGを1減らし、0になればサイクル値にリセット（線形連続管理）
        if (sNgTracker !== 'none') {
            sNgTracker--;
            if (sNgTracker <= 0) sNgTracker = gCycle;
        }

        singleRouteText.push(block);
        sRoll++;
    }
    return singleRouteText;
}

// =================================================================================
// 内部パス計算: 10連ルート (特殊ポインタ管理)
// =================================================================================

function calculateMultiRollRoute(Nodes, tableRows, initialNg, initialLastRollId, gacha, thresholds, SEED_LIST) {
    const multiRouteText = [];
    const gCycle = gacha.guaranteedCycle || 10;
    const uRate = gacha.uberGuaranteedFlag ? (gacha.rarityRates['3'] || 500) : 0;
    const lRate = gacha.legendGuaranteedFlag ? (gacha.rarityRates['4'] || 200) : 0;
    const gDiv = uRate + lRate;
    let tIdx = 1, tRoll = 1, tLastId = initialLastRollId;
    let tNgTracker = (initialNg === 'none' || isNaN(initialNg)) ? 'none' : parseInt(initialNg, 10);

    while (tIdx <= Nodes.length && tRoll <= tableRows) {
        const cycleHeadIdx = tIdx;
        const cycleHeadSeed = SEED_LIST[cycleHeadIdx];
        let cycleBlock = `<strong>【サイクル】</strong>先頭Seed: Seed[${cycleHeadIdx}]<br>`;
        
        // サイクル開始時のNG値に基づき、確定枠が何番目に現れるか算出
        let gIndexInCycle = -1;
        if (tNgTracker !== 'none' && tNgTracker >= 1 && tNgTracker <= 10) {
            gIndexInCycle = tNgTracker - 1;
        }

        let gRarityId = null;
        if (gIndexInCycle !== -1 && gDiv > 0) {
            const gRoll = cycleHeadSeed % gDiv;
            gRarityId = (gRoll < uRate) ? '3' : '4';
            tIdx++; // 確定枠レアリティ判定に1消費
        }

        for (let j = 0; j < 10; j++) {
            if (tRoll > tableRows || tIdx > Nodes.length) break;
            const node = Nodes[tIdx - 1];

            if (j === gIndexInCycle) {
                const poolG = gacha.rarityItems[gRarityId] || [];
                const itemIdG = poolG[node.seed1 % Math.max(1, poolG.length)];
                cycleBlock += `R${tRoll}[G]: ${getItemNameSafe(itemIdG)}<br>`;
                tLastId = itemIdG;
                tIdx += 1; // 確定枠スロットに1消費
            } else {
                const isMatch = (node.itemId === tLastId);
                const isRR = (node.rarityId === 1 && node.poolSize > 1 && (isMatch || window.forceRerollMode)) || node.reRerollFlag;
                cycleBlock += `R${tRoll}: ${isRR ? node.reRollItemName : node.itemName}<br>`;
                tLastId = isRR ? node.reRollItemId : node.itemId;
                tIdx += isRR ? 3 : 2;
            }

            // 10連中の各ロールごとにNGを1減らす（線形連続管理）
            if (tNgTracker !== 'none') {
                tNgTracker--;
                if (tNgTracker <= 0) tNgTracker = gCycle;
            }
            tRoll++;
        }
        multiRouteText.push(cycleBlock);
    }
    return multiRouteText;
}
