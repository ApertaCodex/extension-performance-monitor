import * as vscode from 'vscode';

const DISABLE_COMMANDS = [
    'workbench.extensions.disableExtension',
    'workbench.extensions.disableExtensionGlobally'
];

const ENABLE_COMMANDS = [
    'workbench.extensions.enableExtension',
    'workbench.extensions.enableExtensionGlobally'
];

async function executeWithFallback(commands: string[], extensionId: string): Promise<void> {
    let lastError: unknown;

    for (const command of commands) {
        try {
            await vscode.commands.executeCommand(command, extensionId);
            return;
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError;
}

export async function disableExtension(extensionId: string, displayName?: string): Promise<void> {
    const name = displayName || extensionId;
    const confirm = await vscode.window.showWarningMessage(
        `Disable ${name}? You may need to reload VS Code to fully unload it.`,
        { modal: true },
        'Disable'
    );

    if (confirm !== 'Disable') {
        return;
    }

    try {
        await executeWithFallback(DISABLE_COMMANDS, extensionId);
        vscode.window.showInformationMessage(`Disabled ${name}.`);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to disable ${name}: ${error}`);
    }
}

export async function enableExtension(extensionId: string, displayName?: string): Promise<void> {
    const name = displayName || extensionId;

    try {
        await executeWithFallback(ENABLE_COMMANDS, extensionId);
        vscode.window.showInformationMessage(`Enabled ${name}.`);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to enable ${name}: ${error}`);
    }
}
