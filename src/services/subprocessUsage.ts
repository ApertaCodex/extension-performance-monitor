import * as vscode from 'vscode';
import pidusage, { Stat as PidusageStat } from 'pidusage';
import psTree from 'ps-tree';

export interface SubprocessUsage {
    pid: number;
    ppid: number;
    command: string;
    cpu: number;
    memory: number; // MB
}

export interface ExtensionSubprocessStats {
    extensionId: string;
    totalCpu: number;
    totalMemory: number; // MB
    processCount: number;
    processes: SubprocessUsage[];
}

interface ExtensionIndexEntry {
    id: string;
    name: string;
    path: string;
    idLower: string;
}

interface PsTreeEntry {
    PID: string;
    PPID: string;
    COMMAND?: string;
    COMM?: string;
    COMMAND_LINE?: string;
}

function normalizePath(value: string): string {
    return value.replace(/\\/g, '/').toLowerCase();
}

function getProcessTree(rootPid: number): Promise<PsTreeEntry[]> {
    return new Promise((resolve, reject) => {
        psTree(rootPid, (error: Error | null, children: PsTreeEntry[]) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(children || []);
        });
    });
}

function resolveCommand(entry: PsTreeEntry): string {
    return entry.COMMAND_LINE || entry.COMMAND || entry.COMM || '';
}

function findBestMatch(command: string, extensions: ExtensionIndexEntry[]): ExtensionIndexEntry | undefined {
    if (!command) {
        return undefined;
    }

    const haystack = normalizePath(command);
    let best: ExtensionIndexEntry | undefined;

    for (const extension of extensions) {
        if (haystack.includes(extension.path) || haystack.includes(extension.idLower)) {
            if (!best || extension.path.length > best.path.length) {
                best = extension;
            }
        }
    }

    return best;
}

export async function collectSubprocessStats(
    extensions: readonly vscode.Extension<unknown>[]
): Promise<Map<string, ExtensionSubprocessStats>> {
    const statsByExtension = new Map<string, ExtensionSubprocessStats>();
    const indexedExtensions: ExtensionIndexEntry[] = extensions.map((extension) => ({
        id: extension.id,
        name: extension.packageJSON?.displayName || extension.id,
        path: normalizePath(extension.extensionPath),
        idLower: extension.id.toLowerCase()
    }));

    const children = await getProcessTree(process.pid);
    if (children.length === 0) {
        return statsByExtension;
    }

    const pids = children
        .map((child) => Number(child.PID))
        .filter((pid) => Number.isFinite(pid) && pid > 0);

    if (pids.length === 0) {
        return statsByExtension;
    }

    let usageStats: Record<string, PidusageStat> = {};
    try {
        usageStats = await pidusage(pids);
    } catch (error) {
        // Ignore and fall back to empty stats if pidusage fails.
        return statsByExtension;
    }

    for (const child of children) {
        const pid = Number(child.PID);
        if (!Number.isFinite(pid)) {
            continue;
        }

        const usage = usageStats[String(pid)];
        if (!usage) {
            continue;
        }

        const command = resolveCommand(child);
        const match = findBestMatch(command, indexedExtensions);
        if (!match) {
            continue;
        }

        const entry: SubprocessUsage = {
            pid,
            ppid: Number(child.PPID) || 0,
            command,
            cpu: usage.cpu ?? 0,
            memory: usage.memory ? usage.memory / (1024 * 1024) : 0
        };

        const existing = statsByExtension.get(match.id) || {
            extensionId: match.id,
            totalCpu: 0,
            totalMemory: 0,
            processCount: 0,
            processes: [] as SubprocessUsage[]
        };

        existing.totalCpu += entry.cpu;
        existing.totalMemory += entry.memory;
        existing.processCount += 1;
        existing.processes.push(entry);

        statsByExtension.set(match.id, existing);
    }

    return statsByExtension;
}
