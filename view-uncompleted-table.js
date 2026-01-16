/**
 * 担当: 「未コンプ」ビューのメインテーブルおよび期待値情報のHTML描画
 * 依存関係: utils.js (generateItemLinkの利用)
 */

/**
 * 未コンプビューのメインテーブル（期待値表示含む）を生成してDOMに挿入する関数
 * @param {Array} Nodes - 計算済みの全ノードデータ
 * @param {Map} highlightInfo - ハイライト情報（単発ルート、10連ルートの判定用）
 * @param {Array} tenPullCyclesData - 10連シミュレーションの結果データ
 * @param {Object} expectedFeaturedCounts - 期待値データ
 * @param {number} tableRows - 表示する行数
 * @param {string} displaySeed - '1'なら詳細表示、それ以外は通常表示
 * @param {number} initialNg - 初期のNext Guaranteed値
 * @param {number} initialFs - 初期のFeatured Stock値
 * @param {number} guaranteedCycle - 確定周期（通常30）
 */
function renderUncompletedMainTable(Nodes, highlightInfo, tenPullCyclesData, expectedFeaturedCounts, tableRows, displaySeed, initialNg, initialFs, guaranteedCycle) {
    
    // --- ヘルパー関数: アイテムCSS決定 ---
    function determineItemCss(itemId) {
        if (!itemMaster[itemId]) return '';
        if (itemMaster[itemId].rarity === 4) return 'legendItem-text';
        if (itemMaster[itemId].rarity >= 3) return 'featuredItem-text';
        return '';
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
    
    // 強制再抽選モードの状態に応じてトグル記号を切り替え
    const toggleChar = window.forceRerollMode ? '☑' : '□';
    let header1 = `<tr><th id="forceRerollToggle" class="col-no" style="cursor: pointer;">${toggleChar}</th>`;
    header1 += '<th>A</th><th>B</th><th>C</th><th>G</th>';
    header1 += '</tr>';
    table += header1;
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
                     // 確定ノード
                     const guaranteedLinkSeed = node.prevSeed1;
                     const guaranteedLinkNg = guaranteedCycle; 
                     const guaranteedLinkFs = initialFs;
                     const guaranteedHref = generateItemLink(guaranteedLinkSeed, node.singleCompareItemId, guaranteedLinkNg, node.index, false, guaranteedLinkFs);
                     const guaranteedLinkStyle = `text-decoration: none; color: inherit; font-weight: bold;`;
                     const guaranteedLink = `<a href="${guaranteedHref}" class="featuredItem-text" style="${guaranteedLinkStyle}">目玉(確定)</a>`;

                     const itemDisplayName = node.itemName;
                     const itemLinkSeed = node.seed3; 
                     const itemLinkNg = guaranteedCycle - 1;
                     const itemLinkFs = initialFs;
                     const itemHref = generateItemLink(itemLinkSeed, node.itemId, itemLinkNg, r+1, false, itemLinkFs);
                     const itemLinkStyle = `text-decoration: none; color: inherit; font-weight: normal;"`;
                     const itemNameLink = `<a href="${itemHref}" style="${itemLinkStyle}">${itemDisplayName}</a>`;

                     content = `${guaranteedLink} / ${itemNameLink}`;
                     currentNgVal = guaranteedCycle - 1; 
                     currentFsVal = linkFs; 

                 } else {
                     // 非確定ノード
                     let nextNg = (currentNgVal !== -1) ? currentNgVal - 1 : 'none';
                     if (nextNg !== 'none' && nextNg <= 0) nextNg = guaranteedCycle;
                     
                     if (node.isFeatured) {
                         // 目玉アイテム
                         linkFs = currentFsVal - 1;
                         const currentSeedVal = node.seed1; 
                         const hrefFeatured = generateItemLink(currentSeedVal, -2, nextNg, r+1, false, linkFs);
                         content = `${node.featuredNextAddress})<a href="${hrefFeatured}"><span class="featuredItem-text">目玉</span></a>`;
                         currentFsVal -= 1;
                     } else {
                        // 通常アイテム
                        const isRerollHighlight = info ? info.s_reRoll : false;
                        
                        if (isRerollHighlight) {
                             // 再抽選が行われたケース
                             const preRerollName = node.itemName;
                             const postRerollId = node.reRollItemId;
                             const postRerollName = node.reRollItemName;
                             
                             const preSeed = node.seed3;
                             const preHref = generateItemLink(preSeed, node.itemId, nextNg, r+1, false, linkFs);
                             let preCss = determineItemCss(node.itemId);

                             const postSeed = node.seed4;
                             const postHref = generateItemLink(postSeed, postRerollId, nextNg, r+1, false, linkFs);
                             let postCss = determineItemCss(postRerollId);

                             content = `<a href="${preHref}" class="${preCss}">${preRerollName}</a><br>${node.reRollNextAddress})<a href="${postHref}" class="${postCss}">${postRerollName}</a>`;
                        } else {
                             // 通常排出のケース
                             const nextSeed = node.seed3;
                             const finalId = node.itemId; 
                             const href = generateItemLink(nextSeed, finalId, nextNg, r+1, false, linkFs);
                             let css = determineItemCss(finalId);
                             content = `<a href="${href}" class="${css}">${node.itemName}</a>`;

                             // 再抽選候補表示 (強制モードまたは通常のレア被り発生時)
                             if (node.reRollItemId !== -1) { 
                                 if (node.singleIsReroll || window.forceRerollMode) {
                                     const rrHref = generateItemLink(node.seed4, node.reRollItemId, nextNg, r+1, false, linkFs);
                                     let rrName = node.reRollItemName;
                                     let rrCss = determineItemCss(node.reRollItemId);
                                     content += `<br>${node.reRollNextAddress})<a href="${rrHref}" class="${rrCss}">${rrName}</a>`;
                                 }
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
                // Case 2: Off-Route Logic (ルート外)
                // ----------------------------------------------------------------
                let linkNgVal = (initialNg !== -1) ? initialNg - (r + 1) : 'none';
                if (linkNgVal !== 'none' && linkNgVal <= 0) {
                    linkNgVal = guaranteedCycle - 1;
                }
                const linkFsVal = initialFs;
                if (node.isFeatured) {
                    const currentSeed = node.seed1;
                    const hrefFeatured = generateItemLink(currentSeed, -2, linkNgVal, r+1, false, linkFsVal);
                    content = `${node.featuredNextAddress})<a href="${hrefFeatured}"><span class="featuredItem-text">目玉</span></a>`;
                } else {
                    const finalId = node.itemId;
                    const preRerollName = node.itemName; 
                    
                    const nextSeedNormal = node.seed3;
                    const hrefNormal = generateItemLink(nextSeedNormal, finalId, linkNgVal, r+1, false, linkFsVal);
                    let cssNormal = determineItemCss(finalId);

                    content = `<a href="${hrefNormal}" class="${cssNormal}">${preRerollName}</a>`;

                    // 強制モードまたは通常被り時に再抽選リンクを表示
                    if (node.reRollItemId !== -1) {
                        if (window.forceRerollMode || node.isDupe) {
                            const nextSeedReroll = node.seed4;
                            const rrId = node.reRollItemId;
                            const rrName = node.reRollItemName;
                            const rrHref = generateItemLink(nextSeedReroll, rrId, linkNgVal, r+1, false, linkFsVal);
                            let rrCss = determineItemCss(rrId);
                            content += `<br>${node.reRollNextAddress})<a href="${rrHref}" class="${rrCss}">${rrName}</a>`;
                        }
                    }
                }
            }

            if (displaySeed === '1' && node) {
                content += `<br><span class="seed-value" style="font-size: 0.7em; color: #888;">${node.seed1}</span>`;
            }
            table += `<td${cls ? ' class="'+cls+'"' : ''}>${content}</td>`;
        });

        // --- G Column Logic (10連ガチャシミュレーション) ---
        let gContent = '-';
        let gStyle = '';
        
        const cycleIndex = Math.floor(r / 10);
        const rollIndex = r % 10;
        const tenPullDetailData = tenPullCyclesData ? tenPullCyclesData[cycleIndex] : null; 
        
        if (rollIndex < 9) { gStyle = 'background-color: #ffffe0;';
        } else if (rollIndex === 9) { gStyle = 'background-color: #ffff8d;';
        }

        if (tenPullDetailData && rollIndex < 10) {
            const res = tenPullDetailData.results[rollIndex];
            if (res) {
                let cellName = res.name;
                if (res.isReroll && res.preRerollName) {
                    cellName = `（${res.preRerollName}↓）<br>${cellName}`;
                }
                if (res.isGuaranteed || res.isFeatured) {
                    cellName = `<span class="featuredItem-text">${cellName}</span>`;
                }

                if (rollIndex === 9) {
                    const addressStr = tenPullDetailData.transition.nextAddress;
                    let nextNg = tenPullDetailData.transition.nextNgVal;
                    if (isNaN(nextNg) || nextNg <= 0) nextNg = guaranteedCycle - 1;
                    
                    let usedFs = tenPullDetailData.featuredCountInCycle || 0;
                    let nextFs = initialFs - usedFs;

                    const href10 = generateItemLink(
                        tenPullDetailData.transition.nextSeed,
                        tenPullDetailData.transition.lastItemId,
                        nextNg,
                        tenPullDetailData.transition.nextIndex, 
                        false, 
                        nextFs
                    );
                    gContent = `${addressStr})<a href="${href10}">${cellName}</a>`;
                } else {
                    gContent = cellName;
                }
            }
        }
        if (displaySeed === '1' && tenPullDetailData && tenPullDetailData.transition) {
             gContent += `<br><span class="seed-value" style="font-size: 0.7em; color: #888;">${tenPullDetailData.transition.nextSeed}</span>`;
        }
        table += `<td style="${gStyle}">${gContent}</td>`;
        table += '</tr>';
    }
    table += '</tbody></table>';
    document.getElementById('result-table-container').innerHTML = table;
}