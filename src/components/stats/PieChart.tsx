'use client'

import React from 'react'
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts'

interface PieChartProps {
  data: Array<{
    name: string
    value: number
  }>
  title?: string
  colors?: string[]
  height?: number
}

/**
 * 圓餅圖元件
 * 使用 Recharts 繪製圓餅圖
 */
export default function PieChart({
  data,
  title,
  colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'],
  height = 300,
}: PieChartProps) {
  // 計算總數
  const total = data.reduce((sum, item) => sum + item.value, 0)

  // 自訂 Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const percentage = total > 0 ? ((payload[0].value / total) * 100).toFixed(1) : '0.0'
      return (
        <div className="bg-dark-300 border border-dark-200 rounded-lg p-3">
          <p className="text-foreground font-medium">{payload[0].name}</p>
          <p className="text-foreground-muted text-sm">
            數量: {payload[0].value}
          </p>
          <p className="text-foreground-muted text-sm">
            佔比: {percentage}%
          </p>
        </div>
      )
    }
    return null
  }

  // 自訂 Legend
  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap gap-4 justify-center mt-4">
        {payload.map((entry: any, index: number) => {
          const percentage = total > 0 ? ((entry.payload.value / total) * 100).toFixed(1) : '0.0'
          return (
            <div key={`legend-${index}`} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-foreground-muted">
                {entry.value}: {entry.payload.value} ({percentage}%)
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="bg-dark-300 border border-dark-200 rounded-lg p-6">
      {title && (
        <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  )
}

