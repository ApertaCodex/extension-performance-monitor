import { spawn } from 'child_process';
import * as os from 'os';
import * as path from 'path';
import { collectSubprocessStats, ExtensionSubprocessStats } from '../services/subprocessUsage';

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

async function main(): Promise<void> {
    const extId = 'extperf.metricsTestExtension';
    const extPath = path.join(os.tmpdir(), 'extperf-metrics-test-ext');

    const burnerDurationMs = 12_000;
    const burnerMemoryMb = 200;

    const burnerScriptPath = path.join(__dirname, 'metricsBurner.js');

    let burnerFinal: { rssMb?: number; cpuPercentSingleCore?: number } | undefined;
    let burnerPid: number | undefined;

    const child = spawn(process.execPath, [
        burnerScriptPath,
        `--extPath=${extPath}`,
        `--durationMs=${burnerDurationMs}`,
        `--memoryMb=${burnerMemoryMb}`
    ], {
        stdio: ['ignore', 'pipe', 'pipe']
    });

    child.stderr.setEncoding('utf8');
    child.stdout.setEncoding('utf8');

    let stdoutBuffer = '';

    child.stdout.on('data', (chunk: string) => {
        stdoutBuffer += chunk;

        let newlineIndex = stdoutBuffer.indexOf('\n');
        while (newlineIndex >= 0) {
            const line = stdoutBuffer.slice(0, newlineIndex).trim();
            stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);

            if (line.length > 0) {
                try {
                    const parsed: unknown = JSON.parse(line);
                    if (isRecord(parsed) && typeof parsed.pid === 'number') {
                        burnerPid = parsed.pid;
                    }
                    if (isRecord(parsed) && parsed.type === 'final') {
                        burnerFinal = {
                            rssMb: typeof parsed.rssMb === 'number' ? parsed.rssMb : undefined,
                            cpuPercentSingleCore: typeof parsed.cpuPercentSingleCore === 'number'
                                ? parsed.cpuPercentSingleCore
                                : undefined
                        };
                    }
                } catch {
                    // Ignore non-JSON output.
                }
            }

            newlineIndex = stdoutBuffer.indexOf('\n');
        }
    });

    child.stderr.on('data', (chunk: string) => {
        process.stderr.write(chunk);
    });

    const exitPromise = new Promise<number>((resolve) => {
        child.on('exit', (code) => resolve(code ?? 0));
    });

    // Give the burner time to start.
    await sleep(1000);

    if (!burnerPid) {
        burnerPid = child.pid;
    }

    if (!burnerPid) {
        throw new Error('Unable to determine burner PID.');
    }

    const pidToExtensionId = new Map<number, string>([[burnerPid, extId]]);

    const samples: ExtensionSubprocessStats[] = [];

    for (let i = 0; i < 8; i += 1) {
        const stats = await collectSubprocessStats([
            {
                id: extId,
                extensionPath: extPath,
                packageJSON: { displayName: 'Extension Performance Monitor Metrics Test' }
            }
        ], { pidToExtensionId });

        const entry = stats.get(extId);
        if (entry && entry.processCount > 0) {
            samples.push(entry);
        }

        await sleep(500);
    }

    const code = await exitPromise;

    if (code !== 0) {
        throw new Error(`metricsBurner exited with code ${code}`);
    }

    if (samples.length === 0) {
        throw new Error('No subprocess stats samples were captured. The burner process may not have been detected/matched.');
    }

    const avgCpu = samples.reduce((sum, s) => sum + s.totalCpu, 0) / samples.length;
    const avgMem = samples.reduce((sum, s) => sum + s.totalMemory, 0) / samples.length;

    // Basic correctness checks
    if (!Number.isFinite(avgCpu) || avgCpu <= 0.5) {
        throw new Error(`CPU usage too low or invalid: avgCpu=${avgCpu}`);
    }

    if (!Number.isFinite(avgMem) || avgMem <= burnerMemoryMb * 0.5) {
        throw new Error(`Memory usage too low or invalid: avgMem=${avgMem} MB (expected >= ~${burnerMemoryMb * 0.5} MB)`);
    }

    // Cross-check with burner self-reported values, if present.
    if (burnerFinal?.rssMb !== undefined) {
        const lower = burnerFinal.rssMb * 0.7;
        const upper = burnerFinal.rssMb * 1.3;
        if (avgMem < lower || avgMem > upper) {
            throw new Error(`Memory usage mismatch: avgMem=${avgMem.toFixed(1)} MB, burnerRss=${burnerFinal.rssMb.toFixed(1)} MB (expected within ±30%)`);
        }
    }

    // pidusage CPU is an instantaneous percentage; burner CPU is an average single-core percentage.
    // We keep this check loose and only enforce that we captured meaningful CPU.
    if (burnerFinal?.cpuPercentSingleCore !== undefined) {
        const minExpected = Math.max(1, burnerFinal.cpuPercentSingleCore * 0.1);
        if (avgCpu < minExpected) {
            throw new Error(`CPU usage mismatch: avgCpu=${avgCpu.toFixed(1)}%, burnerAvgSingleCore=${burnerFinal.cpuPercentSingleCore.toFixed(1)}% (expected >= ${minExpected.toFixed(1)}%)`);
        }
    }

    process.stdout.write(
        `OK: subprocess CPU/RAM measurement looks correct (avgCpu=${avgCpu.toFixed(1)}%, avgMem=${avgMem.toFixed(1)} MB, samples=${samples.length}).\n`
    );
}

main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
});
