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

export interface ExtensionLike {
    id: string;
    extensionPath: string;
    packageJSON?: {
        displayName?: string;
    };
}

export interface CollectSubprocessStatsOptions {
    pidToExtensionId?: ReadonlyMap<number, string>;
    rootPid?: number;
    debug?: boolean;
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

async function getAllDescendants(rootPid: number): Promise<PsTreeEntry[]> {
    const allChildren: PsTreeEntry[] = [];
    const visited = new Set<number>();

    async function collect(pid: number): Promise<void> {
        if (visited.has(pid)) return;
        visited.add(pid);

        const children = await getProcessTree(pid);
        for (const child of children) {
            const childPid = Number(child.PID);
            if (Number.isFinite(childPid) && childPid > 0) {
                allChildren.push(child);
                await collect(childPid);
            }
        }
    }

    await collect(rootPid);
    return allChildren;
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

function findBestMatchWithDebug(command: string, extensions: ExtensionIndexEntry[]): ExtensionIndexEntry | undefined {
    const match = findBestMatch(command, extensions);
    if (match) {
        console.error(`[DEBUG] Matched command "${command}" to extension "${match.id}" (${match.path})`);
    }
    return match;
}

export async function collectSubprocessStats(
    extensions: readonly ExtensionLike[],
    options?: CollectSubprocessStatsOptions
): Promise<Map<string, ExtensionSubprocessStats>> {
    const statsByExtension = new Map<string, ExtensionSubprocessStats>();
    const indexedExtensions: ExtensionIndexEntry[] = extensions.map((extension) => ({
        id: extension.id,
        name: extension.packageJSON?.displayName || extension.id,
        path: normalizePath(extension.extensionPath),
        idLower: extension.id.toLowerCase()
    }));

    const extensionsById = new Map<string, ExtensionIndexEntry>();
    for (const entry of indexedExtensions) {
        extensionsById.set(entry.id, entry);
    }

    const rootPid = options?.rootPid ?? process.pid;
    const children = await getAllDescendants(rootPid);
    if (options?.debug) {
        console.error(`[DEBUG] Root PID ${rootPid} has ${children.length} descendants:`);
        children.forEach(child => {
            console.error(`  PID ${child.PID}: ${resolveCommand(child)}`);
        });
    }
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
        let match: ExtensionIndexEntry | undefined;
        const forcedExtensionId = options?.pidToExtensionId?.get(pid);
        if (forcedExtensionId) {
            match = extensionsById.get(forcedExtensionId);
        } else {
            match = options?.debug ? findBestMatchWithDebug(command, indexedExtensions) : findBestMatch(command, indexedExtensions);
        }
        if (!match) {
            // Debug: log unmatched processes
            if (options?.debug) {
                console.error(`[DEBUG] Unmatched process PID ${pid}: ${command}`);
                console.error(`[DEBUG] Available extension paths:`, indexedExtensions.map(e => e.path));
            }
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
