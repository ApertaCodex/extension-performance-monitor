import * as vscode from 'vscode';
import { PerformanceMonitor } from '../services/performanceMonitor';
import { ExtensionMetrics, PerformanceHistory, PerformanceSummary } from '../types';

export interface ExtensionResourceRow {
    id: string;
    displayName: string;
    version: string;
    isActive: boolean;
    cpuUsage: number;
    memoryUsage: number;
    activationTime?: number;
    averageCpu: number;
    averageMemory: number;
    peakCpu: number;
    peakMemory: number;
    lastUpdated: number;
    estimatedCpuUsage: number;
    estimatedMemoryUsage: number;
    processCpuUsage: number;
    processMemoryUsage: number;
    subprocessCount: number;
    topProcesses: ProcessSample[];
}

export interface ExtensionResourcesPayload {
    summary: PerformanceSummary;
    rows: ExtensionResourceRow[];
    generatedAt: number;
}

interface ProcessSample {
    pid: number;
    cpu: number;
    memory: number;
    command: string;
}

export function buildExtensionResourcesPayload(performanceMonitor: PerformanceMonitor): ExtensionResourcesPayload {
    const metrics = performanceMonitor.getCurrentMetrics();
    const summary = performanceMonitor.getPerformanceSummary();
    const rows = metrics.map((metric) => buildResourceRow(metric, performanceMonitor));

    return {
        summary,
        rows,
        generatedAt: Date.now()
    };
}

export function getExtensionResourcesHtml(webview: vscode.Webview): string {
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Extension Resources</title>
    <style>
        :root {
            color-scheme: light dark;
            --surface: var(--vscode-editor-background);
            --surface-alt: var(--vscode-sideBar-background);
            --border: color-mix(in srgb, var(--vscode-editor-foreground) 15%, transparent);
            --text: var(--vscode-editor-foreground);
            --muted: color-mix(in srgb, var(--vscode-editor-foreground) 55%, transparent);
            --accent: color-mix(in srgb, var(--vscode-charts-blue) 85%, white 15%);
            --accent-strong: color-mix(in srgb, var(--vscode-charts-blue) 70%, var(--vscode-charts-green) 30%);
            --good: var(--vscode-charts-green);
            --warn: var(--vscode-charts-orange);
            --bad: var(--vscode-charts-red);
            --shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
            --radius: 16px;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            background: var(--surface);
            color: var(--text);
            font-family: "Fira Sans", "IBM Plex Sans", var(--vscode-font-family);
        }

        .background {
            position: fixed;
            inset: 0;
            background:
                radial-gradient(circle at top left, color-mix(in srgb, var(--accent) 15%, transparent) 0%, transparent 55%),
                radial-gradient(circle at 30% 20%, color-mix(in srgb, var(--accent-strong) 12%, transparent) 0%, transparent 40%),
                linear-gradient(160deg, color-mix(in srgb, var(--surface-alt) 85%, transparent) 0%, transparent 60%);
            pointer-events: none;
            opacity: 0.9;
        }

        .page {
            position: relative;
            padding: 32px 32px 48px;
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            gap: 24px;
        }

        .hero {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            gap: 16px;
        }

        .eyebrow {
            text-transform: uppercase;
            letter-spacing: 0.18em;
            font-size: 11px;
            color: var(--muted);
            margin: 0 0 8px;
        }

        h1 {
            margin: 0;
            font-size: 32px;
            letter-spacing: -0.02em;
        }

        .subtitle {
            margin: 8px 0 0;
            color: var(--muted);
            max-width: 520px;
            line-height: 1.5;
        }

        .hero-actions {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        button,
        select,
        input {
            font: inherit;
            color: inherit;
        }

        .button {
            border: 1px solid var(--border);
            background: color-mix(in srgb, var(--surface-alt) 60%, transparent);
            color: var(--text);
            padding: 10px 16px;
            border-radius: 999px;
            cursor: pointer;
            transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
        }

        .button:hover {
            transform: translateY(-1px);
            border-color: color-mix(in srgb, var(--accent) 50%, var(--border));
            background: color-mix(in srgb, var(--surface-alt) 80%, transparent);
        }

        .timestamp {
            font-size: 12px;
            color: var(--muted);
        }

        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 16px;
        }

        .card {
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 16px;
            background: color-mix(in srgb, var(--surface-alt) 65%, transparent);
            box-shadow: var(--shadow);
            position: relative;
            overflow: hidden;
        }

        .card::after {
            content: "";
            position: absolute;
            inset: 0;
            background: linear-gradient(120deg, color-mix(in srgb, var(--accent) 12%, transparent), transparent 60%);
            opacity: 0.7;
            pointer-events: none;
        }

        .card h3 {
            margin: 0 0 8px;
            font-size: 14px;
            color: var(--muted);
            text-transform: uppercase;
            letter-spacing: 0.12em;
        }

        .card .value {
            font-size: 28px;
            font-weight: 600;
            letter-spacing: -0.02em;
        }

        .card .detail {
            margin-top: 8px;
            font-size: 13px;
            color: var(--muted);
        }

        .controls {
            display: grid;
            grid-template-columns: 2fr 1fr 1.2fr;
            gap: 16px;
            align-items: center;
        }

        .search input {
            width: 100%;
            padding: 10px 14px;
            border-radius: 12px;
            border: 1px solid var(--border);
            background: color-mix(in srgb, var(--surface-alt) 70%, transparent);
        }

        .filter-group,
        .sort-group {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
        }

        .filter-group button {
            padding: 8px 12px;
            border-radius: 999px;
            border: 1px solid var(--border);
            background: transparent;
            cursor: pointer;
        }

        .filter-group button.active {
            background: color-mix(in srgb, var(--accent) 20%, transparent);
            border-color: color-mix(in srgb, var(--accent) 65%, var(--border));
        }

        .sort-group select {
            padding: 8px 12px;
            border-radius: 10px;
            border: 1px solid var(--border);
            background: color-mix(in srgb, var(--surface-alt) 65%, transparent);
        }

        .sort-group .order {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            border: 1px solid var(--border);
            background: color-mix(in srgb, var(--surface-alt) 70%, transparent);
            cursor: pointer;
        }

        .table {
            border: 1px solid var(--border);
            border-radius: var(--radius);
            overflow: hidden;
            background: color-mix(in srgb, var(--surface-alt) 65%, transparent);
        }

        .table-head {
            display: grid;
            grid-template-columns: 2.4fr 0.9fr 1fr 1fr;
            padding: 12px 16px;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.14em;
            color: var(--muted);
            border-bottom: 1px solid var(--border);
        }

        .rows {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 12px;
        }

        .row {
            display: grid;
            grid-template-columns: 2.4fr 0.9fr 1fr 1fr;
            gap: 12px;
            padding: 14px;
            border-radius: 14px;
            border: 1px solid transparent;
            background: color-mix(in srgb, var(--surface) 75%, transparent);
            box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
            animation: rise 0.35s ease forwards;
            opacity: 0;
        }

        .row:nth-child(odd) {
            background: color-mix(in srgb, var(--surface-alt) 80%, transparent);
        }

        .row .name .title {
            font-weight: 600;
        }

        .row .name .sub {
            font-size: 12px;
            color: var(--muted);
        }

        .badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            border-radius: 999px;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.12em;
        }

        .badge.active {
            background: color-mix(in srgb, var(--good) 25%, transparent);
            color: color-mix(in srgb, var(--good) 85%, var(--text));
        }

        .badge.inactive {
            background: color-mix(in srgb, var(--muted) 25%, transparent);
            color: var(--muted);
        }

        .metric .value {
            font-weight: 600;
        }

        .bar {
            height: 6px;
            background: color-mix(in srgb, var(--surface-alt) 55%, transparent);
            border-radius: 999px;
            overflow: hidden;
            margin-top: 6px;
        }

        .bar span {
            display: block;
            height: 100%;
            background: linear-gradient(90deg, var(--accent), var(--accent-strong));
        }

        .bar.memory span {
            background: linear-gradient(90deg, color-mix(in srgb, var(--accent-strong) 70%, var(--accent)), var(--warn));
        }

        .meta {
            grid-column: 1 / -1;
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            font-size: 12px;
            color: var(--muted);
        }

        .meta span {
            padding: 4px 8px;
            border-radius: 999px;
            border: 1px solid var(--border);
            background: color-mix(in srgb, var(--surface-alt) 65%, transparent);
        }

        .process-pill {
            display: inline-block;
            border-style: dashed;
            color: var(--muted);
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .action {
            border: 1px solid var(--border);
            background: transparent;
            color: var(--text);
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            cursor: pointer;
        }

        .action:hover {
            background: color-mix(in srgb, var(--surface-alt) 80%, transparent);
        }

        .action.danger {
            border-color: color-mix(in srgb, var(--bad) 60%, var(--border));
            color: var(--bad);
        }

        .action.secondary {
            color: var(--muted);
        }

        .empty {
            text-align: center;
            padding: 32px;
            color: var(--muted);
            display: none;
        }

        @keyframes rise {
            from {
                transform: translateY(10px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }

        @media (max-width: 900px) {
            .hero {
                flex-direction: column;
                align-items: flex-start;
            }

            .controls {
                grid-template-columns: 1fr;
            }

            .table-head {
                display: none;
            }

            .row {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="background"></div>
    <div class="page">
        <header class="hero">
            <div>
                <p class="eyebrow">Extension Performance Monitor</p>
                <h1>Extension Resources</h1>
                <p class="subtitle">Track CPU, memory, and activity levels for every installed extension.</p>
            </div>
            <div class="hero-actions">
                <button class="button" id="refresh-btn">Refresh metrics</button>
                <div class="timestamp" id="updated-label">Updated: --</div>
            </div>
        </header>

        <section class="summary" id="summary"></section>

        <section class="controls">
            <div class="search">
                <input id="search" type="search" placeholder="Search extensions" />
            </div>
            <div class="filter-group" id="filters">
                <button class="active" data-filter="all">All</button>
                <button data-filter="active">Active</button>
                <button data-filter="inactive">Inactive</button>
            </div>
            <div class="sort-group">
                <label for="sort">Sort</label>
                <select id="sort">
                    <option value="cpu">CPU usage</option>
                    <option value="memory">Memory usage</option>
                    <option value="name">Name</option>
                    <option value="activation">Activation time</option>
                </select>
                <button class="order" id="order" aria-label="Toggle sort order" title="Toggle sort order">&#8595;</button>
            </div>
        </section>

        <section class="table">
            <div class="table-head">
                <div>Extension</div>
                <div>Status</div>
                <div>CPU</div>
                <div>Memory</div>
            </div>
            <div class="rows" id="rows"></div>
            <div class="empty" id="empty">No metrics collected yet. Click refresh to capture the latest snapshot.</div>
        </section>
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        const state = {
            rows: [],
            summary: null,
            search: '',
            filter: 'all',
            sort: 'cpu',
            order: 'desc'
        };

        const summaryEl = document.getElementById('summary');
        const rowsEl = document.getElementById('rows');
        const emptyEl = document.getElementById('empty');
        const updatedLabel = document.getElementById('updated-label');
        const searchInput = document.getElementById('search');
        const sortSelect = document.getElementById('sort');
        const orderButton = document.getElementById('order');
        const filterButtons = Array.from(document.querySelectorAll('#filters button'));

        const formatNumber = (value, digits = 1) => Number(value).toFixed(digits);
        const formatTime = (value) => (value ? value + ' ms' : 'n/a');
        const formatTimestamp = (value) => new Date(value).toLocaleTimeString();
        const formatProcess = (process) => {
            const name = process.command ? process.command.split(/[\\\\/]/).pop() : 'process';
            return 'PID ' + process.pid + ' · ' + formatNumber(process.cpu) + '% · ' + formatNumber(process.memory, 0) + ' MB · ' + name;
        };

        const escapeHtml = (value) => String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

        const renderSummary = (summary) => {
            if (!summary) {
                summaryEl.innerHTML = '';
                return;
            }

            const topCpu = summary.topCpuConsumers?.[0];
            const topMemory = summary.topMemoryConsumers?.[0];
            const topCpuLabel = topCpu ? escapeHtml(topCpu.displayName) : 'n/a';
            const topMemoryLabel = topMemory ? escapeHtml(topMemory.displayName) : 'n/a';

            summaryEl.innerHTML = [
                '                <div class="card">',
                '                    <h3>Extensions</h3>',
                '                    <div class="value">' + summary.totalExtensions + '</div>',
                '                    <div class="detail">' + summary.activeExtensions + ' active</div>',
                '                </div>',
                '                <div class="card">',
                '                    <h3>Total CPU</h3>',
                '                    <div class="value">' + formatNumber(summary.totalCpuUsage) + '%</div>',
                '                    <div class="detail">Top: ' + topCpuLabel + '</div>',
                '                </div>',
                '                <div class="card">',
                '                    <h3>Total Memory</h3>',
                '                    <div class="value">' + formatNumber(summary.totalMemoryUsage, 0) + ' MB</div>',
                '                    <div class="detail">Top: ' + topMemoryLabel + '</div>',
                '                </div>',
                '                <div class="card">',
                '                    <h3>Monitoring</h3>',
                '                    <div class="value">Live snapshot</div>',
                '                    <div class="detail">Updates as metrics refresh</div>',
                '                </div>'
            ].join('');
        };

        const applyFilters = () => {
            const searchLower = state.search.toLowerCase();
            return state.rows
                .filter((row) => {
                    if (state.filter === 'active' && !row.isActive) return false;
                    if (state.filter === 'inactive' && row.isActive) return false;
                    if (!searchLower) return true;
                    return row.displayName.toLowerCase().includes(searchLower) || row.id.toLowerCase().includes(searchLower);
                });
        };

        const sortRows = (rows) => {
            const direction = state.order === 'desc' ? -1 : 1;
            return rows.sort((a, b) => {
                let valueA;
                let valueB;

                switch (state.sort) {
                    case 'memory':
                        valueA = a.memoryUsage;
                        valueB = b.memoryUsage;
                        break;
                    case 'name':
                        valueA = a.displayName.toLowerCase();
                        valueB = b.displayName.toLowerCase();
                        break;
                    case 'activation':
                        valueA = a.activationTime ?? 0;
                        valueB = b.activationTime ?? 0;
                        break;
                    case 'cpu':
                    default:
                        valueA = a.cpuUsage;
                        valueB = b.cpuUsage;
                }

                if (typeof valueA === 'string' && typeof valueB === 'string') {
                    return valueA.localeCompare(valueB) * direction;
                }

                return (valueA - valueB) * direction;
            });
        };

        const renderRows = () => {
            const filtered = sortRows(applyFilters());
            const cpuValues = filtered.map((row) => (row.subprocessCount > 0 ? row.processCpuUsage : row.cpuUsage));
            const memoryValues = filtered.map((row) => (row.subprocessCount > 0 ? row.processMemoryUsage : row.memoryUsage));
            const maxCpu = Math.max(5, ...cpuValues);
            const maxMemory = Math.max(10, ...memoryValues);

            if (!filtered.length) {
                rowsEl.innerHTML = '';
                emptyEl.style.display = 'block';
                return;
            }

            emptyEl.style.display = 'none';

            rowsEl.innerHTML = filtered.map((row, index) => {
                const useProcess = row.subprocessCount > 0;
                const cpuValue = useProcess ? row.processCpuUsage : row.cpuUsage;
                const memoryValue = useProcess ? row.processMemoryUsage : row.memoryUsage;
                const cpuWidth = Math.min(100, Math.round((cpuValue / maxCpu) * 100));
                const memoryWidth = Math.min(100, Math.round((memoryValue / maxMemory) * 100));
                const animationDelay = (index * 0.03).toFixed(2);
                const usageSource = useProcess ? 'Subprocesses' : 'Heuristic estimate';
                const estimatedBadges = useProcess
                    ? ''
                    : [
                        '                            <span>Est CPU ' + formatNumber(row.estimatedCpuUsage) + '%</span>',
                        '                            <span>Est Mem ' + formatNumber(row.estimatedMemoryUsage, 0) + ' MB</span>'
                    ].join('');
                const processBadges = row.topProcesses.map((process) => {
                    return '                            <span class=\"process-pill\">' + escapeHtml(formatProcess(process)) + '</span>';
                }).join('');

                return [
                    '                    <div class="row" style="animation-delay: ' + animationDelay + 's">',
                    '                        <div class="name">',
                    '                            <div class="title">' + escapeHtml(row.displayName) + '</div>',
                    '                            <div class="sub">' + escapeHtml(row.id) + ' | v' + escapeHtml(row.version) + '</div>',
                    '                        </div>',
                    '                        <div>',
                    '                            <span class="badge ' + (row.isActive ? 'active' : 'inactive') + '">' + (row.isActive ? 'Active' : 'Inactive') + '</span>',
                    '                        </div>',
                    '                        <div class="metric">',
                    '                            <div class="value">' + formatNumber(cpuValue) + '%</div>',
                    '                            <div class="bar"><span style="width: ' + cpuWidth + '%"></span></div>',
                    '                        </div>',
                    '                        <div class="metric">',
                    '                            <div class="value">' + formatNumber(memoryValue, 0) + ' MB</div>',
                    '                            <div class="bar memory"><span style="width: ' + memoryWidth + '%"></span></div>',
                    '                        </div>',
                    '                        <div class="meta">',
                    '                            <span>Avg CPU ' + formatNumber(row.averageCpu) + '%</span>',
                    '                            <span>Avg Mem ' + formatNumber(row.averageMemory, 0) + ' MB</span>',
                    '                            <span>Peak CPU ' + formatNumber(row.peakCpu) + '%</span>',
                    '                            <span>Peak Mem ' + formatNumber(row.peakMemory, 0) + ' MB</span>',
                    '                            <span>Activation ' + formatTime(row.activationTime) + '</span>',
                    '                            <span>Updated ' + formatTimestamp(row.lastUpdated) + '</span>',
                    '                            <span>Usage: ' + usageSource + '</span>',
                    '                            <span>Subprocesses ' + row.subprocessCount + '</span>',
                    estimatedBadges,
                    '                            <button type="button" class="action danger" data-action="disable" data-id="' + escapeHtml(row.id) + '" data-name="' + escapeHtml(row.displayName) + '">Disable</button>',
                    '                            <button type="button" class="action secondary" data-action="enable" data-id="' + escapeHtml(row.id) + '" data-name="' + escapeHtml(row.displayName) + '">Enable</button>',
                    processBadges,
                    '                        </div>',
                    '                    </div>'
                ].join('');
            }).join('');
        };

        const render = () => {
            renderSummary(state.summary);
            renderRows();
        };

        searchInput.addEventListener('input', (event) => {
            state.search = event.target.value.trim();
            renderRows();
        });

        sortSelect.addEventListener('change', (event) => {
            state.sort = event.target.value;
            renderRows();
        });

        orderButton.addEventListener('click', () => {
            state.order = state.order === 'desc' ? 'asc' : 'desc';
            orderButton.textContent = state.order === 'desc' ? '\u2193' : '\u2191';
            renderRows();
        });

        filterButtons.forEach((button) => {
            button.addEventListener('click', () => {
                filterButtons.forEach((btn) => btn.classList.remove('active'));
                button.classList.add('active');
                state.filter = button.dataset.filter || 'all';
                renderRows();
            });
        });

        rowsEl.addEventListener('click', (event) => {
            const target = event.target instanceof Element ? event.target : null;
            const button = target ? target.closest('button[data-action]') : null;
            if (!button) {
                return;
            }

            const action = button.dataset.action;
            const id = button.dataset.id;
            const name = button.dataset.name;

            if (!action || !id) {
                return;
            }

            vscode.postMessage({
                type: action === 'disable' ? 'disableExtension' : 'enableExtension',
                id,
                name
            });
        });

        document.getElementById('refresh-btn').addEventListener('click', () => {
            vscode.postMessage({ type: 'refresh' });
        });

        window.addEventListener('message', (event) => {
            const message = event.data;
            if (message?.type === 'metrics') {
                state.rows = message.rows || [];
                state.summary = message.summary || null;
                updatedLabel.textContent = 'Updated: ' + formatTimestamp(message.generatedAt);
                render();
            }
        });
    </script>
</body>
</html>`;
}

function buildResourceRow(metric: ExtensionMetrics, performanceMonitor: PerformanceMonitor): ExtensionResourceRow {
    const history = performanceMonitor.getExtensionHistory(metric.id);
    const subprocessStats = performanceMonitor.getSubprocessStats(metric.id);
    const processes = subprocessStats?.processes ?? [];
    const topProcesses = [...processes]
        .sort((a, b) => b.cpu - a.cpu)
        .slice(0, 3)
        .map((process) => ({
            pid: process.pid,
            cpu: process.cpu,
            memory: process.memory,
            command: process.command
        }));

    return {
        id: metric.id,
        displayName: metric.displayName,
        version: metric.version,
        isActive: metric.isActive,
        cpuUsage: metric.cpuUsage,
        memoryUsage: metric.memoryUsage,
        activationTime: metric.activationTime,
        averageCpu: history?.averages.cpu ?? metric.cpuUsage,
        averageMemory: history?.averages.memory ?? metric.memoryUsage,
        peakCpu: history?.peaks.cpu.value ?? metric.cpuUsage,
        peakMemory: history?.peaks.memory.value ?? metric.memoryUsage,
        lastUpdated: metric.timestamp,
        estimatedCpuUsage: metric.estimatedCpuUsage ?? metric.cpuUsage,
        estimatedMemoryUsage: metric.estimatedMemoryUsage ?? metric.memoryUsage,
        processCpuUsage: metric.processCpuUsage ?? 0,
        processMemoryUsage: metric.processMemoryUsage ?? 0,
        subprocessCount: metric.subprocessCount ?? 0,
        topProcesses
    };
}

function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i += 1) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
