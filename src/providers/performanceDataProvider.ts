import * as vscode from 'vscode';
import { PerformanceMonitor } from '../services/performanceMonitor';
import { ExtensionMetrics, TreeItemType } from '../types';

/**
 * Tree data provider for the performance view
 */
export class PerformanceDataProvider implements vscode.TreeDataProvider<PerformanceTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<PerformanceTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(private performanceMonitor: PerformanceMonitor) {
        // Listen for metrics updates
        this.performanceMonitor.onDidUpdateMetrics(() => {
            this.refresh();
        });
    }

    /**
     * Refreshes the tree view
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    /**
     * Gets tree item representation
     */
    getTreeItem(element: PerformanceTreeItem): vscode.TreeItem {
        return element;
    }

    /**
     * Gets children of a tree item
     */
    getChildren(element?: PerformanceTreeItem): Thenable<PerformanceTreeItem[]> {
        if (!element) {
            // Root level - show summary and categories
            return Promise.resolve(this.getRootItems());
        }

        switch (element.type) {
            case TreeItemType.SUMMARY:
                return Promise.resolve(this.getSummaryChildren());
            case TreeItemType.CATEGORY:
                return Promise.resolve(this.getCategoryChildren(element.contextValue!));
            case TreeItemType.EXTENSION:
                return Promise.resolve(this.getExtensionChildren(element.extensionId!));
            default:
                return Promise.resolve([]);
        }
    }

    /**
     * Gets root level items
     */
    private getRootItems(): PerformanceTreeItem[] {
        const items: PerformanceTreeItem[] = [];
        
        // Summary item
        const summary = this.performanceMonitor.getPerformanceSummary();
        const summaryItem = new PerformanceTreeItem(
            `Performance Summary (${summary.activeExtensions}/${summary.totalExtensions} active)`,
            TreeItemType.SUMMARY,
            vscode.TreeItemCollapsibleState.Expanded
        );
        summaryItem.iconPath = new vscode.ThemeIcon('dashboard');
        summaryItem.description = `CPU: ${summary.totalCpuUsage.toFixed(1)}% | RAM: ${summary.totalMemoryUsage.toFixed(0)}MB`;
        items.push(summaryItem);

        // Categories
        items.push(
            new PerformanceTreeItem(
                'Active Extensions',
                TreeItemType.CATEGORY,
                vscode.TreeItemCollapsibleState.Expanded,
                'active'
            ),
            new PerformanceTreeItem(
                'Top CPU Consumers',
                TreeItemType.CATEGORY,
                vscode.TreeItemCollapsibleState.Collapsed,
                'topCpu'
            ),
            new PerformanceTreeItem(
                'Top Memory Consumers',
                TreeItemType.CATEGORY,
                vscode.TreeItemCollapsibleState.Collapsed,
                'topMemory'
            ),
            new PerformanceTreeItem(
                'All Extensions',
                TreeItemType.CATEGORY,
                vscode.TreeItemCollapsibleState.Collapsed,
                'all'
            )
        );

        return items;
    }

    /**
     * Gets summary children
     */
    private getSummaryChildren(): PerformanceTreeItem[] {
        const summary = this.performanceMonitor.getPerformanceSummary();
        const items: PerformanceTreeItem[] = [];

        // Total metrics
        items.push(
            new PerformanceTreeItem(
                `Total CPU Usage: ${summary.totalCpuUsage.toFixed(1)}%`,
                TreeItemType.METRIC,
                vscode.TreeItemCollapsibleState.None
            ),
            new PerformanceTreeItem(
                `Total Memory Usage: ${summary.totalMemoryUsage.toFixed(0)} MB`,
                TreeItemType.METRIC,
                vscode.TreeItemCollapsibleState.None
            ),
            new PerformanceTreeItem(
                `Active Extensions: ${summary.activeExtensions}`,
                TreeItemType.METRIC,
                vscode.TreeItemCollapsibleState.None
            ),
            new PerformanceTreeItem(
                `Total Extensions: ${summary.totalExtensions}`,
                TreeItemType.METRIC,
                vscode.TreeItemCollapsibleState.None
            )
        );

        // Set icons
        items[0].iconPath = new vscode.ThemeIcon('pulse');
        items[1].iconPath = new vscode.ThemeIcon('database');
        items[2].iconPath = new vscode.ThemeIcon('check');
        items[3].iconPath = new vscode.ThemeIcon('extensions');

        return items;
    }

    /**
     * Gets children for a category
     */
    private getCategoryChildren(category: string): PerformanceTreeItem[] {
        const metrics = this.performanceMonitor.getCurrentMetrics();
        let filteredMetrics: ExtensionMetrics[] = [];

        switch (category) {
            case 'active':
                filteredMetrics = metrics.filter(m => m.isActive);
                break;
            case 'topCpu':
                filteredMetrics = [...metrics]
                    .sort((a, b) => b.cpuUsage - a.cpuUsage)
                    .slice(0, 10);
                break;
            case 'topMemory':
                filteredMetrics = [...metrics]
                    .sort((a, b) => b.memoryUsage - a.memoryUsage)
                    .slice(0, 10);
                break;
            case 'all':
                filteredMetrics = metrics;
                break;
        }

        return filteredMetrics.map(metric => this.createExtensionTreeItem(metric));
    }

    /**
     * Gets children for an extension
     */
    private getExtensionChildren(extensionId: string): PerformanceTreeItem[] {
        const history = this.performanceMonitor.getExtensionHistory(extensionId);
        const items: PerformanceTreeItem[] = [];

        if (history) {
            items.push(
                new PerformanceTreeItem(
                    `Average CPU: ${history.averages.cpu.toFixed(1)}%`,
                    TreeItemType.METRIC,
                    vscode.TreeItemCollapsibleState.None
                ),
                new PerformanceTreeItem(
                    `Average Memory: ${history.averages.memory.toFixed(1)} MB`,
                    TreeItemType.METRIC,
                    vscode.TreeItemCollapsibleState.None
                ),
                new PerformanceTreeItem(
                    `Peak CPU: ${history.peaks.cpu.value.toFixed(1)}% (${new Date(history.peaks.cpu.timestamp).toLocaleTimeString()})`,
                    TreeItemType.METRIC,
                    vscode.TreeItemCollapsibleState.None
                ),
                new PerformanceTreeItem(
                    `Peak Memory: ${history.peaks.memory.value.toFixed(1)} MB (${new Date(history.peaks.memory.timestamp).toLocaleTimeString()})`,
                    TreeItemType.METRIC,
                    vscode.TreeItemCollapsibleState.None
                ),
                new PerformanceTreeItem(
                    `Data Points: ${history.metrics.length}`,
                    TreeItemType.METRIC,
                    vscode.TreeItemCollapsibleState.None
                )
            );

            // Set icons
            items[0].iconPath = new vscode.ThemeIcon('graph-line');
            items[1].iconPath = new vscode.ThemeIcon('graph-line');
            items[2].iconPath = new vscode.ThemeIcon('arrow-up');
            items[3].iconPath = new vscode.ThemeIcon('arrow-up');
            items[4].iconPath = new vscode.ThemeIcon('info');
        }

        return items;
    }

    /**
     * Creates a tree item for an extension
     */
    private createExtensionTreeItem(metric: ExtensionMetrics): PerformanceTreeItem {
        const item = new PerformanceTreeItem(
            metric.displayName,
            TreeItemType.EXTENSION,
            vscode.TreeItemCollapsibleState.Collapsed,
            'extension' // Explicitly set contextValue to match menu condition
        );

        item.extensionId = metric.id;
        item.description = `CPU: ${metric.cpuUsage.toFixed(1)}% | RAM: ${metric.memoryUsage.toFixed(0)}MB`;
        item.tooltip = new vscode.MarkdownString();
        item.tooltip.appendMarkdown(`**${metric.displayName}** (v${metric.version})\n\n`);
        item.tooltip.appendMarkdown(`- **Status:** ${metric.isActive ? 'Active' : 'Inactive'}\n`);
        item.tooltip.appendMarkdown(`- **CPU Usage:** ${metric.cpuUsage.toFixed(1)}%\n`);
        item.tooltip.appendMarkdown(`- **Memory Usage:** ${metric.memoryUsage.toFixed(1)} MB\n`);
        if (metric.subprocessCount && metric.subprocessCount > 0) {
            item.tooltip.appendMarkdown(`- **Subprocess CPU:** ${(metric.processCpuUsage ?? 0).toFixed(1)}%\n`);
            item.tooltip.appendMarkdown(`- **Subprocess Memory:** ${(metric.processMemoryUsage ?? 0).toFixed(1)} MB\n`);
            item.tooltip.appendMarkdown(`- **Subprocesses:** ${metric.subprocessCount}\n`);
        } else {
            item.tooltip.appendMarkdown(`- **Usage Source:** Heuristic estimate\n`);
        }
        
        if (metric.activationTime) {
            item.tooltip.appendMarkdown(`- **Activation Time:** ${metric.activationTime}ms\n`);
        }
        
        item.tooltip.appendMarkdown(`- **Last Updated:** ${new Date(metric.timestamp).toLocaleTimeString()}`);

        // Set icon based on status and performance
        if (!metric.isActive) {
            item.iconPath = new vscode.ThemeIcon('circle-outline');
        } else if (metric.cpuUsage > 10 || metric.memoryUsage > 50) {
            item.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('problemsWarningIcon.foreground'));
        } else {
            item.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.green'));
        }

        return item;
    }
}

/**
 * Tree item for performance data
 */
class PerformanceTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly type: TreeItemType,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue?: string
    ) {
        super(label, collapsibleState);
        this.contextValue = contextValue || type;
    }

    extensionId?: string;
}
