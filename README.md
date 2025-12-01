# AI Command Tool Management (ACMT)

> **MCP Server for intelligent command discovery and execution**

[![npm version](https://img.shields.io/npm/v/@elliotding/ai-command-tool-mcp.svg)](https://www.npmjs.com/package/@elliotding/ai-command-tool-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

ACMT is a Model Context Protocol (MCP) server that provides intelligent search and management of command definitions. It supports both **stdio** (local/SSH) and **SSE** (remote HTTP) transport modes, enabling users to discover and execute commands without copying them to their local workspace.

---

## 📖 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Running Modes](#-running-modes)
- [Configuration](#-configuration)
- [Usage Examples](#-usage-examples)
- [Available Tools](#-available-tools)
- [Deployment](#-deployment)
- [Testing](#-testing)
- [Development](#-development)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)

---

## ✨ Features

- **🔀 Dual Transport Modes**
  - **stdio**: Standard I/O for local development and SSH remote access
  - **SSE**: Server-Sent Events for production HTTP/HTTPS deployment
  
- **🔍 Three-Tier Intelligent Search**
  - Tier 1: Keyword matching against filenames
  - Tier 2: Semantic search of command content
  - Tier 3: Discovery through historical analysis reports
  
- **📁 Remote Command Management**
  - Commands stored on remote server
  - No local file clutter
  - Centralized version control

- **📊 Report Discovery**
  - Search across historical analysis reports
  - Command-specific report filtering
  - Automatic date extraction and sorting

- **⚡ High Performance**
  - Intelligent caching system (configurable TTL)
  - Search optimization with timeout control
  - Configurable limits and thresholds

- **🔒 Security**
  - Path validation and sanitization
  - Directory traversal prevention
  - Input validation on all queries
  - SystemD service isolation (production mode)

---

## 🚀 Quick Start

### Install

```bash
npm install -g @elliotding/ai-command-tool-mcp@latest
```

### Local Testing (stdio mode)

```bash
# 1. Create config
cat > /tmp/test-config.json << 'EOF'
{
  "commands_directory": "./Commands",
  "reports_directory": "./Commands-Analyze-Report"
}
EOF

# 2. Run
CONFIG_PATH=/tmp/test-config.json ai-command-tool
```

### Local Testing (SSE mode)

```bash
# 1. Run the test script
./test-local.sh

# 2. Configure Cursor (see output instructions)

# 3. Test in Cursor
@ai-command-tool-local list commands
```

---

## 📦 Installation

### Prerequisites

- Node.js >= 18.0.0
- npm

### Global Installation (Recommended)

```bash
npm install -g @elliotding/ai-command-tool-mcp@latest
```

This installs **one package** with **two commands**:
- `ai-command-tool` - stdio mode (local/SSH)
- `ai-command-tool-server` - SSE mode (HTTP server)

### Local Development

```bash
git clone https://github.com/ElliotLion-ing/AI-Command-Management.git
cd AI-Command-Management
npm install
npm run build
npm link
```

---

## 🔀 Running Modes

ACMT supports two transport modes. Choose based on your needs:

| Mode | Command | Transport | Use Case | Setup Complexity |
|------|---------|-----------|----------|------------------|
| **stdio** | `ai-command-tool` | Standard I/O | Local dev, SSH remote | ⭐ Simple |
| **SSE** | `ai-command-tool-server` | HTTP/SSE | Production server, Multi-user | ⭐⭐⭐ Advanced |

### Mode 1: stdio (Simple, Secure)

**Best for**: Development, personal use, SSH access

**Pros**:
- ✅ No port configuration needed
- ✅ Encrypted via SSH
- ✅ Simple setup
- ✅ No firewall changes

**Cons**:
- ❌ New process per request (slower)
- ❌ Requires SSH access (for remote)

**Cursor Configuration** (Local):
```json
{
  "mcpServers": {
    "ai-command-tool": {
      "command": "ai-command-tool",
      "env": {
        "CONFIG_PATH": "/path/to/config.json"
      }
    }
  }
}
```

**Cursor Configuration** (SSH Remote):
```json
{
  "mcpServers": {
    "ai-command-tool": {
      "command": "ssh",
      "args": [
        "user@server.com",
        "CONFIG_PATH=/opt/acmt/.ai-command-tool.json",
        "ai-command-tool"
      ]
    }
  }
}
```

### Mode 2: SSE (Production, Multi-user)

**Best for**: Production deployment, team sharing, multiple users

**Pros**:
- ✅ Fast (persistent connection)
- ✅ Multi-user support
- ✅ No SSH needed
- ✅ Easy monitoring

**Cons**:
- ❌ Requires port configuration
- ❌ Needs firewall setup
- ❌ More complex deployment

**Server Start**:
```bash
# Quick test
PORT=5090 CONFIG_PATH=/opt/acmt/.ai-command-tool.json ai-command-tool-server

# Production (with systemd)
sudo systemctl start acmt-mcp
```

**Cursor Configuration**:
```json
{
  "mcpServers": {
    "ai-command-tool": {
      "url": "https://your-domain.com/mcp/sse",
      "transport": "sse"
    }
  }
}
```

---

## ⚙️ Configuration

### Configuration File

Create `.ai-command-tool.json` in your project root or home directory:

```json
{
  "commands_directory": "/path/to/Commands",
  "reports_directory": "/path/to/Commands-Analyze-Report",
  "cache_ttl_seconds": 600,
  "cache_max_entries": 1000,
  "max_search_results": 20,
  "search_timeout_ms": 5000,
  "enable_cache": true,
  "report_link_base_url": "https://reports.example.com/",
  "enable_report_upload": true,
  "report_upload_max_size_mb": 10,
  "report_auto_versioning": true,
  "report_file_permissions": "644",
  "log_level": "info"
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `commands_directory` | string | **required** | Path to Commands directory |
| `reports_directory` | string | **required** | Path to reports directory |
| `cache_ttl_seconds` | number | 3600 | Cache lifetime in seconds |
| `cache_max_entries` | number | 1000 | Maximum cache entries |
| `max_search_results` | number | 10 | Maximum search results (1-100) |
| `search_timeout_ms` | number | 5000 | Search timeout in milliseconds |
| `enable_cache` | boolean | true | Enable/disable caching |
| `report_link_base_url` | string | "" | Base URL for report links (optional) |
| `enable_report_upload` | boolean | true | Enable/disable report upload feature 🆕 |
| `report_upload_max_size_mb` | number | 10 | Maximum report size in MB 🆕 |
| `report_auto_versioning` | boolean | true | Auto-increment version on conflicts 🆕 |
| `report_file_permissions` | string | "644" | File permissions (octal string) 🆕 |
| `log_level` | string | "info" | Log level: debug/info/warn/error |

### Environment Variables

Override configuration with environment variables:

```bash
AICMD_COMMANDS_DIR=/path/to/commands
AICMD_REPORTS_DIR=/path/to/reports
AICMD_CACHE_TTL=600
AICMD_REPORT_BASE_URL=https://reports.example.com/
AICMD_MAX_RESULTS=20
AICMD_SEARCH_TIMEOUT=5000
AICMD_ENABLE_CACHE=true
AICMD_ENABLE_REPORT_UPLOAD=true
AICMD_REPORT_UPLOAD_MAX_SIZE_MB=10
AICMD_REPORT_AUTO_VERSIONING=true
AICMD_REPORT_FILE_PERMISSIONS=644
AICMD_LOG_LEVEL=info
```

### Config Search Path

The tool searches for config in this order:
1. `CONFIG_PATH` environment variable
2. `./.ai-command-tool.json` (current directory)
3. `~/.ai-command-tool.json` (user home)
4. `/etc/ai-command-tool/config.json` (system-wide)

---

## 💡 Usage Examples

### Example 1: Find Log Analysis Command

```
User in Cursor: "Find me a tool to analyze speech SDK logs"

MCP Response:
{
  "results": [
    {
      "name": "analyze_zoom_speech_sdk_log",
      "score": 0.95,
      "description": "Analyzes Zoom Speech SDK log files..."
    }
  ]
}
```

### Example 2: Get Command Details

```
User: "Show me details of analyze_zoom_speech_sdk_log"

MCP Response:
{
  "name": "analyze_zoom_speech_sdk_log",
  "content": "# Zoom Speech SDK Log Analyzer\n\n## Purpose\n...",
  "path": "Commands/analyze_zoom_speech_sdk_log.md"
}
```

### Example 3: Search Reports

```
User: "Find reports about decode timeout issues"

MCP Response:
{
  "reports": [
    {
      "title": "Zoom Speech SDK Analysis - Decode Response",
      "command": "analyze_zoom_speech_sdk_log",
      "date": "2025-11-20",
      "link": "https://reports.example.com/..."
    }
  ]
}
```

---

## 🛠️ Available Tools

### 1. `search_commands`

Search for commands using intelligent three-tier search.

**Input**:
```json
{
  "query": "speech SDK log analysis",
  "max_results": 10
}
```

**Output**:
```json
{
  "results": [
    {
      "name": "analyze_zoom_speech_sdk_log",
      "score": 0.95,
      "tier": "tier1",
      "description": "Analyzes Zoom Speech SDK logs"
    }
  ],
  "search_time_ms": 45
}
```

### 2. `get_command`

Get full command definition by name.

**Input**:
```json
{
  "command_name": "analyze_zoom_speech_sdk_log"
}
```

**Output**:
```json
{
  "name": "analyze_zoom_speech_sdk_log",
  "content": "# Full markdown content...",
  "path": "Commands/analyze_zoom_speech_sdk_log.md",
  "size_bytes": 2048
}
```

### 3. `list_commands`

List all available commands with pagination.

**Input**:
```json
{
  "page": 1,
  "page_size": 50
}
```

**Output**:
```json
{
  "commands": ["analyze_zoom_speech_sdk_log", "..."],
  "total": 10,
  "page": 1,
  "page_size": 50,
  "total_pages": 1
}
```

### 4. `search_reports`

Search analysis reports across all or specific commands.

**Input**:
```json
{
  "query": "decode timeout",
  "command_filter": "analyze_zoom_speech_sdk_log",
  "max_results": 10
}
```

**Output**:
```json
{
  "reports": [
    {
      "title": "Zoom Speech SDK Analysis",
      "command": "analyze_zoom_speech_sdk_log",
      "date": "2025-11-20",
      "link": "https://..."
    }
  ]
}
```

### 5. `list_command_reports`

List all reports for a specific command.

**Input**:
```json
{
  "command_name": "analyze_zoom_speech_sdk_log"
}
```

**Output**:
```json
{
  "command": "analyze_zoom_speech_sdk_log",
  "reports": [
    {
      "filename": "report_20251120.md",
      "date": "2025-11-20",
      "link": "https://..."
    }
  ],
  "total": 5
}
```

### 6. `report_feedback` 🆕 (Recommended)

Collect user feedback on analysis reports and handle upload/local-save based on user decision.

**Important**: This is now the **recommended** approach for report management as it provides better user control. After generating an analysis report, AI should call this tool to ask the user if they want to upload the report to the server or save it locally only.

**Input**:
```json
{
  "command_name": "analyze_zoom_speech_sdk_log",
  "report_content": "# Analysis Report\n\n## Issues Found\n\n- Token timeout...",
  "report_name": "Critical_Timeout_Analysis",
  "user_wants_upload": true
}
```

**Output (Uploaded)**:
```json
{
  "success": true,
  "action_taken": "uploaded",
  "report_path": "/opt/acmt/Commands-Analyze-Report/analyze_zoom_speech_sdk_log/analyze_zoom_speech_sdk_log_Critical_Timeout_Analysis_20251201_143022_v1.md",
  "report_name": "analyze_zoom_speech_sdk_log_Critical_Timeout_Analysis_20251201_143022_v1.md",
  "report_link": "https://server.example.com/reports/...",
  "message": "Report uploaded to server successfully",
  "version": 1
}
```

**Output (Local Only)**:
```json
{
  "success": true,
  "action_taken": "saved_locally",
  "report_path": "/path/to/workspace/local-reports/analyze_zoom_speech_sdk_log/analyze_zoom_speech_sdk_log_Critical_Timeout_Analysis_20251201_143022_local.md",
  "report_name": "analyze_zoom_speech_sdk_log_Critical_Timeout_Analysis_20251201_143022_local.md",
  "message": "Report saved locally (not uploaded to server)"
}
```

**Features**:
- ✅ **User Control**: Ask user before uploading
- 📝 **Custom Naming**: Optional custom report name from user
- 💾 **Dual Mode**: Upload to server OR save locally only
- 🔄 **Auto-Versioning**: Increments version on upload conflicts
- 📁 **Smart Organization**: Local reports in `local-reports/`, uploaded reports in server directory
- 🔒 **Security**: All validation and security features from upload_report

**User Workflow**:
1. AI agent generates analysis report
2. AI prompts user: "分析报告已生成。是否上传到服务器存储？(是/否)"
3. User responds:
   - "是" or "上传" → `user_wants_upload: true` (upload to server)
   - "否" or "本地保存" → `user_wants_upload: false` (save locally only)
4. Agent calls `report_feedback` with user's choice
5. System handles accordingly and returns confirmation

### 7. `upload_report` (Legacy)

**Note**: This tool is kept for backward compatibility. **Please use `report_feedback` instead** for better user experience.

Upload a generated analysis report to the server for persistent storage. **Supports user-provided custom report names.**

**Input**:
```json
{
  "command_name": "analyze_zoom_speech_sdk_log",
  "report_content": "# Analysis Report\n\n## Issues Found\n\n- Token timeout...",
  "report_name": "Critical_Timeout_Analysis"
}
```

**Output**:
```json
{
  "success": true,
  "report_path": "/opt/acmt/Commands-Analyze-Report/analyze_zoom_speech_sdk_log/analyze_zoom_speech_sdk_log_Critical_Timeout_Analysis_20251126_143022_v1.md",
  "report_name": "analyze_zoom_speech_sdk_log_Critical_Timeout_Analysis_20251126_143022_v1.md",
  "report_link": "https://server.example.com/reports/...",
  "message": "Report uploaded successfully",
  "version": 1
}
```

**Features**:
- 📝 **Custom Naming**: User can provide `report_name` (optional), or use default format: `{command}_报告_{timestamp}_v1.md`
- 🔄 **Auto-Versioning**: Automatically increments version number on conflicts (v1 → v2 → v3)
- 📁 **Auto-Directory Creation**: Creates command-specific report directory if first upload
- 💾 **Atomic Writes**: Uses temp-file + rename for data integrity
- 🔒 **Security**: Path traversal prevention, size limits, permission control
- 🔗 **Link Generation**: Returns HTTP link if `report_link_base_url` configured

**User Workflow**:
1. AI agent generates analysis report
2. Agent prompts user: "是否保存此报告到服务器？"
3. User responds: "是" or provides custom name
4. Agent calls `upload_report` with content
5. System saves report and returns confirmation

---

## 🚀 Deployment

### Local Testing

```bash
# Use the test script
./test-local.sh

# Or manually
PORT=5090 CONFIG_PATH=/tmp/test-config.json ai-command-tool-server

# Test health
curl http://localhost:5090/health
```

### Production Deployment (SSE Mode)

#### Quick Deploy (Automated)

```bash
# 1. Download and run deploy script
sudo ./deployment/deploy-server.sh

# 2. Upload Commands and Reports
scp -r ./Commands/* user@server:/opt/acmt/Commands/
scp -r ./Commands-Analyze-Report/* user@server:/opt/acmt/Commands-Analyze-Report/

# 3. Start service
sudo systemctl start acmt-mcp
sudo systemctl enable acmt-mcp
```

#### Manual Deploy

```bash
# 1. Install package
npm install -g @elliotding/ai-command-tool-mcp@latest

# 2. Create system user (security)
sudo useradd -r -s /bin/false -d /opt/acmt acmt

# 3. Create directories
sudo mkdir -p /opt/acmt/{Commands,Commands-Analyze-Report}
sudo chown -R acmt:acmt /opt/acmt

# 4. Create config
sudo tee /opt/acmt/.ai-command-tool.json > /dev/null << 'EOF'
{
  "commands_directory": "/opt/acmt/Commands",
  "reports_directory": "/opt/acmt/Commands-Analyze-Report",
  "cache_ttl_seconds": 600,
  "report_link_base_url": "https://your-domain.com/reports/"
}
EOF

# 5. Install systemd service
sudo cp deployment/acmt-mcp.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl start acmt-mcp
sudo systemctl enable acmt-mcp

# 6. Check status
sudo systemctl status acmt-mcp
curl http://localhost:5090/health
```

#### HTTPS with Nginx (Recommended)

```bash
# 1. Install Nginx and Certbot
sudo apt install nginx certbot python3-certbot-nginx

# 2. Get SSL certificate
sudo certbot --nginx -d your-domain.com

# 3. Configure Nginx
sudo cp deployment/nginx-acmt.conf /etc/nginx/sites-available/acmt-mcp
# Edit domain in the file
sudo ln -s /etc/nginx/sites-available/acmt-mcp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Service Management

```bash
# Start service
sudo systemctl start acmt-mcp

# Stop service
sudo systemctl stop acmt-mcp

# Restart service
sudo systemctl restart acmt-mcp

# View status
sudo systemctl status acmt-mcp

# View logs
sudo journalctl -u acmt-mcp -f

# Enable auto-start
sudo systemctl enable acmt-mcp
```

---

## 🧪 Testing

### Run Test Suite

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test
npm test -- tests/unit/basic.test.ts
```

### Local Integration Test

```bash
# 1. Run test script
./test-local.sh

# 2. In another terminal, test health
curl http://localhost:5090/health

# 3. Test SSE connection
curl -N http://localhost:5090/sse

# 4. Configure Cursor and test
```

### Test Both Modes

#### Test stdio Mode

```bash
# Link for testing
npm link

# Create test config
cat > /tmp/test-config.json << 'EOF'
{
  "commands_directory": "./Commands",
  "reports_directory": "./Commands-Analyze-Report"
}
EOF

# Test (will wait for JSON-RPC input)
CONFIG_PATH=/tmp/test-config.json ai-command-tool

# Send test request (in another terminal)
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | CONFIG_PATH=/tmp/test-config.json ai-command-tool
```

#### Test SSE Mode

```bash
# Start server
PORT=5090 CONFIG_PATH=/tmp/test-config.json ai-command-tool-server

# Test health
curl http://localhost:5090/health

# Test SSE connection
curl -N http://localhost:5090/sse
```

---

## 🔧 Development

### Build

```bash
# Build both modes
npm run build

# Development build (watch mode)
npm run dev

# Type check
npm run typecheck

# Lint
npm run lint
```

### Project Structure

```
AI-Command-Management/
├── src/
│   ├── index.ts              # stdio mode entry point
│   ├── index-sse.ts          # SSE mode entry point
│   ├── config/               # Configuration management
│   ├── commands/             # Command loading and parsing
│   ├── reports/              # Report finding and linking
│   ├── search/               # Three-tier search engine
│   ├── tools/                # MCP tool handlers
│   ├── utils/                # Utilities (logger, errors, etc.)
│   └── types/                # TypeScript type definitions
├── tests/
│   ├── unit/                 # Unit tests
│   ├── integration/          # Integration tests
│   └── fixtures/             # Test data
├── deployment/
│   ├── acmt-mcp.service      # SystemD service config
│   ├── deploy-server.sh      # Deployment script
│   └── nginx-acmt.conf       # Nginx config
├── dist/                     # Build output
│   ├── index.js              # stdio mode build
│   └── index-sse.js          # SSE mode build
└── test-local.sh             # Local testing script
```

### Adding New Features

1. Create feature branch
2. Implement feature with tests
3. Update CHANGELOG.md
4. Run `npm test` and `npm run lint`
5. Submit PR

---

## 🐛 Troubleshooting

### Common Issues

#### Issue: `command not found: ai-command-tool`

**Solution**:
```bash
# Check installation
which ai-command-tool

# Reinstall
npm install -g @elliotding/ai-command-tool-mcp@latest

# Or use npm link for development
npm link
```

#### Issue: "Connection refused" (SSE mode)

**Solution**:
```bash
# Check if server is running
sudo systemctl status acmt-mcp

# Check port
lsof -i :5090

# Check logs
sudo journalctl -u acmt-mcp -n 50

# Restart service
sudo systemctl restart acmt-mcp
```

#### Issue: Commands not found

**Solution**:
```bash
# Check config
cat /opt/acmt/.ai-command-tool.json

# Check directory permissions
ls -la /opt/acmt/Commands/

# Check as service user
sudo -u acmt ls /opt/acmt/Commands/

# Check logs
sudo journalctl -u acmt-mcp | grep "command"
```

#### Issue: Firewall blocking (SSE mode)

**Solution**:
```bash
# Open port
sudo ufw allow 5090/tcp

# Or use Nginx reverse proxy (recommended)
# See deployment section
```

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug ai-command-tool

# Or in config
{
  "log_level": "debug"
}

# View detailed logs
sudo journalctl -u acmt-mcp -f
```

---

## 📊 Performance Tips

### Optimize Cache

```json
{
  "cache_ttl_seconds": 3600,      // Increase for better performance
  "cache_max_entries": 5000,      // Increase for more cache
  "enable_cache": true            // Always enable in production
}
```

### Optimize Search

```json
{
  "search_timeout_ms": 3000,      // Reduce for faster timeout
  "max_search_results": 10        // Reduce for faster results
}
```

### Monitor Performance

```bash
# Check resource usage
systemctl status acmt-mcp

# Detailed monitoring
top -p $(pgrep -f ai-command-tool-server)

# Or with htop
htop -p $(pgrep -f ai-command-tool-server)
```

---

## 🔐 Security Best Practices

### Production Deployment

1. **Use HTTPS**: Always use Nginx with SSL/TLS
2. **System User**: Run service as dedicated user (not root)
3. **Firewall**: Only expose necessary ports
4. **Access Control**: Use IP whitelist or authentication
5. **Regular Updates**: Keep packages updated

### SystemD Security

The provided systemd service includes:
- `ProtectSystem=strict` - Read-only file system
- `ProtectHome=true` - No access to user homes
- `NoNewPrivileges=true` - Cannot escalate privileges
- `PrivateTmp=true` - Isolated /tmp directory

---

## 📝 FAQ

### Q: One package or two?

**A**: One package (`@elliotding/ai-command-tool-mcp`) with two commands:
- `ai-command-tool` (stdio mode)
- `ai-command-tool-server` (SSE mode)

### Q: Which mode should I use?

**A**: 
- **Development/Personal**: Use stdio mode (simpler)
- **Production/Team**: Use SSE mode (better performance, multi-user)

### Q: What is `report_link_base_url`?

**A**: Base URL for generating clickable report links. Examples:
- `"https://reports.example.com/"` - Web server
- `"file:///opt/acmt/Reports/"` - Local files
- `""` - No links (just return content)

### Q: Do I need the deploy script for local testing?

**A**: No! The deploy script (`deployment/deploy-server.sh`) is for production deployment. For local testing, use `./test-local.sh` instead.

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Update documentation
5. Submit a pull request

See [CHANGELOG.md](CHANGELOG.md) for version history.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 📞 Support

- **GitHub**: https://github.com/ElliotLion-ing/AI-Command-Management
- **Issues**: https://github.com/ElliotLion-ing/AI-Command-Management/issues
- **npm**: https://www.npmjs.com/package/@elliotding/ai-command-tool-mcp

---

## 🙏 Acknowledgments

Built with:
- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/sdk) - MCP Protocol
- [fuse.js](https://fusejs.io/) - Fuzzy search
- [marked](https://marked.js.org/) - Markdown parsing
- [TypeScript](https://www.typescriptlang.org/) - Type safety

---

**Version**: 0.0.3  
**Last Updated**: 2025-11-26
