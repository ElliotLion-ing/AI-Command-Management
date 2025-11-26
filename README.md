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
