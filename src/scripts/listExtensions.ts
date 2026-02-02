import { spawn } from 'child_process';
import { collectSubprocessStats, ExtensionLike } from '../services/subprocessUsage';

function getArgValue(prefix: string): string | undefined {
    const match = process.argv.find((arg) => arg.startsWith(prefix));
    return match ? match.slice(prefix.length) : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

async function findVsCodeExtensions(): Promise<ExtensionLike[]> {
    const result: ExtensionLike[] = [];

    // Try to locate VS Code extensions directory from common locations
    const homeDir = require('os').homedir();
    const possiblePaths = [
        `${homeDir}/.vscode-insiders/extensions`,
        `${homeDir}/.vscode/extensions`,
        `${homeDir}/.vscode-server/extensions`,
        '/usr/share/code-insiders/resources/app/extensions',
        '/usr/share/code/resources/app/extensions',
        '/Applications/Visual Studio Code.app/Contents/Resources/app/extensions',
        '/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/extensions'
    ];

    for (const base of possiblePaths) {
        try {
            const fs = require('fs');
            const path = require('path');
            if (!fs.existsSync(base)) continue;

            const entries = fs.readdirSync(base, { withFileTypes: true })
                .filter((dirent: import('fs').Dirent) => dirent.isDirectory())
                .map((dirent: import('fs').Dirent) => dirent.name);

            for (const entry of entries) {
                const extPath1 = path.join(base, entry, 'extension');
                const extPath2 = path.join(base, entry);
                let extPath = '';
                let packageJsonPath = '';

                if (fs.existsSync(extPath1)) {
                    extPath = extPath1;
                    packageJsonPath = path.join(extPath1, 'package.json');
                } else if (fs.existsSync(path.join(extPath2, 'package.json'))) {
                    extPath = extPath2;
                    packageJsonPath = path.join(extPath2, 'package.json');
                } else {
                    continue;
                }

                try {
                    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                    result.push({
                        id: packageJson.name || entry,
                        extensionPath: extPath,
                        packageJSON: {
                            displayName: packageJson.displayName
                        }
                    });
                } catch {
                    // Skip invalid extensions
                }
            }
        } catch {
            // Skip errors accessing paths
        }
    }

    return result;
}

async function main(): Promise<void> {
    const rootPidStr = getArgValue('--rootPid=');
    if (!rootPidStr) {
        console.error('Usage: node listExtensions.js --rootPid=<PID>');
        console.error('');
        console.error('Find the VS Code extension-host PID:');
        console.error('  macOS:   ps aux | grep "Visual Studio Code" | grep "extension-host"');
        console.error('  Linux:   ps aux | grep "code" | grep "extension-host"');
        console.error('  Windows: tasklist | findstr extension-host');
        process.exit(1);
    }

    const rootPid = Number(rootPidStr);
    if (!Number.isFinite(rootPid) || rootPid <= 0) {
        console.error('Invalid PID:', rootPidStr);
        process.exit(1);
    }

    const extensions = await findVsCodeExtensions();
    // Filter out built-in VS Code extensions
    const userExtensions = extensions.filter(ext => 
        !ext.extensionPath.startsWith('/usr/share/code-insiders/resources/app/extensions') &&
        !ext.extensionPath.startsWith('/usr/share/code/resources/app/extensions')
    );
    
    if (userExtensions.length === 0) {
        console.error('No user extensions found. Make sure VS Code extensions directory is accessible.');
        process.exit(1);
    }

    try {
        const stats = await collectSubprocessStats(userExtensions, { rootPid });

        if (stats.size === 0) {
            console.log('No subprocess metrics found for extensions.');
        } else {
            console.log('Extension subprocess metrics:');
            console.log('');
            for (const [extId, data] of stats) {
                console.log(`${extId}`);
                console.log(`  CPU: ${data.totalCpu.toFixed(2)}%`);
                console.log(`  Memory: ${data.totalMemory.toFixed(2)} MB`);
                console.log(`  Processes: ${data.processCount}`);
                if (data.processes.length > 0) {
                    console.log('  Details:');
                    for (const proc of data.processes) {
                        console.log(`    PID ${proc.pid}: CPU ${proc.cpu.toFixed(2)}%, Memory ${proc.memory.toFixed(2)} MB`);
                        console.log(`      Command: ${proc.command}`);
                    }
                }
                console.log('');
            }
        }
    } finally {
        // No cleanup needed since we're not overriding process.pid anymore
    }
}

main().catch((error) => {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
});
