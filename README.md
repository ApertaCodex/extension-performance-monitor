# Extension Performance Monitor

🚀 **Monitor CPU and RAM consumption for all VS Code extensions with real-time tracking, performance insights, and resource usage analytics.**

## Features

### 📊 Real-time Performance Monitoring
- **Live CPU and Memory Tracking**: Monitor resource consumption for all installed extensions
- **Automatic Monitoring**: Starts monitoring automatically when VS Code opens
- **Configurable Intervals**: Adjust monitoring frequency from 1-60 seconds
- **Status Bar Integration**: Quick performance overview always visible

### 📈 Performance Analytics
- **Historical Data**: Track performance trends over time
- **Peak Usage Detection**: Identify when extensions hit maximum resource usage
- **Average Calculations**: See long-term performance patterns
- **Performance Alerts**: Get notified when extensions exceed usage thresholds

### 🎯 Smart Insights
- **Top Consumers**: Quickly identify extensions using the most CPU/RAM
- **Performance Recommendations**: Get suggestions to optimize your setup
- **Extension Status**: See which extensions are active vs inactive
- **Resource Trends**: Understand how your extension usage patterns change

### 📋 Comprehensive Reporting
- **Export Reports**: Generate detailed performance reports in JSON or CSV format
- **Historical Analysis**: Export data for external analysis
- **Performance Summaries**: Get overview reports with key metrics
- **Customizable Data**: Choose what metrics to include in reports

### ⚙️ Flexible Configuration
- **Alert Thresholds**: Set custom CPU and memory usage alerts
- **Data Retention**: Configure how long to keep historical data
- **Monitoring Controls**: Start/stop monitoring as needed
- **Status Bar Options**: Show/hide performance data in status bar

## Installation

1. **From VS Code Marketplace**:
   - Open VS Code
   - Go to Extensions (Ctrl+Shift+X)
   - Search for "Extension Performance Monitor"
   - Click Install

2. **From VSIX**:
   ```bash
   code --install-extension extension-performance-monitor-0.0.1.vsix
   ```

## Usage

### Getting Started

1. **Automatic Start**: The extension begins monitoring automatically when VS Code opens
2. **View Performance**: Open the "Extension Performance" view in the Explorer sidebar
3. **Check Status Bar**: See real-time performance summary in the bottom status bar

### Commands

Access all commands via the Command Palette (Ctrl+Shift+P):

- `Extension Performance: Show Performance Monitor` - Open the performance view
- `Extension Performance: Refresh Metrics` - Manually refresh performance data
- `Extension Performance: Export Performance Report` - Generate and save a performance report
- `Extension Performance: Clear Performance History` - Reset all historical data
- `Extension Performance: Toggle Performance Monitoring` - Start/stop monitoring

### Performance View

The Extension Performance view shows:

- **Performance Summary**: Overall CPU/RAM usage and extension counts
- **Active Extensions**: Currently running extensions with live metrics
- **Top CPU Consumers**: Extensions using the most processing power
- **Top Memory Consumers**: Extensions using the most RAM
- **All Extensions**: Complete list with detailed performance data

### Status Bar

The status bar item displays:
- Current total CPU usage percentage
- Current total memory usage in MB
- Quick access to the performance view (click to open)
- Color coding based on performance levels (green/yellow/red)

### Exporting Reports

1. Run `Extension Performance: Export Performance Report`
2. Choose JSON or CSV format
3. Select save location
4. Open or reveal the exported file

Reports include:
- Current performance metrics for all extensions
- Historical data and trends
- Performance insights and recommendations
- Summary statistics

## Configuration

Configure the extension through VS Code settings:

```json
{
  "extperf.monitoringInterval": 5000,
  "extperf.enableAutoMonitoring": true,
  "extperf.showStatusBarItem": true,
  "extperf.alertThresholds.cpu": 80,
  "extperf.alertThresholds.memory": 100,
  "extperf.historyRetentionDays": 7
}
```

### Settings Reference

| Setting | Default | Description |
|---------|---------|-------------|
| `monitoringInterval` | 5000 | Monitoring interval in milliseconds (1000-60000) |
| `enableAutoMonitoring` | true | Start monitoring automatically when VS Code opens |
| `showStatusBarItem` | true | Show performance summary in status bar |
| `alertThresholds.cpu` | 80 | CPU usage alert threshold (percentage) |
| `alertThresholds.memory` | 100 | Memory usage alert threshold (MB) |
| `historyRetentionDays` | 7 | Number of days to retain performance history |

## Understanding the Metrics

### CPU Usage
- Estimated processing power consumption
- Shown as percentage (0-100%)
- Based on extension activity and type
- Higher values indicate more processing overhead

### Memory Usage
- Estimated RAM consumption
- Shown in megabytes (MB)
- Includes base extension overhead plus active usage
- Higher values indicate more memory overhead

### Performance Categories
- **🟢 Good**: Low resource usage, optimal performance
- **🟡 Moderate**: Medium resource usage, acceptable performance
- **🔴 High**: High resource usage, may impact performance

## Performance Tips

1. **Monitor Regularly**: Check the performance view periodically to identify issues
2. **Review Top Consumers**: Focus on extensions using the most resources
3. **Disable Unused Extensions**: Inactive extensions can still consume memory
4. **Adjust Thresholds**: Set alert thresholds based on your system capabilities
5. **Export Reports**: Use historical data to identify performance trends
6. **Clean Up**: Remove extensions you no longer use

## Troubleshooting

### Extension Not Starting
- Check that VS Code version is 1.96.0 or higher
- Reload VS Code window (Ctrl+Shift+P → "Developer: Reload Window")
- Check the Output panel for error messages

### No Performance Data
- Ensure monitoring is enabled (check status bar)
- Try manually refreshing metrics
- Verify extensions are installed and active

### High Resource Usage
- Review alert notifications for problematic extensions
- Check the "Top Consumers" categories
- Consider disabling or replacing high-usage extensions

### Missing Status Bar Item
- Check that `extperf.showStatusBarItem` is enabled
- Restart VS Code if the setting was recently changed
- Look for the item on the right side of the status bar

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/apertacodex/extension-performance-monitor.git
cd extension-performance-monitor

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Package the extension
npm run package
```

### Using the Makefile

```bash
# Build and install
make install

# Build only
make build

# Publish to marketplace
make publish

# Clean build artifacts
make clean
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/apertacodex/extension-performance-monitor/issues)
- **Documentation**: [GitHub Repository](https://github.com/apertacodex/extension-performance-monitor)
- **Marketplace**: [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=apertacodex.extension-performance-monitor)

---

**Made with ❤️ for the VS Code community**