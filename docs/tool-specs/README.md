# AI Command Management Tool Specifications

This directory contains detailed specifications for all MCP tools provided by the AI Command Management (ACMT) server. These specifications can be used by other AI systems or developers to implement compatible tools.

## Tool Overview

| # | Tool Name | Category | Purpose |
|---|-----------|----------|---------|
| 1 | [search_commands](./01-search_commands.md) | Command Discovery | Intelligent search for commands using three-tier strategy |
| 2 | [get_command](./02-get_command.md) | Command Retrieval | Get full command definition by name |
| 3 | [list_commands](./03-list_commands.md) | Command Discovery | List all available commands with pagination |
| 4 | [search_reports](./04-search_reports.md) | Report Discovery | Search analysis reports across commands |
| 5 | [list_command_reports](./05-list_command_reports.md) | Report Discovery | List all reports for a specific command |
| 6 | [get_report](./06-get_report.md) | Report Retrieval | Get full content of a specific report |
| 7 | [report_feedback](./07-report_feedback.md) | Report Management | Handle report upload/save with user control |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI Command Management                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────┐    ┌─────────────────────┐             │
│  │  Command Discovery  │    │  Report Discovery   │             │
│  ├─────────────────────┤    ├─────────────────────┤             │
│  │ • search_commands   │    │ • search_reports    │             │
│  │ • list_commands     │    │ • list_command_     │             │
│  │                     │    │   reports           │             │
│  └─────────────────────┘    └─────────────────────┘             │
│                                                                  │
│  ┌─────────────────────┐    ┌─────────────────────┐             │
│  │ Command Retrieval   │    │  Report Retrieval   │             │
│  ├─────────────────────┤    ├─────────────────────┤             │
│  │ • get_command       │    │ • get_report        │             │
│  └─────────────────────┘    └─────────────────────┘             │
│                                                                  │
│  ┌─────────────────────────────────────────────┐                │
│  │           Report Management                  │                │
│  ├─────────────────────────────────────────────┤                │
│  │ • report_feedback (upload/save)              │                │
│  └─────────────────────────────────────────────┘                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Command Workflow
```
User Query → search_commands → get_command → Execute → report_feedback
                  │                              ↓
                  └──── list_commands ────> Browse Commands
```

### Report Workflow
```
User Query → search_reports → get_report → View Full Content
                  │
                  └─ list_command_reports → Browse by Command
```

## Directory Structure

The tool system expects the following directory structure:

```
{workspace}/
├── Commands/                          # Command definitions
│   ├── analyze_zoom_speech_sdk_log.md
│   ├── proxy-slow-meeting-analysis-command.md
│   └── ...
│
├── Commands-Analyze-Report/           # Analysis reports
│   ├── analyze_zoom_speech_sdk_log/   # Reports by command
│   │   ├── report_20251120.md
│   │   └── report_20251125.md
│   ├── proxy-slow-meeting-analysis-command/
│   │   └── report_20251202.md
│   └── ...
│
└── local-reports/                     # Local-only reports (not uploaded)
    └── {command_name}/
        └── {report}_local.md
```

## Configuration Schema

```json
{
  "commands_directory": "/path/to/Commands",
  "reports_directory": "/path/to/Commands-Analyze-Report",
  "cache_ttl_seconds": 600,
  "cache_max_entries": 1000,
  "max_search_results": 10,
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

## Common Patterns

### Input Validation
All tools validate inputs before processing:
- Command names: alphanumeric, underscores, hyphens only (`/^[a-zA-Z0-9_-]+$/`)
- Query strings: 1-500 characters, no control characters
- Page numbers: positive integers
- Size limits: configurable maximums

### Error Response Format
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "additional": "context"
    }
  }
}
```

### Date Extraction Patterns
Reports extract dates from filenames using:
- `YYYYMMDD` (e.g., `20251120`)
- `YYYY-MM-DD` (e.g., `2025-11-20`)
- `YYYY_MM_DD` (e.g., `2025_11_20`)

### Dependency Filtering
Commands with frontmatter `is_dependency: true` are:
- Hidden from `list_commands`
- Excluded from `search_commands`
- Still accessible via `get_command`

## Implementation Guidelines

When implementing compatible tools:

1. **Follow the exact input/output schemas** - This ensures interoperability
2. **Implement security checks** - Path traversal prevention, input validation
3. **Support graceful degradation** - Return empty arrays instead of errors when possible
4. **Use consistent error codes** - Follow the error handling patterns defined in each spec
5. **Maintain caching** - Implement caching for frequently accessed data
6. **Support both scenarios** - For `report_feedback`, handle both auto-trigger and user-request cases

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.2.2 | 2025-12-04 | Added get_report, removed upload_report, improved report_feedback |
| 0.2.0 | 2025-12-02 | Added report_feedback, dependency filtering |
| 0.1.0 | 2025-11-25 | Initial release with 5 tools |

---

**Last Updated**: 2025-12-04
**Tool Count**: 7

