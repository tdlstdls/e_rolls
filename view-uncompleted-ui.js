/**
 * 担当: 「未コンプ」ビューにおける計算過程（詳細）の表示切り替えUI制御
 * 依存関係: なし（独立したUI操作）
 */

/**
 * 計算過程（デバッグビュー）の表示・非表示を切り替えるUI制御を設定する
 * HTML要素の存在をチェックし、安全にイベントリスナーを登録します。
 */
function setupDetailsToggleLogic() {
    const detailsDiv = document.getElementById('calculation-details');
    const detailsControls = document.getElementById('details-controls');
    const toggleBtn = document.getElementById('toggleDetailsBtn');

    // 必要なHTML要素が見つからない場合は、エラーを防止するため処理を中断します
    if (!detailsDiv || !detailsControls || !toggleBtn) {
        return;
    }

    // 以前の実行で追加された可能性のある動的要素（スクロールボタン等）をクリーニング
    const scrollButtons = detailsControls.querySelector('.scroll-buttons');
    if (scrollButtons) {
        scrollButtons.remove();
    }
    
    // 操作用コントロールを表示状態にする
    detailsControls.style.display = 'flex';
    toggleBtn.style.display = 'inline-block';

    /**
     * ボタンクリック時のトグル処理
     * 表示状態に応じてテキストと表示スタイルを切り替えます。
     */
    toggleBtn.onclick = () => {
        const isHidden = detailsDiv.style.display === 'none';
        
        if (isHidden) {
            detailsDiv.style.display = 'block';
            toggleBtn.textContent = '計算過程を非表示';
        } else {
            detailsDiv.style.display = 'none';
            toggleBtn.textContent = '計算過程を表示';
        }
    };
}