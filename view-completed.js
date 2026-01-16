/**
 * 担当: 「コンプ済み」ビューのメインテーブル描画およびポップアップ制御
 * 修正: セル単位の精密ハイライト、およびシミュレーション表示モードのトグル対応
 */

window.viewData = {
    calculatedData: null,
    gacha: null,
    initialLastRollId: null,
    highlightedRoute: [], // シミュレーションで算出されたセル番地リスト
    showSimHighlight: true // シミュレーションハイライトを表示するかどうかのフラグ
};

/**
 * 計算詳細ポップアップの表示
 */
function showCalculationPopup(nodeIndex, isGuaranteed, linkSeeds) {
    if (nodeIndex === undefined || viewData.calculatedData === null) return;
    const node = viewData.calculatedData.Nodes[nodeIndex];
    if (!node) return;

    const popupOverlay = document.getElementById('seed-popup-overlay');
    const popupContent = document.getElementById('popup-content');
    const html = generateNodeCalculationDetailsHtml(
        node, viewData.gacha, viewData.calculatedData.thresholds,
        viewData.initialLastRollId, viewData.calculatedData.Nodes,
        linkSeeds, isGuaranteed
    );
    popupContent.innerHTML = html;
    popupOverlay.style.display = 'flex';
}

/**
 * ポップアップ操作のハンドラ設定
 */
function setupPopupHandlers() {
    const popupOverlay = document.getElementById('seed-popup-overlay');
    const closeBtn = document.querySelector('.popup-close-btn');
    const copyBtn = document.getElementById('copy-popup-content-btn');
    if (!popupOverlay || !closeBtn) return;

    const hidePopup = () => { popupOverlay.style.display = 'none'; };
    if (!window.hasEscListener) {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && popupOverlay.style.display === 'flex') hidePopup();
        });
        window.hasEscListener = true;
    }

    if (!popupOverlay.dataset.handlerAttached) {
        popupOverlay.addEventListener('click', (e) => { if (e.target === popupOverlay) hidePopup(); });
        closeBtn.addEventListener('click', hidePopup);
        if (copyBtn) {
            copyBtn.onclick = () => {
                const text = document.getElementById('popup-content').innerText;
                navigator.clipboard.writeText(text).then(() => {
                    const original = copyBtn.textContent;
                    copyBtn.textContent = 'コピー完了';
                    setTimeout(() => { copyBtn.textContent = original; }, 1500);
                });
            };
        }
        popupOverlay.dataset.handlerAttached = 'true';
    }
}

/**
 * メインテーブルの生成と表示
 */
function createAndDisplayCompletedSeedView(initialSeed, gacha, tableRows, thresholds, initialLastRollId, displaySeed, params, initialNg) {
    setupPopupHandlers();
    
    // データ計算の実行
    const { Nodes, highlightInfo } = calculateCompletedData(initialSeed, gacha, tableRows, thresholds, initialLastRollId, initialNg);

    viewData.calculatedData = { Nodes, highlightInfo, thresholds };
    viewData.gacha = gacha;
    viewData.initialLastRollId = initialLastRollId;

    const getAddress = (n) => getAddressStringGeneric(n, 2);
    const currentParams = new URLSearchParams(window.location.search);
    
    // テーブル開始
    let table = `<table style="table-layout: fixed;" class="${currentHighlightMode === 'single' ? 'mode-single' : (currentHighlightMode === 'multi' ? 'mode-multi' : '')}">`;
    table += '<thead>';
    const header = (displaySeed === '1') 
        ? `<tr><th id="forceRerollToggle" class="col-no">#</th><th class="col-seed">SEED</th><th>A</th><th>AG</th><th class="col-seed">SEED</th><th>B</th><th>BG</th></tr>`
        : `<tr><th id="forceRerollToggle" class="col-no">#</th><th>A</th><th>AG</th><th>B</th><th>BG</th></tr>`;
    table += header + '</thead><tbody>';

    for (let r = 1; r <= tableRows; r++) {
        const nodeIdxA = (r - 1) * 2 + 1;
        const nodeIdxB = (r - 1) * 2 + 2;
        const nodeA = Nodes[nodeIdxA - 1];
        const nodeB = Nodes[nodeIdxB - 1];
        if (!nodeA || !nodeB) break;

        table += `<tr><td class="col-no">${r}</td>`;

        const renderCell = (node, isGuar) => {
            const addr = node.address + (isGuar ? 'G' : '');
            const info = highlightInfo.get(addr);
            
            let cls = '';
            
            // ハイライトモードの判定
            if (viewData.showSimHighlight && viewData.highlightedRoute && viewData.highlightedRoute.includes(addr)) {
                // シミュレーションハイライトが有効かつ、ルートに含まれるセルならオレンジ
                cls = 'route-highlight';
            } else {
                // それ以外は通常のルートハイライト（青/黄/緑）を表示
                cls = determineHighlightClass(info);
            }

            const isPartnerRR = (node.reRollFlag || node.reRerollFlag);
            let linkSeeds = {
                normal: node.seed2, 
                reroll: isPartnerRR ? node.seed3 : null, 
                avoid: node.seed2,
                cycleHeadSeed: (info && info.gRaritySeed) ? info.gRaritySeed : null,
                cycleHeadIdx: (info && info.cycleHeadIdx) ? info.cycleHeadIdx : null
            };

            const getFmt = (id, skipStyle = false) => {
                if (id === undefined || id === null || id === -1) return '---';
                const name = getItemNameSafe(id);
                if (skipStyle) return name;
                
                const item = itemMaster[id];
                if (!item) return name;
                if (item.rarity === 3) return `<span style="color:#d9534f; font-weight:bold;">${name}</span>`;
                if (item.rarity === 4) return `<span style="color:#0000ff; font-weight:bold;">${name}</span>`;
                return name;
            };

            let displayHtml = '---';
            if (node.itemId !== -1) {
                if (displaySeed === '1') {
                    // SEED表示モード時のセル内HTML生成
                    const buildStaticItemDisplay = (isGuaranteedColumn) => {
                        if (isGuaranteedColumn) {
                            const base = getFmt(node.itemGId, true);
                            if (isPartnerRR) {
                                const poolG = gacha.rarityItems[node.rarityGId] || [];
                                const itemG_rr_Id = poolG[node.seed2 % Math.max(1, poolG.length)];
                                return `${base}<br>${getFmt(itemG_rr_Id, true)}`;
                            }
                            return base;
                        } else {
                            const base = getFmt(node.itemId);
                            if (isPartnerRR) {
                                return `${base}<br>${getAddress(node.index + 3)})${getFmt(node.reRollItemId)}`;
                            }
                            return base;
                        }
                    };
                    const nameHtml = buildStaticItemDisplay(isGuar);
                    const json = JSON.stringify(linkSeeds).replace(/"/g, '&quot;');
                    displayHtml = `<a href="#" onclick="showCalculationPopup(${node.index - 1}, ${isGuar}, ${json}); return false;">${nameHtml}</a>`;
                } else {
                    // SEED非表示モード時のリンク生成
                    if (isGuar) {
                        const baseName = getFmt(node.itemGId, true);
                        if (isPartnerRR) {
                            const poolG = gacha.rarityItems[node.rarityGId] || [];
                            const itemG_rr_Id = poolG[node.seed2 % Math.max(1, poolG.length)];
                            const link1 = `<a href="${generateItemLink(currentParams, node.seed2, node.itemGId, initialNg, r, true)}">${baseName}</a>`;
                            const link2 = `<a href="${generateItemLink(currentParams, node.seed3, itemG_rr_Id, initialNg, r, true)}">${getFmt(itemG_rr_Id, true)}</a>`;
                            displayHtml = `${link1}<br>${link2}`;
                        } else {
                            displayHtml = `<a href="${generateItemLink(currentParams, node.seed2, node.itemGId, initialNg, r, true)}">${baseName}</a>`;
                        }
                    } else {
                        const baseName = getFmt(node.itemId);
                        if (isPartnerRR) {
                            const link1 = `<a href="${generateItemLink(currentParams, node.seed2, node.itemId, initialNg, r, true)}">${baseName}</a>`;
                            const link2 = `<a href="${generateItemLink(currentParams, node.seed3, node.reRollItemId, initialNg, r, true)}">${getAddress(node.index + 3)})${getFmt(node.reRollItemId)}</a>`;
                            displayHtml = `${link1}<br>${link2}`;
                        } else {
                            displayHtml = `<a href="${generateItemLink(currentParams, node.seed2, node.itemId, initialNg, r, true)}">${baseName}</a>`;
                        }
                    }
                }
            }
            return { html: `<td class="${cls || ''}">${displayHtml}</td>` };
        };

        const cA = renderCell(nodeA, false); 
        const cAG = renderCell(nodeA, true);
        const cB = renderCell(nodeB, false);
        const cBG = renderCell(nodeB, true);

        if (displaySeed === '1') {
            table += `<td class="col-seed">${nodeA.seed1} [${nodeA.index}]</td>${cA.html}${cAG.html}<td class="col-seed">${nodeB.seed1} [${nodeB.index}]</td>${cB.html}${cBG.html}`;
        } else {
            table += cA.html + cAG.html + cB.html + cBG.html;
        }
        table += '</tr>';
    }
    table += '</tbody></table>';
    document.getElementById('result-table-container').innerHTML = table;
}