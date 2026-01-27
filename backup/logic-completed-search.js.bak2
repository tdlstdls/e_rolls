// =================================================================================
// 最適ルート探索（ビームサーチ）
// =================================================================================

/**
 * 単発ガチャを1回シミュレートする
 */
function simulateSingleRoll(startIdx, lastId, rollNum, currentNg, gacha, Nodes) {
    const node = Nodes[startIdx - 1];
    if (!node) return null;

    const gCycle = gacha.guaranteedCycle || 30;
    // isGuar: あと1回で確定枠の時
    const isGuar = !isNaN(currentNg) && currentNg !== 'none' && currentNg > 0 && (gacha.uberGuaranteedFlag || gacha.legendGuaranteedFlag) && (currentNg <= 1);
    
    if (isGuar) {
        // 確定枠を消費する
        return { items: [{itemId: node.itemGId, rarity: itemMaster[node.itemGId]?.rarity || 0}], useSeeds: 2, nextLastId: node.itemGId, nextNg: gCycle };
    } else {
        // 通常ロール
        const isMatch = (node.itemId !== -1 && node.itemId === lastId);
        // レア被り再抽選判定
        const isRR = (node.rarityId === 1 && node.poolSize > 1 && isMatch) || node.reRerollFlag;
        let finalId = node.itemId;
        if (isRR && node.reRollItemId !== undefined) {
            finalId = node.reRollItemId;
        }
        const useSeeds = isRR ? 3 : 2;
        // 確定枠ではないので、カウンターを1減らす
        const nextNg = (isNaN(currentNg) || currentNg === 'none') ? 'none' : (currentNg - 1);
        return { items: [{itemId: finalId, rarity: itemMaster[finalId]?.rarity || 0}], useSeeds, nextLastId: finalId, nextNg };
    }
}


/**
 * 10連ガチャを1回シミュレートする
 * ユーザー指定の特殊なSeed消費ロジックを実装
 */
function simulateTenRoll(startIdx, lastId, rollNum, currentNg, gacha, Nodes) {
    const gCycle = gacha.guaranteedCycle || 30;

    // 1. 確定枠がこの10連に含まれるか、そのインデックス(0-9)を特定
    let guaranteedRollIndex = -1;
    // `currentNg` が 1-10 の間なら、この10連に確定枠が含まれる
    if (!isNaN(currentNg) && currentNg !== 'none' && currentNg > 0 && currentNg <= 10 && (gacha.uberGuaranteedFlag || gacha.legendGuaranteedFlag)) {
        guaranteedRollIndex = currentNg - 1;
    }

    // 2. 確定枠の「レアリティ」を最初のSeedから決定
    let guaranteedRarityId = null;
    let raritySeedConsumed = 0;
    if (guaranteedRollIndex !== -1) {
        const rarityNode = Nodes[startIdx - 1];
        if (!rarityNode) return null; // 探索不能
        guaranteedRarityId = rarityNode.rarityGId;
        raritySeedConsumed = 1; // レアリティ判定で1消費
    }

    // 3. 各ロールで消費するSeed数と開始インデックスを事前計算
    const rollInfos = [];
    let currentSeedIdx = startIdx + raritySeedConsumed;
    let tempLastId = lastId;

    // まず通常ロール9回分(または10回分)のSeed消費を計算
    for (let i = 0; i < 10; i++) {
        if (i === guaranteedRollIndex) {
            rollInfos.push(null); // 確定枠は後で計算
            continue;
        }
        const node = Nodes[currentSeedIdx - 1];
        if (!node) return null;
        
        const isMatch = (node.itemId !== -1 && node.itemId === tempLastId);
        const isRR = (node.rarityId === 1 && node.poolSize > 1 && isMatch) || node.reRerollFlag;
        const useSeeds = isRR ? 3 : 2;

        let finalId = node.itemId;
        if (isRR && node.reRollItemId !== undefined) {
            finalId = node.reRollItemId;
        }
        
        rollInfos.push({ type: 'normal', seed: currentSeedIdx, use: useSeeds, itemId: finalId, rarity: itemMaster[finalId]?.rarity || 0 });
        currentSeedIdx += useSeeds;
        tempLastId = finalId;
    }

    // 4. 最後に確定枠の「スロット」用のSeedを割り当てる
    if (guaranteedRollIndex !== -1) {
        const slotNode = Nodes[currentSeedIdx - 1];
        if (!slotNode) return null;
        
        const poolG = gacha.rarityItems[guaranteedRarityId] || [];
        const slotG = slotNode.seed1 % Math.max(1, poolG.length);
        const itemIdG = poolG[slotG];

        rollInfos[guaranteedRollIndex] = { type: 'guaranteed', seed: currentSeedIdx, use: 1, itemId: itemIdG, rarity: itemMaster[itemIdG]?.rarity || 0 };
        currentSeedIdx += 1;
    }

    // 5. 結果を組み立て
    const items = [];
    let nextLastId = lastId;
    
    for (let i = 0; i < 10; i++) {
        const roll = rollInfos[i];
        items.push({ itemId: roll.itemId, rarity: roll.rarity });
        nextLastId = roll.itemId;
    }
    
    // 10連後の最終的な nextNg を計算
    let nextNg;
    if (guaranteedRollIndex !== -1) {
        // 確定枠を消費したので、gCycleにリセットされる
        nextNg = gCycle;
    } else {
        // 確定枠を消費していないので、10回分カウンターを減らす
        nextNg = (isNaN(currentNg) || currentNg === 'none') ? 'none' : (currentNg - 10);
    }

    const totalSeedsConsumed = currentSeedIdx - startIdx;
    return { items, useSeeds: totalSeedsConsumed, nextLastId, nextNg };
}


/**
 * 探索の最終結果から最良のものを選択する
 * totalTicketsを使い切った状態から優先的に探す
 */
function findBestBeamSearchResult(dp, totalTickets, calculateScore) {
    // 指定されたチケット数を使い切った状態から逆順に探す
    for (let t = totalTickets; t >= 1; t--) {
        const statesInTier = dp[t];
        if (!statesInTier || statesInTier.size === 0) {
            continue; // このチケット数の状態がなければ次へ
        }

        // このチケット数で有効なルートが見つかったので、この中からベストを探して返す
        let bestStateInTier = null;
        let bestScoreInTier = -1;

        for (const state of statesInTier.values()) {
            const score = calculateScore(state);
            if (score > bestScoreInTier) {
                bestScoreInTier = score;
                bestStateInTier = state;
            }
        }
        return bestStateInTier;
    }
    return null; // 有効なルートが一つも見つからなかった場合
}


function runGachaSearch(Nodes, initialLastRollId, totalTickets, gacha, thresholds, initialNg, targetLayers = []) {
    // 渡された targetLayers が実際に有効なターゲットを含んでいるかチェック
    const hasValidLayers = targetLayers && targetLayers.some(layer => Array.isArray(layer) && layer.length > 0);
    const effectiveLayers = hasValidLayers ? targetLayers : [];

    const BEAM_WIDTH = 2000; // ビーム幅

    // dp[t] はチケットを t 枚消費した時点での状態を保持するMap
    const dp = new Array(totalTickets + 1).fill(null).map(() => new Map());

    // 初期状態 (チケット0枚)
    const initialLayerCounts = new Array(effectiveLayers.length).fill(0);
    dp[0].set(`1_${initialLastRollId}_${initialNg}_${initialLayerCounts.join('-')}`, {
        nodeIdx: 1,
        lastId: initialLastRollId,
        currentNg: initialNg,
        layerCounts: initialLayerCounts,
        ubers: 0,
        legends: 0,
        path: [],
        rollCount: 1,
        tickets: 0
    });

    /**
     * 状態を評価するスコア関数
     * @param {object} state 状態
     * @returns {number} スコア
     */
    const calculateScore = (state) => {
        let score = 0;
        // ターゲットレイヤーのスコアを最優先
        if (hasValidLayers) {
            for (let i = 0; i < state.layerCounts.length; i++) {
                // 第1優先を100,000点、以降の優先度は1/10ずつ価値を落とす
                score += state.layerCounts[i] * (100000 / Math.pow(10, i));
            }
        }
        // 副産物としての超激レア・伝説レアのスコアは相対的に低くする
        score += state.ubers * 1;
        score += state.legends * 10;

        return score;
    };

    for (let t = 0; t < totalTickets; t++) {
        if (!dp[t] || dp[t].size === 0) continue;

        // ビームサーチによる絞り込み: スコア上位 `BEAM_WIDTH` 件のみを保持する
        if (dp[t].size > BEAM_WIDTH) {
            const sortedStates = Array.from(dp[t].values()).sort((a, b) => calculateScore(b) - calculateScore(a));
            const newDp = new Map();
            for (let i = 0; i < Math.min(sortedStates.length, BEAM_WIDTH); i++) {
                const state = sortedStates[i];
                const key = `${state.nodeIdx}_${state.lastId}_${state.currentNg}_${state.layerCounts.join('-')}`;
                newDp.set(key, state);
            }
            dp[t] = newDp;
        }

        const states = Array.from(dp[t].values());

        for (const state of states) {
            // --- 単発ガチャ (Single Roll) ---
            if (t + 1 <= totalTickets) {
                const resS = simulateSingleRoll(state.nodeIdx, state.lastId, state.rollCount, state.currentNg, gacha, Nodes);
                if (resS) {
                    const newLayerCounts = [...state.layerCounts];
                    // 有効なターゲットがある場合のみカウント
                    if (hasValidLayers) {
                        const item = resS.items[0];
                        effectiveLayers.forEach((ids, idx) => { if (ids.includes(Number(item.itemId))) newLayerCounts[idx]++; });
                    }
                    
                    const nextState = {
                        nodeIdx: state.nodeIdx + resS.useSeeds,
                        lastId: resS.nextLastId,
                        currentNg: resS.nextNg,
                        layerCounts: newLayerCounts,
                        ubers: state.ubers + (resS.items[0].rarity === 3 ? 1 : 0),
                        legends: state.legends + (resS.items[0].rarity === 4 ? 1 : 0),
                        path: state.path.concat({ type: 'single', item: getItemNameSafe(resS.items[0].itemId), addr: Nodes[state.nodeIdx - 1]?.address || '?' }),
                        rollCount: state.rollCount + 1,
                        tickets: t + 1
                    };
                    
                    const key = `${nextState.nodeIdx}_${nextState.lastId}_${nextState.currentNg}_${nextState.layerCounts.join('-')}`;
                    const existing = dp[t + 1].get(key);
                    if (!existing || calculateScore(existing) < calculateScore(nextState)) {
                        dp[t + 1].set(key, nextState);
                    }
                }
            }

            // --- 10連ガチャ (10-Roll) ---
            if (t + 10 <= totalTickets) {
                const resTen = simulateTenRoll(state.nodeIdx, state.lastId, state.rollCount, state.currentNg, gacha, Nodes);
                if (resTen) {
                    const addLayer = new Array(effectiveLayers.length).fill(0);
                    let ubers = 0;
                    let legends = 0;
                    let itemNames = [];
                    
                    resTen.items.forEach(item => {
                        // 有効なターゲットがある場合のみカウント
                        if (hasValidLayers) {
                            effectiveLayers.forEach((ids, idx) => { if (ids.includes(Number(item.itemId))) addLayer[idx]++; });
                        }
                        if (item.rarity === 3) ubers++;
                        if (item.rarity === 4) legends++;
                        itemNames.push(getItemNameSafe(item.itemId));
                    });

                    const nextStateTen = {
                        nodeIdx: state.nodeIdx + resTen.useSeeds,
                        lastId: resTen.nextLastId,
                        currentNg: resTen.nextNg,
                        layerCounts: state.layerCounts.map((c, idx) => c + addLayer[idx]),
                        ubers: state.ubers + ubers,
                        legends: state.legends + legends,
                        path: state.path.concat({ type: 'ten', items: itemNames, addr: Nodes[state.nodeIdx - 1]?.address || '?' }),
                        rollCount: state.rollCount + 10,
                        tickets: t + 10
                    };

                    const keyTen = `${nextStateTen.nodeIdx}_${nextStateTen.lastId}_${nextStateTen.currentNg}_${nextStateTen.layerCounts.join('-')}`;
                    const existingTen = dp[t + 10].get(keyTen);
                    if (!existingTen || calculateScore(existingTen) < calculateScore(nextStateTen)) {
                        dp[t + 10].set(keyTen, nextStateTen);
                    }
                }
            }
        }
    }
    
    // 最終的に最もスコアの高い状態を見つける
    return findBestBeamSearchResult(dp, totalTickets, calculateScore);
}