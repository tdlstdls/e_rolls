/**
 * 担当: シミュレーション結果の表示
 */

function displaySimulationResult(result) {
    const display = document.getElementById('sim-result-text');
    display.style.display = 'block';
    display.innerHTML = "";

    if (!result) { 
        display.textContent = "指定されたチケット枚数内でターゲットを獲得できるルートが見つかりませんでした。";
        window.lastSimText = "";
        return;
    }
    
    const header = createResultHeader(result);
    display.appendChild(header);

    const { plainText, pathRows } = renderResultRows(result.path);
    pathRows.forEach(row => display.appendChild(row));
    
    window.lastSimText = `【最適ルートシミュレーション結果】(${header.dataset.status})\n\n` + plainText;
}

function createResultHeader(result) {
    const statusText = result.layerCounts.map((c, i) => `P${i + 1}:${c}`).join(', ');
    const fullStatus = `${statusText} / 超激:${result.ubers} / 伝説:${result.legends}`;

    const header = createStyledElement('div', {
        fontWeight: 'bold',
        marginBottom: '12px',
        borderBottom: '1px solid #28a745',
        paddingBottom: '5px'
    });
    header.textContent = `【最適ルート】(獲得数 -> ${fullStatus})`;
    header.dataset.status = fullStatus;
    return header;
}

function renderResultRows(path) {
    let plainText = "";
    const pathRows = [];
    let i = 0;

    while (i < path.length) {
        let row, plain, consumed;
        if (path[i].type === 'single') {
            ({ row, plain, consumed } = renderConsecutiveSingles(path, i));
        } else {
            ({ row, plain, consumed } = renderTenPull(path, i));
        }
        pathRows.push(row);
        plainText += plain + "\n";
        i += consumed;
    }
    return { plainText, pathRows };
}

function renderConsecutiveSingles(path, startIndex) {
    let j = startIndex;
    const itemsHtml = [], itemsPlain = [];
    while (j < path.length && path[j].type === 'single') {
        itemsHtml.push(getColoredItemHtml(path[j].item));
        itemsPlain.push(path[j].item);
        j++;
    }
    const count = j - startIndex;
    const addr = path[startIndex].addr;
    const header = `<span style="color: #007bff; font-weight: bold;">[単発]</span> ${count}ロール (${addr}～):<br>`;
    const html = "　=> " + itemsHtml.join('、');
    const plain = `[単発] ${count}ロール (${addr}～) => ` + itemsPlain.join('、');
    
    return { row: createResultRow(header + html), plain, consumed: count };
}

function renderTenPull(path, index) {
    const pull = path[index];
    const header = `<span style="color: #c0a000; font-weight: bold;">[10連]</span> (${pull.addr}～):<br>`;
    const html = "　=> " + pull.items.map(getColoredItemHtml).join('、');
    const plain = `[10連] (${pull.addr}～) => ` + pull.items.join('、');

    return { row: createResultRow(header + html), plain, consumed: 1 };
}

function createResultRow(innerHTML) {
    const rowContainer = createStyledElement('div', {
        display: 'flex',
        gap: '8px',
        marginBottom: '6px',
        alignItems: 'flex-start'
    });

    const checkbox = createStyledElement('input', {
        marginTop: '3px',
        cursor: 'pointer'
    }, { type: 'checkbox' });

    const span = createStyledElement('span', { lineHeight: '1.4' }, { innerHTML });

    checkbox.onchange = () => {
        span.style.color = checkbox.checked ? '#aaa' : '#333';
        span.style.textDecoration = checkbox.checked ? 'line-through' : 'none';
    };
    
    rowContainer.append(checkbox, span);
    return rowContainer;
}

function getColoredItemHtml(name) {
    const item = Object.values(itemMaster).find(it => it.name === name);
    if (!item) return name;

    if (item.rarity === 3) return `<span style="color: #d9534f; font-weight: bold;">${name}</span>`;
    if (item.rarity === 4) return `<span style="color: #0000ff; font-weight: bold;">${name}</span>`;
    return name;
}
