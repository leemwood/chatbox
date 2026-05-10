/**
 * OPPO Watch 2 屏幕适配检测工具
 * 用于检测是否在手表设备上运行，并提供UI缩放功能
 */

export interface WatchResolution {
  width: number
  height: number
  ppi: number
}

// OPPO Watch 2 规格
export const OPPO_WATCH_2_46MM: WatchResolution = {
  width: 402,
  height: 476,
  ppi: 326,
}

export const OPPO_WATCH_2_42MM: WatchResolution = {
  width: 372,
  height: 430,
  ppi: 326,
}

// 手表分辨率范围（用于检测）
export const WATCH_RESOLUTION_RANGES = {
  minWidth: 320,
  maxWidth: 500,
  minHeight: 350,
  maxHeight: 550,
}

// 手表UI缩放比例
export const WATCH_UI_SCALE = {
  min: 1.0,
  max: 2.0,
  default: 1.3,
  step: 0.1,
}

/**
 * 检测当前设备是否为手表分辨率
 */
export function isWatchResolution(): boolean {
  if (typeof window === 'undefined') return false

  const width = window.innerWidth
  const height = window.innerHeight

  // 检测是否在手表分辨率范围内
  const isWidthInRange =
    width >= WATCH_RESOLUTION_RANGES.minWidth &&
    width <= WATCH_RESOLUTION_RANGES.maxWidth
  const isHeightInRange =
    height >= WATCH_RESOLUTION_RANGES.minHeight &&
    height <= WATCH_RESOLUTION_RANGES.maxHeight

  return isWidthInRange && isHeightInRange
}

/**
 * 检测是否为OPPO Watch 2特定分辨率
 */
export function isOPPOWatch2(): boolean {
  if (typeof window === 'undefined') return false

  const width = window.innerWidth
  const height = window.innerHeight

  // 检测46mm版本
  const is46mm =
    (width === OPPO_WATCH_2_46MM.width && height === OPPO_WATCH_2_46MM.height) ||
    (width === OPPO_WATCH_2_46MM.height && height === OPPO_WATCH_2_46MM.width)

  // 检测42mm版本
  const is42mm =
    (width === OPPO_WATCH_2_42MM.width && height === OPPO_WATCH_2_42MM.height) ||
    (width === OPPO_WATCH_2_42MM.height && height === OPPO_WATCH_2_42MM.width)

  return is46mm || is42mm
}

/**
 * 获取当前设备的屏幕信息
 */
export function getScreenInfo(): {
  width: number
  height: number
  devicePixelRatio: number
  isWatch: boolean
  isOPPOWatch2: boolean
} {
  if (typeof window === 'undefined') {
    return {
      width: 0,
      height: 0,
      devicePixelRatio: 1,
      isWatch: false,
      isOPPOWatch2: false,
    }
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
    isWatch: isWatchResolution(),
    isOPPOWatch2: isOPPOWatch2(),
  }
}

/**
 * 计算手表UI缩放比例
 * @param baseScale 基础缩放比例（用户设置）
 * @returns 最终缩放比例
 */
export function calculateWatchScale(baseScale: number = WATCH_UI_SCALE.default): number {
  if (!isWatchResolution()) return 1.0

  // 限制在有效范围内
  return Math.max(WATCH_UI_SCALE.min, Math.min(WATCH_UI_SCALE.max, baseScale))
}

/**
 * 获取CSS缩放变量值
 */
export function getWatchScaleCSS(scale: number): string {
  return `${scale}`
}

/**
 * 监听屏幕尺寸变化
 */
export function watchScreenChanges(callback: (isWatch: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {}

  let lastIsWatch = isWatchResolution()

  const handleResize = () => {
    const currentIsWatch = isWatchResolution()
    if (currentIsWatch !== lastIsWatch) {
      lastIsWatch = currentIsWatch
      callback(currentIsWatch)
    }
  }

  window.addEventListener('resize', handleResize)

  // 返回清理函数
  return () => {
    window.removeEventListener('resize', handleResize)
  }
}
