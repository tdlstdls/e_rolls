/**
 * 担当: シミュレーションUIの基本要素の生成
 * 修正: 階層選択UIの削除、およびハイライト切替ボタンの追加
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
 * コントロール行（チケット入力、実行、コピー、ハイライト切替ボタン）を生成
 */
function createControlRow() {
    const row = createStyledElement('div', {
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '0px'
    });

    row.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <label style="font-size: 0.85rem; font-weight: bold; color: #555;">チケット:</label>
            <input type="number" id="simTicketInput" value="30" min="1" max="1000" 
                   style="width: 65px; padding: 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 0.9rem;">
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button id="runSimBtn" style="background-color: #28a745; color: white; border: none; padding: 8px 14px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.85rem;">
                シミュレーション開始
            </button>
            <button id="copySimResultBtn" style="background-color: #6c757d; color: white; border: none; padding: 8px 14px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.85rem;">
                結果をコピー
            </button>
            <button id="toggleHighlightBtn" style="background-color: #007bff; color: white; border: none; padding: 8px 14px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.85rem;">
                ハイライト: ON
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

    // ボタン類を含むメイン行のみを追加
    const controlRow = createControlRow();
    group.append(controlRow);
    
    return group;
}