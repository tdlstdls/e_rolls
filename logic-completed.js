/**
 * 担当: 「コンプ済み」ビューにおける全アイテムの計算ロジック
 * 構成:
 * 1. メイン計算関数 `calculateCompletedData`
 *    - `initializeNodes`: 全ノードの基本情報を算出
 *    - `calculateRerolls`: 再抽選・再々抽選の判定
 *    - `calculateSingleRollRoute`: 単発ルートのテキストを生成
 *    - `calculateMultiRollRoute`: 10連ルートのテキストを生成
 * 2. ポップアップHTML生成 `generateNodeCalculationDetailsHtml`
 *    - 各種ヘルパー関数
 * 3. 最適ルート探索 `runGachaBeamSearchCorrected`
 *    - `simulateSingleRoll`: 1回分のガチャをシミュレート
 *    - その他ヘルパー関数
 * 4. ハイライト情報生成 `generateHighlightMap`
 */

// =================================================================================
// メイン計算関数
// =================================================================================

function calculateCompletedData(initialSeed, gacha, tableRows, thresholds, initialLastRollId, initialNg) {
    const maxSeedsNeeded = Math.max(tableRows * 20, 20000);
    const SEED_LIST = generateSeedList(initialSeed, maxSeedsNeeded);
    
    const maxNodeIndex = Math.max(tableRows * 6, 6000);
    const Nodes = initializeNodes(SEED_LIST, maxNodeIndex, gacha, thresholds);
    
    calculateRerolls(Nodes, initialLastRollId, gacha);

    const singleRouteText = calculateSingleRollRoute(Nodes, tableRows, initialNg, initialLastRollId, gacha, thresholds, SEED_LIST);
    const multiRouteText = calculateMultiRollRoute(Nodes, tableRows, initialNg, initialLastRollId, gacha, thresholds, SEED_LIST);
    const highlightInfo = generateHighlightMap(Nodes, tableRows, initialNg, initialLastRollId, gacha.guaranteedCycle || 30, gacha);

    return { Nodes, singleRouteText, multiRouteText, highlightInfo, maxNodeIndex, SEED_LIST };
}