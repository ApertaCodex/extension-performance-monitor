/**
 * Command identifiers for the extension
 */
export const COMMANDS = {
    SHOW_PERFORMANCE_VIEW: 'extperf.showPerformanceView',
    SHOW_RESOURCES_PAGE: 'extperf.showResourcesPage',
    REFRESH_METRICS: 'extperf.refreshMetrics',
    EXPORT_REPORT: 'extperf.exportReport',
    CLEAR_HISTORY: 'extperf.clearHistory',
    TOGGLE_MONITORING: 'extperf.toggleMonitoring',
    DISABLE_EXTENSION: 'extperf.disableExtension',
    ENABLE_EXTENSION: 'extperf.enableExtension'
} as const;

/**
 * Configuration keys
 */
export const CONFIG_KEYS = {
    MONITORING_INTERVAL: 'extperf.monitoringInterval',
    ENABLE_AUTO_MONITORING: 'extperf.enableAutoMonitoring',
    SHOW_STATUS_BAR_ITEM: 'extperf.showStatusBarItem',
    CPU_ALERT_THRESHOLD: 'extperf.alertThresholds.cpu',
    MEMORY_ALERT_THRESHOLD: 'extperf.alertThresholds.memory',
    HISTORY_RETENTION_DAYS: 'extperf.historyRetentionDays'
} as const;

/**
 * Default values
 */
export const DEFAULTS = {
    MONITORING_INTERVAL: 5000,
    CPU_ALERT_THRESHOLD: 80,
    MEMORY_ALERT_THRESHOLD: 100,
    HISTORY_RETENTION_DAYS: 7
} as const;
