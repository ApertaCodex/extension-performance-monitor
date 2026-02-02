/**
 * Performance metrics for an extension
 */
export interface ExtensionMetrics {
    id: string;
    displayName: string;
    version: string;
    isActive: boolean;
    cpuUsage: number; // Percentage
    memoryUsage: number; // MB
    timestamp: number;
    activationTime?: number; // Time taken to activate in ms
    estimatedCpuUsage?: number; // Percentage
    estimatedMemoryUsage?: number; // MB
    processCpuUsage?: number; // Percentage
    processMemoryUsage?: number; // MB
    subprocessCount?: number;
}

/**
 * Historical performance data
 */
export interface PerformanceHistory {
    extensionId: string;
    metrics: ExtensionMetrics[];
    averages: {
        cpu: number;
        memory: number;
    };
    peaks: {
        cpu: { value: number; timestamp: number };
        memory: { value: number; timestamp: number };
    };
}

/**
 * Performance summary for all extensions
 */
export interface PerformanceSummary {
    totalExtensions: number;
    activeExtensions: number;
    totalCpuUsage: number;
    totalMemoryUsage: number;
    topCpuConsumers: ExtensionMetrics[];
    topMemoryConsumers: ExtensionMetrics[];
    timestamp: number;
}

/**
 * Configuration interface
 */
export interface ExtPerfConfig {
    monitoringInterval: number;
    enableAutoMonitoring: boolean;
    showStatusBarItem: boolean;
    alertThresholds: {
        cpu: number;
        memory: number;
    };
    historyRetentionDays: number;
}

/**
 * Tree item types for the performance view
 */
export enum TreeItemType {
    SUMMARY = 'summary',
    EXTENSION = 'extension',
    METRIC = 'metric',
    CATEGORY = 'category'
}

/**
 * Performance alert
 */
export interface PerformanceAlert {
    type: 'cpu' | 'memory';
    extensionId: string;
    extensionName: string;
    value: number;
    threshold: number;
    timestamp: number;
}
