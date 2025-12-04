# Tool Specification: search_reports

## Overview

| Property | Value |
|----------|-------|
| **Tool Name** | `search_reports` |
| **Category** | Report Discovery |
| **Purpose** | Search analysis reports across all or specific commands |

## Description

Search through historical analysis reports to find relevant information. Reports are organized by the command that generated them. This tool enables knowledge discovery from past analyses.

## Input Schema

```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Search query - keywords to find in report content",
      "required": true,
      "examples": ["decode timeout", "proxy configuration", "McKinsey"]
    },
    "command_filter": {
      "type": "string",
      "description": "Optional: filter results to reports from a specific command",
      "examples": ["analyze_zoom_speech_sdk_log", "proxy-slow-meeting-analysis-command"]
    },
    "max_results": {
      "type": "number",
      "description": "Maximum number of results to return",
      "default": 10,
      "minimum": 1,
      "maximum": 100
    }
  },
  "required": ["query"]
}
```

## Output Schema

```json
{
  "type": "object",
  "properties": {
    "results": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "report_name": {
            "type": "string",
            "description": "Report filename"
          },
          "command_name": {
            "type": "string",
            "description": "Command that generated this report"
          },
          "date": {
            "type": "string",
            "format": "date-time",
            "description": "Report date (extracted from filename or null)"
          },
          "excerpt": {
            "type": "string",
            "description": "Text excerpt showing the matched content with context"
          },
          "link": {
            "type": "string",
            "description": "URL or file path to access the report (optional)"
          },
          "path": {
            "type": "string",
            "description": "Full file path to the report"
          }
        }
      }
    }
  }
}
```

## Implementation Requirements

### Core Logic

1. **Directory Structure**
   - Reports are organized in: `{reports_directory}/{command_name}/`
   - Each command has its own subdirectory containing `.md` report files
   - Directory naming: use command name directly (no suffix)

2. **Search Scope Determination**
   ```
   if (command_filter):
       search in: {reports_directory}/{command_filter}/
   else:
       search in: all subdirectories of {reports_directory}/
   ```

3. **Content Search**
   - Read each `.md` file in scope
   - Perform case-insensitive substring search
   - Count match occurrences for ranking

4. **Excerpt Extraction**
   - Find first match position in content
   - Extract surrounding context (e.g., 100 chars before/after)
   - Add ellipsis if truncated

5. **Date Extraction**
   - Parse date from filename using patterns:
     - `YYYYMMDD` (e.g., `20251120`)
     - `YYYY-MM-DD` (e.g., `2025-11-20`)
     - `YYYY_MM_DD` (e.g., `2025_11_20`)
   - Return null if no date found

6. **Result Ranking**
   - Primary: Match count (descending)
   - Secondary: Date (newer first)
   - Apply max_results limit

### Link Generation

If `report_link_base_url` is configured:
```
link = {base_url}/{command_name}/{report_filename}
```

Otherwise, use file:// URL or omit link.

## Usage Examples

### Example 1: Search All Reports
```json
// Input
{
  "query": "proxy timeout"
}

// Output
{
  "results": [
    {
      "report_name": "proxy-slow-meeting-analysis-command_报告_20251201_172952_v1.md",
      "command_name": "proxy-slow-meeting-analysis-command",
      "date": "2025-12-01T00:00:00.000Z",
      "excerpt": "...detected proxy timeout issue during meeting join. The WinHTTP call...",
      "link": "https://reports.example.com/proxy-slow-meeting-analysis-command/...",
      "path": "/opt/acmt/Commands-Analyze-Report/proxy-slow-meeting-analysis-command/..."
    }
  ]
}
```

### Example 2: Search Within Command
```json
// Input
{
  "query": "decode response",
  "command_filter": "analyze_zoom_speech_sdk_log"
}

// Output
{
  "results": [
    {
      "report_name": "Zoom_Speech_SDK_日志分析报告_20251120_decode_response_v6.md",
      "command_name": "analyze_zoom_speech_sdk_log",
      "date": "2025-11-20T00:00:00.000Z",
      "excerpt": "...analyzing decode response timing. Token validation shows...",
      "link": "file:///opt/acmt/Commands-Analyze-Report/analyze_zoom_speech_sdk_log/...",
      "path": "/opt/acmt/Commands-Analyze-Report/analyze_zoom_speech_sdk_log/..."
    }
  ]
}
```

## Error Handling

| Error Code | Description | Resolution |
|------------|-------------|------------|
| `INVALID_QUERY` | Query is empty or invalid | Provide a valid search query |
| `INVALID_COMMAND_FILTER` | Command filter contains invalid characters | Use valid command name |
| `DIRECTORY_NOT_FOUND` | Reports directory doesn't exist | Check configuration |

## Related Tools

- `list_command_reports`: List all reports for a specific command
- `get_report`: Get full content of a specific report
- `search_commands`: Find commands that might generate relevant reports

