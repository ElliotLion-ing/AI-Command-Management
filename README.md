# AI Command Tool Management (ACMT)

> **MCP Server for intelligent command discovery and execution**

[![npm version](https://img.shields.io/npm/v/@elliotding/ai-command-tool-mcp.svg)](https://www.npmjs.com/package/@elliotding/ai-command-tool-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[English](README.md) | [中文](README_CN.md)

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
  - **SSE**: Server-Sent Events with heartbeat mechanism for stable long-running connections 🆕
  
- **🔍 Three-Tier Intelligent Search**
  - Tier 1: Keyword matching against filenames
  - Tier 2: Semantic search of command content with frontmatter support 🆕
  - Tier 3: Discovery through historical analysis reports
  
- **📁 Smart Command Management**
  - Commands stored on remote server
  - Dependency filtering - hide helper commands, show only primary commands 🆕
  - Frontmatter metadata support for command organization 🆕
  - No local file clutter
  - Centralized version control

- **📊 Report Discovery & Management**
  - Search across historical analysis reports
  - Command-specific report filtering
  - User-controlled report upload (ask before uploading) 🆕
  - Automatic date extraction and sorting
  - Auto-versioning on conflicts 🆕

- **⚡ High Performance**
  - Intelligent caching system (configurable TTL)
  - Search optimization with timeout control
  - SSE connection stability with heartbeat mechanism 🆕
  - Configurable limits and thresholds

- **🔒 Security**
  - Path validation and sanitization
  - Directory traversal prevention
  - Input validation on all queries
  - SystemD service isolation (production mode)
  - Report size limits and permission control 🆕

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
- ✅ Stable connections with heartbeat mechanism 🆕

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
| `mcp_server_domain` | string | "" | Remote API server domain for database sync 🆕 |
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
AICMD_MCP_SERVER_DOMAIN=https://your-api-server.com
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

## 📚 Command Organization

### Dependency Command Filtering 🆕

ACMT supports organizing complex command structures by marking helper commands as dependencies. This keeps your command listings clean and focused on primary commands while maintaining full functionality.

#### How It Works

1. **Mark Dependencies**: Add frontmatter to helper command markdown files:

```markdown
---
is_dependency: true
---

# Log Type Identification Rules

This helper command provides log type identification logic...
```

2. **Automatic Filtering**: Dependency commands are:
   - ✅ Hidden from `list_commands` results
   - ✅ Excluded from `search_commands` results
   - ✅ Still accessible via direct `get_command` calls
   - ✅ Fully functional when referenced by primary commands

#### Example Use Case

**Primary Command**: `proxy-slow-meeting-analysis-command.md`
```markdown
# Proxy Slow Meeting Analysis

This command analyzes proxy logs for meeting join issues.

## Dependencies
- [Log Type Identification](./log-type-identification.md)
- [Proxy Thread Identification](./proxy-thread-identification.md)
- [Meeting Join Process](./meeting-join-proxy-process.md)

## Usage
...
```

**Helper Commands** (marked as dependencies):
- `log-type-identification.md` - Helper logic for log type detection
- `proxy-thread-identification.md` - Thread identification patterns
- `meeting-join-proxy-process.md` - Meeting join flow reference

**Result**: Users only see `proxy-slow-meeting-analysis-command` in listings, but it can still reference and use all helper commands internally.

#### Migration Guide

To organize existing commands:

1. Identify helper/dependency commands
2. Add frontmatter to each dependency file:
```markdown
---
is_dependency: true
---
```
3. No code changes needed - filtering is automatic!

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

### 6. `get_report` 🆕

Get full content of a specific report by command name and report name.

**Input**:
```json
{
  "command_name": "analyze_zoom_speech_sdk_log",
  "report_name": "Zoom_Speech_SDK_日志分析报告_20251120_decode_response_v6.md"
}
```

**Output**:
```json
{
  "name": "Zoom_Speech_SDK_日志分析报告_20251120_decode_response_v6.md",
  "command_name": "analyze_zoom_speech_sdk_log",
  "content": "# Full report content in markdown...",
  "metadata": {
    "path": "/opt/acmt/Commands-Analyze-Report/analyze_zoom_speech_sdk_log/Zoom_Speech_SDK_日志分析报告_20251120_decode_response_v6.md",
    "size": 11179,
    "date": "2025-11-20T00:00:00.000Z",
    "link": "https://..."
  }
}
```

**Features**:
- 📄 **Full Content**: Returns complete report content (not just excerpt)
- 🔒 **Security**: Path traversal prevention
- 📊 **Metadata**: Includes file size, date, and optional HTTP link
- 🔍 **Companion Tool**: Use with `list_command_reports` or `search_reports` to find report names first

### 7. `report_feedback` (Recommended)

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

**Correct Workflow** (⚠️ **CRITICAL - Must Follow**):
1. **AI generates report**: Complete the analysis
2. **AI asks user**: Display report summary and ask: "分析报告已生成。是否上传到服务器存储？(输入'是'上传 / '否'仅本地保存)"
3. **Wait for user response**: DO NOT proceed until user responds
4. **User responds**:
   - "是" or "上传" → User wants upload
   - "否" or "本地" → User wants local save only
5. **AI calls tool** with user's choice:
   - If user said "是": `user_wants_upload: true`
   - If user said "否": `user_wants_upload: false`
6. **System executes** and returns confirmation
7. **AI confirms to user**: Show where the report was saved

⚠️ **DO NOT**:
- ❌ Call this tool before asking the user
- ❌ Decide `user_wants_upload` value without user confirmation
- ❌ Assume user's intent

📚 **See detailed workflow**: [docs/CORRECT_WORKFLOW.md](./docs/CORRECT_WORKFLOW.md)

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
│   ├── index-sse.ts          # SSE mode entry point (with heartbeat) 🆕
│   ├── config/               # Configuration management
│   ├── commands/
│   │   ├── loader.ts         # Command loading with frontmatter parsing 🆕
│   │   └── parser.ts         # Markdown parsing
│   ├── reports/
│   │   ├── finder.ts         # Report discovery
│   │   ├── linker.ts         # Report URL generation
│   │   └── uploader.ts       # Report upload with versioning 🆕
│   ├── search/               # Three-tier search engine
│   │   ├── engine.ts         # Main search logic
│   │   └── indexer.ts        # Content indexing
│   ├── tools/                # MCP tool handlers
│   │   ├── search-commands.ts
│   │   ├── get-command.ts
│   │   ├── list-commands.ts
│   │   ├── search-reports.ts
│   │   ├── list-command-reports.ts
│   │   ├── get-report.ts       # Get full report content 🆕
│   │   └── report-feedback.ts  # User-controlled report upload
│   ├── utils/                # Utilities (logger, errors, cache, etc.)
│   └── types/                # TypeScript type definitions
├── tests/
│   ├── unit/                 # Unit tests
│   │   ├── basic.test.ts
│   │   ├── commands/
│   │   ├── reports/
│   │   └── tools/
│   ├── integration/          # Integration tests
│   └── fixtures/             # Test data
├── Commands/                 # Command definitions (markdown)
│   ├── *.md                  # Primary commands
│   └── *.md (is_dependency: true)  # Dependency commands (hidden) 🆕
├── deployment/
│   ├── acmt-mcp.service      # SystemD service config
│   ├── deploy-server.sh      # Deployment script
│   └── nginx-acmt.conf       # Nginx config with SSE optimization 🆕
├── dist/                     # Build output
│   ├── index.js              # stdio mode build
│   └── index-sse.js          # SSE mode build
├── test-local.sh             # Local testing script
└── publish.sh                # NPM publishing script
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
- [gray-matter](https://github.com/jonschlinkert/gray-matter) - Frontmatter parsing 🆕
- [TypeScript](https://www.typescriptlang.org/) - Type safety

---

**Version**: 0.5.1  
**Last Updated**: 2025-12-23

---

## 🆕 What's New in v0.2.2

### New Tool: `get_report`
A new tool to retrieve the full content of a specific report. Previously, `search_reports` and `list_command_reports` only returned metadata and excerpts. Now you can get the complete report content.

**Usage**:
```json
{
  "command_name": "analyze_zoom_speech_sdk_log",
  "report_name": "report_20251120.md"
}
```

### Removed: `upload_report` (Legacy)
The deprecated `upload_report` tool has been removed. Use `report_feedback` instead, which provides:
- ✅ User confirmation before upload
- ✅ Option to save locally only
- ✅ Better user experience

### Unified Report Directory Naming
Report directories now use the command name directly without any suffix:
- ✅ New: `analyze_zoom_speech_sdk_log/`
- ❌ Old: `analyze_zoom_speech_sdk_log-reports/`

---

## 🆕 What's New in v0.2.0

### Dependency Command Filtering
Commands can now be marked as dependencies using frontmatter metadata. Dependency commands are automatically hidden from search and list results, reducing clutter and showing only the primary commands users need.

**Example**:
```markdown
---
is_dependency: true
---

# Helper Command Content
This command is used as a dependency by other commands...
```

**Benefits**:
- ✅ Cleaner command listings
- ✅ Better organization of complex command structures
- ✅ Users see only what they need to use directly
- ✅ Dependencies are still accessible when needed by primary commands

### SSE Connection Stability
The SSE server now implements a heartbeat mechanism that sends periodic keep-alive events every 30 seconds. This prevents proxy timeouts and connection drops during idle periods.

**Technical Details**:
- Heartbeat interval: 30 seconds
- Automatic cleanup on connection close
- Compatible with Nginx proxy configurations
- Improved long-running session stability

### Enhanced Frontmatter Support
Commands now support YAML frontmatter for metadata storage, enabling:
- Command categorization
- Dependency marking
- Custom metadata fields
- Better organization and filtering

**Powered by**: [gray-matter](https://github.com/jonschlinkert/gray-matter)

---

## 🆕 What's New in v0.3.0

### Report Database Sync 🆕
When uploading reports via `report_feedback`, the system now automatically syncs report metadata to a remote database. This enables centralized report tracking and management.

**Configuration**:
```json
{
  "mcp_server_domain": "https://your-api-server.com"
}
```

**Features**:
- ✅ Sync executed BEFORE file upload (per Sync-Mechanism-Requirements)
- ✅ Sync failure stops file upload operation
- ✅ Owner email tracking (auto-detected from Cursor or manually provided)
- ✅ Clear success/failure status feedback for every sync attempt
- ✅ Automatic retry mechanism (up to 4 attempts)

### Sync Retry Mechanism 🆕
The sync process now includes a robust retry mechanism:

**Precondition Checks (No Retry)**:
- `mcp_server_domain` not configured → Stop immediately
- `owner` not provided → Stop immediately  
- `owner` invalid email format → Stop immediately

**Retry Logic**:
- First attempt + up to 3 retries (4 total attempts)
- 1 second delay between retries
- Success on any attempt → Continue with file upload
- All attempts fail → Stop file upload, show detailed error

**Output Examples**:

*Success (first attempt)*:
```
✅ Sync 请求成功 (第1次尝试)

✅ 数据库同步成功，报告元数据已记录到 ZCT 数据库
```

*Success (after retries)*:
```
❌ Sync 请求失败 (第1次): HTTP 500 - Internal Server Error
❌ Sync 请求失败 (第2次): HTTP 503 - Service Unavailable
✅ Sync 请求成功 (第3次尝试)

✅ 数据库同步成功，报告元数据已记录到 ZCT 数据库
```

*Failure (all retries exhausted)*:
```
❌ Sync 请求失败 (第1次): HTTP 500 - Internal Server Error
❌ Sync 请求失败 (第2次): HTTP 500 - Internal Server Error
❌ Sync 请求失败 (第3次): HTTP 500 - Internal Server Error
❌ Sync 请求失败 (第4次): HTTP 500 - Internal Server Error

⛔ Sync 到 ZCT 数据库失败
错误信息: HTTP 500 - Internal Server Error
已停止 Command/Report 上传操作
```

*Precondition failure*:
```
⛔ Sync 失败: 未配置 mcp_server_domain
已停止所有后续操作
```

### Improved Version Suffix Logic 🆕
Report filename handling has been improved:
- **No conflict**: Uses original filename without version suffix
- **With conflict**: Automatically adds `_v1`, `_v2`, etc.

**Example**:
```
First upload:  MyReport.md        (no suffix)
Second upload: MyReport_v1.md     (conflict detected)
Third upload:  MyReport_v2.md     (conflict detected)
```

### Enhanced Owner Tracking 🆕
The `report_feedback` tool now supports an `owner` parameter:
- Auto-detected from Cursor client's cached email (macOS/Windows/Linux)
- Falls back to asking user if auto-detection fails
- Used for database sync to track report ownership

---

## 🆕 What's New in v0.4.0

### New Tool: `upload_command` 🆕
A new tool for uploading and updating command files. This enables centralized command management with version control.

**Workflow**:
1. **Auto-get user email** from Cursor client (falls back to asking user)
2. **For updates**: 
   - Call `list_commands` to show available commands
   - Select command to update
   - Choose version bump type (patch/minor/major)
   - Provide release notes
3. **For new commands**:
   - Check if command already exists via `list_commands`
   - Confirm command name
   - Set initial version (default: 0.0.1)
   - Provide description

**Version Format**:
- `patch`: x.y.z → x.y.(z+1)
- `minor`: x.y.z → x.(y+1).0
- `major`: x.y.z → (x+1).0.0

**Input**:
```json
{
  "command_name": "my_new_command",
  "command_content": "# My Command\n\n...",
  "version": "0.0.1",
  "owner": "user@example.com",
  "description": "Description for new commands",
  "release_note": "Release notes for updates"
}
```

**Features**:
- ✅ Upload new commands or update existing ones
- ✅ Semantic versioning support (patch/minor/major)
- ✅ Automatic database sync via `/api/ai-commands/sync`
- ✅ Owner tracking with auto-detection from Cursor
- ✅ File name validation and normalization
- ✅ Command naming convention enforcement

### Command Naming Convention 🆕
Commands must follow a specific naming format for consistency:

**Format**: `{Module}-xx-yy-zz`
- **Module**: Technical module name (case flexible)
- **xx-yy-zz**: Descriptive parts separated by `-`
- **No spaces** allowed in any part
- **No redundant suffixes** like `-command` or `-analysis`

**Examples**:
```
✅ VALID:
   zNet-proxy-slow-meeting-join
   ZMDB-log-analyze
   SpeechSDK-log-analyze
   Tool-code-review-self

❌ INVALID:
   proxy-slow-meeting-analysis-command  (missing Module prefix)
   Tool-code review-self                (contains space)
```

**Validation Behavior**:
If a name is invalid, the AI will:
1. Notify user: "当前命名不符合规则：{issue}"
2. Explain the naming convention
3. Auto-generate a valid name suggestion
4. Ask: "建议使用 {suggested_name}，是否同意？"

### New Configuration Options 🆕

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enable_command_upload` | boolean | true | Enable/disable command upload feature |
| `command_upload_max_size_mb` | number | 5 | Maximum command file size in MB |
| `command_file_permissions` | string | "644" | File permissions for uploaded commands |

---

## 🆕 What's New in v0.5.1

### Command Dependency Upload Support 🆕
Commands can now be uploaded with their dependency relationships. The system automatically detects file types and handles upload order correctly.

**How It Works**:
1. **File Type Detection**: Checks if markdown file contains `is_dependency: true` in the first 3 lines
2. **Automatic Analysis**: When uploading, the system analyzes main file content to detect dependency references
3. **Smart Upload Order**: Dependencies are uploaded FIRST, then main files

**Supported Scenarios**:
| Scenario | Supported | Behavior |
|----------|-----------|----------|
| Single main file (no deps) | ✅ | Auto-analyze content for dependency references |
| Multiple main files (no deps) | ✅ | Upload all together |
| Single main + dependencies | ✅ | Upload deps first, then main |
| Multiple main + multiple deps | ❌ | Must upload in batches (1 main + its deps per batch) |

**Request Body Enhancement**:
The sync API request now includes a `belongTo` field:
- **Main files**: `belongTo = ""` (empty)
- **Dependency files**: `belongTo = "parent-command.md"` (with .md suffix)

### Pre-Upload Validation 🆕
Before uploading main + dependency files together:
1. Validates ALL dependency file names for `{Module}-xx-yy-zz` convention
2. If any dependency needs renaming:
   - STOPS the upload process
   - Notifies user: "依赖文件 {old_name} 需要重命名为 {new_name}"
   - Asks user to update references in main file first
3. After user confirms changes, retry upload

**Example Workflow**:
```
User: Upload Main-Command.md with Utils.md
AI: Detects Utils.md needs renaming to Dep-Utils.md
AI: "依赖文件命名不符合规范：
     Utils.md → Dep-Utils.md
     请先修改主文件中对 Utils 的引用为 Dep-Utils"
User: Updates Main-Command.md, confirms
AI: Uploads Dep-Utils.md first, then Main-Command.md
```

### Automatic Dependency Detection 🆕
When uploading a single main file, the AI now:
1. Analyzes file content for dependency references (e.g., `@include`, `[[xxx.md]]`)
2. If dependencies detected: Asks user "检测到文件中引用了依赖: xxx.md，是否需要一起上传?"
3. If no dependencies detected: Uploads directly without asking
