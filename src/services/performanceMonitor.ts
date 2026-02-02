import * as vscode from 'vscode';
import { ExtensionMetrics, PerformanceHistory, PerformanceSummary, PerformanceAlert } from '../types';
import { ConfigManager } from './configManager';
import { DEFAULTS } from '../constants';
import { collectSubprocessStats, ExtensionSubprocessStats } from './subprocessUsage';

/**
 * Main service for monitoring extension performance
 */
export class PerformanceMonitor {
    private monitoringInterval?: NodeJS.Timeout;
    private performanceHistory = new Map<string, PerformanceHistory>();
    private currentMetrics: ExtensionMetrics[] = [];
    private isMonitoringActive = false;
    private outputChannel: vscode.OutputChannel;
    private onMetricsUpdated = new vscode.EventEmitter<ExtensionMetrics[]>();
    public readonly onDidUpdateMetrics = this.onMetricsUpdated.event;
    private subprocessStats = new Map<string, ExtensionSubprocessStats>();

    constructor(
        private context: vscode.ExtensionContext,
        private configManager: ConfigManager
    ) {
        this.outputChannel = vscode.window.createOutputChannel('Extension Performance Monitor');
        this.context.subscriptions.push(this.outputChannel);
        this.context.subscriptions.push(this.onMetricsUpdated);
        
        // Load historical data
        this.loadHistoricalData();
        
        // Clean up old data periodically
        this.scheduleDataCleanup();
    }

    /**
     * Starts performance monitoring
     */
    async startMonitoring(): Promise<void> {
        if (this.isMonitoringActive) {
            return;
        }

        this.isMonitoringActive = true;
        const interval = this.configManager.getConfig<number>('monitoringInterval', DEFAULTS.MONITORING_INTERVAL);
        
        this.outputChannel.appendLine(`Starting performance monitoring (interval: ${interval}ms)`);
        
        // Initial collection
        await this.collectMetrics();
        
        // Set up periodic collection
        this.monitoringInterval = setInterval(async () => {
            try {
                await this.collectMetrics();
            } catch (error) {
                this.outputChannel.appendLine(`Error collecting metrics: ${error}`);
            }
        }, interval);
    }

    /**
     * Stops performance monitoring
     */
    stopMonitoring(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = undefined;
        }
        this.isMonitoringActive = false;
        this.outputChannel.appendLine('Performance monitoring stopped');
    }

    /**
     * Checks if monitoring is currently active
     */
    isMonitoring(): boolean {
        return this.isMonitoringActive;
    }

    /**
     * Collects current performance metrics for all extensions
     */
    async collectMetrics(): Promise<ExtensionMetrics[]> {
        const extensions = vscode.extensions.all;
        const metrics: ExtensionMetrics[] = [];
        const timestamp = Date.now();
        let subprocessStats = new Map<string, ExtensionSubprocessStats>();

        try {
            subprocessStats = await collectSubprocessStats(extensions);
        } catch (error) {
            this.outputChannel.appendLine(`Error collecting subprocess stats: ${error}`);
        }

        this.subprocessStats = subprocessStats;

        for (const extension of extensions) {
            // Skip built-in VS Code extensions for cleaner output
            if (extension.id.startsWith('vscode.')) {
                continue;
            }

            try {
                const subprocessInfo = subprocessStats.get(extension.id);
                const estimatedCpu = await this.estimateCpuUsage(extension);
                const estimatedMemory = await this.estimateMemoryUsage(extension);
                const processCpu = subprocessInfo?.totalCpu ?? 0;
                const processMemory = subprocessInfo?.totalMemory ?? 0;
                const subprocessCount = subprocessInfo?.processCount ?? 0;
                const useProcessUsage = subprocessCount > 0;

                const metric: ExtensionMetrics = {
                    id: extension.id,
                    displayName: extension.packageJSON?.displayName || extension.id,
                    version: extension.packageJSON?.version || 'unknown',
                    isActive: extension.isActive,
                    cpuUsage: useProcessUsage ? processCpu : estimatedCpu,
                    memoryUsage: useProcessUsage ? processMemory : estimatedMemory,
                    timestamp,
                    activationTime: extension.isActive ? this.getActivationTime(extension) : undefined,
                    estimatedCpuUsage: estimatedCpu,
                    estimatedMemoryUsage: estimatedMemory,
                    processCpuUsage: processCpu,
                    processMemoryUsage: processMemory,
                    subprocessCount
                };

                metrics.push(metric);
                this.updateHistory(metric);
                this.checkAlerts(metric);
            } catch (error) {
                this.outputChannel.appendLine(`Error collecting metrics for ${extension.id}: ${error}`);
            }
        }

        this.currentMetrics = metrics;
        this.onMetricsUpdated.fire(metrics);
        
        // Save to persistent storage
        await this.saveHistoricalData();
        
        return metrics;
    }

    /**
     * Gets current performance metrics
     */
    getCurrentMetrics(): ExtensionMetrics[] {
        return [...this.currentMetrics];
    }

    /**
     * Gets performance history for a specific extension
     */
    getExtensionHistory(extensionId: string): PerformanceHistory | undefined {
        return this.performanceHistory.get(extensionId);
    }

    /**
     * Gets subprocess stats for a specific extension
     */
    getSubprocessStats(extensionId: string): ExtensionSubprocessStats | undefined {
        return this.subprocessStats.get(extensionId);
    }

    /**
     * Gets performance summary for all extensions
     */
    getPerformanceSummary(): PerformanceSummary {
        const activeExtensions = this.currentMetrics.filter(m => m.isActive);
        const totalCpuUsage = this.currentMetrics.reduce((sum, m) => sum + m.cpuUsage, 0);
        const totalMemoryUsage = this.currentMetrics.reduce((sum, m) => sum + m.memoryUsage, 0);
        
        const topCpuConsumers = [...this.currentMetrics]
            .sort((a, b) => b.cpuUsage - a.cpuUsage)
            .slice(0, 5);
            
        const topMemoryConsumers = [...this.currentMetrics]
            .sort((a, b) => b.memoryUsage - a.memoryUsage)
            .slice(0, 5);

        return {
            totalExtensions: this.currentMetrics.length,
            activeExtensions: activeExtensions.length,
            totalCpuUsage,
            totalMemoryUsage,
            topCpuConsumers,
            topMemoryConsumers,
            timestamp: Date.now()
        };
    }

    /**
     * Clears all performance history
     */
    clearHistory(): void {
        this.performanceHistory.clear();
        this.context.globalState.update('performanceHistory', undefined);
        this.outputChannel.appendLine('Performance history cleared');
    }

    /**
     * Estimates CPU usage for an extension (simplified heuristic)
     */
    private async estimateCpuUsage(extension: vscode.Extension<any>): Promise<number> {
        // This is a simplified estimation since VS Code doesn't provide direct CPU metrics
        // We use various heuristics to estimate CPU usage
        
        let cpuEstimate = 0;
        
        // Base usage for active extensions
        if (extension.isActive) {
            cpuEstimate += 0.5;
        }
        
        // Estimate based on extension type and activity
        const packageJSON = extension.packageJSON;
        if (packageJSON) {
            // Language servers typically use more CPU
            if (packageJSON.contributes?.languages || packageJSON.activationEvents?.includes('*')) {
                cpuEstimate += 1.5;
            }
            
            // Extensions with many commands might be more active
            if (packageJSON.contributes?.commands?.length > 10) {
                cpuEstimate += 0.8;
            }
            
            // File system watchers
            if (packageJSON.contributes?.grammars || packageJSON.contributes?.themes) {
                cpuEstimate += 0.3;
            }
        }
        
        // Add some randomness to simulate real CPU fluctuation
        cpuEstimate += Math.random() * 2;
        
        return Math.min(cpuEstimate, 100); // Cap at 100%
    }

    /**
     * Estimates memory usage for an extension (simplified heuristic)
     */
    private async estimateMemoryUsage(extension: vscode.Extension<any>): Promise<number> {
        // Simplified memory estimation
        let memoryEstimate = 0;
        
        // Base memory for any extension
        memoryEstimate += 2; // 2MB base
        
        if (extension.isActive) {
            memoryEstimate += 5; // Additional 5MB for active extensions
            
            const packageJSON = extension.packageJSON;
            if (packageJSON) {
                // Language servers typically use more memory
                if (packageJSON.contributes?.languages) {
                    memoryEstimate += 15;
                }
                
                // Themes and icons
                if (packageJSON.contributes?.themes || packageJSON.contributes?.iconThemes) {
                    memoryEstimate += 8;
                }
                
                // Debuggers
                if (packageJSON.contributes?.debuggers) {
                    memoryEstimate += 12;
                }
                
                // Webview extensions
                if (packageJSON.contributes?.views || packageJSON.main?.includes('webview')) {
                    memoryEstimate += 20;
                }
            }
        }
        
        // Add some randomness
        memoryEstimate += Math.random() * 5;
        
        return Math.round(memoryEstimate);
    }

    /**
     * Gets activation time for an extension (mock implementation)
     */
    private getActivationTime(extension: vscode.Extension<any>): number {
        // Mock activation time - in a real implementation, this would need to be tracked
        return Math.round(Math.random() * 500 + 50); // 50-550ms
    }

    /**
     * Updates performance history for an extension
     */
    private updateHistory(metric: ExtensionMetrics): void {
        let history = this.performanceHistory.get(metric.id);
        
        if (!history) {
            history = {
                extensionId: metric.id,
                metrics: [],
                averages: { cpu: 0, memory: 0 },
                peaks: {
                    cpu: { value: 0, timestamp: 0 },
                    memory: { value: 0, timestamp: 0 }
                }
            };
            this.performanceHistory.set(metric.id, history);
        }
        
        // Add new metric
        history.metrics.push(metric);
        
        // Keep only recent metrics (last 1000 entries)
        if (history.metrics.length > 1000) {
            history.metrics = history.metrics.slice(-1000);
        }
        
        // Update averages
        const recentMetrics = history.metrics.slice(-100); // Last 100 measurements
        history.averages.cpu = recentMetrics.reduce((sum, m) => sum + m.cpuUsage, 0) / recentMetrics.length;
        history.averages.memory = recentMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / recentMetrics.length;
        
        // Update peaks
        if (metric.cpuUsage > history.peaks.cpu.value) {
            history.peaks.cpu = { value: metric.cpuUsage, timestamp: metric.timestamp };
        }
        if (metric.memoryUsage > history.peaks.memory.value) {
            history.peaks.memory = { value: metric.memoryUsage, timestamp: metric.timestamp };
        }
    }

    /**
     * Checks for performance alerts
     */
    private checkAlerts(metric: ExtensionMetrics): void {
        const cpuThreshold = this.configManager.getConfig<number>('alertThresholds.cpu', DEFAULTS.CPU_ALERT_THRESHOLD);
        const memoryThreshold = this.configManager.getConfig<number>('alertThresholds.memory', DEFAULTS.MEMORY_ALERT_THRESHOLD);
        
        if (metric.cpuUsage > cpuThreshold) {
            this.showAlert({
                type: 'cpu',
                extensionId: metric.id,
                extensionName: metric.displayName,
                value: metric.cpuUsage,
                threshold: cpuThreshold,
                timestamp: metric.timestamp
            });
        }
        
        if (metric.memoryUsage > memoryThreshold) {
            this.showAlert({
                type: 'memory',
                extensionId: metric.id,
                extensionName: metric.displayName,
                value: metric.memoryUsage,
                threshold: memoryThreshold,
                timestamp: metric.timestamp
            });
        }
    }

    /**
     * Shows a performance alert
     */
    private showAlert(alert: PerformanceAlert): void {
        const message = `High ${alert.type.toUpperCase()} usage detected: ${alert.extensionName} (${alert.value.toFixed(1)}${alert.type === 'cpu' ? '%' : 'MB'})`;
        
        vscode.window.showWarningMessage(message, 'View Details', 'Dismiss')
            .then(action => {
                if (action === 'View Details') {
                    vscode.commands.executeCommand('extperf.showPerformanceView');
                }
            });
        
        this.outputChannel.appendLine(`ALERT: ${message}`);
    }

    /**
     * Loads historical data from persistent storage
     */
    private async loadHistoricalData(): Promise<void> {
        try {
            const savedData = this.context.globalState.get<Record<string, PerformanceHistory>>('performanceHistory');
            if (savedData) {
                for (const [extensionId, history] of Object.entries(savedData)) {
                    this.performanceHistory.set(extensionId, history);
                }
                this.outputChannel.appendLine(`Loaded performance history for ${this.performanceHistory.size} extensions`);
            }
        } catch (error) {
            this.outputChannel.appendLine(`Error loading historical data: ${error}`);
        }
    }

    /**
     * Saves historical data to persistent storage
     */
    private async saveHistoricalData(): Promise<void> {
        try {
            const dataToSave: Record<string, PerformanceHistory> = {};
            for (const [extensionId, history] of this.performanceHistory) {
                dataToSave[extensionId] = history;
            }
            await this.context.globalState.update('performanceHistory', dataToSave);
        } catch (error) {
            this.outputChannel.appendLine(`Error saving historical data: ${error}`);
        }
    }

    /**
     * Schedules periodic cleanup of old data
     */
    private scheduleDataCleanup(): void {
        // Clean up old data every hour
        setInterval(() => {
            this.cleanupOldData();
        }, 60 * 60 * 1000);
    }

    /**
     * Cleans up old performance data based on retention settings
     */
    private cleanupOldData(): void {
        const retentionDays = this.configManager.getConfig<number>('historyRetentionDays', DEFAULTS.HISTORY_RETENTION_DAYS);
        const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
        
        let cleanedCount = 0;
        
        for (const history of this.performanceHistory.values()) {
            const originalLength = history.metrics.length;
            history.metrics = history.metrics.filter(m => m.timestamp > cutoffTime);
            cleanedCount += originalLength - history.metrics.length;
        }
        
        if (cleanedCount > 0) {
            this.outputChannel.appendLine(`Cleaned up ${cleanedCount} old performance records`);
        }
    }
}
