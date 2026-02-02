declare module 'pidusage' {
    export interface Stat {
        cpu: number;
        memory: number;
        ppid?: number;
        elapsed?: number;
        timestamp?: number;
    }

    interface Pidusage {
        (pid: number | number[]): Promise<Record<string, Stat>>;
        clear(): void;
    }

    const pidusage: Pidusage;
    export default pidusage;
}

declare module 'ps-tree' {
    interface PsTreeEntry {
        PID: string;
        PPID: string;
        COMMAND?: string;
        COMM?: string;
        COMMAND_LINE?: string;
    }

    type PsTreeCallback = (err: Error | null, children: PsTreeEntry[]) => void;

    function psTree(pid: number, callback: PsTreeCallback): void;

    export = psTree;
}
