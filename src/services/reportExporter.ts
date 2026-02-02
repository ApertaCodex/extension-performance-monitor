import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PerformanceMonitor } from './performanceMonitor';
import { ExtensionMetrics, PerformanceHistory } from '../types';

/**
 * Service for exporting performance reports
 */
export class ReportExporter {
    constructor(private performanceMonitor: PerformanceMonitor) {}

    /**
     * Exports a comprehensive performance report
     */
    async exportReport(): Promise<void> {
        const saveLocation = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(`extension-performance-report-${new Date().toISOString().split('T')[0]}.json`),
            filters: {
                'JSON Files': ['json'],
                'CSV Files': ['csv'],
                'All Files': ['*']
            }
        });

        if (!saveLocation) {
            return;
        }

        const extension = path.extname(saveLocation.fsPath).toLowerCase();
        
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Exporting performance report...',
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0, message: 'Collecting data...' });
                
                const reportData = this.generateReportData();
                
                progress.report({ increment: 50, message: 'Formatting report...' });
                
                let content: string;
                if (extension === '.csv') {
                    content = this.formatAsCSV(reportData);
                } else {
                    content = this.formatAsJSON(reportData);
                }
                
                progress.report({ increment: 80, message: 'Writing file...' });
                
                await fs.writeFile(saveLocation.fsPath, content, 'utf8');
                
                progress.report({ increment: 100, message: 'Complete!' });
            });

            const action = await vscode.window.showInformationMessage(
                `Performance report exported successfully to ${path.basename(saveLocation.fsPath)}`,
                'Open File',
                'Show in Folder'
            );

            if (action === 'Open File') {
                await vscode.commands.executeCommand('vscode.open', saveLocation);
            } else if (action === 'Show in Folder') {
                await vscode.commands.executeCommand('revealFileInOS', saveLocation);
            }
        } catch (error) {
            throw new Error(`Failed to export report: ${error}`);
        }
    }

    /**
     * Generates comprehensive report data
     */
    private generateReportData() {
        const currentMetrics = this.performanceMonitor.getCurrentMetrics();
        const summary = this.performanceMonitor.getPerformanceSummary();
        
        // Collect historical data for all extensions
        const historicalData: Record<string, PerformanceHistory> = {};
        for (const metric of currentMetrics) {
            const history = this.performanceMonitor.getExtensionHistory(metric.id);
            if (history) {
                historicalData[metric.id] = history;
            }
        }

        return {
            reportMetadata: {
                generatedAt: new Date().toISOString(),
                vscodeVersion: vscode.version,
                extensionVersion: vscode.extensions.getExtension('apertacodex.extension-performance-monitor')?.packageJSON?.version || 'unknown'
            },
            summary,
            currentMetrics: currentMetrics.sort((a, b) => b.cpuUsage + b.memoryUsage - (a.cpuUsage + a.memoryUsage)),
            historicalData,
            insights: this.generateInsights(currentMetrics, historicalData)
        };
    }

    /**
     * Generates performance insights
     */
    private generateInsights(metrics: ExtensionMetrics[], historicalData: Record<string, PerformanceHistory>) {
        const insights = {
            topPerformers: {
                cpu: metrics.filter(m => m.isActive).sort((a, b) => a.cpuUsage - b.cpuUsage).slice(0, 5),
                memory: metrics.filter(m => m.isActive).sort((a, b) => a.memoryUsage - b.memoryUsage).slice(0, 5)
            },
            worstPerformers: {
                cpu: metrics.filter(m => m.isActive).sort((a, b) => b.cpuUsage - a.cpuUsage).slice(0, 5),
                memory: metrics.filter(m => m.isActive).sort((a, b) => b.memoryUsage - a.memoryUsage).slice(0, 5)
            },
            recommendations: this.generateRecommendations(metrics, historicalData)
        };

        return insights;
    }

    /**
     * Generates performance recommendations
     */
    private generateRecommendations(metrics: ExtensionMetrics[], historicalData: Record<string, PerformanceHistory>): string[] {
        const recommendations: string[] = [];
        
        // High CPU usage recommendations
        const highCpuExtensions = metrics.filter(m => m.cpuUsage > 10);
        if (highCpuExtensions.length > 0) {
            recommendations.push(`Consider reviewing extensions with high CPU usage: ${highCpuExtensions.map(e => e.displayName).join(', ')}`);
        }
        
        // High memory usage recommendations
        const highMemoryExtensions = metrics.filter(m => m.memoryUsage > 50);
        if (highMemoryExtensions.length > 0) {
            recommendations.push(`Consider reviewing extensions with high memory usage: ${highMemoryExtensions.map(e => e.displayName).join(', ')}`);
        }
        
        // Too many active extensions
        const activeCount = metrics.filter(m => m.isActive).length;
        if (activeCount > 20) {
            recommendations.push(`You have ${activeCount} active extensions. Consider disabling unused extensions to improve performance.`);
        }
        
        // Inactive extensions taking up space
        const inactiveWithMemory = metrics.filter(m => !m.isActive && m.memoryUsage > 5);
        if (inactiveWithMemory.length > 0) {
            recommendations.push(`Some inactive extensions are still using memory: ${inactiveWithMemory.map(e => e.displayName).join(', ')}`);
        }
        
        return recommendations;
    }

    /**
     * Formats report data as JSON
     */
    private formatAsJSON(data: any): string {
        return JSON.stringify(data, null, 2);
    }

    /**
     * Formats report data as CSV
     */
    private formatAsCSV(data: any): string {
        const lines: string[] = [];
        
        // Header
        lines.push('Extension ID,Display Name,Version,Is Active,CPU Usage (%),Memory Usage (MB),Average CPU,Average Memory,Peak CPU,Peak Memory');
        
        // Data rows
        for (const metric of data.currentMetrics) {
            const history = data.historicalData[metric.id];
            const avgCpu = history?.averages.cpu?.toFixed(2) || 'N/A';
            const avgMemory = history?.averages.memory?.toFixed(2) || 'N/A';
            const peakCpu = history?.peaks.cpu?.value?.toFixed(2) || 'N/A';
            const peakMemory = history?.peaks.memory?.value?.toFixed(2) || 'N/A';
            
            lines.push([
                metric.id,
                `"${metric.displayName}"`,
                metric.version,
                metric.isActive.toString(),
                metric.cpuUsage.toFixed(2),
                metric.memoryUsage.toFixed(2),
                avgCpu,
                avgMemory,
                peakCpu,
                peakMemory
            ].join(','));
        }
        
        return lines.join('\n');
    }
}