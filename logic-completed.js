/**
 * 担当: 「コンプ済み」ビューにおけるデータ計算（各ノードの生成とルートハイライト判定）
 * 依存関係: master.js, utils.js
 */

/**
 * 初期シードから指定行数分の計算データを生成し、ルートハイライト情報を返す
 */
function calculateCompletedData(initialSeed, gacha, tableRows, thresholds, initialLastRollId, initialNg) {
    const maxNodeIndex = tableRows * 2 + 100; // 余裕を持って生成
    const SEED_LIST = generateSeedList(initialSeed, maxNodeIndex * 5 + 100);
    const gCycle = gacha.guaranteedCycle || 30;

    // --- 1. 全ノードの基本計算 (Step 1) ---
    const Nodes = [];
    for (let i = 1; i <= maxNodeIndex; i++) {
        const seed1 = SEED_LIST[i - 1]; // Seed[n]
        const seed2 = SEED_LIST[i];     // Seed[n+1]
        const seed3 = SEED_LIST[i + 1]; // Seed[n+2]
        const seed4 = SEED_LIST[i + 2]; // Seed[n+3]

        // 通常枠の計算 (Step 1-1)
        const roll1 = seed1 % 10000;
        let rid = 0;
        if (roll1 < thresholds['0']) rid = 0;
        else if (roll1 < thresholds['1']) rid = 1;
        else if (roll1 < thresholds['2']) rid = 2;
        else if (roll1 < thresholds['3']) rid = 3;
        else rid = 4;

        const pool = gacha.rarityItems[rid] || [];
        const poolSize = pool.length;
        const slot = poolSize > 0 ? seed2 % poolSize : 0;
        const itemId = poolSize > 0 ? pool[slot] : -1;

        // 確定枠の基本計算 (Step 1-2): AG/BG列用
        // 超激レア(3)と伝説レア(4)のみを対象とする
        const uFlag = gacha.uberGuaranteedFlag, lFlag = gacha.legendGuaranteedFlag;
        const uRate = uFlag ? (gacha.rarityRates['3'] || 500) : 0, lRate = lFlag ? (gacha.rarityRates['4'] || 200) : 0;
        const totalG = uRate + lRate;
        
        let ridG = -1, itemIdG = -1, slotG = 0, poolGSize = 0;
        if (totalG > 0) {
            // Seed[n] を用いて 3 or 4 を決定
            const resG = seed1 % totalG;
            ridG = (resG < uRate) ? 3 : 4;
            const poolG = gacha.rarityItems[ridG] || [];
            poolGSize = poolG.length;
            // スロット計算も Seed[n] を使用（Step1(2)のロジック）
            slotG = poolGSize > 0 ? seed1 % poolGSize : 0;
            itemIdG = poolGSize > 0 ? poolG[slotG] : -1;
        }

        Nodes.push({
            index: i,
            address: getAddressStringGeneric(i, 2),
            seed1, seed2, seed3, seed4,
            roll1, rarityId: rid, rarity: { name: ["ノーマル", "レア", "激レア", "超激レア", "伝説レア"][rid] },
            slot, poolSize, itemId, itemName: getItemNameSafe(itemId),
            rarityGId: ridG, rarityGName: ridG === 3 ? "超激レア" : (ridG === 4 ? "伝説レア" : "-"),
            itemGId: itemIdG, itemGName: getItemNameSafe(itemIdG), slotG, poolGSize, gDivisor: totalG, gRoll: seed1 % totalG,
            reRollFlag: false, reRerollFlag: false, 
            reRollItemId: -1, reRollItemName: "", reRollSlot: 0
        });
    }

    // --- 2. ルートハイライト判定 (単発・10連) ---
    const highlightInfo = new Map();

    const addHighlight = (addr, type, flags = {}) => {
        if (!highlightInfo.has(addr)) {
            highlightInfo.set(addr, { single: false, ten: false, s_reRoll: false, t_reRoll: false });
        }
        const info = highlightInfo.get(addr);
        if (type === 'single') {
            info.single = true;
            if (flags.reRoll) info.s_reRoll = true;
        }
        if (type === 'ten') {
            info.ten = true;
            if (flags.reRoll) info.t_reRoll = true;
        }
    };

    const calculateRerollItem = (node) => {
        const pool = gacha.rarityItems[node.rarityId] || [];
        const filtered = pool.filter(id => id !== node.itemId);
        if (filtered.length > 0) {
            const poolDiv = Math.max(1, filtered.length);
            const slot = node.seed3 % poolDiv;
            const rrId = filtered[slot];
            return { id: rrId, name: getItemNameSafe(rrId), slot: slot };
        }
        return { id: -1, name: "---", slot: 0 };
    };

    // 2-A. 単発ルートシミュレーション
    let sIdx = 1, sRoll = 1, sNgTracker = initialNg;
    let sLastItemName = getItemNameSafe(initialLastRollId);
    let sPrevRerollName = "---";

    while (sIdx <= maxNodeIndex && sRoll <= tableRows) {
        const node = Nodes[sIdx - 1];
        if (!node) break;
        
        const isGuar = !isNaN(initialNg) && initialNg > 0 && 
                       (gacha.uberGuaranteedFlag || gacha.legendGuaranteedFlag) && 
                       (sRoll >= initialNg) && ((sRoll - initialNg) % 10 === 0);

        if (isGuar) {
            // 【確定枠ハイライト】 (n-2)ロジック
            const targetAddr = getAddressStringGeneric(sIdx - 1, 2) + 'G';
            addHighlight(targetAddr, 'single');
            
            sLastItemName = node.itemGName;
            sPrevRerollName = "---";
            sIdx += 2;
            sNgTracker = gCycle;
        } else {
            addHighlight(node.address, 'single');
            
            const isMatchStep2 = (node.itemName === sLastItemName);
            const isMatchStep3 = (sPrevRerollName !== "---" && node.itemName === sPrevRerollName);
            const isRR = (node.rarityId === 1 && node.poolSize > 1 && (isMatchStep2 || isMatchStep3));
            
            if (isRR) {
                const rrResult = calculateRerollItem(node);
                node.reRollFlag = true;
                node.reRollItemId = rrResult.id;
                node.reRollItemName = rrResult.name;
                node.reRollSlot = rrResult.slot;
                
                addHighlight(node.address, 'single', { reRoll: true });
                sLastItemName = rrResult.name;
                sPrevRerollName = rrResult.name;
                sIdx += 3;
            } else {
                sLastItemName = node.itemName;
                sPrevRerollName = "---";
                sIdx += 2;
            }
            sNgTracker = (sNgTracker <= 1) ? gCycle : sNgTracker - 1;
        }
        sRoll++;
    }

    // 2-B. 10連ルートシミュレーション
    let tIdx = 1, tRoll = 1, tNgTracker = initialNg;
    let tLastItemName = getItemNameSafe(initialLastRollId);
    let tPrevRerollName = "---";

    while (tIdx <= maxNodeIndex && tRoll <= tableRows) {
        const nodeInit = Nodes[tIdx - 1];
        if (!nodeInit) break;
        tIdx++; 

        for (let j = 0; j < 10; j++) {
            if (tRoll > tableRows || tIdx > maxNodeIndex) break;
            const node = Nodes[tIdx - 1];
            const isGuar = !isNaN(initialNg) && initialNg > 0 && 
                           (gacha.uberGuaranteedFlag || gacha.legendGuaranteedFlag) && 
                           (tRoll >= initialNg) && ((tRoll - initialNg) % 10 === 0);

            if (isGuar) {
                // 【確定枠ハイライト】 n-2ロジック
                const targetAddr = getAddressStringGeneric(tIdx - 2, 2) + 'G';
                addHighlight(targetAddr, 'ten');
                
                // アイテム特定（サイクル開始時のレアリティプールを使用）
                const poolG = gacha.rarityItems[nodeInit.rarityGId] || [];
                const slotG = node.seed1 % Math.max(1, poolG.length);
                tLastItemName = getItemNameSafe(poolG[slotG]);
                tPrevRerollName = "---";
                tIdx += 1;
                tNgTracker = gCycle;
            } else {
                addHighlight(node.address, 'ten');
                
                const isMatchStep2 = (node.itemName === tLastItemName);
                const isMatchStep3 = (tPrevRerollName !== "---" && node.itemName === tPrevRerollName);
                const isRR = (node.rarityId === 1 && node.poolSize > 1 && (isMatchStep2 || isMatchStep3));

                if (isRR) {
                    const rrResult = calculateRerollItem(node);
                    node.reRollFlag = true;
                    node.reRollItemId = rrResult.id;
                    node.reRollItemName = rrResult.name;
                    node.reRollSlot = rrResult.slot;

                    addHighlight(node.address, 'ten', { reRoll: true });
                    tLastItemName = rrResult.name;
                    tPrevRerollName = rrResult.name;
                    tIdx += 3;
                } else {
                    tLastItemName = node.itemName;
                    tPrevRerollName = "---";
                    tIdx += 2;
                }
                tNgTracker = (tNgTracker <= 1) ? gCycle : tNgTracker - 1;
            }
            tRoll++;
        }
    }

    return { Nodes, highlightInfo, maxNodeIndex };
}