/**
 * 担当: 最適ルート探索（ビームサーチ）のコアロジック
 * 修正: ハイライト対象をセル単位(A/AG等)で特定するためのアドレス生成ロジックを追加
 */

/**
 * 単発ガチャを1回シミュレートする
 */
function simulateSingleRoll(startIdx, lastId, rollNum, currentNg, gacha, Nodes) {
    const node = Nodes[startIdx - 1];
    if (!node) return null;

    const gCycle = gacha.guaranteedCycle || 30;
    const isGuar = !isNaN(currentNg) && currentNg !== 'none' && currentNg > 0 && (gacha.uberGuaranteedFlag || gacha.legendGuaranteedFlag) && (currentNg <= 1);
    
    if (isGuar) {
        return { 
            items: [{itemId: node.itemGId, rarity: itemMaster[node.itemGId]?.rarity || 0}], 
            useSeeds: 2, 
            nextLastId: node.itemGId, 
            nextNg: gCycle,
            cellAddr: node.address + 'G' // 確定枠アドレス
        };
    } else {
        const isRR = node.rarityId === 1 && node.poolSize > 1 && node.itemId === lastId;
        let finalId = node.itemId;
        if (isRR && node.reRollItemId !== undefined) {
            finalId = node.reRollItemId;
        }
        const useSeeds = isRR ? 3 : 2;
        const nextNg = (isNaN(currentNg) || currentNg === 'none') ? 'none' : (currentNg - 1);
        return { 
            items: [{itemId: finalId, rarity: itemMaster[finalId]?.rarity || 0}], 
            useSeeds, 
            nextLastId: finalId, 
            nextNg,
            cellAddr: node.address // 通常枠アドレス
        };
    }
}

/**
 * 10連ガチャを1回シミュレートする
 */
function simulateTenRoll(startIdx, lastId, rollNum, currentNg, gacha, Nodes) {
    const gCycle = gacha.guaranteedCycle || 30;
    const uRate = gacha.uberGuaranteedFlag ? (gacha.rarityRates['3'] || 500) : 0;
    const lRate = gacha.legendGuaranteedFlag ? (gacha.rarityRates['4'] || 200) : 0;
    const gDiv = uRate + lRate;

    let guaranteedRollIndex = -1;
    if (!isNaN(currentNg) && currentNg !== 'none' && currentNg > 0 && currentNg <= 10 && (gacha.uberGuaranteedFlag || gacha.legendGuaranteedFlag)) {
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

    const rollInfos = [];
    let currentSeedIdx = startIdx + raritySeedConsumed;
    let tempLastId = lastId;
    
    // トラック判定 (A列を含むかB列を含むか)
    let currentTrack = Nodes[currentSeedIdx - 1]?.address.includes('A') ? 'A' : 'B';

    for (let i = 0; i < 10; i++) {
        if (i === guaranteedRollIndex) {
            rollInfos.push(null);
            continue;
        }
        const node = Nodes[currentSeedIdx - 1];
        if (!node) return null;
        
        const isRR = node.rarityId === 1 && node.poolSize > 1 && node.itemId === tempLastId;
        const useSeeds = isRR ? 3 : 2;
        let finalId = node.itemId;
        if (isRR && node.reRollItemId !== undefined) {
            finalId = node.reRollItemId;
        }

        rollInfos.push({ 
            type: 'normal', 
            seed: currentSeedIdx, 
            use: useSeeds, 
            itemId: finalId, 
            rarity: itemMaster[finalId]?.rarity || 0,
            cellAddr: node.address.replace(/[AB]/, currentTrack)
        });
        currentSeedIdx += useSeeds;
        tempLastId = finalId;
    }

    if (guaranteedRollIndex !== -1) {
        const slotNode = Nodes[currentSeedIdx - 1];
        if (!slotNode) return null;
        const poolG = gacha.rarityItems[guaranteedRarityId] || [];
        const slotG = slotNode.seed1 % Math.max(1, poolG.length);
        const itemIdG = poolG[slotG];
        
        // 確定枠のトラックは直前ロールの反対側
        const oppositeTrack = (currentTrack === 'A' ? 'B' : 'A');
        
        rollInfos[guaranteedRollIndex] = { 
            type: 'guaranteed', 
            seed: currentSeedIdx, 
            use: 1, 
            itemId: itemIdG, 
            rarity: itemMaster[itemIdG]?.rarity || 0,
            cellAddr: slotNode.address.replace(/[AB]/, oppositeTrack) + 'G'
        };
        currentSeedIdx += 1;
    }

    const items = [];
    const cellAddrs = [];
    let nextLastId = lastId;
    for (let i = 0; i < 10; i++) {
        const roll = rollInfos[i];
        items.push({ itemId: roll.itemId, rarity: roll.rarity });
        cellAddrs.push(roll.cellAddr);
        nextLastId = roll.itemId;
    }
    
    let nextNg;
    if (guaranteedRollIndex !== -1) {
        nextNg = gCycle;
    } else {
        nextNg = (isNaN(currentNg) || currentNg === 'none') ? 'none' : (currentNg - 10);
    }

    const totalSeedsConsumed = currentSeedIdx - startIdx;
    return { items, useSeeds: totalSeedsConsumed, nextLastId, nextNg, cellAddrs };
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

    dp[0].set(`1_${initialLastRollId}_${initialNg}`, {
        nodeIdx: 1,
        lastId: initialLastRollId,
        currentNg: initialNg,
        ubers: 0,
        legends: 0,
        path: [],
        rollCount: 1,
        tickets: 0
    });

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
            // --- 単発ガチャ ---
            if (t + 1 <= totalTickets) {
                const resS = simulateSingleRoll(state.nodeIdx, state.lastId, state.rollCount, state.currentNg, gacha, Nodes);
                if (resS) {
                    const nextState = {
                        nodeIdx: state.nodeIdx + resS.useSeeds,
                        lastId: resS.nextLastId,
                        currentNg: resS.nextNg,
                        ubers: state.ubers + (resS.items[0].rarity === 3 ? 1 : 0),
                        legends: state.legends + (resS.items[0].rarity === 4 ? 1 : 0),
                        path: state.path.concat({ 
                            type: 'single', 
                            item: getItemNameSafe(resS.items[0].itemId), 
                            addr: Nodes[state.nodeIdx - 1]?.address || '?', 
                            targetCell: resS.cellAddr // ハイライト対象を保存
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

            // --- 10連ガチャ ---
            if (t + 10 <= totalTickets) {
                const resTen = simulateTenRoll(state.nodeIdx, state.lastId, state.rollCount, state.currentNg, gacha, Nodes);
                if (resTen) {
                    let ubers = 0;
                    let legends = 0;
                    let itemNames = [];
                    resTen.items.forEach(item => {
                        if (item.rarity === 3) ubers++;
                        if (item.rarity === 4) legends++;
                        itemNames.push(getItemNameSafe(item.itemId));
                    });

                    const nextStateTen = {
                        nodeIdx: state.nodeIdx + resTen.useSeeds,
                        lastId: resTen.nextLastId,
                        currentNg: resTen.nextNg,
                        ubers: state.ubers + ubers,
                        legends: state.legends + legends,
                        path: state.path.concat({ 
                            type: 'ten', 
                            items: itemNames, 
                            addr: Nodes[state.nodeIdx - 1]?.address || '?', 
                            targetCells: resTen.cellAddrs // ハイライト対象(10個分)を保存
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
    
    return findBestBeamSearchResult(dp, totalTickets, calculateScore);
}