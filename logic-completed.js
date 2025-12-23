/**
 * 担当: 「コンプ済み」ビューにおける全アイテムの出現順およびルート計算
 * 依存関係: logic-common.js (シード生成・レアリティ判定の利用)
 */

function calculateCompletedData(initialSeed, gacha, tableRows, thresholds, initialLastRollId, initialNg) {
    const maxSeedsNeeded = Math.max(tableRows * 10, 5000) + 1000;
    const SEED = generateSeedList(initialSeed, maxSeedsNeeded);
    const getAddress = (n) => getAddressStringGeneric(n, 2);
    const Nodes = [];
    const maxNodeIndex = Math.max(tableRows * 3, 3500);

    for (let i = 1; i <= maxNodeIndex; i++) {
        const node = {
            index: i,
            address: getAddress(i),
            seed1: SEED[i],
            seed2: SEED[i+1],
            seed3: SEED[i+2],
            singleRoll: null, singleUseSeeds: null, singleNextAddr: null,
            tenPullMark: null, tenPullUseSeeds: null, tenPullNextAddr: null,
            roll1: SEED[i] % 10000
        };
        const roll1 = node.seed1 % 10000;
        node.rarity = getRarityFromRoll(roll1, thresholds);
        node.rarityId = node.rarity.id;
        node.roll1 = roll1;

        const uberRate = gacha.uberGuaranteedFlag ? (gacha.rarityRates['3'] || 0) : 0;
        const legendRate = gacha.legendGuaranteedFlag ? (gacha.rarityRates['4'] || 0) : 0;
        const gDivisor = uberRate + legendRate;
        if (gDivisor > 0) {
            const gRoll = node.seed1 % gDivisor;
            node.rarityGId = (gRoll < uberRate) ? '3' : '4';
            node.rarityGName = (node.rarityGId === '3') ? '超激レア' : '伝説レア';
            node.gRoll = gRoll; node.gDivisor = gDivisor;
        } else {
            node.rarityGId = null;
            node.rarityGName = '-'; node.gRoll = 0; node.gDivisor = 0;
        }

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

        const poolG = node.rarityGId ? (gacha.rarityItems[node.rarityGId] || []) : [];
        node.poolGSize = poolG.length;
        if (poolG.length > 0) {
            node.slotG = node.seed2 % poolG.length;
            node.itemGId = poolG[node.slotG];
            node.itemGName = getItemNameSafe(node.itemGId);
        } else {
            node.slotG = 0;
            node.itemGId = -1; node.itemGName = '---';
        }

        const prevNode = (i > 2) ? Nodes[i - 3] : null;
        const isRare = (node.rarityId === 1);
        const prevItemId = prevNode ? (prevNode.reRollFlag ? prevNode.reRollItemId : prevNode.itemId) : initialLastRollId;
        
        node.reRollFlag = isRare && (pool.length > 1) && (node.itemId !== -1) && (node.itemId === prevItemId);
        node.useSeeds = node.reRollFlag ? 3 : 2;

        if (isRare && pool.length > 1) {
             const reRollPool = pool.filter(id => id !== node.itemId);
             if (reRollPool.length > 0) {
                 node.reRollSlot = node.seed3 % reRollPool.length;
                 node.reRollItemId = reRollPool[node.reRollSlot];
                 node.reRollItemName = getItemNameSafe(node.reRollItemId);
             } else {
                 node.reRollItemId = -1;
                 node.reRollItemName = '---';
             }
             const nextIdxRe = i + 3;
             node.reRollNextAddress = getAddress(nextIdxRe);
        } else {
             node.reRollItemId = -1;
             node.reRollItemName = '---';
             node.reRollNextAddress = '-';
        }
        Nodes.push(node);
    }

    let sIdx = 1;
    let sLastItemId = initialLastRollId || -1;
    let sRoll = 1;
    const ngVal = parseInt(initialNg, 10);
    const hasGuaranteed = !isNaN(ngVal);
    while (sIdx <= maxNodeIndex && sRoll <= tableRows) {
        const node = Nodes[sIdx - 1];
        const isGuaranteedRoll = hasGuaranteed && (gacha.uberGuaranteedFlag || gacha.legendGuaranteedFlag) && (sRoll >= ngVal) && ((sRoll - ngVal) % 10 === 0);
        if (isGuaranteedRoll) {
            if (node) {
                node.singleRoll = `${sRoll}g`;
                node.singleUseSeeds = 2;
                node.singleNextAddr = getAddress(sIdx + 2);
            }
            sLastItemId = node ? node.itemGId : -1;
            sIdx += 2;
        } else {
            const isRare = (node && node.rarityId === 1);
            const poolSize = gacha.rarityItems[1] ? gacha.rarityItems[1].length : 0;
            const isMatch = (node && node.itemId !== -1 && node.itemId === sLastItemId);
            const reRollFlag = isRare && isMatch && poolSize > 1;
            const useSeeds = reRollFlag ? 3 : 2;
            const finalId = (node && reRollFlag) ? node.reRollItemId : (node ? node.itemId : -1);
            if (node) {
                node.singleRoll = sRoll;
                node.singleUseSeeds = useSeeds;
                node.singleNextAddr = getAddress(sIdx + useSeeds);
            }
            sLastItemId = finalId;
            sIdx += useSeeds;
        }
        sRoll++;
    }

    let tIdx = 1;
    let tRoll = 1;
    let tLastItemId = initialLastRollId || -1; 
    while (tIdx <= maxNodeIndex && tRoll <= tableRows) {
        const isCycleStart = (tRoll - 1) % 10 === 0;
        const isGuaranteedRoll = hasGuaranteed && (gacha.uberGuaranteedFlag || gacha.legendGuaranteedFlag) && (tRoll >= ngVal) && ((tRoll - ngVal) % 10 === 0);
        if (isCycleStart) {
            const nodeG = Nodes[tIdx - 1];
            if(nodeG) { 
                nodeG.tenPullMark = 'r';
                nodeG.tenPullUseSeeds = 1; 
                nodeG.tenPullNextAddr = getAddress(tIdx + 1); 
            }
            tIdx++;
        }
        if (tIdx <= maxNodeIndex) {
            if (isGuaranteedRoll) {
                const gNode = Nodes[tIdx - 2];
                const nextNode = Nodes[tIdx - 1]; 
                if (gNode) tLastItemId = gNode.itemGId;
                if (nextNode) {
                    nextNode.tenPullMark = `↖${tRoll}g`;
                    nextNode.tenPullUseSeeds = 1; 
                    nextNode.tenPullNextAddr = getAddress(tIdx + 1); 
                }
                tIdx++;
            } else {
                const node = Nodes[tIdx - 1];
                const isRare = (node && node.rarityId === 1);
                const poolSize = gacha.rarityItems[1] ? gacha.rarityItems[1].length : 0;
                const isMatch = (node && node.itemId !== -1 && node.itemId === tLastItemId);
                const reRollFlag = isRare && isMatch && poolSize > 1;
                const useSeeds = reRollFlag ? 3 : 2;
                const finalId = (node && reRollFlag) ? node.reRollItemId : (node ? node.itemId : -1);
                if (node) {
                    node.tenPullMark = tRoll;
                    node.tenPullUseSeeds = useSeeds;
                    node.tenPullNextAddr = getAddress(tIdx + useSeeds);
                }
                tLastItemId = finalId;
                tIdx += useSeeds;
            }
        }
        tRoll++;
    }

    const highlightInfo = new Map();
    sIdx = 1;
    sLastItemId = initialLastRollId || -1;
    for (let roll = 1; roll <= tableRows; roll++) {
        if (sIdx > maxNodeIndex) break;
        const node = Nodes[sIdx - 1];
        const isGuaranteedRoll = hasGuaranteed && (gacha.uberGuaranteedFlag || gacha.legendGuaranteedFlag) && (roll >= ngVal) && ((roll - ngVal) % 10 === 0);
        if (isGuaranteedRoll) {
            const addressKey = node.address + 'G';
            const info = highlightInfo.get(addressKey) || {};
            info.single = true; info.singleRoll = roll; 
            highlightInfo.set(addressKey, info);
            sLastItemId = node.itemGId;
            sIdx += 2;
        } else {
            const isRare = (node.rarityId === 1);
            const poolSize = gacha.rarityItems[1] ? gacha.rarityItems[1].length : 0;
            const isMatch = (node && node.itemId !== -1 && node.itemId === sLastItemId);
            const reRollFlag = isRare && isMatch && poolSize > 1;
            const useSeeds = reRollFlag ? 3 : 2;
            const finalId = (node && reRollFlag) ? node.reRollItemId : (node ? node.itemId : -1);
            const info = highlightInfo.get(node.address) || {};
            info.single = true; info.singleRoll = roll; 
            info.s_reRoll = reRollFlag;
            if (reRollFlag) {
                info.s_normalName = node.itemName;
                info.s_reRollName = node.reRollItemName;
                info.s_nextAddr = getAddress(sIdx + useSeeds);
            }
            highlightInfo.set(node.address, info);
            sLastItemId = finalId;
            sIdx += useSeeds;
        }
    }
    
    tIdx = 1;
    tLastItemId = initialLastRollId || -1;
    for (let roll = 1; roll <= tableRows; roll++) {
        if (tIdx > maxNodeIndex) break;
        const isCycleStart = (roll - 1) % 10 === 0;
        if (isCycleStart) tIdx++;
        if (tIdx <= maxNodeIndex) {
            const node = Nodes[tIdx - 1];
            const isGuaranteedRoll = (gacha.uberGuaranteedFlag || gacha.legendGuaranteedFlag) && (roll >= ngVal) && ((roll - ngVal) % 10 === 0);
            if (isGuaranteedRoll) {
                const gNode = Nodes[tIdx - 2];
                if (gNode) {
                    const addressKey = gNode.address + 'G';
                    const info = highlightInfo.get(addressKey) || {};
                    info.ten = true; info.tenRoll = roll; 
                    highlightInfo.set(addressKey, info);
                    tLastItemId = gNode.itemGId;
                } 
                tIdx += 1;
            } else {
                const isRare = (node && node.rarityId === 1);
                const poolSize = gacha.rarityItems[1] ? gacha.rarityItems[1].length : 0;
                const isMatch = (node.itemId !== -1 && node.itemId === tLastItemId);
                const reRollFlag = isRare && isMatch && poolSize > 1;
                const useSeeds = reRollFlag ? 3 : 2;
                let finalId = node.itemId;
                if (reRollFlag) finalId = node.reRollItemId;
                const info = highlightInfo.get(node.address) || {};
                info.ten = true; info.tenRoll = roll; 
                info.t_reRoll = reRollFlag;
                if (reRollFlag) {
                    info.t_normalName = node.itemName;
                    info.t_reRollName = node.reRollItemName;
                    info.t_nextAddr = getAddress(tIdx + useSeeds);
                }
                highlightInfo.set(node.address, info);
                tLastItemId = finalId;
                tIdx += useSeeds;
            }
        }
    }
    return { Nodes, highlightInfo, maxNodeIndex };
}

/**
 * ビームサーチ（DP）による最適ガチャルートのシミュレーション
 */
function runGachaBeamSearch(Nodes, initialLastRollId, totalTickets, gacha, thresholds, initialNg, targetLayers = []) {
    const ngVal = parseInt(initialNg);
    const hasGuaranteed = !isNaN(ngVal);

    const simulateRoll = (node, lastId, rollNum) => {
        const isGuaranteed = hasGuaranteed && (gacha.uberGuaranteedFlag || gacha.legendGuaranteedFlag) && (rollNum >= ngVal) && ((rollNum - ngVal) % 10 === 0);
        if (isGuaranteed) {
            const finalId = node.itemGId;
            return { itemId: finalId, itemName: node.itemGName, useSeeds: 2, rarity: itemMaster[finalId]?.rarity || 0 };
        } else {
            const pool = gacha.rarityItems[node.rarityId] || [];
            const isMatch = (node.itemId !== -1 && node.itemId === lastId);
            const reRoll = (node.rarityId === 1) && (pool.length > 1) && isMatch;
            const finalId = reRoll ? node.reRollItemId : node.itemId;
            return { itemId: finalId, itemName: reRoll ? node.reRollItemName : node.itemName, useSeeds: reRoll ? 3 : 2, rarity: itemMaster[finalId]?.rarity || 0 };
        }
    };

    let dp = new Array(totalTickets + 1).fill(null).map(() => new Map());
    
    // 状態に各階層の獲得数を保持させる
    dp[0].set(`1_${initialLastRollId}`, {
        nodeIdx: 1, lastId: initialLastRollId, 
        layerCounts: new Array(targetLayers.length).fill(0),
        ubers: 0, legends: 0, path: [], rollCount: 1
    });

    const calculateScore = (state) => {
        let score = 0;
        // 階層ごとに巨大な重みを付ける (Layer 0 = 最高優先)
        for (let i = 0; i < state.layerCounts.length; i++) {
            const weight = Math.pow(1000, targetLayers.length - i + 1);
            score += state.layerCounts[i] * weight;
        }
        score += (state.ubers * 10) + state.legends;
        return score;
    };

    const updateDP = (map, state) => {
        const key = `${state.nodeIdx}_${state.lastId}`;
        const currentScore = calculateScore(state);
        const existing = map.get(key);
        if (!existing || calculateScore(existing) < currentScore) {
            map.set(key, state);
        }
    };

    for (let t = 0; t < totalTickets; t++) {
        for (let state of dp[t].values()) {
            const nodeS = Nodes[state.nodeIdx - 1];
            if (nodeS) {
                const res = simulateRoll(nodeS, state.lastId, state.rollCount);
                const newLayerCounts = [...state.layerCounts];
                targetLayers.forEach((layerIds, idx) => {
                    if (layerIds.includes(res.itemId)) newLayerCounts[idx]++;
                });

                updateDP(dp[t + 1], {
                    nodeIdx: state.nodeIdx + res.useSeeds,
                    lastId: res.itemId,
                    layerCounts: newLayerCounts,
                    ubers: state.ubers + (res.rarity === 3 ? 1 : 0),
                    legends: state.legends + (res.rarity === 4 ? 1 : 0),
                    path: state.path.concat({ type: 'single', item: res.itemName, addr: nodeS.address }),
                    rollCount: state.rollCount + 1
                });
            }

            if (t + 10 <= totalTickets) {
                let curIdx = state.nodeIdx + 1;
                let curLastId = state.lastId;
                let curRollCount = state.rollCount;
                let items = [], ubers = 0, legends = 0;
                let addLayerCounts = new Array(targetLayers.length).fill(0);
                let startAddr = Nodes[state.nodeIdx - 1]?.address || '??';

                for (let i = 0; i < 10; i++) {
                    const node = Nodes[curIdx - 1];
                    if (!node) break;
                    const res = simulateRoll(node, curLastId, curRollCount);
                    items.push(res.itemName);
                    targetLayers.forEach((layerIds, idx) => {
                        if (layerIds.includes(res.itemId)) addLayerCounts[idx]++;
                    });
                    if (res.rarity === 3) ubers++;
                    if (res.rarity === 4) legends++;
                    curIdx += res.useSeeds;
                    curLastId = res.itemId;
                    curRollCount++;
                }

                if (items.length === 10) {
                    const nextLayerCounts = state.layerCounts.map((c, idx) => c + addLayerCounts[idx]);
                    updateDP(dp[t + 10], {
                        nodeIdx: curIdx, lastId: curLastId, 
                        layerCounts: nextLayerCounts,
                        ubers: state.ubers + ubers, 
                        legends: state.legends + legends, 
                        path: state.path.concat({ type: 'ten', items: items, addr: startAddr }), 
                        rollCount: curRollCount
                    });
                }
            }
        }
    }

    let best = null;
    let maxScore = -1;
    for (let state of dp[totalTickets].values()) {
        const score = calculateScore(state);
        if (score > maxScore) {
            maxScore = score;
            best = state;
        }
    }
    return best;
}