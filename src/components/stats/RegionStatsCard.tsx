'use client'

interface RegionStats {
  total: number
  north: number
  central: number
  south: number
  east: number
}

interface RegionStatsCardProps {
  stats: RegionStats
}

export default function RegionStatsCard({ stats }: RegionStatsCardProps) {
  // 防禦性檢查：確保所有數值都是有效的數字
  const safeTotal = stats?.total ?? 0
  const safeNorth = stats?.north ?? 0
  const safeCentral = stats?.central ?? 0
  const safeSouth = stats?.south ?? 0
  const safeEast = stats?.east ?? 0

  return (
    <div className="bg-dark-300 border border-dark-200 rounded-lg p-6">
      {/* 全台筆數 - 大標題 */}
      <div className="text-center mb-8">
        <p className="text-foreground-muted text-sm mb-2">全台債務筆數</p>
        <p className="text-5xl font-bold text-foreground">
          {safeTotal.toLocaleString()}
        </p>
      </div>

      {/* 4 大區 - 橫向排列 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* 北部 */}
        <div className="text-center p-4 bg-dark-200 rounded-lg hover:bg-dark-100 transition-colors">
          <p className="text-foreground-muted text-xs mb-2">北部</p>
          <p className="text-2xl md:text-3xl font-semibold text-blue-400">
            {safeNorth.toLocaleString()}
          </p>
          <p className="text-foreground-muted text-xs mt-1">
            北北基宜 + 桃竹苗
          </p>
        </div>

        {/* 中部 */}
        <div className="text-center p-4 bg-dark-200 rounded-lg hover:bg-dark-100 transition-colors">
          <p className="text-foreground-muted text-xs mb-2">中部</p>
          <p className="text-2xl md:text-3xl font-semibold text-green-400">
            {safeCentral.toLocaleString()}
          </p>
          <p className="text-foreground-muted text-xs mt-1">
            中彰投
          </p>
        </div>

        {/* 南部 */}
        <div className="text-center p-4 bg-dark-200 rounded-lg hover:bg-dark-100 transition-colors">
          <p className="text-foreground-muted text-xs mb-2">南部</p>
          <p className="text-2xl md:text-3xl font-semibold text-yellow-400">
            {safeSouth.toLocaleString()}
          </p>
          <p className="text-foreground-muted text-xs mt-1">
            雲嘉南 + 高屏澎
          </p>
        </div>

        {/* 東部 */}
        <div className="text-center p-4 bg-dark-200 rounded-lg hover:bg-dark-100 transition-colors">
          <p className="text-foreground-muted text-xs mb-2">東部</p>
          <p className="text-2xl md:text-3xl font-semibold text-orange-400">
            {safeEast.toLocaleString()}
          </p>
          <p className="text-foreground-muted text-xs mt-1">
            花東
          </p>
        </div>
      </div>

      {/* 說明文字 */}
      <div className="mt-6 text-center">
        <p className="text-foreground-muted text-xs">
          💡 數據統計依據會員業務區域分類，即時更新
        </p>
      </div>
    </div>
  )
}

