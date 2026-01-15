/**
 * 担当: ポップアップ（計算詳細）内の表示HTML生成
 * 仕様: テーブルの番地に基づいた静的な計算過程を表示
 */

function generateGachaInfoHeaderHtml(thresholds, gacha, isGuaranteedColumn) {
    const names = ["ノーマル", "レア", "激レア", "超激レア", "伝説レア"];
    let html = '<h4>ガチャ情報</h4><p style="font-size: 0.8rem; background: #eee; padding: 5px;">';
    if (isGuaranteedColumn && (gacha.uberGuaranteedFlag || gacha.legendGuaranteedFlag)) {
        let p = [];
        if (gacha.uberGuaranteedFlag) p.push(names[3]);
        if (gacha.legendGuaranteedFlag) p.push(names[4]);
        html += "確定枠対象: " + p.join(' / ');
    } else {
        Object.keys(thresholds).forEach(id => {
            html += `${names[id]}: ${thresholds[id]}${id < 4 ? ' / ' : ''}`;
        });
    }
    return html + '</p>';
}

/**
 * SEED情報表示の生成
 * 修正: 直前SEEDを削除し、ラベルを「最終SEED」に変更
 */
function generateSeedInfoHtml(node, isGuaranteedColumn, linkSeeds) {
    let html = `<h3>${node.address}${isGuaranteedColumn ? 'G' : ''} の詳細計算</h3><h4>SEED情報</h4><ul>`;
    html += `<li>対象SEED (S1): Index[${node.index}] : ${node.seed1}</li>`;
    
    const cmp = (calc, link, label, idx) => {
        if (!link) return `<li>${label}: 該当なし</li>`;
        const match = (calc.toString() === link.toString());
        const s = match ? '<span style="color:green;">(一致)</span>' : `<span style="color:red;">⚠️不一致: ${link}</span>`;
        return `<li>${label}: Index[${idx}] : ${calc} ${s}</li>`;
    };

    if (isGuaranteedColumn) {
        html += cmp(node.seed2, linkSeeds.avoid, "最終SEED(通常)", node.index + 1);
        html += cmp(node.seed3, linkSeeds.reroll, "最終SEED(再抽選)", node.index + 2);
    } else {
        html += cmp(node.seed2, linkSeeds.normal, "最終SEED(通常)", node.index + 1);
        html += cmp(node.seed3, linkSeeds.reroll, "最終SEED(再抽選)", node.index + 2);
    }
    return html + '</ul>';
}

function generateNodeCalculationDetailsHtml(node, gacha, thresholds, initialLastRollId, Nodes, linkSeeds, isGuar) {
    const names = ["ノーマル", "レア", "激レア", "超激レア", "伝説レア"];
    let html = '<div class="popup-details">';
    
    html += generateGachaInfoHeaderHtml(thresholds, gacha, isGuar);
    html += generateSeedInfoHtml(node, isGuar, linkSeeds);
    if (isGuar) {
        // AG/BG列（確定枠）の静的計算
        const uRate = gacha.uberGuaranteedFlag ?
            (gacha.rarityRates['3'] || 500) : 0;
        const lRate = gacha.legendGuaranteedFlag ? (gacha.rarityRates['4'] || 200) : 0;
        const gDiv = uRate + lRate;

        html += '<h4>確定枠計算 (通常)</h4>';
        if (gDiv > 0) {
            const gRoll = node.seed1 % gDiv;
            const rId = (gRoll < uRate) ? '3' : '4';
            const pool = (gacha.rarityItems[rId] || []);
            const slot = node.seed2 % Math.max(1, pool.length);
            
            html += `<p>Rarity: Seed[${node.index}] ${node.seed1} % ${gDiv} = ${gRoll} → ${names[rId]}</p>`;
            html += `<p>Slot: Seed[${node.index+1}] ${node.seed2} % ${pool.length} = ${slot} → ${getItemNameSafe(pool[slot])}</p>`;
        }

        if (node.reRollFlag || node.reRerollFlag) {
            html += '<h4>確定枠計算 (再抽選経由)</h4>';
            if (gDiv > 0) {
                const gRoll_RR = node.seed2 % gDiv;
                const rId_RR = (gRoll_RR < uRate) ? '3' : '4';
                const pool_RR = (gacha.rarityItems[rId_RR] || []);
                const slot_RR = node.seed3 % Math.max(1, pool_RR.length);
                
                html += `<p>Rarity: Seed[${node.index+1}] ${node.seed2} % ${gDiv} = ${gRoll_RR} → ${names[rId_RR]}</p>`;
                html += `<p>Slot: Seed[${node.index+2}] ${node.seed3} % ${pool_RR.length} = ${slot_RR} → ${getItemNameSafe(pool_RR[slot_RR])}</p>`;
            }
        }
    } else {
        // A/B列（通常枠）の静制計算
        html += '<h4>通常計算</h4>';
        html += `<p>Rarity: Seed[${node.index}] ${node.seed1} % 10000 = ${node.roll1} → ${names[node.rarityId]}</p>`;
        html += `<p>Slot: Seed[${node.index+1}] ${node.seed2} % ${node.poolSize} = ${node.slot} → ${node.itemName}</p>`;

        const prevN2 = (node.index >= 3) ?
            Nodes[node.index - 3] : null;
        const prevId2 = prevN2 ? prevN2.itemId : (initialLastRollId || -1);
        const match = (node.itemId !== -1 && node.itemId === prevId2);
        
        html += '<h4>被り判定</h4>';
        html += `<div style="font-size:0.8rem; border:1px solid #ddd; padding:8px; background:#fafafa;">`;
        html += `直前アイテム: ${getItemNameSafe(prevId2)}<br>`;
        html += `一致判定: <b>${match ? '一致' : '不一致'}</b><br>`;
        html += `再抽選実行: <b>${node.reRollFlag ? '実行' : 'なし'}</b>`;
        html += `</div>`;
        if (node.reRollFlag || node.reRerollFlag) {
            html += '<h4>再抽選詳細</h4>';
            html += `<p>Slot: Seed[${node.index+2}] ${node.seed3} % ${node.poolSize-1} = ${node.reRollSlot} → ${node.reRollItemName}</p>`;
        }
    }
    return html + '</div>';
}