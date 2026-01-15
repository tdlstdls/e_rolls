/**
 * 担当: シミュレーションUIの階層管理
 */

function createLayerUI(gacha, priority) {
    const layersContainer = document.getElementById('targetLayersContainer');
    if (!layersContainer) return;

    const wrapper = createStyledElement('div', {
        marginTop: '12px',
        padding: '10px',
        background: '#fff',
        border: '1px solid #ccc',
        borderRadius: '6px'
    }, { className: 'priority-layer-wrapper' });

    wrapper.innerHTML = `<div style="font-size: 0.8rem; font-weight: bold; margin-bottom: 8px; color: #004085;">
        【第 ${priority} 優先ターゲット】
    </div>`;

    const area = createStyledElement('div', {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
        maxHeight: '120px',
        overflowY: 'auto',
        padding: '5px'
    }, {
        className: 'layer-selection-area',
        dataset: { priority }
    });

    populateLayerWithOptions(area, gacha);
    wrapper.appendChild(area);
    layersContainer.appendChild(wrapper);

    const status = document.getElementById('selectedTargetStatus');
    if (status) status.textContent = `階層: ${layersContainer.children.length}`;
}

function populateLayerWithOptions(area, gacha) {
    area.innerHTML = '';
    const targetPool = [];
    
    Object.keys(gacha.rarityItems)
          .sort((a, b) => parseInt(b) - parseInt(a))
          .forEach(rid => {
              if (gacha.rarityItems[rid]) targetPool.push(...gacha.rarityItems[rid]);
          });

    Array.from(new Set(targetPool)).forEach(id => {
        const item = itemMaster[id];
        if (!item) return;
        area.appendChild(createItemCheckbox(item));
    });
}

function createItemCheckbox(item) {
    const label = createStyledElement('label', {
        fontSize: '0.75rem',
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer',
        background: '#f8f9fa',
        padding: '2px 6px',
        borderRadius: '3px',
        border: '1px solid #eee'
    });

    let color = '#333';
    if (item.rarity === 2) color = '#c0a000'; // 激レア
    else if (item.rarity === 3) color = '#d9534f'; // 超激レア
    else if (item.rarity === 4) color = '#0000ff'; // 伝説レア

    label.innerHTML = `
        <input type="checkbox" class="layer-target-checkbox" value="${item.id}" style="margin-right: 5px;">
        <span style="color: ${color}; font-weight: ${item.rarity >= 3 ? 'bold' : 'normal'};">${item.name}</span>
    `;
    return label;
}

function updateSimGachaItems(gacha) {
    const layers = document.querySelectorAll('.layer-selection-area');
    layers.forEach(area => populateLayerWithOptions(area, gacha));
}
