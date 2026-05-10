/**
 * 手表UI适配初始化
 * 在应用启动时初始化手表分辨率检测和适配
 */

import { settingsStore } from '@/stores/settingsStore'
import { WatchUIMode } from '@shared/types'
import { isWatchResolution, calculateWatchScale } from '@/utils/watchDetection'

/**
 * 初始化手表UI适配
 * 在应用启动时调用，设置CSS变量和监听
 */
export function initWatchAdaptation(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const applyWatchAdaptation = () => {
    const state = settingsStore.getState()
    const watchAdaptation = state.watchAdaptation

    // 如果手表适配未启用，直接返回
    if (!watchAdaptation?.enabled) {
      document.documentElement.removeAttribute('data-watch-mode')
      document.documentElement.style.removeProperty('--watch-scale')
      document.documentElement.style.removeProperty('--watch-font-scale')
      return
    }

    // 根据模式决定是否应用适配
    let shouldApply = false

    switch (watchAdaptation.mode) {
      case WatchUIMode.Enabled:
        shouldApply = true
        break
      case WatchUIMode.Disabled:
        shouldApply = false
        break
      case WatchUIMode.Auto:
      default:
        shouldApply = watchAdaptation.autoDetect !== false && isWatchResolution()
        break
    }

    if (shouldApply) {
      const scale = calculateWatchScale(watchAdaptation.scale)
      document.documentElement.setAttribute('data-watch-mode', 'true')
      document.documentElement.style.setProperty('--watch-scale', `${scale}`)
      document.documentElement.style.setProperty('--watch-font-scale', `${scale}`)
    } else {
      document.documentElement.removeAttribute('data-watch-mode')
      document.documentElement.style.removeProperty('--watch-scale')
      document.documentElement.style.removeProperty('--watch-font-scale')
    }
  }

  // 初始应用
  applyWatchAdaptation()

  // 监听设置变化
  const unsubscribe = settingsStore.subscribe((state, prevState) => {
    if (state.watchAdaptation !== prevState.watchAdaptation) {
      applyWatchAdaptation()
    }
  })

  // 监听窗口大小变化
  let resizeTimeout: ReturnType<typeof setTimeout> | null = null
  const handleResize = () => {
    if (resizeTimeout) clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(() => {
      applyWatchAdaptation()
    }, 100)
  }

  window.addEventListener('resize', handleResize)

  // 监听屏幕方向变化
  window.addEventListener('orientationchange', () => {
    setTimeout(applyWatchAdaptation, 100)
  })

  // 返回清理函数（如果需要）
  // 注意：这个初始化通常不需要清理，因为应用生命周期内都需要
}

/**
 * 获取当前手表适配状态
 */
export function getWatchAdaptationStatus(): {
  isEnabled: boolean
  isWatchResolution: boolean
  scale: number
} {
  const state = settingsStore.getState()
  const watchAdaptation = state.watchAdaptation

  if (!watchAdaptation?.enabled) {
    return {
      isEnabled: false,
      isWatchResolution: isWatchResolution(),
      scale: 1.0,
    }
  }

  let isActive = false
  switch (watchAdaptation.mode) {
    case WatchUIMode.Enabled:
      isActive = true
      break
    case WatchUIMode.Disabled:
      isActive = false
      break
    case WatchUIMode.Auto:
    default:
      isActive = watchAdaptation.autoDetect !== false && isWatchResolution()
      break
  }

  return {
    isEnabled: isActive,
    isWatchResolution: isWatchResolution(),
    scale: isActive ? calculateWatchScale(watchAdaptation.scale) : 1.0,
  }
}

// 自动初始化（如果在浏览器环境中）
if (typeof window !== 'undefined') {
  // 延迟初始化，确保settings已加载
  setTimeout(initWatchAdaptation, 0)
}
