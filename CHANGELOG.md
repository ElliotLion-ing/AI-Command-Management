# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.2] - 2025-12-04

### Added
- **NEW MCP Tool: `get_report`** 🎉
  - Get full content of a specific report by command name and report name
  - Returns complete report content (not just excerpt like `search_reports`)
  - Includes metadata: path, size, date, and optional HTTP link
  - Security: path traversal prevention
  - Companion tool to `list_command_reports` and `search_reports`

### Removed
- **Removed `upload_report` tool** (previously deprecated)
  - Use `report_feedback` instead for better user experience
  - `report_feedback` provides user confirmation before upload
  - `report_feedback` supports both upload and local-only save modes

### Changed
- Updated tool count: 7 MCP tools (search_commands, get_command, list_commands, search_reports, list_command_reports, get_report, report_feedback)
- Unified report directory naming: use command name directly without `-reports` suffix
  - ✅ New: `analyze_zoom_speech_sdk_log/`
  - ❌ Old: `analyze_zoom_speech_sdk_log-reports/`

### Documentation
- Updated README.md and README_CN.md with `get_report` tool documentation
- Removed `upload_report` tool documentation
- Added "What's New in v0.2.1" section

---

## [0.2.0] - 2025-12-02

### Changed
- **Improved `report_feedback` tool description** to emphasize user interaction workflow
  - Tool description now clearly states AI must ASK user first
  - Added step-by-step workflow in tool description
  - Enhanced parameter descriptions with critical warnings
  - Created comprehensive workflow documentation (CORRECT_WORKFLOW.md)
  - Updated README with detailed "Correct Workflow" section

### Added
- **NEW MCP Tool: `report_feedback`** 🎉✨ (Recommended)
  - Collect user feedback before uploading reports
  - Dual-mode operation: upload to server OR save locally only
  - User control over report storage location
  - Ask user confirmation before uploading
  - Local-only mode saves reports to `local-reports/` directory
  - All validation and security features from `upload_report`
  - Better user experience with explicit consent workflow
  
- **NEW MCP Tool: `upload_report`** 🎉 (Now removed in v0.2.1)
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
- Updated tool count from 5 to 7 MCP tools
- Enhanced configuration schema with upload-related options:
  - `enable_report_upload` (default: true)
  - `report_upload_max_size_mb` (default: 10)
  - `report_auto_versioning` (default: true)
  - `report_file_permissions` (default: "644")
- **Report directory naming**: Report folders now use the command name directly (e.g., `analyze_zoom_speech_sdk_log/`) instead of adding `-reports` suffix (e.g., `analyze_zoom_speech_sdk_log-reports/`)
- Added `local-reports/` directory to `.gitignore` for local-only reports

### Documentation
- Added comprehensive `report_feedback` tool documentation to README (recommended approach)
- Added user workflow examples for report feedback and upload
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

