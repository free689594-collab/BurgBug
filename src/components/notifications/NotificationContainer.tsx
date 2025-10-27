'use client'

import React from 'react'
import { useNotification } from '@/contexts/NotificationContext'
import { LevelUpNotification } from './LevelUpNotification'
import { BadgeUnlockNotification } from './BadgeUnlockNotification'
import type { LevelUpData, BadgeUnlockData } from '@/types/notification'

export function NotificationContainer() {
  const { notifications, closeNotification } = useNotification()

  return (
    <>
      {notifications.map(notification => {
        if (notification.type === 'level_up') {
          return (
            <LevelUpNotification
              key={notification.id}
              data={notification.data as LevelUpData}
              onClose={() => closeNotification(notification.id)}
            />
          )
        }

        if (notification.type === 'badge_unlock') {
          return (
            <BadgeUnlockNotification
              key={notification.id}
              data={notification.data as BadgeUnlockData}
              onClose={() => closeNotification(notification.id)}
            />
          )
        }

        return null
      })}
    </>
  )
}

