import { useEffect, useMemo, useState } from 'react'
import { WatchUIMode } from '@shared/types'
import {
  calculateWatchScale,
  getScreenInfo,
  isWatchResolution,
  watchScreenChanges,
  WATCH_UI_SCALE,
} from '@/utils/watchDetection'
import { useSettingsStore } from '@/stores/settingsStore'

export interface WatchAdaptationState {
  // 是否启用手表适配
  isEnabled: boolean
  // 当前是否为手表分辨率
  isWatchResolution: boolean
  // 当前缩放比例
  scale: number
  // 用户设置的缩放比例
  userScale: number
  // 屏幕信息
  screenInfo: {
    width: number
    height: number
    devicePixelRatio: number
  }
}

/**
 * 手表UI适配Hook
 * 用于检测手表分辨率并应用UI缩放
 */
export function useWatchAdaptation(): WatchAdaptationState {
  const watchAdaptation = useSettingsStore((state) => state.watchAdaptation)

  const [isWatch, setIsWatch] = useState(() => isWatchResolution())
  const [screenInfo, setScreenInfo] = useState(() => {
    const info = getScreenInfo()
    return {
      width: info.width,
      height: info.height,
      devicePixelRatio: info.devicePixelRatio,
    }
  })

  // 监听屏幕尺寸变化
  useEffect(() => {
    // 初始检测
    setIsWatch(isWatchResolution())
    setScreenInfo(getScreenInfo())

    // 监听变化
    const unsubscribe = watchScreenChanges((newIsWatch) => {
      setIsWatch(newIsWatch)
      setScreenInfo(getScreenInfo())
    })

    return unsubscribe
  }, [])

  // 计算是否启用手表适配
  const isEnabled = useMemo(() => {
    if (!watchAdaptation?.enabled) return false

    switch (watchAdaptation?.mode) {
      case WatchUIMode.Enabled:
        return true
      case WatchUIMode.Disabled:
        return false
      case WatchUIMode.Auto:
      default:
        return watchAdaptation?.autoDetect !== false && isWatch
    }
  }, [watchAdaptation, isWatch])

  // 计算缩放比例
  const scale = useMemo(() => {
    if (!isEnabled) return 1.0
    const userScale = watchAdaptation?.scale ?? WATCH_UI_SCALE.default
    return calculateWatchScale(userScale)
  }, [isEnabled, watchAdaptation?.scale])

  // 应用CSS缩放变量
  useEffect(() => {
    if (typeof document === 'undefined') return

    const root = document.documentElement

    if (isEnabled && scale > 1.0) {
      root.style.setProperty('--watch-scale', `${scale}`)
      root.style.setProperty('--watch-font-scale', `${scale}`)
      root.setAttribute('data-watch-mode', 'true')
    } else {
      root.style.removeProperty('--watch-scale')
      root.style.removeProperty('--watch-font-scale')
      root.removeAttribute('data-watch-mode')
    }

    return () => {
      root.style.removeProperty('--watch-scale')
      root.style.removeProperty('--watch-font-scale')
      root.removeAttribute('data-watch-mode')
    }
  }, [isEnabled, scale])

  return {
    isEnabled,
    isWatchResolution: isWatch,
    scale,
    userScale: watchAdaptation?.scale ?? WATCH_UI_SCALE.default,
    screenInfo,
  }
}

/**
 * 获取手表适配的CSS变量
 */
export function getWatchAdaptationCSS(): React.CSSProperties {
  if (typeof window === 'undefined') return {}

  const scale = calculateWatchScale()

  return {
    '--watch-scale': scale,
    '--watch-font-scale': scale,
  } as React.CSSProperties
}

/**
 * 检查手表适配是否活跃
 */
export function useIsWatchMode(): boolean {
  const { isEnabled } = useWatchAdaptation()
  return isEnabled
}

/**
 * 获取当前手表缩放比例
 */
export function useWatchScale(): number {
  const { scale } = useWatchAdaptation()
  return scale
}
