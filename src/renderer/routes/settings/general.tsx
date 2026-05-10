import {
  Alert,
  Button,
  Checkbox,
  Divider,
  FileButton,
  Flex,
  Radio,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { type Language, type ProviderInfo, type Settings, Theme, WatchUIMode } from '@shared/types'
import { formatFileSize } from '@shared/utils'
import { IconInfoCircle } from '@tabler/icons-react'
import { createFileRoute } from '@tanstack/react-router'
import dayjs from 'dayjs'
import { mapValues, uniqBy } from 'lodash'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AdaptiveSelect } from '@/components/AdaptiveSelect'
import LazySlider from '@/components/common/LazySlider'
import { languageNameMap, languages } from '@/i18n/locales'
import platform from '@/platform'
import storage, { StorageKey } from '@/storage'
import { recoverSessionList } from '@/stores/chatStore'
import { migrateOnData } from '@/stores/migration'
import { useSettingsStore } from '@/stores/settingsStore'
import { useWatchAdaptation } from '@/hooks/useWatchAdaptation'

export const Route = createFileRoute('/settings/general')({
  component: RouteComponent,
})

export function RouteComponent() {
  const { t } = useTranslation()
  const { setSettings, ...settings } = useSettingsStore((state) => state)
  const watchAdaptation = useWatchAdaptation()

  return (
    <Stack p="md" gap="xl">
      <Title order={5}>{t('General Settings')}</Title>

      {/* Display Settings */}
      <Stack gap="md">
        <Title order={5}>{t('Display Settings')}</Title>

        {/* language */}
        <AdaptiveSelect
          maw={320}
          comboboxProps={{ withinPortal: true }}
          value={settings.language}
          data={languages.map((language) => ({
            value: language,
            label: languageNameMap[language],
            // style: language === 'ar' ? { fontFamily: 'Cairo, Arial, sans-serif' } : {},
          }))}
          label={t('Language')}
          styles={{
            label: {
              fontWeight: 400,
            },
          }}
          onChange={(val) => {
            if (val) {
              setSettings({
                language: val as Language,
              })
            }
          }}
        />

        {/* theme */}
        <AdaptiveSelect
          maw={320}
          comboboxProps={{ withinPortal: true, withArrow: true }}
          label={t('Theme')}
          styles={{
            label: {
              fontWeight: 400,
            },
          }}
          data={[
            { value: `${Theme.System}`, label: t('Follow System') },
            { value: `${Theme.Light}`, label: t('Light Mode') },
            { value: `${Theme.Dark}`, label: t('Dark Mode') },
          ]}
          value={`${settings.theme}`}
          onChange={(val) => {
            if (val) {
              setSettings({
                theme: parseInt(val),
              })
            }
          }}
        />

        {/* Font Size */}
        <Stack>
          <Text>{t('Font Size')}</Text>
          <LazySlider
            step={1}
            min={10}
            max={22}
            maw={320}
            marks={[
              {
                value: 14,
              },
            ]}
            value={settings.fontSize}
            onChange={(val) =>
              setSettings({
                fontSize: val,
              })
            }
          />
        </Stack>

        {/* Startup Page */}
        <Stack>
          <Text>{t('Startup Page')}</Text>
          <Radio.Group
            value={settings.startupPage}
            defaultValue="home"
            onChange={(val) => setSettings({ startupPage: val as any })}
          >
            <Flex gap="md">
              <Radio label={t('Home Page')} value="home" />
              <Radio label={t('Last Session')} value="session" />
            </Flex>
          </Radio.Group>
        </Stack>

        {/* Watch UI Adaptation */}
        <WatchAdaptationSection />
      </Stack>

      <Divider />

      {/* Network Proxy */}
      <Stack gap="xs">
        <Title order={5}>{t('Network Proxy')}</Title>
        <TextInput
          maw={320}
          placeholder="socks5://127.0.0.1:6153"
          value={settings.proxy}
          onChange={(e) =>
            setSettings({
              proxy: e.currentTarget.value,
            })
          }
        />
      </Stack>

      <Divider />

      {/* Data Recovery */}
      <DataRecoverySection />

      <Divider />

      {/* import and export data */}
      <ImportExportDataSection />

      <Divider />

      {/* Export Logs */}
      <ExportLogsSection />

      <Divider />

      {/* Error Reporting */}
      <Stack gap="md">
        <Stack gap="xxs">
          <Title order={5}>{t('Error Reporting')}</Title>
          <Text c="chatbox-tertiary">
            {t(
              'Chatbox respects your privacy and only uploads anonymous error data and events when necessary. You can change your preferences at any time in the settings.'
            )}
          </Text>
        </Stack>

        <Checkbox
          label={t('Enable optional anonymous reporting of crash and event data')}
          checked={settings.allowReportingAndTracking}
          onChange={(e) => setSettings({ allowReportingAndTracking: e.target.checked })}
        />
      </Stack>

      {/* others */}
      {platform.type === 'desktop' && (
        <>
          <Divider />

          <Stack gap="xl">
            <Switch
              label={t('Launch at system startup')}
              checked={settings.autoLaunch}
              onChange={(e) =>
                setSettings({
                  autoLaunch: e.currentTarget.checked,
                })
              }
            />
            <Switch
              label={t('Automatic updates')}
              checked={settings.autoUpdate}
              onChange={(e) =>
                setSettings({
                  autoUpdate: e.currentTarget.checked,
                })
              }
            />
            <Switch
              label={t('Beta updates')}
              checked={settings.betaUpdate}
              onChange={(e) =>
                setSettings({
                  betaUpdate: e.currentTarget.checked,
                })
              }
            />
          </Stack>
        </>
      )}
    </Stack>
  )
}

const DataRecoverySection = () => {
  const { t } = useTranslation()
  const [isRecovering, setIsRecovering] = useState(false)
  const [recoveryResult, setRecoveryResult] = useState<{
    success: boolean
    recovered?: number
    failed?: number
    error?: string
  } | null>(null)

  const handleRecover = async () => {
    setIsRecovering(true)
    setRecoveryResult(null)
    try {
      const result = await recoverSessionList()
      setRecoveryResult({ success: true, recovered: result.recovered, failed: result.failed })
    } catch (error) {
      console.error('Failed to recover session list:', error)
      setRecoveryResult({ success: false, error: String(error) })
    } finally {
      setIsRecovering(false)
    }
  }

  const hasPartialFailure = recoveryResult?.success && recoveryResult.failed && recoveryResult.failed > 0

  return (
    <Stack gap="md">
      <Stack gap="xxs">
        <Title order={5}>{t('Data Recovery')}</Title>
        <Text c="chatbox-tertiary">
          {t('If conversations are missing from the list, use this feature to scan and recover them from storage')}
        </Text>
      </Stack>
      <Button className="self-start" onClick={handleRecover} disabled={isRecovering} loading={isRecovering}>
        {isRecovering ? t('Recovering...') : t('Recover Conversation List')}
      </Button>
      {recoveryResult && (
        <Alert
          className="self-start"
          variant="light"
          color={recoveryResult.success ? (hasPartialFailure ? 'yellow' : 'green') : 'red'}
          title={
            recoveryResult.success
              ? t('Recovered {{count}} conversations', { count: recoveryResult.recovered })
              : t('Recovery failed')
          }
          icon={<IconInfoCircle />}
        >
          {recoveryResult.success ? (
            <Stack gap="xs">
              <Text size="sm">{t('The conversation list has been successfully recovered')}</Text>
              {hasPartialFailure && (
                <Text size="sm" c="orange">
                  {t('{{count}} conversations could not be recovered due to data read errors', {
                    count: recoveryResult.failed,
                  })}
                </Text>
              )}
            </Stack>
          ) : (
            <Text size="sm">{recoveryResult.error || t('Unknown error')}</Text>
          )}
        </Alert>
      )}
    </Stack>
  )
}

const ImportExportDataSection = () => {
  const { t } = useTranslation()

  const [importTips, setImportTips] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [exportItems, setExportItems] = useState<ExportDataItem[]>([
    ExportDataItem.Setting,
    ExportDataItem.Conversations,
    ExportDataItem.Copilot,
  ])

  const isLoading = isExporting || isImporting

  const onExport = async () => {
    if (isLoading) return

    setIsExporting(true)
    try {
      const date = new Date()
      const dateStr = dayjs(date).format('YYYY-M-D')

      const streamingDataGenerator = async function* () {
        yield '{'

        let isFirstItem = true

        // 导出metadata
        if (!isFirstItem) yield ','
        yield `"__exported_items":${JSON.stringify(exportItems)}`
        isFirstItem = false

        if (!isFirstItem) yield ','
        yield `"__exported_at":"${date.toISOString()}"`

        // 获取所有存储的keys
        try {
          const allKeys = await storage.getAllKeys()

          for (const key of allKeys) {
            let shouldExport = false

            // 判断是否需要导出这个key
            if (key === StorageKey.Settings && exportItems.includes(ExportDataItem.Setting)) {
              shouldExport = true
            } else if (key.startsWith('session:') && exportItems.includes(ExportDataItem.Conversations)) {
              shouldExport = true
            } else if (key === StorageKey.MyCopilots && exportItems.includes(ExportDataItem.Copilot)) {
              shouldExport = true
            } else if (key === StorageKey.ChatSessionsList && exportItems.includes(ExportDataItem.Conversations)) {
              shouldExport = true
            } else if (key === StorageKey.ChatSessionSettings && exportItems.includes(ExportDataItem.Conversations)) {
              shouldExport = true
            } else if (
              key === StorageKey.PictureSessionSettings &&
              exportItems.includes(ExportDataItem.Conversations)
            ) {
              shouldExport = true
            } else if (key === StorageKey.ConfigVersion) {
              shouldExport = true
            }

            // 跳过不需要导出的key
            if (key === StorageKey.Configs) {
              shouldExport = false // 不导出 uuid
            }

            if (shouldExport) {
              try {
                const value = await storage.getItem(key, null)
                if (value !== null) {
                  // 对settings进行特殊处理，清理敏感数据
                  if (key === StorageKey.Settings) {
                    const cleanedSettings = { ...(value as Settings) }
                    cleanedSettings.licenseDetail = undefined
                    cleanedSettings.licenseInstances = undefined

                    if (!exportItems.includes(ExportDataItem.Key)) {
                      delete cleanedSettings.licenseKey
                      if (cleanedSettings.providers) {
                        cleanedSettings.providers = mapValues(cleanedSettings.providers, (provider: ProviderInfo) => {
                          const cleanedProvider = { ...provider }
                          delete cleanedProvider.apiKey
                          delete cleanedProvider.accessKey
                          delete cleanedProvider.secretKey
                          delete cleanedProvider.sessionToken
                          return cleanedProvider
                        }) as unknown as { [key: string]: ProviderInfo }
                      }
                    }

                    yield ','
                    yield `"${key}":${JSON.stringify(cleanedSettings)}`
                  } else {
                    yield ','
                    yield `"${key}":${JSON.stringify(value)}`
                  }
                }
              } catch (error) {
                console.warn(`Failed to export key ${key}:`, error)
              }
            }
          }
        } catch (error) {
          console.error('Failed to get storage keys:', error)
        }

        yield '}'
      }

      await platform.exporter.exportStreamingJson(`chatbox-exported-data-${dateStr}.json`, streamingDataGenerator)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const onImport = (file: File | null) => {
    if (isLoading) return

    const errTip = t('Import failed, unsupported data format')
    if (!file) {
      return
    }

    setIsImporting(true)
    setImportTips('')

    const reader = new FileReader()
    reader.onload = (event) => {
      void (async () => {
        try {
          const result = event.target?.result
          if (typeof result !== 'string') {
            throw new Error('FileReader result is not string')
          }
          const importData = JSON.parse(result)
          // 如果导入数据中包含了老的版本号，应该仅仅针对老的版本号进行迁移
          await migrateOnData(
            {
              getData: (key, defaultValue) => Promise.resolve(importData[key] ?? defaultValue),
              setData: (key, value) => {
                importData[key] = value
                return Promise.resolve()
              },
              setAll: (data) => {
                Object.assign(importData, data)
                return Promise.resolve()
              },
            },
            false
          )

          const entriesToImport = Object.entries(importData).filter(
            ([key]) => key !== StorageKey.ChatSessionsList && key !== StorageKey.ConfigVersion && !key.startsWith('__')
          )

          const importedChatSessions = Array.isArray(importData[StorageKey.ChatSessionsList])
            ? importData[StorageKey.ChatSessionsList]
            : undefined

          for (const [key, value] of entriesToImport) {
            await storage.setItemNow(key, value)
          }

          if (importedChatSessions) {
            const previousChatSessions = await storage.getItem(StorageKey.ChatSessionsList, [])

            await storage.setItemNow(
              StorageKey.ChatSessionsList,
              uniqBy([...previousChatSessions, ...importedChatSessions], 'id')
            )
          }

          // 由于即将重启应用，这里不需要清理loading状态
          // props.onCancel() // 导入成功后立即关闭设置窗口，防止用户点击保存、导致设置数据被覆盖
          platform.relaunch() // 重启应用以生效
        } catch (err) {
          setImportTips(errTip)
          setIsImporting(false)
          throw err
        }
      })()
    }
    reader.onerror = (event) => {
      setImportTips(errTip)
      setIsImporting(false)
      const err = event.target?.error
      if (!err) {
        throw new Error('FileReader error but no error message')
      }
      throw err
    }
    reader.readAsText(file)
  }

  const [showStorageInfo, setShowStorageInfo] = useState(false)
  const [storagePersisted, setStoragePersisted] = useState<boolean>()
  const [storageEstimate, setStorageEstimate] = useState<StorageEstimate>()
  const storageInfo = useMemo(
    () =>
      `Storage persisted: ${storagePersisted}; Storage Estimate: { quota: ${formatFileSize(storageEstimate?.quota || 0)}, usage: ${formatFileSize(storageEstimate?.usage || 0)} }`,
    [storagePersisted, storageEstimate]
  )
  useEffect(() => {
    if (window?.navigator?.storage) {
      window.navigator.storage.estimate?.().then((res) => setStorageEstimate(res))
      window.navigator.storage.persisted?.().then((p) => setStoragePersisted(p))
    }
  }, [])

  return (
    <>
      <Stack gap="md">
        <Title order={5} onDoubleClick={() => setShowStorageInfo(true)}>
          {t('Data Backup')}
        </Title>
        {showStorageInfo && (
          <Text size="xs" c="chatbox-tertiary">
            {storageInfo}
          </Text>
        )}
        {[
          { label: t('Settings'), value: ExportDataItem.Setting },
          { label: t('API KEY & License'), value: ExportDataItem.Key },
          { label: t('Chat History'), value: ExportDataItem.Conversations },
          { label: t('My Copilots'), value: ExportDataItem.Copilot },
        ].map(({ label, value }) => (
          <Checkbox
            key={value}
            checked={exportItems.includes(value)}
            label={label}
            disabled={isLoading}
            onChange={(e) => {
              const checked = e.currentTarget.checked
              if (checked && !exportItems.includes(value)) {
                setExportItems([...exportItems, value])
              } else if (!checked) {
                setExportItems(exportItems.filter((v) => v !== value))
              }
            }}
          />
        ))}
        <Button className="self-start" onClick={onExport} disabled={isLoading} loading={isExporting}>
          {isExporting ? t('Exporting...') : t('Export Selected Data')}
        </Button>
      </Stack>

      <Divider />

      <Stack gap="lg">
        <Stack gap="xxs">
          <Title order={5}>{t('Data Restore')}</Title>
          <Text c="chatbox-tertiary">
            {t('Upon import, changes will take effect immediately and existing data will be overwritten')}
          </Text>
        </Stack>
        {importTips && (
          <Alert
            className=" self-start"
            variant="light"
            color="yellow"
            title={importTips}
            icon={<IconInfoCircle />}
          ></Alert>
        )}
        <FileButton accept="application/json" onChange={onImport} disabled={isLoading}>
          {(props) => (
            <Button {...props} className="self-start" disabled={isLoading} loading={isImporting}>
              {isImporting ? t('Importing...') : t('Import and Restore')}
            </Button>
          )}
        </FileButton>
      </Stack>
    </>
  )
}

enum ExportDataItem {
  Setting = 'setting',
  Key = 'key',
  Conversations = 'conversations',
  Copilot = 'copilot',
}

const ExportLogsSection = () => {
  const { t } = useTranslation()
  const [isExporting, setIsExporting] = useState(false)
  const [exportResult, setExportResult] = useState<{
    success: boolean
    error?: string
  } | null>(null)

  const handleExportLogs = async () => {
    setIsExporting(true)
    setExportResult(null)
    try {
      const logs = await platform.exportLogs()
      if (!logs || logs.trim() === '') {
        setExportResult({ success: true })
        return
      }

      const date = new Date()
      const dateStr = dayjs(date).format('YYYY-M-D_H-m')
      await platform.exporter.exportTextFile(`chatbox-logs-${dateStr}.txt`, logs)
      setExportResult({ success: true })
    } catch (error) {
      console.error('Failed to export logs:', error)
      setExportResult({ success: false, error: String(error) })
    } finally {
      setIsExporting(false)
    }
  }

  const handleClearLogs = async () => {
    try {
      await platform.clearLogs()
      setExportResult({ success: true })
    } catch (error) {
      console.error('Failed to clear logs:', error)
    }
  }

  return (
    <Stack gap="md">
      <Stack gap="xxs">
        <Title order={5}>{t('Diagnostic Logs')}</Title>
        <Text c="chatbox-tertiary">
          {t(
            'Export application logs for troubleshooting. These logs may be requested by support to help diagnose issues.'
          )}
        </Text>
      </Stack>
      <Flex gap="md">
        <Button variant="primary" onClick={handleExportLogs} disabled={isExporting} loading={isExporting}>
          {isExporting ? t('Exporting...') : t('Export Logs')}
        </Button>
        {/* <Button variant="subtle" color="red" onClick={handleClearLogs} disabled={isExporting}>
          {t('Clear Logs')}
        </Button> */}
      </Flex>
      {exportResult && !exportResult.success && (
        <Alert className="self-start" variant="light" color="red" title={t('Export failed')} icon={<IconInfoCircle />}>
          <Text size="sm">{exportResult.error || t('Unknown error')}</Text>
        </Alert>
      )}
    </Stack>
  )
}

/**
 * 手表UI适配设置组件
 */
const WatchAdaptationSection = () => {
  const { t } = useTranslation()
  const { setSettings, ...settings } = useSettingsStore((state) => state)
  const watchAdaptation = useWatchAdaptation()

  const watchSettings = settings.watchAdaptation || {
    enabled: true,
    mode: WatchUIMode.Auto,
    scale: 1.3,
    autoDetect: true,
  }

  const updateWatchSettings = (updates: Partial<typeof watchSettings>) => {
    setSettings({
      watchAdaptation: {
        ...watchSettings,
        ...updates,
      },
    })
  }

  return (
    <Stack gap="md" mt="md">
      <Divider />

      <Stack gap="xs">
        <Title order={5}>{t('Watch UI Adaptation')}</Title>
        <Text c="chatbox-tertiary" size="sm">
          {t('Optimize UI display for smartwatch screens like OPPO Watch 2')}
        </Text>
      </Stack>

      {/* 检测状态显示 */}
      {watchAdaptation.isWatchResolution && (
        <Alert variant="light" color="blue" icon={<IconInfoCircle />} className="self-start">
          <Text size="sm">
            {t('Watch resolution detected: {{width}}x{{height}}', {
              width: watchAdaptation.screenInfo.width,
              height: watchAdaptation.screenInfo.height,
            })}
          </Text>
        </Alert>
      )}

      {/* 启用手表适配 */}
      <Switch
        label={t('Enable watch UI adaptation')}
        checked={watchSettings.enabled}
        onChange={(e) => updateWatchSettings({ enabled: e.currentTarget.checked })}
      />

      {watchSettings.enabled && (
        <>
          {/* 适配模式 */}
          <AdaptiveSelect
            maw={320}
            comboboxProps={{ withinPortal: true, withArrow: true }}
            label={t('Adaptation Mode')}
            styles={{
              label: {
                fontWeight: 400,
              },
            }}
            data={[
              { value: `${WatchUIMode.Auto}`, label: t('Auto Detect') },
              { value: `${WatchUIMode.Enabled}`, label: t('Always Enabled') },
              { value: `${WatchUIMode.Disabled}`, label: t('Always Disabled') },
            ]}
            value={`${watchSettings.mode}`}
            onChange={(val) => {
              if (val) {
                updateWatchSettings({ mode: parseInt(val) as WatchUIMode })
              }
            }}
          />

          {/* 自动检测开关（仅在自动模式下显示） */}
          {watchSettings.mode === WatchUIMode.Auto && (
            <Switch
              label={t('Auto-detect watch resolution')}
              checked={watchSettings.autoDetect !== false}
              onChange={(e) => updateWatchSettings({ autoDetect: e.currentTarget.checked })}
            />
          )}

          {/* 缩放比例滑块 */}
          <Stack>
            <Text>{t('UI Scale')}</Text>
            <LazySlider
              step={0.1}
              min={1.0}
              max={2.0}
              maw={320}
              marks={[
                { value: 1.0, label: '1.0x' },
                { value: 1.3, label: '1.3x' },
                { value: 1.5, label: '1.5x' },
                { value: 2.0, label: '2.0x' },
              ]}
              value={watchSettings.scale}
              onChange={(val) => updateWatchSettings({ scale: val })}
            />
            <Text size="xs" c="chatbox-tertiary">
              {t('Current scale: {{scale}}x', { scale: watchSettings.scale.toFixed(1) })}
            </Text>
          </Stack>

          {/* 当前状态 */}
          <Alert variant="light" color={watchAdaptation.isEnabled ? 'green' : 'gray'} className="self-start">
            <Text size="sm">
              {watchAdaptation.isEnabled
                ? t('Watch mode active - Scale: {{scale}}x', { scale: watchAdaptation.scale.toFixed(1) })
                : t('Watch mode inactive')}
            </Text>
          </Alert>
        </>
      )}
    </Stack>
  )
}
