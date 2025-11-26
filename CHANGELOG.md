# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **NEW MCP Tool: `upload_report`** 🎉
  - Upload AI-generated analysis reports to server for persistent storage
  - Support for user-provided custom report names
  - Automatic directory creation for new commands
  - Automatic version conflict resolution (v1 → v2 → v3)
  - Atomic file write operations for data integrity
  - Configurable file size limits (default 10MB)
  - Configurable file permissions (default 644)
  - Security validations (path traversal prevention, name sanitization)
  - Optional HTTP link generation for uploaded reports
  
### Changed
- Updated tool count from 5 to 6 MCP tools
- Enhanced configuration schema with upload-related options:
  - `enable_report_upload` (default: true)
  - `report_upload_max_size_mb` (default: 10)
  - `report_auto_versioning` (default: true)
  - `report_file_permissions` (default: "644")
- **Report directory naming**: Report folders now use the command name directly (e.g., `analyze_zoom_speech_sdk_log/`) instead of adding `-reports` suffix (e.g., `analyze_zoom_speech_sdk_log-reports/`)

### Documentation
- Added comprehensive `upload_report` tool documentation to README
- Added user workflow examples for report upload
- Updated configuration examples with new upload options

## [0.0.1] - 2025-11-25

### Added
- Initial release of AI Command Tool Management MCP Server
- Three-tier intelligent search engine:
  - Tier 1: Filename keyword matching
  - Tier 2: Content semantic search with fuse.js
  - Tier 3: Historical report-based discovery
- Five MCP tools:
  - `search_commands`: Intelligent command search
  - `get_command`: Retrieve full command definition
  - `list_commands`: Paginated command listing
  - `search_reports`: Search across analysis reports
  - `list_command_reports`: List reports for specific command
- Command loader with intelligent caching
- Report finder with date extraction and relevance scoring
- Configurable caching system with TTL and LRU eviction
- Comprehensive input validation and security checks
- Structured JSON logging to stderr
- Environment variable and file-based configuration
- npm package publication support with publish.sh script

### Features
- Remote command management (no local file copies needed)
- Automatic command metadata extraction from Markdown
- Report link generation with configurable base URL
- Performance optimization with intelligent caching
- Search timeout handling
- Graceful shutdown on SIGINT/SIGTERM
- Transport-agnostic design (works with SSE, stdio)

### Documentation
- Comprehensive README with usage examples
- Configuration guide with all options documented
- Architecture overview
- Development and testing guide
- MIT License

[0.0.1]: https://github.com/ai-command-mgmt/mcp-server/releases/tag/v0.0.1

