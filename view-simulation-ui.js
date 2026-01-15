/**
 * 担当: シミュレーションUIの基本要素の生成
 */

function createStyledElement(tag, styles = {}, properties = {}) {
    const element = document.createElement(tag);
    Object.assign(element.style, styles);

    // `dataset` has only a getter and cannot be assigned directly.
    // Handle it separately.
    if (properties.dataset) {
        Object.assign(element.dataset, properties.dataset);
        delete properties.dataset; // Remove it to avoid conflict
    }

    Object.assign(element, properties);
    return element;
}

function createControlRow() {
    const row = createStyledElement('div', {
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '15px',
        marginBottom: '12px'
    });
    row.innerHTML = `
        <div style="display: flex; align-items: center; gap: 5px;">
            <label style="font-size: 0.8rem; font-weight: bold; color: #555;">チケット:</label>
            <input type="number" id="simTicketInput" value="30" min="1" max="1000" 
                   style="width: 60px; padding: 5px; border: 1px solid #ccc; border-radius: 4px;">
        </div>
        <div id="selectedTargetStatus" style="font-size: 0.75rem; color: #0056b3; font-weight: bold; 
             background: #fff; padding: 5px 10px; border-radius: 4px; border: 1px solid #bdd7ff;">
            階層: 1
        </div>
        <button id="runSimBtn" class="sim-btn sim-btn-run">シミュレーション開始</button>
        <button id="copySimResultBtn" class="sim-btn sim-btn-copy">結果をコピー</button>
    `;
    return row;
}

function createLayersGroup(gacha) {
    const container = createStyledElement('div', {}, { id: 'targetLayersContainer' });
    const addBtn = createStyledElement('button', {
        marginTop: '10px',
        fontSize: '0.75rem',
        padding: '5px 10px',
        cursor: 'pointer',
        backgroundColor: '#fff',
        border: '1px solid #007bff',
        color: '#007bff',
        borderRadius: '4px'
    }, {
        id: 'addPriorityLayerBtn',
        textContent: '＋ 次順位の階層を追加'
    });
    addBtn.onclick = () => createLayerUI(gacha, container.children.length + 1);
    return [container, addBtn];
}

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
        borderRadius: '8px'
    }, { id: 'sim-result-text' });
}

function createSimUIGroup(gacha) {
    const group = createStyledElement('div', {
        padding: '15px',
        background: '#eef6ff',
        borderRadius: '8px',
        border: '1px solid #bdd7ff',
        marginTop: '10px'
    }, { id: 'sim-ui-group' });

    const controlRow = createControlRow();
    const [layersContainer, addLayerBtn] = createLayersGroup(gacha);
    
    group.append(controlRow, layersContainer, addLayerBtn);
    return group;
}
