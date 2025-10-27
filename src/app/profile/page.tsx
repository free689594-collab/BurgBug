'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MemberLayout from '@/components/layouts/MemberLayout'
import { LevelBadge } from '@/components/member/LevelBadge'
import { ActivityProgress } from '@/components/member/ActivityProgress'
import { BadgeDisplay } from '@/components/member/BadgeDisplay'
import { User, TrendingUp, Upload, Search, Calendar, Award } from 'lucide-react'
import type { MemberProfileData } from '@/types/member'

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [profileData, setProfileData] = useState<MemberProfileData | null>(null)

  useEffect(() => {
    fetchProfile()

    // 監聽使用者資料更新事件
    const handleUserDataUpdated = () => {
      fetchProfile()
    }

    window.addEventListener('userDataUpdated', handleUserDataUpdated)

    return () => {
      window.removeEventListener('userDataUpdated', handleUserDataUpdated)
    }
  }, [])

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/member/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error?.message || '載入失敗')
        return
      }

      setProfileData(data.data)
    } catch (err) {
      console.error('Failed to fetch profile:', err)
      setError('系統錯誤，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <MemberLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">載入中...</p>
          </div>
        </div>
      </MemberLayout>
    )
  }

  if (error || !profileData) {
    return (
      <MemberLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error || '載入失敗'}</p>
            <button
              onClick={fetchProfile}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              重新載入
            </button>
          </div>
        </div>
      </MemberLayout>
    )
  }

  return (
    <MemberLayout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* 頁面標題 */}
        <div className="flex items-center gap-3 mb-6">
          <User className="w-8 h-8 text-blue-500" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            會員資料
          </h1>
        </div>

        {/* 第一行：個人資訊和等級 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 個人資訊卡片 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              個人資訊
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">帳號</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {profileData.user.account}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">暱稱</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {profileData.user.nickname}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">業種</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {profileData.user.business_type}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">地區</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {profileData.user.business_region}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">狀態</span>
                <span className={`px-2 py-1 rounded text-sm font-medium ${
                  profileData.user.status === 'approved'
                    ? 'bg-green-100 text-green-700'
                    : profileData.user.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {profileData.user.status === 'approved' && '已審核'}
                  {profileData.user.status === 'pending' && '待審核'}
                  {profileData.user.status === 'suspended' && '已停用'}
                </span>
              </div>
            </div>
          </div>

          {/* 等級資訊卡片 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              等級資訊
            </h2>
            <div className="flex flex-col items-center gap-4">
              <LevelBadge
                level={profileData.level.current_level}
                title={profileData.level.title}
                titleColor={profileData.level.title_color}
                size="large"
              />
              <ActivityProgress
                currentPoints={profileData.level.activity_points}
                nextLevelPoints={profileData.level.next_level_points}
                currentLevel={profileData.level.current_level}
                nextLevel={profileData.level.current_level + 1}
                titleColor={profileData.level.title_color}
                className="w-full"
              />
              <div className="grid grid-cols-2 gap-4 w-full mt-2">
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">上傳配額獎勵</div>
                  <div className="text-lg font-bold text-green-600">
                    +{profileData.level.total_upload_bonus}
                  </div>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">查詢配額獎勵</div>
                  <div className="text-lg font-bold text-blue-600">
                    +{profileData.level.total_query_bonus}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 第二行：統計資料 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <Upload className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">今日上傳</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {profileData.stats.total_uploads}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Search className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">今日查詢</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {profileData.stats.total_queries}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">連續登入</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {profileData.stats.consecutive_login_days} 天
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <Award className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">勳章數量</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {profileData.stats.total_badges}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 第三行：勳章展示 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <BadgeDisplay
            badges={profileData.badges}
            totalBadges={34}
            maxDisplay={10}
          />
        </div>

        {/* 第四行：配額資訊 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            每日配額
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 dark:text-gray-400">上傳配額</span>
                <span className="font-bold text-green-600">
                  {profileData.quotas.remaining_uploads} / {profileData.quotas.daily_upload_limit}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{
                    width: `${(profileData.quotas.remaining_uploads / profileData.quotas.daily_upload_limit) * 100}%`
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 dark:text-gray-400">查詢配額</span>
                <span className="font-bold text-blue-600">
                  {profileData.quotas.remaining_queries} / {profileData.quotas.daily_query_limit}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{
                    width: `${(profileData.quotas.remaining_queries / profileData.quotas.daily_query_limit) * 100}%`
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </MemberLayout>
  )
}

