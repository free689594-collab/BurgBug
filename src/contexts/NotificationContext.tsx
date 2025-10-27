'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import type {
  Notification,
  NotificationContextValue,
  LevelUpData,
  BadgeUnlockData
} from '@/types/notification'

// 建立 Context
const NotificationContext = createContext<NotificationContextValue | undefined>(undefined)

// Provider 組件
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  // 生成唯一 ID
  const generateId = () => `notification-${Date.now()}-${Math.random()}`

  // 關閉通知（先定義，避免依賴項警告）
  const closeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  // 顯示等級升級通知
  const showLevelUp = useCallback((data: LevelUpData, duration = 5000) => {
    const id = generateId()
    const notification: Notification = {
      id,
      type: 'level_up',
      data,
      duration,
      onClose: () => closeNotification(id)
    }

    setNotifications(prev => [...prev, notification])

    // 自動關閉
    if (duration > 0) {
      setTimeout(() => {
        closeNotification(id)
      }, duration)
    }
  }, [closeNotification])

  // 顯示勳章解鎖通知
  const showBadgeUnlock = useCallback((data: BadgeUnlockData, duration = 5000) => {
    const id = generateId()
    const notification: Notification = {
      id,
      type: 'badge_unlock',
      data,
      duration,
      onClose: () => closeNotification(id)
    }

    setNotifications(prev => [...prev, notification])

    // 自動關閉
    if (duration > 0) {
      setTimeout(() => {
        closeNotification(id)
      }, duration)
    }
  }, [closeNotification])

  // 清除所有通知
  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  const value: NotificationContextValue = {
    notifications,
    showLevelUp,
    showBadgeUnlock,
    closeNotification,
    clearAll
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

// Hook
export function useNotification() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}

