'use client'

import { X } from 'lucide-react'

interface KeyboardShortcutsHelpProps {
  open: boolean
  onClose: () => void
}

interface Shortcut {
  keys: string[]
  description: string
  category: string
}

export default function KeyboardShortcutsHelp({ open, onClose }: KeyboardShortcutsHelpProps) {
  if (!open) return null

  const shortcuts: Shortcut[] = [
    // 全域功能
    { keys: ['Ctrl', 'K'], description: '開啟全域搜尋', category: '全域功能' },
    { keys: ['Ctrl', '/'], description: '顯示快捷鍵列表', category: '全域功能' },
    { keys: ['Esc'], description: '關閉彈窗', category: '全域功能' },
    
    // 快速導航
    { keys: ['Ctrl', '1'], description: '儀表板', category: '快速導航' },
    { keys: ['Ctrl', '2'], description: '會員管理', category: '快速導航' },
    { keys: ['Ctrl', '3'], description: '債務管理', category: '快速導航' },
    { keys: ['Ctrl', '4'], description: '訂閱管理', category: '快速導航' },
    { keys: ['Ctrl', '5'], description: '站內信', category: '快速導航' },
    { keys: ['Ctrl', '6'], description: '系統配置', category: '快速導航' },
  ]

  // 按類別分組
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = []
    }
    acc[shortcut.category].push(shortcut)
    return acc
  }, {} as Record<string, Shortcut[]>)

  // 檢測作業系統
  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const modifierKey = isMac ? '⌘' : 'Ctrl'

  return (
    <>
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* 快捷鍵面板 */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-dark-300 border border-dark-200 rounded-lg shadow-2xl z-50 overflow-hidden">
        {/* 標題列 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-200">
          <h2 className="text-xl font-bold text-foreground">鍵盤快捷鍵</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-200 rounded-md transition-colors"
          >
            <X className="w-5 h-5 text-foreground-muted" />
          </button>
        </div>

        {/* 快捷鍵列表 */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {Object.entries(groupedShortcuts).map(([category, items]) => (
            <div key={category} className="mb-6 last:mb-0">
              <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {items.map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between py-2 px-3 bg-dark-200/50 rounded-md">
                    <span className="text-foreground">{shortcut.description}</span>
                    <div className="flex items-center space-x-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <div key={keyIndex} className="flex items-center">
                          <kbd className="px-2 py-1 text-xs font-semibold text-foreground bg-dark-100 border border-dark-200 rounded shadow-sm">
                            {key === 'Ctrl' ? modifierKey : key}
                          </kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="mx-1 text-foreground-muted">+</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 底部提示 */}
        <div className="px-6 py-4 border-t border-dark-200 bg-dark-200/30">
          <p className="text-xs text-foreground-muted text-center">
            按 <kbd className="px-1.5 py-0.5 text-xs font-semibold text-foreground bg-dark-100 border border-dark-200 rounded">Esc</kbd> 或點擊背景關閉此面板
          </p>
        </div>
      </div>
    </>
  )
}

