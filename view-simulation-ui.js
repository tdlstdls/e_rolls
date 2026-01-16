/**
 * 担当: シミュレーションUIの基本要素の生成
 * 修正: 階層（Layer）選択機能を削除し、チケット入力と実行ボタンのみに簡素化
 */

/**
 * スタイル付き要素を生成する共通関数
 */
function createStyledElement(tag, styles = {}, properties = {}) {
    const element = document.createElement(tag);
    Object.assign(element.style, styles);

    if (properties.dataset) {
        Object.assign(element.dataset, properties.dataset);
        delete properties.dataset;
    }

    Object.assign(element, properties);
    return element;
}

/**
 * 上部のコントロール行（チケット入力、開始・コピーボタン）を生成
 */
function createControlRow() {
    const row = createStyledElement('div', {
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '15px',
        marginBottom: '0px' // 階層がなくなったため余白を調整
    });

    row.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <label style="font-size: 0.85rem; font-weight: bold; color: #555;">使用チケット枚数:</label>
            <input type="number" id="simTicketInput" value="30" min="1" max="1000" 
                   style="width: 70px; padding: 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 0.9rem;">
        </div>
        <div style="display: flex; gap: 10px;">
            <button id="runSimBtn" class="sim-btn" style="background-color: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.85rem;">
                シミュレーション開始
            </button>
            <button id="copySimResultBtn" class="sim-btn" style="background-color: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.85rem;">
                結果をコピー
            </button>
        </div>
    `;
    return row;
}

/**
 * 結果表示用のテキストエリアを生成
 */
function createResultDisplay() {
    return createStyledElement('div', {
        marginTop: '15px',
        padding: '15px',
        border: '2px dashed #28a745',
        backgroundColor: '#fafffa',
        whiteSpace: 'pre-wrap',
        fontFamily: 'monospace',
        fontSize: '0.85rem',
        display: 'none',
        borderRadius: '8px',
        lineHeight: '1.5'
    }, { id: 'sim-result-text' });
}

/**
 * シミュレーションUI全体のグループを生成
 */
function createSimUIGroup(gacha) {
    const group = createStyledElement('div', {
        padding: '15px',
        background: '#eef6ff',
        borderRadius: '8px',
        border: '1px solid #bdd7ff',
        marginTop: '10px'
    }, { id: 'sim-ui-group' });

    // コントロール行のみを追加（LayersContainerとAddLayerBtnは削除）
    const controlRow = createControlRow();
    group.append(controlRow);
    
    return group;
}