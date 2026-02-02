# Changelog

All notable changes to the "Extension Performance Monitor" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] - 2024-01-XX

### Added
- Initial release of Extension Performance Monitor
- Real-time CPU and memory monitoring for all VS Code extensions
- Performance tree view in Explorer sidebar with categorized extension data
- Status bar integration with live performance summary
- Configurable monitoring intervals (1-60 seconds)
- Performance alert system with customizable thresholds
- Historical data tracking and persistence
- Comprehensive performance reporting (JSON/CSV export)
- Performance insights and optimization recommendations
- Automatic monitoring on VS Code startup
- Data retention management with configurable cleanup
- Extension activation time tracking
- Top CPU and memory consumer identification
- Performance trend analysis
- User-friendly tooltips and detailed extension information

### Features
- **Monitoring**: Automatic performance tracking for all extensions
- **Visualization**: Tree view with summary, categories, and detailed metrics
- **Alerts**: Configurable CPU and memory usage thresholds
- **Reports**: Export detailed performance data in multiple formats
- **History**: Persistent storage of performance metrics over time
- **Insights**: Smart recommendations for performance optimization
- **Configuration**: Extensive customization options
- **Status Bar**: Real-time performance overview

### Commands
- `Extension Performance: Show Performance Monitor` - Open performance view
- `Extension Performance: Refresh Metrics` - Manual metrics refresh
- `Extension Performance: Export Performance Report` - Generate performance report
- `Extension Performance: Clear Performance History` - Reset historical data
- `Extension Performance: Toggle Performance Monitoring` - Start/stop monitoring

### Configuration Options
- `extperf.monitoringInterval` - Monitoring frequency (default: 5000ms)
- `extperf.enableAutoMonitoring` - Auto-start monitoring (default: true)
- `extperf.showStatusBarItem` - Show status bar item (default: true)
- `extperf.alertThresholds.cpu` - CPU alert threshold (default: 80%)
- `extperf.alertThresholds.memory` - Memory alert threshold (default: 100MB)
- `extperf.historyRetentionDays` - Data retention period (default: 7 days)

### Technical Details
- TypeScript implementation with strict typing
- VS Code API 1.96.0+ compatibility
- Efficient performance monitoring with minimal overhead
- Persistent data storage using VS Code global state
- Event-driven architecture for real-time updates
- Comprehensive error handling and logging
- Memory-efficient historical data management

### Known Limitations
- CPU and memory metrics are estimated using heuristics (VS Code doesn't provide direct extension resource usage APIs)
- Performance data is approximate and may not reflect exact system resource consumption
- Historical data is stored locally and doesn't sync across VS Code instances
