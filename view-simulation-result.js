/**
 * 担当: シミュレーション結果の表示
 * 修正: 「(確定)」「(被り)」ラベルの表示対応、および表示優先順位の調整
 */

/**
 * シミュレーション結果を画面に描画するメイン関数
 */
function displaySimulationResult(result) {
    const display = document.getElementById('sim-result-text');
    display.style.display = 'block';
    display.innerHTML = "";

    if (!result) { 
        display.textContent = "指定されたチケット枚数内で有効なルートが見つかりませんでした。";
        window.lastSimText = "";
        return;
    }
    
    // ヘッダー（獲得数情報）の作成
    const header = createResultHeader(result);
    display.appendChild(header);

    // 各ロールの結果行を生成
    const { plainText, pathRows } = renderResultRows(result.path);
    pathRows.forEach(row => display.appendChild(row));
    
    // コピー用のプレーンテキストを保存（超激レアを先に記載）
    window.lastSimText = `【最適ルートシミュレーション結果】(超激レア:${result.ubers}, 伝説レア:${result.legends})\n\n` + plainText;
}

/**
 * 結果表示の上部ヘッダー（獲得統計）を生成
 */
function createResultHeader(result) {
    // 表示テキストを超激レア優先に変更
    const fullStatus = `超激レア: ${result.ubers}体 / 伝説レア: ${result.legends}体`;

    const header = createStyledElement('div', {
        fontWeight: 'bold',
        marginBottom: '12px',
        borderBottom: '1px solid #28a745',
        paddingBottom: '5px',
        fontSize: '1rem',
        color: '#155724'
    });

    header.textContent = `【最適獲得ルート】 (${fullStatus})`;
    header.dataset.status = fullStatus;
    return header;
}

/**
 * ガチャの実行パスを解析して表示用の行を作成
 */
function renderResultRows(path) {
    let plainText = "";
    const pathRows = [];
    let i = 0;

    while (i < path.length) {
        let row, plain, consumed;
        if (path[i].type === 'single') {
            // 連続する単発ガチャをまとめて表示
            ({ row, plain, consumed } = renderConsecutiveSingles(path, i));
        } else {
            // 10連ガチャを表示
            ({ row, plain, consumed } = renderTenPull(path, i));
        }
        pathRows.push(row);
        plainText += plain + "\n";
        i += consumed;
    }
    return { plainText, pathRows };
}

/**
 * 連続する単発ガチャを1つのブロックとして描画
 */
function renderConsecutiveSingles(path, startIndex) {
    let j = startIndex;
    const itemsHtml = [], itemsPlain = [];
    
    while (j < path.length && path[j].type === 'single') {
        const step = path[j];
        let label = "";
        if (step.isGuaranteed) label += " (確定)";
        if (step.isReroll) label += " (被り)";

        itemsHtml.push(getColoredItemHtml(step.item) + label);
        itemsPlain.push(step.item + label);
        j++;
    }
    
    const count = j - startIndex;
    const addr = path[startIndex].addr;
    const header = `<span style="color: #007bff; font-weight: bold;">[単発]</span> ${count}回 (${addr}～):<br>`;
    const html = "　=> " + itemsHtml.join('、');
    const plain = `[単発] ${count}回 (${addr}～) => ` + itemsPlain.join('、');
    
    return { row: createResultRow(header + html), plain, consumed: count };
}

/**
 * 10連ガチャの結果を1つのブロックとして描画
 */
function renderTenPull(path, index) {
    const pull = path[index];
    const header = `<span style="color: #c0a000; font-weight: bold;">[10連]</span> (${pull.addr}～):<br>`;
    
    // pull.items は {name, isGuaranteed, isReroll} の配列
    const itemsHtml = pull.items.map(item => {
        let label = "";
        if (item.isGuaranteed) label += " (確定)";
        if (item.isReroll) label += " (被り)";
        return getColoredItemHtml(item.name) + label;
    });

    const itemsPlain = pull.items.map(item => {
        let label = "";
        if (item.isGuaranteed) label += " (確定)";
        if (item.isReroll) label += " (被り)";
        return item.name + label;
    });

    const html = "　=> " + itemsHtml.join('、');
    const plain = `[10連] (${pull.addr}～) => ` + itemsPlain.join('、');
    
    return { row: createResultRow(header + html), plain, consumed: 1 };
}

/**
 * チェックボックス付きの表示行を作成
 */
function createResultRow(innerHTML) {
    const rowContainer = createStyledElement('div', {
        display: 'flex',
        gap: '10px',
        marginBottom: '8px',
        alignItems: 'flex-start',
        borderBottom: '1px solid #eee',
        paddingBottom: '4px'
    });

    const checkbox = createStyledElement('input', {
        marginTop: '4px',
        cursor: 'pointer',
        transform: 'scale(1.2)'
    }, { type: 'checkbox' });

    const span = createStyledElement('span', { 
        lineHeight: '1.5',
        flex: '1'
    }, { innerHTML });

    // チェックボックスによる「消し込み」機能
    checkbox.onchange = () => {
        span.style.color = checkbox.checked ? '#aaa' : '#333';
        span.style.textDecoration = checkbox.checked ? 'line-through' : 'none';
    };
    
    rowContainer.append(checkbox, span);
    return rowContainer;
}

/**
 * アイテム名にレアリティに応じた色を付ける
 */
function getColoredItemHtml(name) {
    const item = Object.values(itemMaster).find(it => it.name === name);
    if (!item) return name;

    if (item.rarity === 3) return `<span style="color: #d9534f; font-weight: bold;">${name}</span>`;
    if (item.rarity === 4) return `<span style="color: #0000ff; font-weight: bold;">${name}</span>`;
    if (item.rarity === 2) return `<span style="color: #c0a000; font-weight: bold;">${name}</span>`;
    
    return name;
}