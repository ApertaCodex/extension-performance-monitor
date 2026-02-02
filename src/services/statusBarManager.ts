import * as vscode from 'vscode';
import { PerformanceMonitor } from './performanceMonitor';
import { COMMANDS } from '../constants';

/**
 * Manages the status bar item for performance monitoring
 */
export class StatusBarManager {
    private statusBarItem: vscode.StatusBarItem;
    private isInitialized = false;

    constructor(private performanceMonitor: PerformanceMonitor) {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.command = COMMANDS.SHOW_PERFORMANCE_VIEW;
    }

    /**
     * Initializes the status bar item
     */
    initialize(): void {
        if (this.isInitialized) {
            return;
        }

        this.isInitialized = true;
        
        // Listen for metrics updates
        this.performanceMonitor.onDidUpdateMetrics(() => {
            this.updateStatusBar();
        });

        // Initial update
        this.updateStatusBar();
        this.statusBarItem.show();
    }

    /**
     * Updates the status bar with current performance summary
     */
    updateStatusBar(): void {
        if (!this.isInitialized) {
            return;
        }

        const summary = this.performanceMonitor.getPerformanceSummary();
        const isMonitoring = this.performanceMonitor.isMonitoring();

        if (!isMonitoring) {
            this.statusBarItem.text = '$(pulse) ExtPerf: Stopped';
            this.statusBarItem.tooltip = 'Extension Performance Monitor (Click to view)';
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            return;
        }

        // Format the status bar text
        const cpuText = `CPU: ${summary.totalCpuUsage.toFixed(1)}%`;
        const memoryText = `RAM: ${summary.totalMemoryUsage.toFixed(0)}MB`;
        const activeText = `${summary.activeExtensions}/${summary.totalExtensions} active`;

        this.statusBarItem.text = `$(pulse) ${cpuText} | ${memoryText}`;
        
        // Create detailed tooltip
        const tooltip = new vscode.MarkdownString();
        tooltip.appendMarkdown(`**Extension Performance Monitor**\n\n`);
        tooltip.appendMarkdown(`- **Total CPU Usage:** ${summary.totalCpuUsage.toFixed(1)}%\n`);
        tooltip.appendMarkdown(`- **Total Memory Usage:** ${summary.totalMemoryUsage.toFixed(0)} MB\n`);
        tooltip.appendMarkdown(`- **Active Extensions:** ${summary.activeExtensions}/${summary.totalExtensions}\n\n`);
        
        if (summary.topCpuConsumers.length > 0) {
            tooltip.appendMarkdown(`**Top CPU Consumers:**\n`);
            summary.topCpuConsumers.slice(0, 3).forEach(ext => {
                tooltip.appendMarkdown(`- ${ext.displayName}: ${ext.cpuUsage.toFixed(1)}%\n`);
            });
            tooltip.appendMarkdown(`\n`);
        }
        
        if (summary.topMemoryConsumers.length > 0) {
            tooltip.appendMarkdown(`**Top Memory Consumers:**\n`);
            summary.topMemoryConsumers.slice(0, 3).forEach(ext => {
                tooltip.appendMarkdown(`- ${ext.displayName}: ${ext.memoryUsage.toFixed(0)} MB\n`);
            });
        }
        
        tooltip.appendMarkdown(`\n*Click to view detailed performance data*`);
        this.statusBarItem.tooltip = tooltip;

        // Set background color based on performance
        if (summary.totalCpuUsage > 50 || summary.totalMemoryUsage > 500) {
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        } else if (summary.totalCpuUsage > 25 || summary.totalMemoryUsage > 250) {
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        } else {
            this.statusBarItem.backgroundColor = undefined;
        }
    }

    /**
     * Disposes of the status bar item
     */
    dispose(): void {
        this.statusBarItem.dispose();
    }
}