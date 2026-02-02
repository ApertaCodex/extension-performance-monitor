import * as vscode from 'vscode';
import { PerformanceMonitor } from '../services/performanceMonitor';
import { disableExtension, enableExtension } from '../services/extensionEnablement';
import { buildExtensionResourcesPayload, getExtensionResourcesHtml } from './extensionResourcesContent';

export class ExtensionResourcesPanel {
    static readonly viewType = 'extensionResources';
    private static currentPanel: ExtensionResourcesPanel | undefined;

    private readonly panel: vscode.WebviewPanel;
    private readonly disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, private readonly performanceMonitor: PerformanceMonitor) {
        this.panel = panel;
        this.panel.iconPath = new vscode.ThemeIcon('graph');

        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

        this.panel.webview.html = getExtensionResourcesHtml(this.panel.webview);

        this.panel.webview.onDidReceiveMessage(
            async (message) => {
                if (message?.type === 'refresh') {
                    await this.refreshMetrics();
                }
                if (message?.type === 'disableExtension') {
                    if (typeof message.id !== 'string') {
                        vscode.window.showErrorMessage('Select an extension to disable.');
                        return;
                    }
                    await disableExtension(message.id, typeof message.name === 'string' ? message.name : undefined);
                    await this.refreshMetrics();
                }
                if (message?.type === 'enableExtension') {
                    if (typeof message.id !== 'string') {
                        vscode.window.showErrorMessage('Select an extension to enable.');
                        return;
                    }
                    await enableExtension(message.id, typeof message.name === 'string' ? message.name : undefined);
                    await this.refreshMetrics();
                }
            },
            null,
            this.disposables
        );

        this.disposables.push(
            this.performanceMonitor.onDidUpdateMetrics(() => {
                this.postMetrics();
            })
        );

        this.postMetrics();
    }

    static createOrShow(performanceMonitor: PerformanceMonitor): void {
        const column = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One;

        if (ExtensionResourcesPanel.currentPanel) {
            ExtensionResourcesPanel.currentPanel.panel.reveal(column);
            ExtensionResourcesPanel.currentPanel.postMetrics();
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            ExtensionResourcesPanel.viewType,
            'Extension Resources',
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        ExtensionResourcesPanel.currentPanel = new ExtensionResourcesPanel(panel, performanceMonitor);
    }

    private postMetrics(): void {
        const payload = buildExtensionResourcesPayload(this.performanceMonitor);
        this.panel.webview.postMessage({ type: 'metrics', ...payload });
    }

    private async refreshMetrics(): Promise<void> {
        try {
            await this.performanceMonitor.collectMetrics();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to refresh metrics: ${error}`);
        }
        this.postMetrics();
    }

    dispose(): void {
        ExtensionResourcesPanel.currentPanel = undefined;

        this.panel.dispose();

        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
