'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/layouts/AdminLayout'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { ColorPicker } from '@/components/admin/ColorPicker'
import { LevelBadge } from '@/components/member/LevelBadge'
import { Trophy, Edit2, Save, X, Trash2 } from 'lucide-react'
import type { LevelConfig } from '@/types/admin'

export default function LevelConfigPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [levels, setLevels] = useState<LevelConfig[]>([])
  const [editingLevel, setEditingLevel] = useState<LevelConfig | null>(null)
  const [formData, setFormData] = useState<Partial<LevelConfig>>({})
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'save' | 'delete'>('save')

  const fetchLevels = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/admin/level-config', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error?.message || '載入失敗')
        return
      }

      setLevels(data.data)
    } catch (err) {
      console.error('Failed to fetch levels:', err)
      setError('系統錯誤，請稍後再試')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchLevels()
  }, [fetchLevels])

  const handleEdit = (level: LevelConfig) => {
    setEditingLevel(level)
    setFormData(level)
  }

  const handleCancel = () => {
    setEditingLevel(null)
    setFormData({})
  }

  const handleSave = () => {
    setConfirmAction('save')
    setShowConfirm(true)
  }

  const handleDelete = (level: LevelConfig) => {
    if (level.level === 1 || level.level === 99) {
      alert('無法刪除 LV1 和 LV99')
      return
    }
    setEditingLevel(level)
    setFormData(level)
    setConfirmAction('delete')
    setShowConfirm(true)
  }

  const confirmSave = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch('/api/admin/level-config', {
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
      setEditingLevel(null)
      setFormData({})
      setShowConfirm(false)
      fetchLevels()
    } catch (err) {
      console.error('Failed to update level:', err)
      alert('系統錯誤，請稍後再試')
    }
  }

  const confirmDelete = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch(`/api/admin/level-config?level=${formData.level}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error?.message || '刪除失敗')
        return
      }

      alert('刪除成功！')
      setEditingLevel(null)
      setFormData({})
      setShowConfirm(false)
      fetchLevels()
    } catch (err) {
      console.error('Failed to delete level:', err)
      alert('系統錯誤，請稍後再試')
    }
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
              onClick={fetchLevels}
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
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* 頁面標題 */}
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="w-8 h-8 text-blue-500" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            等級配置
          </h1>
        </div>

        {/* 說明 */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            💡 提示：修改等級配置會立即生效，請謹慎操作。LV1 和 LV99 無法刪除。
          </p>
        </div>

        {/* 等級表格 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    等級
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    預覽
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    稱號
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    顏色
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    所需點數
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    上傳獎勵
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    查詢獎勵
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {levels.map((level) => (
                  <tr key={level.level} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        LV{level.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <LevelBadge
                        level={editingLevel?.level === level.level ? (formData.level || level.level) : level.level}
                        title={editingLevel?.level === level.level ? (formData.title || level.title) : level.title}
                        titleColor={editingLevel?.level === level.level ? (formData.title_color || level.title_color) : level.title_color}
                        size="small"
                      />
                    </td>
                    <td className="px-6 py-4">
                      {editingLevel?.level === level.level ? (
                        <input
                          type="text"
                          value={formData.title || ''}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        />
                      ) : (
                        <span className="text-sm text-gray-900 dark:text-white">
                          {level.title}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingLevel?.level === level.level ? (
                        <ColorPicker
                          value={formData.title_color || level.title_color}
                          onChange={(color) => setFormData({ ...formData, title_color: color })}
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
                            style={{ backgroundColor: level.title_color }}
                          />
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {level.title_color}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingLevel?.level === level.level ? (
                        <input
                          type="number"
                          value={formData.required_points ?? 0}
                          onChange={(e) => setFormData({ ...formData, required_points: parseInt(e.target.value) })}
                          className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          min="0"
                        />
                      ) : (
                        <span className="text-sm text-gray-900 dark:text-white">
                          {level.required_points.toLocaleString()}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingLevel?.level === level.level ? (
                        <input
                          type="number"
                          value={formData.bonus_upload_quota ?? 0}
                          onChange={(e) => setFormData({ ...formData, bonus_upload_quota: parseInt(e.target.value) })}
                          className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          min="0"
                        />
                      ) : (
                        <span className="text-sm text-green-600 dark:text-green-400">
                          +{level.bonus_upload_quota}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingLevel?.level === level.level ? (
                        <input
                          type="number"
                          value={formData.bonus_query_quota ?? 0}
                          onChange={(e) => setFormData({ ...formData, bonus_query_quota: parseInt(e.target.value) })}
                          className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          min="0"
                        />
                      ) : (
                        <span className="text-sm text-blue-600 dark:text-blue-400">
                          +{level.bonus_query_quota}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingLevel?.level === level.level ? (
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
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(level)}
                            className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            title="編輯"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {level.level !== 1 && level.level !== 99 && (
                            <button
                              onClick={() => handleDelete(level)}
                              className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                              title="刪除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 確認對話框 */}
      <ConfirmDialog
        isOpen={showConfirm}
        title={confirmAction === 'save' ? '確認更新' : '確認刪除'}
        message={confirmAction === 'save' ? '確定要更新此等級配置嗎？修改會立即生效。' : '確定要刪除此等級配置嗎？此操作無法復原。'}
        confirmText={confirmAction === 'save' ? '確認更新' : '確認刪除'}
        cancelText="取消"
        onConfirm={confirmAction === 'save' ? confirmSave : confirmDelete}
        onCancel={() => setShowConfirm(false)}
        type={confirmAction === 'save' ? 'warning' : 'danger'}
      />
    </AdminLayout>
  )
}

