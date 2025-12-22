# Tool Specification: get_report

## Overview

| Property | Value |
|----------|-------|
| **Tool Name** | `get_report` |
| **Category** | Report Retrieval |
| **Purpose** | Retrieve full content of a specific report |

## Description

Get the complete content of a specific analysis report by command name and report filename. This is the companion tool to `list_command_reports` and `search_reports`, which return report metadata but not full content.

## Input Schema

```json
{
  "type": "object",
  "properties": {
    "command_name": {
      "type": "string",
      "description": "Name of the command that the report belongs to",
      "required": true,
      "examples": ["analyze_zoom_speech_sdk_log", "proxy-slow-meeting-analysis-command"]
    },
    "report_name": {
      "type": "string",
      "description": "Report filename (including .md extension)",
      "required": true,
      "examples": ["Zoom_Speech_SDK_日志分析报告_20251120_decode_response_v6.md"]
    }
  },
  "required": ["command_name", "report_name"]
}
```

## Output Schema

```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Report filename"
    },
    "command_name": {
      "type": "string",
      "description": "Command that generated this report"
    },
    "content": {
      "type": "string",
      "description": "Full Markdown content of the report"
    },
    "metadata": {
      "type": "object",
      "properties": {
        "path": {
          "type": "string",
          "description": "Full file path to the report"
        },
        "size": {
          "type": "number",
          "description": "File size in bytes"
        },
        "date": {
          "type": "string",
          "format": "date-time",
          "description": "Report date (extracted from filename, or null)"
        },
        "link": {
          "type": "string",
          "description": "URL to access the report (optional, if base URL configured)"
        }
      }
    }
  }
}
```

## Implementation Requirements

### Core Logic

1. **Input Validation**
   - Validate command_name format (alphanumeric, underscores, hyphens)
   - Validate report_name is provided and non-empty

2. **Path Construction**
   ```
   report_path = {reports_directory}/{command_name}/{report_name}
   ```

3. **Security Checks**
   - Normalize path to prevent traversal attacks
   - Verify final path is within reports_directory
   - Reject paths containing `..`

4. **File Reading**
   - Check file existence
   - Read content as UTF-8
   - Get file stats (size, modification time)

5. **Date Extraction**
   - Extract date from filename using standard patterns
   - Return null if no date pattern found

6. **Link Generation**
   - If `report_link_base_url` configured:
     ```
     link = {base_url}/{command_name}/{report_name}
     ```
   - Otherwise, use file:// URL or omit

### Security Considerations

```javascript
// Path traversal prevention
const normalizedPath = path.normalize(reportPath);
if (!normalizedPath.startsWith(reportsDirectory)) {
  throw new Error('Path traversal detected');
}
```

## Usage Examples

### Example 1: Get Report Content
```json
// Input
{
  "command_name": "proxy-slow-meeting-analysis-command",
  "report_name": "proxy-slow-meeting-analysis-command_Proxy分析报告_McKinsey_Zoom_20251027_20251202_104609_v1.md"
}

// Output
{
  "name": "proxy-slow-meeting-analysis-command_Proxy分析报告_McKinsey_Zoom_20251027_20251202_104609_v1.md",
  "command_name": "proxy-slow-meeting-analysis-command",
  "content": "# Proxy Slow Meeting Join Analysis Report\n\n## Executive Summary\n- **Analysis Date**: December 2, 2025\n...",
  "metadata": {
    "path": "/opt/acmt/Commands-Analyze-Report/proxy-slow-meeting-analysis-command/...",
    "size": 12377,
    "date": "2025-10-27T00:00:00.000Z",
    "link": "https://reports.example.com/proxy-slow-meeting-analysis-command/..."
  }
}
```

### Example 2: Report Not Found
```json
// Input
{
  "command_name": "analyze_zoom_speech_sdk_log",
  "report_name": "nonexistent_report.md"
}

// Output (Error)
{
  "error": {
    "code": "REPORT_NOT_FOUND",
    "message": "Report not found: nonexistent_report.md for command analyze_zoom_speech_sdk_log",
    "details": {
      "command_name": "analyze_zoom_speech_sdk_log",
      "report_name": "nonexistent_report.md",
      "expected_path": "/opt/acmt/Commands-Analyze-Report/analyze_zoom_speech_sdk_log/nonexistent_report.md"
    }
  }
}
```

## Error Handling

| Error Code | Description | Resolution |
|------------|-------------|------------|
| `INVALID_COMMAND_NAME` | Command name contains invalid characters | Use alphanumeric, underscores, hyphens only |
| `INVALID_REPORT_NAME` | Report name is empty or invalid | Provide valid report filename |
| `REPORT_NOT_FOUND` | Report file doesn't exist | Check report name and command |
| `PATH_TRAVERSAL` | Path traversal attempt detected | Use valid paths only |

## Workflow Example

Typical usage pattern:

```
1. User asks: "Show me the proxy analysis report"

2. AI calls search_reports:
   { "query": "proxy analysis" }
   → Returns list with report names

3. AI calls get_report:
   { "command_name": "proxy-slow-meeting-analysis-command",
     "report_name": "proxy_report_20251202.md" }
   → Returns full content

4. AI presents the report content to user
```

## Related Tools

- `search_reports`: Search for reports by content
- `list_command_reports`: List all reports for a command
- `get_command`: Get the command that generates these reports


