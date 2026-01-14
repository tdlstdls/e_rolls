/**
 * 担当: URLクエリ生成、乱数生成、共有の表示補助等の汎用ユーティリティ関数
 * 依存関係: master.js (itemMaster/gachaMasterの参照)
 */

// --- ユーティリティ関数 ---

/**
 * URLSearchParamsオブジェクトからクエリ文字列を生成する
 */
function generateUrlQuery(p) {
    const query = new URLSearchParams();
    for (const key in p) {
        if (p[key] !== null && p[key] !== undefined) {
            query.set(key, p[key]);
        }
    }
    return '?' + query.toString();
}

/**
 * 32bit Xorshiftによる乱数生成（次シード算出）
 */
function xorshift32(seed) {
    let x = seed;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 15;
    return x >>> 0;
}

/**
 * マスターデータのpool情報をレアリティ別に分類する初期化処理
 * 修正内容: IDによるソートを削除し、定義順（マスターの並び順）を維持します。
 */
function setupGachaRarityItems() {
    for (const gachaId in gachaMaster) {
        const gacha = gachaMaster[gachaId];
        if (gacha && gacha.pool) {
            // 各レアリティのコンテナを初期化
            gacha.rarityItems = { '0': [], '1': [], '2': [], '3': [], '4': [] };
            
            // pool配列に出現する順番で各レアリティに振り分ける
            for (const itemId of gacha.pool) {
                const item = itemMaster[itemId];
                if (item && gacha.rarityItems[item.rarity.toString()] !== undefined) {
                    gacha.rarityItems[item.rarity.toString()].push(itemId);
                }
            }
            
            // 重要: ここでの .sort() を削除しました。
            // これにより、gachaMaster[id].pool の定義順がスロット順になります。
        }
    }
}

/**
 * デバッグ用：マスター情報のHTMLを生成
 */
function generateMasterInfoHtml(gacha) {
    let html = `<h2>＜マスター情報＞</h2>`;
    html += `(ガチャ) ${gacha.name}(ID:${window.activeGachaId || '?'})<br>`;
    html += `(目玉) ${gacha.featuredItemRate > 0}(レート:${gacha.featuredItemRate}, 初期残数:${gacha.featuredItemStock})<br>`;
    html += `(確定) 超激:${gacha.uberGuaranteedFlag}, 伝説:${gacha.legendGuaranteedFlag}<br>`;
    
    const r = gacha.rarityRates;
    const r0 = r['0'];
    const t1 = r0;
    const t2 = r0 + r['1'];
    const t3 = t2 + r['2'];
    const t4 = t3 + r['3'];
    
    let rateStr = `(レート) `;
    if (r0 === 0) rateStr += `0(ノーマル)-, `;
    else rateStr += `0(ノーマル)～${t1-1}, `;
    rateStr += `1(レア)～${t2-1}, `;
    rateStr += `2(激レア)～${t3-1}, `;
    rateStr += `3(超激レア)～${t4-1}, `;
    rateStr += `4(伝説レア)～9999`;
    html += rateStr + `<br>`;
    
    html += `(各レアリティ別アイテム ※スロット順)<br>`;
    const rarities = ['0.ノーマル', '1.レア', '2.激レア', '3.超激レア', '4.伝説レア'];
    for (let i = 0; i <= 4; i++) {
        const pool = gacha.rarityItems[i.toString()];
        if (pool && pool.length > 0) {
            const itemsStr = pool.map(id => `${itemMaster[id].name}(ID:${id})`).join(', ');
            html += `${rarities[i]}(${pool.length}種) ${itemsStr}<br>`;
        }
    }
    return html + '<br>';
}

/**
 * アイテム比較情報の整形（コンプ済み表示用）
 */
function getFormattedItemComparison(nodeItemName, nodeItemId, nodeRarityId, prevItemId, comparisonTargetName) {
    const rComp = (nodeRarityId === 1) ? '1=1' : `${nodeRarityId}≠1`;
    let idComp = '';
    let targetDisplay = comparisonTargetName ? comparisonTargetName : (prevItemId === -1 ? 'Null' : `${prevItemId}`);

    if (prevItemId === -1) {
         idComp = (nodeItemId === -1) ? '=Null' : '≠Null'; 
    } else {
         idComp = (nodeItemId === prevItemId) ? `=${targetDisplay}` : `≠${targetDisplay}`;
    }
    
    const text = `${nodeItemName}(${nodeItemId}(${rComp})${idComp})`;
    return { text, isDupe: (nodeRarityId === 1 && nodeItemId !== -1 && nodeItemId === prevItemId) };
}

/**
 * アイテムリンク生成ヘルパー
 */
function generateItemLink(baseParams, newSeed, newItemId, ngVal, rollNumberInSequence, isCompleted, fsVal) {
    const gId = window.activeGachaId;
    const paramsForQuery = {};
    
    // baseParams (URLSearchParams) から現在の値をコピー
    for (const [key, value] of baseParams.entries()) {
        paramsForQuery[key] = value;
    }
    
    if (!paramsForQuery.gacha) paramsForQuery.gacha = gId;

    paramsForQuery.seed = newSeed;
    if (newItemId !== undefined) paramsForQuery.lr = newItemId;
    
    if (fsVal !== undefined && fsVal !== null && !isNaN(fsVal)) {
        paramsForQuery.fs = fsVal;
    }

    if (ngVal !== undefined && ngVal !== null) {
        paramsForQuery.ng = ngVal.toString();
    }
    
    return generateUrlQuery(paramsForQuery);
}