import * as vscode from 'vscode';
import { DEFAULTS } from '../constants';
import { ExtPerfConfig } from '../types';

/**
 * Manages configuration for the extension
 */
export class ConfigManager {
    private readonly configSection = 'extperf';

    /**
     * Gets a configuration value
     * @param key - Configuration key
     * @param defaultValue - Default value if not set
     * @returns Configuration value
     */
    getConfig<T>(key: keyof ExtPerfConfig | string, defaultValue: T): T {
        const config = vscode.workspace.getConfiguration();
        return config.get<T>(`${this.configSection}.${key}`, defaultValue);
    }

    /**
     * Sets a configuration value
     * @param key - Configuration key
     * @param value - Value to set
     * @param target - Configuration target (global, workspace, etc.)
     */
    async setConfig<T>(key: keyof ExtPerfConfig | string, value: T, target?: vscode.ConfigurationTarget): Promise<void> {
        const config = vscode.workspace.getConfiguration();
        await config.update(`${this.configSection}.${key}`, value, target);
    }

    /**
     * Gets the complete configuration object
     */
    getAllConfig(): Partial<ExtPerfConfig> {
        const config = vscode.workspace.getConfiguration(this.configSection);
        return {
            monitoringInterval: config.get('monitoringInterval'),
            enableAutoMonitoring: config.get('enableAutoMonitoring'),
            showStatusBarItem: config.get('showStatusBarItem'),
            alertThresholds: {
                cpu: config.get('alertThresholds.cpu', DEFAULTS.CPU_ALERT_THRESHOLD),
                memory: config.get('alertThresholds.memory', DEFAULTS.MEMORY_ALERT_THRESHOLD)
            },
            historyRetentionDays: config.get('historyRetentionDays')
        };
    }

    /**
     * Registers a configuration change listener
     * @param callback - Callback function to execute on configuration change
     * @returns Disposable for the listener
     */
    onConfigurationChanged(callback: (e: vscode.ConfigurationChangeEvent) => void): vscode.Disposable {
        return vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(this.configSection)) {
                callback(e);
            }
        });
    }
}
