'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/layouts/AdminLayout'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { TrendingUp, Edit2, Save, X } from 'lucide-react'
import type { ActivityRule } from '@/types/admin'

export default function ActivityRulesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rules, setRules] = useState<ActivityRule[]>([])
  const [editingRule, setEditingRule] = useState<ActivityRule | null>(null)
  const [formData, setFormData] = useState<Partial<ActivityRule>>({})
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    fetchRules()
  }, [])

  const fetchRules = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/admin/activity-rules', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error?.message || '載入失敗')
        return
      }

      setRules(data.data)
    } catch (err) {
      console.error('Failed to fetch rules:', err)
      setError('系統錯誤，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (rule: ActivityRule) => {
    setEditingRule(rule)
    setFormData(rule)
  }

  const handleCancel = () => {
    setEditingRule(null)
    setFormData({})
  }

  const handleSave = () => {
    setShowConfirm(true)
  }

  const confirmSave = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch('/api/admin/activity-rules', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error?.message || '更新失敗')
        return
      }

      alert('更新成功！')
      setEditingRule(null)
      setFormData({})
      setShowConfirm(false)
      fetchRules()
    } catch (err) {
      console.error('Failed to update rule:', err)
      alert('系統錯誤，請稍後再試')
    }
  }

  // 動作名稱映射
  const actionNames: Record<string, string> = {
    'upload': '上傳債務資料',
    'query': '查詢債務資料',
    'daily_login': '每日登入',
    'like_given': '給予按讚',
    'like_received': '收到按讚'
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">載入中...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={fetchRules}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              重新載入
            </button>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* 頁面標題 */}
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="w-8 h-8 text-blue-500" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            活躍度規則配置
          </h1>
        </div>

        {/* 說明 */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            💡 提示：修改活躍度規則會立即生效，請謹慎操作。每日上限設為 -1 表示無限制。
          </p>
        </div>

        {/* 規則表格 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  動作
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  點數
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  每日上限
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  冷卻時間
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {rules.map((rule) => (
                <tr key={rule.action} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {actionNames[rule.action] || rule.action}
                    </div>
                    {rule.description && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {rule.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingRule?.action === rule.action ? (
                      <input
                        type="number"
                        value={formData.points || 0}
                        onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) })}
                        className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        min="0"
                      />
                    ) : (
                      <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                        +{rule.points}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingRule?.action === rule.action ? (
                      <input
                        type="number"
                        value={formData.max_daily_count ?? 0}
                        onChange={(e) => setFormData({ ...formData, max_daily_count: parseInt(e.target.value) })}
                        className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        min="-1"
                      />
                    ) : (
                      <span className="text-sm text-gray-900 dark:text-white">
                        {rule.max_daily_count === -1 ? '無限制' : rule.max_daily_count}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingRule?.action === rule.action ? (
                      <input
                        type="number"
                        value={formData.cooldown_seconds || 0}
                        onChange={(e) => setFormData({ ...formData, cooldown_seconds: parseInt(e.target.value) })}
                        className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        min="0"
                      />
                    ) : (
                      <span className="text-sm text-gray-900 dark:text-white">
                        {rule.cooldown_seconds} 秒
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingRule?.action === rule.action ? (
                      <div className="flex gap-2">
                        <button
                          onClick={handleSave}
                          className="p-2 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                          title="儲存"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancel}
                          className="p-2 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                          title="取消"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEdit(rule)}
                        className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        title="編輯"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 確認對話框 */}
      <ConfirmDialog
        isOpen={showConfirm}
        title="確認更新"
        message="確定要更新此活躍度規則嗎？修改會立即生效。"
        confirmText="確認更新"
        cancelText="取消"
        onConfirm={confirmSave}
        onCancel={() => setShowConfirm(false)}
        type="warning"
      />
    </AdminLayout>
  )
}

