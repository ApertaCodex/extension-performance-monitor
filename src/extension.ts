import * as vscode from 'vscode';
import { PerformanceMonitor } from './services/performanceMonitor';
import { PerformanceDataProvider } from './providers/performanceDataProvider';
import { StatusBarManager } from './services/statusBarManager';
import { ReportExporter } from './services/reportExporter';
import { ConfigManager } from './services/configManager';
import { disableExtension, enableExtension } from './services/extensionEnablement';
import { COMMANDS } from './constants';
import { ExtensionResourcesPanel } from './webviews/extensionResourcesPanel';

let performanceMonitor: PerformanceMonitor;
let dataProvider: PerformanceDataProvider;
let statusBarManager: StatusBarManager;
let reportExporter: ReportExporter;

/**
 * Activates the Extension Performance Monitor extension
 * @param context - The extension context
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
    console.log('Extension Performance Monitor is now active');

    try {
        // Initialize services
        const configManager = new ConfigManager();
        performanceMonitor = new PerformanceMonitor(context, configManager);
        dataProvider = new PerformanceDataProvider(performanceMonitor);
        statusBarManager = new StatusBarManager(performanceMonitor);
        reportExporter = new ReportExporter(performanceMonitor);

        // Register tree data provider
        const treeView = vscode.window.createTreeView('extensionPerformance', {
            treeDataProvider: dataProvider,
            showCollapseAll: true
        });
        context.subscriptions.push(treeView);

        // Register commands
        registerCommands(context);

        // Set context for when clauses
        await vscode.commands.executeCommand('setContext', 'extperf.monitoringEnabled', true);

        // Initialize status bar
        statusBarManager.initialize();

        // Start monitoring if auto-monitoring is enabled
        if (configManager.getConfig<boolean>('enableAutoMonitoring', true)) {
            await performanceMonitor.startMonitoring();
            vscode.window.showInformationMessage('Extension Performance Monitor started automatically');
        }

    } catch (error) {
        vscode.window.showErrorMessage(`Failed to activate Extension Performance Monitor: ${error}`);
        console.error('Activation error:', error);
    }
}

/**
 * Registers all extension commands
 * @param context - The extension context
 */
function registerCommands(context: vscode.ExtensionContext): void {
    const commands = [
        {
            command: COMMANDS.SHOW_PERFORMANCE_VIEW,
            handler: () => vscode.commands.executeCommand('extensionPerformance.focus')
        },
        {
            command: COMMANDS.SHOW_RESOURCES_PAGE,
            handler: async () => {
                await performanceMonitor.collectMetrics();
                dataProvider.refresh();
                statusBarManager.updateStatusBar();
                ExtensionResourcesPanel.createOrShow(performanceMonitor);
            }
        },
        {
            command: COMMANDS.REFRESH_METRICS,
            handler: async () => {
                await performanceMonitor.collectMetrics();
                dataProvider.refresh();
                statusBarManager.updateStatusBar();
                vscode.window.showInformationMessage('Performance metrics refreshed');
            }
        },
        {
            command: COMMANDS.EXPORT_REPORT,
            handler: async () => {
                try {
                    await reportExporter.exportReport();
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to export report: ${error}`);
                }
            }
        },
        {
            command: COMMANDS.CLEAR_HISTORY,
            handler: async () => {
                const result = await vscode.window.showWarningMessage(
                    'Are you sure you want to clear all performance history?',
                    { modal: true },
                    'Yes, Clear History'
                );
                if (result === 'Yes, Clear History') {
                    performanceMonitor.clearHistory();
                    dataProvider.refresh();
                    vscode.window.showInformationMessage('Performance history cleared');
                }
            }
        },
        {
            command: COMMANDS.TOGGLE_MONITORING,
            handler: async () => {
                if (performanceMonitor.isMonitoring()) {
                    performanceMonitor.stopMonitoring();
                    vscode.window.showInformationMessage('Performance monitoring stopped');
                } else {
                    await performanceMonitor.startMonitoring();
                    vscode.window.showInformationMessage('Performance monitoring started');
                }
                statusBarManager.updateStatusBar();
            }
        },
        {
            command: COMMANDS.DISABLE_EXTENSION,
            handler: async (target?: unknown) => {
                const resolved = resolveExtensionTarget(target);
                if (!resolved) {
                    vscode.window.showErrorMessage('Select an extension to disable.');
                    return;
                }
                await disableExtension(resolved.id, resolved.name);
                await refreshMetrics();
            }
        },
        {
            command: COMMANDS.ENABLE_EXTENSION,
            handler: async (target?: unknown) => {
                const resolved = resolveExtensionTarget(target);
                if (!resolved) {
                    vscode.window.showErrorMessage('Select an extension to enable.');
                    return;
                }
                await enableExtension(resolved.id, resolved.name);
                await refreshMetrics();
            }
        }
    ];

    commands.forEach(({ command, handler }) => {
        const disposable = vscode.commands.registerCommand(command, handler);
        context.subscriptions.push(disposable);
    });
}

async function refreshMetrics(): Promise<void> {
    await performanceMonitor.collectMetrics();
    dataProvider.refresh();
    statusBarManager.updateStatusBar();
}

function resolveExtensionTarget(target: unknown): { id: string; name?: string } | undefined {
    if (typeof target === 'string') {
        return { id: target };
    }

    if (!target || typeof target !== 'object') {
        return undefined;
    }

    const candidate = target as {
        extensionId?: unknown;
        id?: unknown;
        label?: unknown;
        displayName?: unknown;
    };

    const extensionId = typeof candidate.extensionId === 'string'
        ? candidate.extensionId
        : (typeof candidate.id === 'string' ? candidate.id : undefined);

    if (!extensionId) {
        return undefined;
    }

    let name: string | undefined;
    if (typeof candidate.label === 'string') {
        name = candidate.label;
    } else if (typeof candidate.displayName === 'string') {
        name = candidate.displayName;
    }

    return { id: extensionId, name };
}

/**
 * Deactivates the extension
 */
export function deactivate(): void {
    if (performanceMonitor) {
        performanceMonitor.stopMonitoring();
    }
    if (statusBarManager) {
        statusBarManager.dispose();
    }
    console.log('Extension Performance Monitor deactivated');
}
