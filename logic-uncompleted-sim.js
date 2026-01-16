/**
 * 担当: 「未コンプ」ビュー用の10連ガチャシミュレーションおよび期待値計算ロジック
 * 依存関係: logic-common.js, utils.js
 */

// =================================================================================
// 1. 通常枠の計算パーツ
// =================================================================================

/**
 * 通常枠（レアリティ判定、スロット、被り再抽選）の計算を行う
 */
function calculateNormalRollResult(fullSeedArray, currentIndex, thresholds, lastItemId) {
    const sRarity = fullSeedArray[currentIndex];
    const sSlot = fullSeedArray[currentIndex + 1];
    
    if (sRarity === undefined || sSlot === undefined) return null;
    const rarityInfo = getRarityFromRoll(sRarity % 10000, thresholds);
    const pool = gachaMaster[window.activeGachaId]?.rarityItems[rarityInfo.id] || [];
    const poolSize = pool.length > 0 ? pool.length : 1;
    const itemId = (pool[sSlot % poolSize] !== undefined) ? pool[sSlot % poolSize] : -1;
    const itemName = getItemNameSafe(itemId);

    let finalId = itemId;
    let finalName = itemName;
    let consumed = 2;
    let isReroll = false;
    let preRerollName = null;
    let logStr = `S${currentIndex + 1}→${rarityInfo.name}, S${currentIndex + 2}→${itemName}`;

    // レア(ID:1)の被り再抽選判定
    // 通常判定(一致)に加え、強制再抽選モード (window.forceRerollMode) が有効ならレアは全て再抽選
    const isDupe = (itemId !== -1 && itemId === lastItemId);
    if (rarityInfo.id === 1 && (isDupe || window.forceRerollMode) && pool.length > 1) {
        const sReRoll = fullSeedArray[currentIndex + 2];
        if (sReRoll !== undefined) {
            const rePool = pool.filter(id => id !== itemId);
            if (rePool.length > 0) {
                isReroll = true;
                preRerollName = itemName;
                finalId = rePool[sReRoll % rePool.length];
                finalName = getItemNameSafe(finalId);
                logStr += ` [Reroll], S${currentIndex + 3}→${finalName}`;
                consumed = 3;
            }
        }
    }
    return { finalId, finalName, consumed, isReroll, preRerollName, logStr };
}

// =================================================================================
// 2. 10連シミュレーション
// =================================================================================

/**
 * 10連スロット用シード(S1~S10)による目玉判定を事前に行う
 * 線形NG管理に基づき、確定ロール(NG=1)の位置では判定をスキップする
 */
function getFeaturedSeedResults(fullSeedArray, gacha, ngVal, isGuaranteedActive) {
    const featuredResults = [];
    const featuredLog = [];
    const gCycle = gacha.guaranteedCycle || 10;
    let featuredSeedPtr = 0;
    let internalNg = ngVal;

    for (let i = 1; i <= 10; i++) {
        // ロール開始時の判定
        const isGuaranteedRoll = isGuaranteedActive && internalNg === 1;
        
        if (isGuaranteedRoll) {
            featuredLog.push(`S${featuredSeedPtr + 1} (Skipped): Guaranteed Roll (NG=1)`);
            featuredResults.push({ index: i, isFeatured: false, isGuaranteed: true, seedIndex: null });
        } else {
            const sVal = fullSeedArray[featuredSeedPtr];
            if (sVal === undefined) break;

            const isFeatured = (sVal % 10000) < gacha.featuredItemRate;
            featuredResults.push({ index: i, isFeatured, isGuaranteed: false, seedIndex: featuredSeedPtr + 1 });
            featuredLog.push(`S${featuredSeedPtr + 1} (${sVal}) % 10000 = ${sVal % 10000} < ${gacha.featuredItemRate} → ${isFeatured}`);
            featuredSeedPtr++;
        }

        // 1ロールごとにNGをデクリメント
        if (isGuaranteedActive) {
            internalNg--;
            if (internalNg <= 0) internalNg = gCycle;
        }
    }
    return { featuredResults, featuredLog, featuredSeedPtr };
}

/**
 * 10連ガチャ1回分の計算を行う
 */
function calculateTenPullDetailedLogic(fullSeedArray, gacha, thresholds, ngVal, initialLastRollId, getAddressFunc) {
    const isGuaranteedActive = !isNaN(ngVal) && ngVal !== 'none';
    const gCycle = gacha.guaranteedCycle || 10;
    const { featuredResults, featuredLog, featuredSeedPtr } = getFeaturedSeedResults(fullSeedArray, gacha, ngVal, isGuaranteedActive);
    
    let currentSeedIndex = featuredSeedPtr;
    let lastItemId = initialLastRollId || -1;
    let featuredCountInCycle = 0;
    let currentNg = ngVal;
    
    const results = [];
    const processLog = [];

    for (let r = 1; r <= 10; r++) {
        const fRes = featuredResults[r - 1];
        if (!fRes) break;

        let label = `Roll${r}`;
        if (isGuaranteedActive) label += ` (NG:${currentNg})`;

        if (fRes.isGuaranteed) {
            label += `[G]`;
            results.push({ label, name: '目玉(確定)', isGuaranteed: true, isFeatured: false, isReroll: false, preRerollName: null });
            processLog.push(`${label}: Featured by guaranteed (NG was 1)`);
            lastItemId = -2;
            featuredCountInCycle++;
        } else if (fRes.isFeatured) {
            results.push({ label, name: '目玉', isGuaranteed: false, isFeatured: true, isReroll: false, preRerollName: null });
            processLog.push(`${label}: Featured (by S${fRes.seedIndex})`);
            lastItemId = -2;
            featuredCountInCycle++;
        } else {
            const roll = calculateNormalRollResult(fullSeedArray, currentSeedIndex, thresholds, lastItemId);
            if (!roll) break;
            processLog.push(`${label}: ${roll.logStr}`);
            results.push({ label, name: roll.finalName, isGuaranteed: false, isFeatured: false, isReroll: roll.isReroll, preRerollName: roll.preRerollName });
            currentSeedIndex += roll.consumed;
            lastItemId = roll.finalId;
        }

        // 1ロールごとにNGを更新
        if (isGuaranteedActive) {
            currentNg--;
            if (currentNg <= 0) currentNg = gCycle;
        }
    }

    return {
        guaranteedStatus: isGuaranteedActive ? `next NG: ${currentNg}` : 'none',
        featuredLog, processLog, results, featuredCountInCycle,
        transition: { 
            consumedCount: currentSeedIndex, 
            nextIndex: currentSeedIndex + 1, 
            nextAddress: getAddressFunc(currentSeedIndex + 1), 
            nextSeed: fullSeedArray[currentSeedIndex], 
            lastItemId, 
            nextNgVal: currentNg 
        }
    };
}

// =================================================================================
// 3. 複数サイクル・期待値計算
// =================================================================================

/**
 * nサイクル分の10連計算を実行
 */
function calculateTenPullsOverCycles(initialFullSeedArray, gacha, thresholds, initialNgVal, initialLastRollId, nCycles = 10) {
    const getAddress = (n) => getAddressStringGeneric(n, 3);
    const gCycle = gacha.guaranteedCycle || 10;
    let currentSeedArray = [...initialFullSeedArray];
    let currentLastRollId = initialLastRollId;
    let currentNgVal = (initialNgVal === 'none' || isNaN(initialNgVal)) ? 'none' : parseInt(initialNgVal, 10);
    const cycleResults = [];

    for (let c = 1; c <= nCycles; c++) {
        if (currentSeedArray.length < 1) break;
        const res = calculateTenPullDetailedLogic(currentSeedArray.slice(0, 50), gacha, thresholds, currentNgVal, currentLastRollId, getAddress);
        cycleResults.push({ cycle: c, ...res, startNgVal: currentNgVal, startLastRollId: currentLastRollId });
        
        currentSeedArray = currentSeedArray.slice(res.transition.consumedCount);
        currentLastRollId = res.transition.lastItemId;
        currentNgVal = res.transition.nextNgVal;
    }
    return cycleResults;
}

/**
 * 単発Nロール後の内部状態（シード位置、NG値、直前ID）を算出
 */
function simulateSingleRollsAndGetState(n, seedArray, initialNg, initialLastRoll, gacha, thresholds) {
    const gCycle = gacha.guaranteedCycle || 10;
    let currentSeedIndex = 0;
    let currentNg = (!isNaN(initialNg) && initialNg !== 'none' && initialNg > 0) ? parseInt(initialNg, 10) : gCycle;
    let lastItemId = initialLastRoll || -1;

    for (let r = 1; r <= n; r++) {
        if (currentSeedIndex >= seedArray.length) break;
        
        const isFeatured = (seedArray[currentSeedIndex] % 10000) < gacha.featuredItemRate;
        const isGuaranteedRoll = (currentNg === 1);

        if (isGuaranteedRoll) {
            // 確定枠の場合、シード消費なし（通常枠を引かないため。ただし仕様によりスロット消費がある場合はここを調整）
            // 実際は目玉(確定)になる
            lastItemId = -2;
            // 確定ロール時はシードを消費しない仕様（確定枠が通常枠と排他の場合）
        } else if (isFeatured) {
            currentSeedIndex += 1;
            lastItemId = -2;
        } else {
            const roll = calculateNormalRollResult(seedArray, currentSeedIndex, thresholds, lastItemId);
            if (!roll) break;
            currentSeedIndex += roll.consumed;
            lastItemId = roll.finalId;
        }

        // NGを線形デクリメント
        currentNg--;
        if (currentNg <= 0) currentNg = gCycle;
    }
    return { nextSeedIndex: currentSeedIndex, nextNg: currentNg, nextLastRollId: lastItemId };
}

/**
 * 期待値の計算
 */
function calculateExpectedFeaturedCounts(initialFullSeedArray, gacha, thresholds, nRollsArray, initialNgVal, initialLastRollId) {
    const results = {};
    for (const n of nRollsArray) {
        if (n < 0) continue;
        const state = simulateSingleRollsAndGetState(n, initialFullSeedArray, initialNgVal, initialLastRollId, gacha, thresholds);
        const tenPullSeed = initialFullSeedArray.slice(state.nextSeedIndex, state.nextSeedIndex + 50);
        if (tenPullSeed.length < 10) { results[n] = 0; continue; }
        
        const sim = calculateTenPullDetailedLogic(tenPullSeed, gacha, thresholds, state.nextNg, state.nextLastRollId, (addr) => `S${state.nextSeedIndex + addr}`);
        results[n] = sim.featuredCountInCycle;
    }
    return results;
}
