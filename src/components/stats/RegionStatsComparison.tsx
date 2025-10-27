'use client'

import { useState } from 'react'

interface RegionData {
  actual: number
  override: number
  display: number
}

interface RegionStatsComparisonProps {
  regions: Record<string, RegionData>
  summary: {
    total: number
    north: number
    central: number
    south: number
    east: number
  }
  totals: {
    actual: number
    override: number
    display: number
  }
  onUpdate: (newOverrides: Record<string, number>) => Promise<void>
}

export default function RegionStatsComparison({
  regions,
  summary,
  totals,
  onUpdate,
}: RegionStatsComparisonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingOverrides, setEditingOverrides] = useState<Record<string, number>>({})

  // 初始化編輯中的灌水量
  useState(() => {
    const overrides: Record<string, number> = {}
    Object.keys(regions).forEach((region) => {
      overrides[region] = regions[region].override
    })
    setEditingOverrides(overrides)
  })

  // 調整灌水量
  const handleAdjust = (region: string, delta: number) => {
    setEditingOverrides((prev) => {
      const newValue = Math.max(0, Math.min(50, (prev[region] || 0) + delta))
      return { ...prev, [region]: newValue }
    })
  }

  // 儲存變更
  const handleSave = async () => {
    try {
      setLoading(true)
      setError(null)
      await onUpdate(editingOverrides)
    } catch (err: any) {
      setError(err.message || '更新失敗')
    } finally {
      setLoading(false)
    }
  }

  // 重置變更
  const handleReset = () => {
    const overrides: Record<string, number> = {}
    Object.keys(regions).forEach((region) => {
      overrides[region] = regions[region].override
    })
    setEditingOverrides(overrides)
    setError(null)
  }

  // 檢查是否有變更
  const hasChanges = Object.keys(editingOverrides).some(
    (region) => editingOverrides[region] !== regions[region].override
  )

  // 計算即時的 4 大區統計（根據本地調整的灌水量）
  const calculateLiveSummary = () => {
    const liveDisplay: Record<string, number> = {}
    Object.keys(regions).forEach((region) => {
      liveDisplay[region] = regions[region].actual + (editingOverrides[region] || 0)
    })

    return {
      total: Object.values(liveDisplay).reduce((sum, count) => sum + count, 0),
      north: (liveDisplay['北北基宜'] || 0) + (liveDisplay['桃竹苗'] || 0),
      central: liveDisplay['中彰投'] || 0,
      south: (liveDisplay['雲嘉南'] || 0) + (liveDisplay['高屏澎'] || 0),
      east: liveDisplay['花東'] || 0,
    }
  }

  const liveSummary = calculateLiveSummary()

  return (
    <div className="space-y-6">
      {/* 標題 */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          區域統計對比（6 小區）
        </h3>
        <p className="text-foreground-muted text-sm">
          管理員可以調整各小區的展示數據增量（灌水量），會員將看到展示數據
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* 6 小區對比表格 */}
      <div className="bg-dark-300 border border-dark-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-dark-200 border-b border-dark-100">
                <th className="text-left py-3 px-4 text-foreground-muted font-medium">小區</th>
                <th className="text-right py-3 px-4 text-foreground-muted font-medium">實際</th>
                <th className="text-right py-3 px-4 text-foreground-muted font-medium">灌水量</th>
                <th className="text-right py-3 px-4 text-foreground-muted font-medium">展示</th>
                <th className="text-center py-3 px-4 text-foreground-muted font-medium">調整</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(regions).map(([region, data]) => (
                <tr key={region} className="border-b border-dark-200 last:border-0">
                  <td className="py-3 px-4 text-foreground font-medium">{region}</td>
                  <td className="py-3 px-4 text-foreground text-right">
                    {data.actual.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={
                      editingOverrides[region] !== data.override
                        ? 'text-yellow-400 font-semibold'
                        : 'text-foreground-muted'
                    }>
                      +{editingOverrides[region] || 0}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-foreground text-right font-semibold">
                    {(data.actual + (editingOverrides[region] || 0)).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleAdjust(region, -1)}
                        disabled={loading || (editingOverrides[region] || 0) <= 0}
                        className="px-3 py-1 bg-dark-100 hover:bg-dark-50 text-foreground rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        -
                      </button>
                      <span className="text-foreground min-w-[3rem] text-center">
                        {editingOverrides[region] || 0}
                      </span>
                      <button
                        onClick={() => handleAdjust(region, 1)}
                        disabled={loading || (editingOverrides[region] || 0) >= 50}
                        className="px-3 py-1 bg-dark-100 hover:bg-dark-50 text-foreground rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {/* 總計 */}
              <tr className="bg-dark-200 font-semibold">
                <td className="py-3 px-4 text-foreground">總計</td>
                <td className="py-3 px-4 text-foreground text-right">
                  {totals.actual.toLocaleString()}
                </td>
                <td className="py-3 px-4 text-yellow-400 text-right">
                  +{Object.values(editingOverrides).reduce((sum, val) => sum + val, 0)}
                </td>
                <td className="py-3 px-4 text-foreground text-right">
                  {(totals.actual + Object.values(editingOverrides).reduce((sum, val) => sum + val, 0)).toLocaleString()}
                </td>
                <td className="py-3 px-4"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 操作按鈕 */}
      {hasChanges && (
        <div className="flex gap-4">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '儲存中...' : '儲存變更'}
          </button>
          <button
            onClick={handleReset}
            disabled={loading}
            className="px-6 py-2 bg-dark-200 hover:bg-dark-100 text-foreground rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            取消
          </button>
        </div>
      )}

      {/* 4 大區統計（會員視角） */}
      <div className="bg-dark-300 border border-dark-200 rounded-lg p-6">
        <h4 className="text-md font-semibold text-foreground mb-4">
          4 大區統計（會員視角）
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-4 bg-dark-200 rounded-lg">
            <p className="text-foreground-muted text-xs mb-1">全台</p>
            <p className="text-2xl font-bold text-foreground">
              {liveSummary.total.toLocaleString()}
            </p>
          </div>
          <div className="text-center p-4 bg-dark-200 rounded-lg">
            <p className="text-foreground-muted text-xs mb-1">北部</p>
            <p className="text-xl font-semibold text-blue-400">
              {liveSummary.north.toLocaleString()}
            </p>
          </div>
          <div className="text-center p-4 bg-dark-200 rounded-lg">
            <p className="text-foreground-muted text-xs mb-1">中部</p>
            <p className="text-xl font-semibold text-green-400">
              {liveSummary.central.toLocaleString()}
            </p>
          </div>
          <div className="text-center p-4 bg-dark-200 rounded-lg">
            <p className="text-foreground-muted text-xs mb-1">南部</p>
            <p className="text-xl font-semibold text-yellow-400">
              {liveSummary.south.toLocaleString()}
            </p>
          </div>
          <div className="text-center p-4 bg-dark-200 rounded-lg">
            <p className="text-foreground-muted text-xs mb-1">東部</p>
            <p className="text-xl font-semibold text-orange-400">
              {liveSummary.east.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

