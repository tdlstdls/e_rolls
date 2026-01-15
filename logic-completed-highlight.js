/**
 * 担当: ハイライトマップ（単発ルート・10連ルートの経路情報）の生成
 * 10連ガチャの特殊仕様（シード消費順序、確定枠の判定位置、トラック遷移）に対応
 */

function generateHighlightMap(Nodes, tableRows, initialNg, initialLastRollId, gCycle, gacha) {
    const map = new Map();
    const uFlag = gacha.uberGuaranteedFlag;
    const lFlag = gacha.legendGuaranteedFlag;
    const uRate = uFlag ? (gacha.rarityRates['3'] || 500) : 0;
    const lRate = lFlag ? (gacha.rarityRates['4'] || 200) : 0;
    const gDiv = uRate + lRate;
    const getAddr = (n) => getAddressStringGeneric(n, 2);

    // --- 1. 単発ルートのハイライト ---
    let sIdx = 1;
    let sLastId = initialLastRollId;
    let sNgTracker = parseInt(initialNg, 10);
    if (isNaN(sNgTracker)) sNgTracker = 0;

    for (let roll = 1; roll <= tableRows && sIdx <= Nodes.length; roll++) {
        const node = Nodes[sIdx - 1];
        if (!node) break;
        
        const isG = (sNgTracker === 1) && (uFlag || lFlag);
        let addr;

        if (isG) {
            addr = node.address + 'G';
            const existing = map.get(addr) || {};
            map.set(addr, { ...existing, single: true, singleRoll: roll });
            
            sIdx += 2;
            sNgTracker = gCycle;
            sLastId = node.itemGId;
        } else {
            addr = node.address;
            const isMatch = (node.itemId !== -1 && node.itemId === sLastId);
            const isRR = (node.rarityId === 1 && node.poolSize > 1 && isMatch) || node.reRerollFlag;
            
            const existing = map.get(addr) || {};
            map.set(addr, { ...existing, single: true, singleRoll: roll });
            
            sLastId = isRR ? node.reRollItemId : node.itemId;
            sIdx += isRR ? 3 : 2;
            
            if (sNgTracker > 1) sNgTracker--;
            else if (sNgTracker === 1) sNgTracker = gCycle;
        }
    }

    // --- 2. 10連ルートのハイライト ---
    let tIdx = 1;
    let tLastId = initialLastRollId;
    let tNgTracker = parseInt(initialNg, 10);
    if (isNaN(tNgTracker)) tNgTracker = 0;
    let tRollNum = 1;

    while (tIdx <= Nodes.length && tRollNum <= tableRows) {
        const cycleStartIdx = tIdx;
        let gRollInCycle = -1;

        if (tNgTracker > 0 && tNgTracker <= 10) {
            gRollInCycle = tNgTracker - 1;
        }
        
        let ptr = cycleStartIdx;

        // 確定枠がある場合、サイクル先頭の1SEEDをレアリティ判定に消費 (Seed[1])
        if (gRollInCycle !== -1 && gDiv > 0) {
            ptr++;
        }

        // 10連開始時のトラックを判定
        let currentTrack = getAddr(ptr).includes('A') ? 'A' : 'B';

        for (let j = 0; j < 10; j++) {
            const currentRollCount = tRollNum + j;
            if (currentRollCount > tableRows || ptr > Nodes.length) break;
            
            if (j === gRollInCycle) {
                // 確定枠の処理 (例: Seed[9])
                // 仕様: 確定枠は「スロット判定」に使用しているセル（現在のptr）をハイライト
                // ただし、トラックは確定枠直前のロールの反対側に配置される（住所計算）
                const node = Nodes[ptr - 1];
                const oppositeTrack = (currentTrack === 'A' ? 'B' : 'A');
                const addr = node.address.replace(/[AB]/, oppositeTrack) + 'G';
                
                const existing = map.get(addr) || {};
                map.set(addr, { 
                    ...existing, 
                    ten: true, 
                    tenRoll: currentRollCount,
                    tenIndex: ptr
                });

                ptr += 1; // 確定枠はスロット判定で1消費
                tNgTracker = gCycle;
                // 確定枠通過後、トラックを正式に反転
                currentTrack = oppositeTrack;
            } else {
                // 通常枠の処理
                // 仕様: レアリティ判定に使用しているセル（現在のptr）をハイライト
                const node = Nodes[ptr - 1];
                const addr = node.address.replace(/[AB]/, currentTrack);
                
                const isMatch = (node.itemId !== -1 && node.itemId === tLastId);
                const isRR = (node.rarityId === 1 && node.poolSize > 1 && isMatch) || node.reRerollFlag;
                
                const existing = map.get(addr) || {};
                map.set(addr, { 
                    ...existing, 
                    ten: true, 
                    tenRoll: currentRollCount,
                    t_reRoll: isRR,
                    tenIndex: ptr
                });

                tLastId = isRR ? node.reRollItemId : node.itemId;
                ptr += isRR ? 3 : 2;
                if (tNgTracker > 1) tNgTracker--;
            }
        }
        tIdx = ptr;
        tRollNum += 10;
    }

    return map;
}