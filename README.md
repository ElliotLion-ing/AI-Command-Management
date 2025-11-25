# AI Command Tool Management (ACMT)

> **MCP Server for intelligent command discovery and execution**

ACMT is a Model Context Protocol (MCP) server that provides intelligent search and management of command definitions stored remotely. It enables users to discover and execute commands without copying them to their local workspace.

## ✨ Features

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
  - Intelligent caching system
  - Search optimization
  - Configurable timeouts and limits

- **🔒 Security**
  - Path validation and sanitization
  - Directory traversal prevention
  - Input validation on all queries

## 🚀 Installation

### Install from npm

```bash
npm install @ai-command-mgmt/mcp-server
```

### Prerequisites

- Node.js >= 18.0.0
- Access to command and report directories on server

## 📋 Configuration

Create a configuration file `.ai-command-tool.json` in your project root or home directory:

```json
{
  "commands_directory": "/path/to/Commands",
  "reports_directory": "/path/to/Commands-Analyze-Report",
  "cache_ttl_seconds": 3600,
  "max_search_results": 10,
  "search_timeout_ms": 5000,
  "enable_cache": true,
  "report_link_base_url": "https://reports.example.com",
  "log_level": "info"
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `commands_directory` | string | required | Path to Commands directory |
| `reports_directory` | string | required | Path to reports directory |
| `cache_ttl_seconds` | number | 3600 | Cache lifetime in seconds |
| `max_search_results` | number | 10 | Maximum search results (1-100) |
| `search_timeout_ms` | number | 5000 | Search timeout in milliseconds |
| `enable_cache` | boolean | true | Enable/disable caching |
| `report_link_base_url` | string | "" | Base URL for report links |
| `log_level` | string | "info" | Log level (debug/info/warn/error) |

### Environment Variables

Override configuration using environment variables:

- `AICMD_COMMANDS_DIR`
- `AICMD_REPORTS_DIR`
- `AICMD_CACHE_TTL`
- `AICMD_REPORT_BASE_URL`
- `AICMD_MAX_RESULTS`
- `AICMD_SEARCH_TIMEOUT`
- `AICMD_ENABLE_CACHE`
- `AICMD_LOG_LEVEL`

## 🔧 Usage

### Configure in Cursor

Add to your Cursor `mcp.json`:

```json
{
  "mcpServers": {
    "acmt": {
      "url": "https://your-server.example.com/csp/acmt/sse",
      "transport": "sse"
    }
  }
}
```

### Available Tools

#### 1. `search_commands`
Search for commands using intelligent multi-tier search.

**Input:**
```typescript
{
  query: string;           // Search query
  max_results?: number;    // Max results (default: 10)
}
```

**Example:**
```
Search query: "speech SDK log analyze"
Returns: Commands matching the query ranked by relevance
```

#### 2. `get_command`
Get full command definition by name.

**Input:**
```typescript
{
  command_name: string;    // Name of command
}
```

#### 3. `list_commands`
List all available commands with pagination.

**Input:**
```typescript
{
  page?: number;           // Page number (default: 1)
  page_size?: number;      // Items per page (default: 50)
}
```

#### 4. `search_reports`
Search analysis reports across all or specific commands.

**Input:**
```typescript
{
  query: string;              // Search query
  command_filter?: string;    // Filter by command name
  max_results?: number;       // Max results (default: 10)
}
```

#### 5. `list_command_reports`
List all reports for a specific command.

**Input:**
```typescript
{
  command_name: string;    // Command name
}
```

## 📁 Directory Structure

Commands and reports should follow this structure:

```
Commands/
├── analyze_zoom_speech_sdk_log.md
├── parse_meeting_log.md
└── network_diagnostics.md

Commands-Analyze-Report/
├── analyze_zoom_speech_sdk_log-reports/
│   ├── Report_20251120_issue1.md
│   └── Report_20251115_issue2.md
└── parse_meeting_log-reports/
    └── Report_20251118_analysis.md
```

## 🧪 Development

### Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Create development config: `cp examples/.ai-command-tool.dev.json .ai-command-tool.json`
4. Run in development mode: `npm run dev`

### Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Building

```bash
npm run build
```

## 📦 Publishing

Use the provided publish script:

```bash
./publish.sh
```

The script will:
1. Run tests and type checking
2. Build the package
3. Prompt for version bump
4. Publish to npm

## 🏗️ Architecture

```
User (Cursor) 
    ↓ SSE
MCP Server Infrastructure
    ↓
ACMT Tool
    ├── Search Engine (3 tiers)
    ├── Command Loader
    ├── Report Finder
    └── Cache Layer
        ↓
Local File System
    ├── Commands/
    └── Reports/
```

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙋 Support

- **Issues**: [GitHub Issues](https://github.com/ElliotLion-ing/AI-Command-Management/issues)
- **Documentation**: [Full Documentation](https://github.com/ElliotLion-ing/AI-Command-Management)

## 📊 Status

- Version: 0.0.1
- Status: Initial Release
- Node: >= 18.0.0
- MCP Protocol: 1.0+

---

Built with ❤️ using [Model Context Protocol](https://modelcontextprotocol.io/)

