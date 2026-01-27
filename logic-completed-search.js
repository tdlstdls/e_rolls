/**
 * 担当: 最適ルート探索（ビームサーチ）のコアロジック
<<<<<<< HEAD
 * 修正: 強制レア被りモード (window.forceRerollMode) をシミュレーションに反映
 */

/**
=======
 * 修正: NG管理を1ロールごとの完全線形デクリメント（0時にサイクル値へ置換）に統一
 */

/**
 * 次のNG値を算出する共通関数
 */
function getNextNgLinear(currentNg, rollCount, cycle) {
    if (currentNg === 'none' || isNaN(currentNg)) return 'none';
    let next = currentNg - rollCount;
    while (next <= 0) {
        next += cycle;
    }
    return next;
}

/**
>>>>>>> 5e0b83a616ebb5025e499b3f5d1bd2d23519dcb9
 * 単発ガチャを1回シミュレートする
 */
function simulateSingleRoll(startIdx, lastId, rollNum, currentNg, gacha, Nodes) {
    const node = Nodes[startIdx - 1];
    if (!node) return null;

<<<<<<< HEAD
    const gCycle = gacha.guaranteedCycle || 30;
    const isGuar = !isNaN(currentNg) && currentNg !== 'none' && currentNg > 0 && (gacha.uberGuaranteedFlag || gacha.legendGuaranteedFlag) && (currentNg <= 1);
=======
    const gCycle = gacha.guaranteedCycle || 10;
    // 線形管理において currentNg === 1 が確定ロール
    const isGuar = (currentNg === 1) && (gacha.uberGuaranteedFlag || gacha.legendGuaranteedFlag);
    
    // 次のNG状態を算出
    const nextNg = getNextNgLinear(currentNg, 1, gCycle);

>>>>>>> 5e0b83a616ebb5025e499b3f5d1bd2d23519dcb9
    if (isGuar) {
        return { 
            items: [{
                itemId: node.itemGId, 
                rarity: itemMaster[node.itemGId]?.rarity || 0,
                isGuaranteed: true,
                isReroll: false
            }], 
            useSeeds: 2, 
            nextLastId: node.itemGId, 
<<<<<<< HEAD
            nextNg: gCycle,
            cellAddr: node.address + 'G',
            hType: 'single' // 単発ハイライト
        };
    } else {
        // 通常の被り判定、または強制再抽選モードの適用
        const isMatch = (node.itemId === lastId);
        const isRR = (node.rarityId === 1 && node.poolSize > 1 && (isMatch || window.forceRerollMode));
=======
            nextNg: nextNg,
            cellAddr: node.address + 'G',
            hType: 'single' 
        };
    } else {
        const isMatch = (node.itemId === lastId);
        const isRR = (node.rarityId === 1 && node.poolSize > 1 && (isMatch || window.forceRerollMode)) || node.reRerollFlag;
>>>>>>> 5e0b83a616ebb5025e499b3f5d1bd2d23519dcb9

        let finalId = node.itemId;
        if (isRR && node.reRollItemId !== undefined) {
            finalId = node.reRollItemId;
        }
        const useSeeds = isRR ? 3 : 2;
<<<<<<< HEAD
        const nextNg = (isNaN(currentNg) || currentNg === 'none') ? 'none' : (currentNg - 1);
=======
        
>>>>>>> 5e0b83a616ebb5025e499b3f5d1bd2d23519dcb9
        return { 
            items: [{
                itemId: finalId, 
                rarity: itemMaster[finalId]?.rarity || 0,
                isGuaranteed: false,
                isReroll: isRR
            }], 
            useSeeds, 
            nextLastId: finalId, 
<<<<<<< HEAD
            nextNg,
            cellAddr: node.address,
            hType: 'single' // 単発ハイライト
=======
            nextNg: nextNg,
            cellAddr: node.address,
            hType: 'single'
>>>>>>> 5e0b83a616ebb5025e499b3f5d1bd2d23519dcb9
        };
    }
}

/**
 * 10連ガチャを1回シミュレートする
 */
function simulateTenRoll(startIdx, lastId, rollNum, currentNg, gacha, Nodes) {
<<<<<<< HEAD
    const gCycle = gacha.guaranteedCycle || 30;
=======
    const gCycle = gacha.guaranteedCycle || 10;
>>>>>>> 5e0b83a616ebb5025e499b3f5d1bd2d23519dcb9
    const uRate = gacha.uberGuaranteedFlag ? (gacha.rarityRates['3'] || 500) : 0;
    const lRate = gacha.legendGuaranteedFlag ? (gacha.rarityRates['4'] || 200) : 0;
    const gDiv = uRate + lRate;

<<<<<<< HEAD
    let guaranteedRollIndex = -1;
    if (!isNaN(currentNg) && currentNg !== 'none' && currentNg > 0 && currentNg <= 10 && (gacha.uberGuaranteedFlag || gacha.legendGuaranteedFlag)) {
=======
    // 10連中のどの位置に確定が来るかを特定
    let guaranteedRollIndex = -1;
    if (currentNg !== 'none' && currentNg >= 1 && currentNg <= 10) {
>>>>>>> 5e0b83a616ebb5025e499b3f5d1bd2d23519dcb9
        guaranteedRollIndex = currentNg - 1;
    }

    let guaranteedRarityId = null;
    let raritySeedConsumed = 0;
    if (guaranteedRollIndex !== -1 && gDiv > 0) {
        const rarityNode = Nodes[startIdx - 1];
        if (!rarityNode) return null;
        guaranteedRarityId = rarityNode.rarityGId;
        raritySeedConsumed = 1;
    }

    const items = [];
<<<<<<< HEAD
    const cellData = []; // { addr, type } の配列
=======
    const cellData = []; 
>>>>>>> 5e0b83a616ebb5025e499b3f5d1bd2d23519dcb9
    let ptr = startIdx + raritySeedConsumed;
    let tempLastId = lastId;

    for (let i = 0; i < 10; i++) {
        const hType = (i === 9) ? 'ten-guar' : 'ten-normal';

        if (i === guaranteedRollIndex) {
            const slotNode = Nodes[ptr - 1];
            if (!slotNode) return null;
            
            const poolG = gacha.rarityItems[guaranteedRarityId] || [];
            const slotG = slotNode.seed1 % Math.max(1, poolG.length);
            const itemIdG = poolG[slotG];
            
            items.push({ 
                itemId: itemIdG, 
                rarity: itemMaster[itemIdG]?.rarity || 0,
                isGuaranteed: true,
                isReroll: false
            });
            cellData.push({ addr: slotNode.address + 'G', type: hType });
            
            ptr += 1;
            tempLastId = itemIdG;
<<<<<<< HEAD
            tNgTracker = gCycle;
=======
>>>>>>> 5e0b83a616ebb5025e499b3f5d1bd2d23519dcb9
        } else {
            const node = Nodes[ptr - 1];
            if (!node) return null;

            const isMatch = (node.itemId === tempLastId);
<<<<<<< HEAD
            // 通常の被り判定、または強制再抽選モードの適用
            const isRR = (node.rarityId === 1 && node.poolSize > 1 && (isMatch || window.forceRerollMode));
=======
            const isRR = (node.rarityId === 1 && node.poolSize > 1 && (isMatch || window.forceRerollMode)) || node.reRerollFlag;
>>>>>>> 5e0b83a616ebb5025e499b3f5d1bd2d23519dcb9

            let finalId = node.itemId;
            if (isRR && node.reRollItemId !== undefined) {
                finalId = node.reRollItemId;
            }
            
            items.push({ 
                itemId: finalId, 
                rarity: itemMaster[finalId]?.rarity || 0,
                isGuaranteed: false,
                isReroll: isRR
            });
            
            cellData.push({ addr: node.address, type: hType });
<<<<<<< HEAD
            
=======
>>>>>>> 5e0b83a616ebb5025e499b3f5d1bd2d23519dcb9
            const consumed = isRR ? 3 : 2;
            ptr += consumed;
            tempLastId = finalId;
        }
    }
    
<<<<<<< HEAD
    let nextNg;
    if (guaranteedRollIndex !== -1) {
        nextNg = gCycle;
    } else {
        nextNg = (isNaN(currentNg) || currentNg === 'none') ? 'none' : (currentNg - 10);
    }
=======
    // 次のNGを算出 (10ロール分進める)
    const nextNg = getNextNgLinear(currentNg, 10, gCycle);
>>>>>>> 5e0b83a616ebb5025e499b3f5d1bd2d23519dcb9

    return { 
        items, 
        useSeeds: ptr - startIdx, 
        nextLastId: tempLastId, 
<<<<<<< HEAD
        nextNg, 
=======
        nextNg: nextNg, 
>>>>>>> 5e0b83a616ebb5025e499b3f5d1bd2d23519dcb9
        cellData 
    };
}

/**
 * 探索の最終結果から最良のものを選択する
 */
function findBestBeamSearchResult(dp, totalTickets, calculateScore) {
    for (let t = totalTickets; t >= 0; t--) {
        const statesInTier = dp[t];
        if (!statesInTier || statesInTier.size === 0) continue;

        let bestStateInTier = null;
        let bestScoreInTier = -1;
        for (const state of statesInTier.values()) {
            const score = calculateScore(state);
            if (score > bestScoreInTier) {
                bestScoreInTier = score;
                bestStateInTier = state;
            }
        }
        if (bestStateInTier) return bestStateInTier;
    }
    return null;
}

/**
 * 探索メイン関数
 */
function runGachaSearch(Nodes, initialLastRollId, totalTickets, gacha, thresholds, initialNg) {
    const BEAM_WIDTH = 1000;
    const dp = new Array(totalTickets + 1).fill(null).map(() => new Map());
<<<<<<< HEAD
    dp[0].set(`1_${initialLastRollId}_${initialNg}`, {
        nodeIdx: 1,
        lastId: initialLastRollId,
        currentNg: initialNg,
=======
    
    const startNg = initialNg === 'none' ? 'none' : parseInt(initialNg, 10);

    dp[0].set(`1_${initialLastRollId}_${startNg}`, {
        nodeIdx: 1,
        lastId: initialLastRollId,
        currentNg: startNg,
>>>>>>> 5e0b83a616ebb5025e499b3f5d1bd2d23519dcb9
        ubers: 0,
        legends: 0,
        path: [],
        rollCount: 1,
        tickets: 0
    });
<<<<<<< HEAD
=======
    
>>>>>>> 5e0b83a616ebb5025e499b3f5d1bd2d23519dcb9
    const calculateScore = (state) => {
        return (state.ubers * 10000) + (state.legends * 1000);
    };

    for (let t = 0; t <= totalTickets; t++) {
        if (!dp[t] || dp[t].size === 0) continue;
        if (dp[t].size > BEAM_WIDTH) {
            const sortedStates = Array.from(dp[t].values()).sort((a, b) => calculateScore(b) - calculateScore(a));
            const newDp = new Map();
            for (let i = 0; i < Math.min(sortedStates.length, BEAM_WIDTH); i++) {
                const state = sortedStates[i];
                const key = `${state.nodeIdx}_${state.lastId}_${state.currentNg}`;
                newDp.set(key, state);
            }
            dp[t] = newDp;
        }

        const states = Array.from(dp[t].values());
        for (const state of states) {
<<<<<<< HEAD
            // --- 単発ガチャ ---
=======
            // 単発
>>>>>>> 5e0b83a616ebb5025e499b3f5d1bd2d23519dcb9
            if (t + 1 <= totalTickets) {
                const resS = simulateSingleRoll(state.nodeIdx, state.lastId, state.rollCount, state.currentNg, gacha, Nodes);
                if (resS) {
                    const item = resS.items[0];
                    const nextState = {
                        nodeIdx: state.nodeIdx + resS.useSeeds,
                        lastId: resS.nextLastId,
                        currentNg: resS.nextNg,
                        ubers: state.ubers + (item.rarity === 3 ? 1 : 0),
                        legends: state.legends + (item.rarity === 4 ? 1 : 0),
                        path: state.path.concat({ 
                            type: 'single', 
                            item: getItemNameSafe(item.itemId), 
                            isGuaranteed: item.isGuaranteed,
                            isReroll: item.isReroll,
                            addr: Nodes[state.nodeIdx - 1]?.address || '?', 
<<<<<<< HEAD
                            targetCell: { addr: resS.cellAddr, type: resS.hType } // 型付き情報を保存
=======
                            targetCell: { addr: resS.cellAddr, type: resS.hType }
>>>>>>> 5e0b83a616ebb5025e499b3f5d1bd2d23519dcb9
                        }),
                        rollCount: state.rollCount + 1,
                        tickets: t + 1
                    };
                    const key = `${nextState.nodeIdx}_${nextState.lastId}_${nextState.currentNg}`;
                    const existing = dp[t + 1].get(key);
                    if (!existing || calculateScore(existing) < calculateScore(nextState)) {
                        dp[t + 1].set(key, nextState);
                    }
                }
            }

<<<<<<< HEAD
            // --- 10連ガチャ ---
=======
            // 10連
>>>>>>> 5e0b83a616ebb5025e499b3f5d1bd2d23519dcb9
            if (t + 10 <= totalTickets) {
                const resTen = simulateTenRoll(state.nodeIdx, state.lastId, state.rollCount, state.currentNg, gacha, Nodes);
                if (resTen) {
                    let ubers = 0;
                    let legends = 0;
                    let itemsData = [];
                    resTen.items.forEach(item => {
                        if (item.rarity === 3) ubers++;
                        if (item.rarity === 4) legends++;
                        itemsData.push({
                            name: getItemNameSafe(item.itemId),
                            isGuaranteed: item.isGuaranteed,
                            isReroll: item.isReroll
                        });
                    });
                    const nextStateTen = {
                        nodeIdx: state.nodeIdx + resTen.useSeeds,
<<<<<<< HEAD
                        lastId: state.nodeIdx + resTen.useSeeds, // ptrを正しく管理
                        nodeIdx: state.nodeIdx + resTen.useSeeds,
=======
>>>>>>> 5e0b83a616ebb5025e499b3f5d1bd2d23519dcb9
                        lastId: resTen.nextLastId,
                        currentNg: resTen.nextNg,
                        ubers: state.ubers + ubers,
                        legends: state.legends + legends,
                        path: state.path.concat({ 
                            type: 'ten', 
                            items: itemsData,
                            addr: Nodes[state.nodeIdx - 1]?.address || '?', 
<<<<<<< HEAD
                            targetCells: resTen.cellData // 型付き情報の配列を保存
=======
                            targetCells: resTen.cellData 
>>>>>>> 5e0b83a616ebb5025e499b3f5d1bd2d23519dcb9
                        }),
                        rollCount: state.rollCount + 10,
                        tickets: t + 10
                    };
                    const keyTen = `${nextStateTen.nodeIdx}_${nextStateTen.lastId}_${nextStateTen.currentNg}`;
                    const existingTen = dp[t + 10].get(keyTen);
                    if (!existingTen || calculateScore(existingTen) < calculateScore(nextStateTen)) {
                        dp[t + 10].set(keyTen, nextStateTen);
                    }
                }
            }
        }
    }
<<<<<<< HEAD
    
    return findBestBeamSearchResult(dp, totalTickets, calculateScore);
}
=======
    return findBestBeamSearchResult(dp, totalTickets, calculateScore);
}
>>>>>>> 5e0b83a616ebb5025e499b3f5d1bd2d23519dcb9
