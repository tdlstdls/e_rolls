/**
 * 担当: 「未コンプ」ビューのメインテーブルおよび期待値情報のHTML描画
 * 依存関係: utils.js (generateItemLinkの利用は行わず、main.jsのイベントを利用)
 */

/**
 * 未コンプビューのメインテーブル（期待値表示含む）を生成してDOMに挿入する関数
 */
function renderUncompletedMainTable(Nodes, highlightInfo, tenPullCyclesData, expectedFeaturedCounts, tableRows, displaySeed, initialNg, initialFs, guaranteedCycle) {
    
    // --- ヘルパー関数: アイテムCSS決定 ---
    function determineItemCss(itemId) {
        if (!itemMaster[itemId]) return '';
        if (itemMaster[itemId].rarity === 4) return 'legendItem-text';
        if (itemMaster[itemId].rarity >= 3) return 'featuredItem-text';
        return '';
    }

    // --- ヘルパー関数: クリックイベント用スパン生成 ---
    function createClickable(name, seed, lr, ng, fs, css) {
        // data属性に次状態のパラメータを埋め込む
        return `<span class="clickable-item ${css}" data-seed="${seed}" data-lr="${lr}" data-ng="${ng}" data-fs="${fs}" data-comp="false">${name}</span>`;
    }

    // --- 期待値表示エリア ---
    let expectedValueHtml = '<div>';
    if (expectedFeaturedCounts) {
        expectedValueHtml += '<h3>＜単発Nroll後の10連での目玉獲得数予測＞</h3>';
        const expectedKeys = Object.keys(expectedFeaturedCounts).sort((a, b) => parseInt(a) - parseInt(b));
        
        const expectedValueText = expectedKeys.map(n => {
            const m = expectedFeaturedCounts[n];
            const rollNum = parseInt(n) + 1; 
            return `${rollNum}roll:<span style="font-weight: bold;">${Math.floor(m)}個</span>`;
        }).join(', ');
        expectedValueHtml += `<p style="font-size: 1.1em;">${expectedValueText}</p>`;
    } else {
        expectedValueHtml += '<p>期待値データが見つかりませんでした。</p>';
    }
    expectedValueHtml += '</div><br>';

    // --- テーブルヘッダー生成 ---
    let table = expectedValueHtml;
    table += '<table style="table-layout: fixed;"><thead>';
    
    let header1 = `<tr><th rowspan="${displaySeed === '1' ? 2 : 1}" id="forceRerollToggle" class="col-no" style="cursor: pointer;">${window.forceRerollMode ? '☑' : '□'}</th>`;
    let header2 = '<tr>';

    if (displaySeed === '1') {
        header1 += '<th colspan="5">A</th><th colspan="5">B</th><th colspan="5">C</th><th colspan="5">G</th>';
        const subHeaders = ['S1<br>Feat', 'S2<br>Rare', 'S3<br>Slot', 'S4<br>Re', 'Item'];
        for(let i=0; i<4; i++) header2 += subHeaders.map(h => `<th>${h}</th>`).join('');
    } else {
        header1 += '<th>A</th><th>B</th><th>C</th><th>G</th>';
    }
    header1 += '</tr>';
    if (displaySeed === '1') { header2 += '</tr>'; table += header1 + header2; } else { table += header1; }
    table += '</thead><tbody>';

    // --- メインループ変数の初期化 ---
    let currentNgVal = !isNaN(initialNg) ? initialNg : -1;
    let currentFsVal = initialFs;

    // --- メインループ (各行の生成) ---
    for (let r = 0; r < tableRows; r++) {
        table += `<tr><td class="col-no">${r + 1}</td>`;
        const nodeIndices = [r * 3 + 1, r * 3 + 2, r * 3 + 3];
        
        // --- A, B, C 列の処理 ---
        nodeIndices.forEach((idx, colIndex) => {
            const node = Nodes[idx - 1];
            if (!node) {
                table += displaySeed === '1' ? '<td colspan="5"></td>' : '<td></td>';
                return;
            }

            const info = highlightInfo.get(node.address);
            let cls = determineHighlightClass(info);
            const isSingleRouteNode = info && info.single;
            const isGuaranteedNode = isSingleRouteNode && node.isGuaranteedRoll;

            let content = '';
            let linkFs = currentFsVal;

            // ----------------------------------------------------------------
            // Case 1: Single Route Logic (単発ガチャルート上のノード)
            // ----------------------------------------------------------------
            if (isSingleRouteNode) {
                 if (isGuaranteedNode) {
                     // 1-A. Guaranteed Roll Processing
                     // 確定リンク (遷移前状態)
                     const guaranteedLink = createClickable("目玉(確定)", node.prevSeed1, node.singleCompareItemId, guaranteedCycle, initialFs, "featuredItem-text");
                     // アイテム名リンク (遷移後状態)
                     const itemNameLink = createClickable(node.itemName, node.seed3, node.itemId, guaranteedCycle - 1, initialFs, "");

                     content = `${guaranteedLink} / ${itemNameLink}`;
                     currentNgVal = guaranteedCycle - 1;
                 } else {
                     // 1-B. Normal Single Route Node (非確定ノード)
                     let nextNg = (currentNgVal !== -1) ? currentNgVal - 1 : 'none';
                     if (nextNg !== 'none' && nextNg <= 0) nextNg = guaranteedCycle;
                     
                     if (node.isFeatured) {
                         // 目玉アイテムの場合
                         linkFs = currentFsVal - 1;
                         content = `${node.featuredNextAddress})${createClickable("目玉", node.seed1, -2, nextNg, linkFs, "featuredItem-text")}`;
                         currentFsVal -= 1;
                     } else {
                        // 通常アイテム
                        const isRerollHighlight = info ? info.s_reRoll : false;
                        if (isRerollHighlight) {
                             // 再抽選ケース
                             const prePart = createClickable(node.itemName, node.seed3, node.itemId, nextNg, linkFs, determineItemCss(node.itemId));
                             const postPart = createClickable(node.reRollItemName, node.seed4, node.reRollItemId, nextNg, linkFs, determineItemCss(node.reRollItemId));
                             content = `${prePart}<br>${node.reRollNextAddress})${postPart}`;
                        } else {
                             // 通常排出ケース
                             content = createClickable(node.itemName, node.seed3, node.itemId, nextNg, linkFs, determineItemCss(node.itemId));
                             // 再抽選候補の表示 (強制モードまたはフラグあり)
                             if (node.reRollItemId !== -1 && (node.singleIsReroll || window.forceRerollMode)) {
                                 const rrPart = createClickable(node.reRollItemName, node.seed4, node.reRollItemId, nextNg, linkFs, determineItemCss(node.reRollItemId));
                                 content += `<br>${node.reRollNextAddress})${rrPart}`;
                             }
                        }
                     }
                     if (currentNgVal !== -1) {
                         currentNgVal -= 1;
                         if (currentNgVal <= 0) currentNgVal = guaranteedCycle;
                     }
                 }
            } else {
                // ----------------------------------------------------------------
                // Case 2: Off-Route Logic (共通/10連ルート等)
                // ----------------------------------------------------------------
                let linkNgVal = (initialNg !== -1) ? initialNg - (r + 1) : 'none';
                if (linkNgVal !== 'none' && linkNgVal <= 0) linkNgVal = guaranteedCycle - 1;
                
                if (node.isFeatured) {
                    content = `${node.featuredNextAddress})${createClickable("目玉", node.seed1, -2, linkNgVal, initialFs, "featuredItem-text")}`;
                } else {
                    const normPart = createClickable(node.itemName, node.seed3, node.itemId, linkNgVal, initialFs, determineItemCss(node.itemId));
                    content = normPart;
                    // 再抽選リンク (10連ルートでの重複等)
                    if (node.reRollItemId !== -1 && node.isDupe) {
                        if (window.forceRerollMode || (info && info.ten && info.t_reRoll)) {
                            const rrPart = createClickable(node.reRollItemName, node.seed4, node.reRollItemId, linkNgVal, initialFs, determineItemCss(node.reRollItemId));
                            content += `<br>${node.reRollNextAddress})${rrPart}`;
                        }
                    }
                }
            }

            // --- セルHTML生成 (詳細表示対応) ---
            if (displaySeed === '1') {
                const sub1 = `(S${(idx-1)*3+1})${node.seed1}<br>${node.seed1%10000}<br>${node.isFeatured}`;
                const sub2 = `(S${(idx-1)*3+2})${node.seed2}<br>${node.seed2%10000}<br>${node.rarity.name}`;
                const sub3 = `(S${(idx-1)*3+3})${node.seed3}<br>${node.poolSize}<br>${node.slot}`;
                let sub4 = '---';
                if (!node.isFeatured && node.reRollItemId !== -1) {
                    sub4 = `(S${(idx-1)*3+4})${node.seed4}<br>ReRoll`;
                }
                table += `<td${cls ? ' class="'+cls+'"' : ''}>${sub1}</td><td${cls ? ' class="'+cls+'"' : ''}>${sub2}</td><td${cls ? ' class="'+cls+'"' : ''}>${sub3}</td><td${cls ? ' class="'+cls+'"' : ''}>${sub4}</td><td${cls ? ' class="'+cls+'"' : ''}>${content}</td>`;
            } else {
                table += `<td${cls ? ' class="'+cls+'"' : ''}>${content}</td>`;
            }
        });

        // --- G Column Logic (10連シミュレーション) ---
        let gContent = '-';
        let gStyle = '';
        const cycleIndex = Math.floor(r / 10);
        const rollIndex = r % 10;
        const cycleData = tenPullCyclesData ? tenPullCyclesData[cycleIndex] : null; 
        
        if (rollIndex < 9) gStyle = 'background-color: #ffffe0;';
        else if (rollIndex === 9) gStyle = 'background-color: #ffff8d;';

        if (cycleData && rollIndex < 10) {
            const res = cycleData.results[rollIndex];
            if (res) {
                let cellName = res.name;
                if (res.isReroll && res.preRerollName) cellName = `（${res.preRerollName}↓）<br>${cellName}`;
                const itemCss = (res.isGuaranteed || res.isFeatured) ? 'featuredItem-text' : '';

                if (rollIndex === 9) {
                    // 10ロール目のみ遷移クリックを付与
                    const addr = cycleData.transition.nextAddress;
                    let nNg = isNaN(cycleData.transition.nextNgVal) ? guaranteedCycle - 1 : cycleData.transition.nextNgVal;
                    let nFs = initialFs - (cycleData.featuredCountInCycle || 0);
                    gContent = `${addr})${createClickable(cellName, cycleData.transition.nextSeed, cycleData.transition.lastItemId, nNg, nFs, itemCss)}`;
                } else {
                    gContent = `<span class="${itemCss}">${cellName}</span>`;
                }
            }
        }
        
        if (displaySeed === '1') table += `<td colspan="5" style="${gStyle}">${gContent}</td>`;
        else table += `<td style="${gStyle}">${gContent}</td>`;
        table += '</tr>';
    }
    table += '</tbody></table>';
    document.getElementById('result-table-container').innerHTML = table;
}