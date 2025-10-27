import type { Metadata } from 'next'
import './globals.css'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { NotificationContainer } from '@/components/notifications/NotificationContainer'

export const metadata: Metadata = {
  title: '臻好尋 - 債務查詢系統',
  description: '安全、可靠的債務資訊查詢平台',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW">
      <body>
        <NotificationProvider>
          {children}
          <NotificationContainer />
        </NotificationProvider>
      </body>
    </html>
  )
}

