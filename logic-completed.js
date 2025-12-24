/**
 * 担当: 「コンプ済み」ビューにおける全アイテムの計算ロジック
 * 順序: Step 1 (通常・確定算出) -> Step 2 (再抽選) -> Step 3 (再々抽選) -> ルート計算・テキスト生成
 * 特徴: 消費シードインデックスの完全な線形連続性の確保
 */

function calculateCompletedData(initialSeed, gacha, tableRows, thresholds, initialLastRollId, initialNg) {
    const rarityNames = ["ノーマル", "レア", "激レア", "超激レア", "伝説レア"];
    const gCycle = gacha.guaranteedCycle || 30;
    
    // シードリストの生成 (探索用に余裕を持って確保)
    const maxSeedsNeeded = Math.max(tableRows * 15, 15000);
    const SEED_LIST = generateSeedList(initialSeed, maxSeedsNeeded);
    
    const getAddress = (n) => getAddressStringGeneric(n, 2);
    const Nodes = [];

    // 全ノードに対して各ステップの計算を事前に行う
    const maxNodeIndex = Math.max(tableRows * 5, 5000);

    // --- Step 1: 全ノードの基本算出 (通常抽選 & 確定枠) ---
    for (let i = 1; i <= maxNodeIndex; i++) {
        const node = {
            index: i,
            address: getAddress(i),
            seed1: SEED_LIST[i],     // rarity判定用 (または確定枠Slot用)
            seed2: SEED_LIST[i + 1], // slot判定用
            seed3: SEED_LIST[i + 2], // 再抽選用
            seed4: SEED_LIST[i + 3], // 再々抽選用
        };

        // 通常枠の算出
        node.roll1 = node.seed1 % 10000;
        node.rarity = getRarityFromRoll(node.roll1, thresholds);
        node.rarityId = node.rarity.id;
        
        const pool = gacha.rarityItems[node.rarityId] || [];
        node.poolSize = pool.length;
        if (pool.length > 0) {
            node.slot = node.seed2 % pool.length;
            node.itemId = pool[node.slot];
            node.itemName = getItemNameSafe(node.itemId);
        } else {
            node.slot = 0;
            node.itemId = -1; node.itemName = '---';
        }

        // 確定枠の算出 (このノードで10連を開始した場合の期待値)
        const uFlag = gacha.uberGuaranteedFlag;
        const lFlag = gacha.legendGuaranteedFlag;
        const uRate = uFlag ? (gacha.rarityRates['3'] || 500) : 0;
        const lRate = lFlag ? (gacha.rarityRates['4'] || 200) : 0;
        node.gDivisor = uRate + lRate;
        if (node.gDivisor > 0) {
            node.gRoll = node.seed1 % node.gDivisor;
            node.rarityGId = (node.gRoll < uRate) ? '3' : '4';
            node.rarityGName = (node.rarityGId === '3') ? '超激レア' : '伝説レア';
            const poolG = gacha.rarityItems[node.rarityGId] || [];
            node.poolGSize = poolG.length;
            node.slotG = node.seed1 % poolG.length;
            node.itemGId = poolG[node.slotG];
            node.itemGName = getItemNameSafe(node.itemGId);
        } else {
            node.rarityGId = null;
            node.rarityGName = '-'; node.itemGId = -1; node.itemGName = '---';
        }

        Nodes.push(node);
    }

    // --- Step 2 & 3: 再抽選・再々抽選ロジックの適用 ---
    Nodes.forEach((node, i) => {
        // Step 2: 再抽選判定
        const prevNodeS2 = (i >= 2) ? Nodes[i - 3] : null;
        const prevNameS2 = prevNodeS2 ? (prevNodeS2.reRollFlag ? prevNodeS2.reRollItemName : prevNodeS2.itemName) : getItemNameSafe(initialLastRollId);
        
        node.isMatchS2 = (node.itemName === prevNameS2);
        node.reRollFlag = (node.rarityId === 1 && node.poolSize > 1 && node.isMatchS2);
        
        if (node.reRollFlag) {
            const rrPool = (gacha.rarityItems[1] || []).filter(id => id !== node.itemId);
            node.reRollSlot = node.seed3 % rrPool.length;
            node.reRollItemId = rrPool[node.reRollSlot];
            node.reRollItemName = getItemNameSafe(node.reRollItemId);
            node.reRollNextAddress = getAddress(i + 3);
        } else {
            node.reRollItemId = -1; node.reRollItemName = '---'; node.reRollNextAddress = '-';
        }

        // Step 3: 再々抽選判定
        const prevNodeS3 = (i >= 3) ? Nodes[i - 4] : null;
        const prevRerollName = (prevNodeS3 && (prevNodeS3.reRollFlag || prevNodeS3.reRerollFlag)) ? prevNodeS3.reRollItemName : '---';
        node.isMatchS3 = (prevRerollName !== '---' && node.itemName === prevRerollName);
        node.reRerollFlag = (node.rarityId === 1 && node.isMatchS3);
    });

    // --- 詳細テキスト生成 (単発・10連ルート) ---
    const singleRouteText = [];
    let sIdx = 1, sRoll = 1, sNgTracker = initialNg, sLastInfo = { addr: 'LastRoll', name: getItemNameSafe(initialLastRollId) };
    while (sIdx <= maxNodeIndex && sRoll <= tableRows) {
        const node = Nodes[sIdx - 1];
        if (!node) break;
        const isGuar = !isNaN(initialNg) && sNgTracker > 0 && (gacha.uberGuaranteedFlag || gacha.legendGuaranteedFlag) && (sRoll >= initialNg) && ((sRoll - initialNg) % 10 === 0);
        let block = `<strong>Roll ${sRoll}${isGuar ? '[Guar]' : ''}</strong><br>実行前SEED：Seed[${sIdx - 1}] ${SEED_LIST[sIdx - 1]}<br>`;
        if (isGuar) {
            block += `レアリティ計算：Seed[${sIdx}] ${node.seed1} % ${node.gDivisor} = ${node.gRoll} → ${node.rarityGName}(${node.rarityGId})<br>`;
            const b = sNgTracker; sNgTracker = gCycle;
            block += `スロット計算：Seed[${sIdx + 1}] ${node.seed2} % ${node.poolGSize} = ${node.slotG} ${node.itemGName}(${node.itemGId}) nextGuar ${b}→${sNgTracker} 最終Seed ${node.seed2}<br>`;
            sLastInfo = { addr: node.address + 'G', name: node.itemGName }; sIdx += 2;
        } else {
            const thres = thresholds[node.rarityId];
            block += `レアリティ計算：Seed[${sIdx}] ${node.seed1} % 10000 = ${node.roll1} ＜ ${thres} → ${rarityNames[node.rarityId]}(${node.rarityId})<br>`;
            const b = sNgTracker;
            sNgTracker = (sNgTracker <= 1) ? gCycle : sNgTracker - 1;
            block += `スロット計算：Seed[${sIdx + 1}] ${node.seed2} % ${node.poolSize} = ${node.slot} ${node.itemName}(${node.itemId}) nextGuar ${b}→${sNgTracker} 最終Seed ${node.seed2}<br>`;
            block += `再抽選判定：レアリティ判定 ${rarityNames[node.rarityId]}(${node.rarityId})→${node.rarityId === 1 ? '該当' : '不該当'} 現アイテム ${node.address})${node.itemName} 前アイテム ${sLastInfo.addr})${sLastInfo.name} →${node.isMatchS2 ? '一致' : '不一致'} 再抽選判定 ${node.reRollFlag ? '実行' : 'なし'}<br>`;
            const pNode = (sIdx >= 3) ? Nodes[sIdx - 4] : null;
            const pRRName = (pNode && (pNode.reRollFlag || pNode.reRerollFlag)) ? pNode.reRollItemName : '---';
            block += `再々抽選判定：レアリティ判定 ${rarityNames[node.rarityId]}(${node.rarityId})→${node.rarityId === 1 ? '該当' : '不該当'} 現アイテム ${node.address})${node.itemName} 前アイテム ${pNode ? pNode.address : '---'})${pRRName} →${node.isMatchS3 ? '一致' : '不一致'} 再抽選判定 ${node.reRerollFlag ? '実行' : 'なし'}<br>`;
            if (node.reRollFlag || node.reRerollFlag) {
                block += `再抽選スロット計算：Seed[${sIdx + 2}] ${node.seed3} % ${node.poolSize - 1} = ${node.reRollSlot} ${node.reRollItemName}(${node.reRollItemId}) nextGuar ${b}→${sNgTracker} 最終Seed ${node.seed3}<br>`;
                sLastInfo = { addr: node.address, name: node.reRollItemName }; sIdx += 3;
            } else {
                sLastInfo = { addr: node.address, name: node.itemName };
                sIdx += 2;
            }
        }
        singleRouteText.push(block);
        sRoll++;
    }

    const multiRouteText = [];
    let tIdx = 1, tRoll = 1, cycleCount = 1, tNgTracker = initialNg, tLastInfo = { addr: 'LastRoll', name: getItemNameSafe(initialLastRollId) };
    while (tIdx <= maxNodeIndex && tRoll <= tableRows) {
        const nodeInit = Nodes[tIdx - 1];
        if (!nodeInit) break;
        let cycleBlock = `<strong>【サイクル ${cycleCount}】</strong><br>実行前Seed：Seed[${tIdx - 1}] ${SEED_LIST[tIdx - 1]}<br>`;
        if (nodeInit.gDivisor > 0) cycleBlock += `確定枠のレアリティ判定：Seed[${tIdx}] ${nodeInit.seed1} % ${nodeInit.gDivisor} = ${nodeInit.gRoll} → ${nodeInit.rarityGName}(${nodeInit.rarityGId}) 最終Seed ${nodeInit.seed1}<br>`;
        cycleBlock += `==================================================<br>`;
        tIdx++;
        for (let j = 0; j < 10; j++) {
            if (tRoll > tableRows || tIdx > maxNodeIndex) break;
            const node = Nodes[tIdx - 1];
            const isGuar = !isNaN(initialNg) && tNgTracker > 0 && (tRoll >= initialNg) && ((tRoll - initialNg) % 10 === 0);
            let rollTxt = `<strong>Roll ${tRoll}${isGuar ? '[Guar]' : ''}</strong><br>実行前Seed：Seed[${tIdx - 1}] ${SEED_LIST[tIdx - 1]}<br>`;
            if (isGuar) {
                // 確定枠アイテム算出: レアリティはサイクル開始時(nodeInit)、スロットはこのロール(node)のシード
                const poolG = gacha.rarityItems[nodeInit.rarityGId] || [];
                const slotG = node.seed1 % Math.max(1, poolG.length);
                const itemIdG = poolG[slotG];
                const itemNameG = getItemNameSafe(itemIdG);

                rollTxt += `レアリティ計算：サイクルの初期シードで算出済み→${nodeInit.rarityGName}(${nodeInit.rarityGId})<br>`;
                const b = tNgTracker; tNgTracker = gCycle;
                rollTxt += `スロット計算：Seed[${tIdx}] ${node.seed1} % ${poolG.length} = ${slotG} ${itemNameG}(${itemIdG}) nextGuar ${b}→${tNgTracker} 最終Seed ${node.seed1}<br>`;
                tLastInfo = { addr: node.address + 'G', name: itemNameG }; tIdx += 1;
            } else {
                const thres = thresholds[node.rarityId];
                rollTxt += `レアリティ計算：Seed[${tIdx}] ${node.seed1} % 10000 = ${node.roll1} ＜ ${thres} → ${rarityNames[node.rarityId]}(${node.rarityId})<br>`;
                const b = tNgTracker;
                tNgTracker = (tNgTracker <= 1) ? gCycle : tNgTracker - 1;
                rollTxt += `スロット計算：Seed[${tIdx + 1}] ${node.seed2} % ${node.poolSize} = ${node.slot} ${node.itemName}(${node.itemId}) nextGuar ${b}→${tNgTracker} 最終Seed ${node.seed2}<br>`;
                rollTxt += `再抽選判定：レアリティ判定 ${rarityNames[node.rarityId]}(${node.rarityId})→${node.rarityId === 1 ? '該当' : '不該当'} 現アイテム ${node.address})${node.itemName} 前アイテム ${tLastInfo.addr})${tLastInfo.name} →${node.isMatchS2 ? '一致' : '不一致'} 再抽選判定 ${node.reRollFlag ? '実行' : 'なし'}<br>`;
                const pNode = (tIdx >= 3) ? Nodes[tIdx - 4] : null;
                const pRRName = (pNode && (pNode.reRollFlag || pNode.reRerollFlag)) ? pNode.reRollItemName : '---';
                rollTxt += `再々抽選判定：レアリティ判定 ${rarityNames[node.rarityId]}(${node.rarityId})→${node.rarityId === 1 ? '該当' : '不該当'} 現アイテム ${node.address})${node.itemName} 前アイテム ${pNode ? pNode.address : '---'})${pRRName} →${node.isMatchS3 ? '一致' : '不一致'} 再抽選判定 ${node.reRerollFlag ? '実行' : 'なし'}<br>`;
                if (node.reRollFlag || node.reRerollFlag) {
                    rollTxt += `再抽選スロット計算：Seed[${tIdx + 2}] ${node.seed3} % ${node.poolSize - 1} = ${node.reRollSlot} ${node.reRollItemName}(${node.reRollItemId}) nextGuar ${b}→${tNgTracker} 最終Seed ${node.seed3}<br>`;
                    tLastInfo = { addr: node.address, name: node.reRollItemName }; tIdx += 3;
                } else {
                    tLastInfo = { addr: node.address, name: node.itemName };
                    tIdx += 2;
                }
            }
            cycleBlock += rollTxt + `--------------------------------------------------<br>`;
            tRoll++;
        }
        multiRouteText.push(cycleBlock); cycleCount++;
    }

    const highlightInfo = generateHighlightMap(Nodes, tableRows, initialNg, initialLastRollId, gCycle, gacha);
    return { Nodes, singleRouteText, multiRouteText, highlightInfo, maxNodeIndex, SEED_LIST };
}

/**
 * ビームサーチ（動的計画法）による最適ルート探索
 */
function runGachaBeamSearch(Nodes, initialLastRollId, totalTickets, gacha, thresholds, initialNg, targetLayers = []) {
    const gCycle = gacha.guaranteedCycle || 30;
    const uFlag = gacha.uberGuaranteedFlag;
    const lFlag = gacha.legendGuaranteedFlag;

    const simulateSingleRoll = (startIdx, lastId, rollNum, currentNg, nodeInit = null) => {
        const node = Nodes[startIdx - 1];
        if (!node) return null;
        const isGuar = !isNaN(initialNg) && currentNg > 0 && (uFlag || lFlag) && (rollNum >= initialNg) && ((rollNum - initialNg) % 10 === 0);
        
        if (isGuar && nodeInit) {
            // 確定枠の計算: レアリティはサイクル開始時、スロットは現在のノード
            const poolG = gacha.rarityItems[nodeInit.rarityGId] || [];
            const slotG = node.seed1 % Math.max(1, poolG.length);
            const itemIdG = poolG[slotG];
            return { itemId: itemIdG, itemName: getItemNameSafe(itemIdG), useSeeds: 1, rarity: itemMaster[itemIdG]?.rarity || 0, nextNg: gCycle };
        } else if (isGuar) {
            // 単発ルートでの確定（通常ありえないが安全のため）
            return { itemId: node.itemGId, itemName: node.itemGName, useSeeds: 2, rarity: itemMaster[node.itemGId]?.rarity || 0, nextNg: gCycle };
        } else {
            const isMatch = (node.itemId !== -1 && node.itemId === lastId);
            const isRR = (node.rarityId === 1 && node.poolSize > 1 && isMatch) || node.reRerollFlag;
            
            let finalId = isRR ? node.reRollItemId : node.itemId;
            let finalName = isRR ? node.reRollItemName : node.itemName;
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
            // 1. 単発ルート
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

            // 2. 10連ルート
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

function generateHighlightMap(Nodes, tableRows, initialNg, initialLastRollId, gCycle, gacha) {
    const map = new Map();
    const uFlag = gacha.uberGuaranteedFlag, lFlag = gacha.legendGuaranteedFlag;
    let sIdx = 1, sLastId = initialLastRollId;
    for (let roll = 1; roll <= tableRows; roll++) {
        if (sIdx > Nodes.length) break;
        const node = Nodes[sIdx - 1];
        const isG = !isNaN(initialNg) && (uFlag || lFlag) && (roll >= initialNg) && ((roll - initialNg) % 10 === 0);
        if (isG) {
            map.set(node.address + 'G', { single: true, singleRoll: roll });
            sLastId = node.itemGId; sIdx += 2;
        } else {
            const rr = (node.rarityId === 1 && node.poolSize > 1 && node.itemId === sLastId) || node.reRerollFlag;
            map.set(node.address, { single: true, singleRoll: roll, s_reRoll: rr });
            sLastId = rr ? node.reRollItemId : node.itemId;
            sIdx += rr ? 3 : 2;
        }
    }
    let tIdx = 1, tLastId = initialLastRollId;
    for (let roll = 1; roll <= tableRows; roll++) {
        if ((roll - 1) % 10 === 0) tIdx++;
        if (tIdx > Nodes.length) break;
        const node = Nodes[tIdx - 1];
        const isG = !isNaN(initialNg) && (uFlag || lFlag) && (roll >= initialNg) && ((roll - initialNg) % 10 === 0);
        if (isG) {
            const gNode = Nodes[tIdx - 2];
            if (gNode) {
                const info = map.get(gNode.address + 'G') || {};
                info.ten = true; info.tenRoll = roll;
                map.set(gNode.address + 'G', info);
            }
            tIdx += 1;
        } else {
            const rr = (node.rarityId === 1 && node.poolSize > 1 && node.itemId === tLastId) || node.reRerollFlag;
            const info = map.get(node.address) || {};
            info.ten = true; info.tenRoll = roll; info.t_reRoll = rr;
            map.set(node.address, info);
            tLastId = rr ? node.reRollItemId : node.itemId;
            tIdx += rr ? 3 : 2;
        }
    }
    return map;
}