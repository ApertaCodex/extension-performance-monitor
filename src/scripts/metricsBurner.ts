import * as os from 'os';

function getArgValue(prefix: string): string | undefined {
    const match = process.argv.find((arg) => arg.startsWith(prefix));
    return match ? match.slice(prefix.length) : undefined;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
    const extPath = getArgValue('--extPath=') ?? '';
    const durationMs = Number(getArgValue('--durationMs=') ?? '8000');
    const memoryMb = Number(getArgValue('--memoryMb=') ?? '150');

    const startedAt = Date.now();
    const cpuStart = process.cpuUsage();

    const allocations: Buffer[] = [];
    const bytesToAllocate = Math.max(0, Math.floor(memoryMb * 1024 * 1024));
    if (bytesToAllocate > 0) {
        allocations.push(Buffer.alloc(bytesToAllocate, 0xaa));
    }

    const startedPayload = {
        type: 'started',
        pid: process.pid,
        platform: os.platform(),
        extPath,
        memoryMb,
        durationMs
    };

    process.stdout.write(`${JSON.stringify(startedPayload)}\n`);

    // Busy loop to generate CPU load.
    // Keep yielding occasionally so stdout can flush and the process stays responsive.
    while (Date.now() - startedAt < durationMs) {
        let x = 0;
        for (let i = 0; i < 10_000_0; i += 1) {
            x = (x + i) % 9973;
        }
        if (x === -1) {
            allocations.push(Buffer.from('noop'));
        }
        await sleep(0);
    }

    const cpuEnd = process.cpuUsage(cpuStart);
    const elapsedMs = Math.max(1, Date.now() - startedAt);
    const cpuMicros = cpuEnd.user + cpuEnd.system;
    const cpuPercentSingleCore = (cpuMicros / (elapsedMs * 1000)) * 100;

    const rssMb = process.memoryUsage().rss / (1024 * 1024);

    const finalPayload = {
        type: 'final',
        pid: process.pid,
        extPath,
        rssMb,
        cpuPercentSingleCore
    };

    process.stdout.write(`${JSON.stringify(finalPayload)}\n`);
}

main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
});
