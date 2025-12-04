# Tool Specification: report_feedback

## Overview

| Property | Value |
|----------|-------|
| **Tool Name** | `report_feedback` |
| **Category** | Report Management |
| **Purpose** | Handle report upload/save operations with user control |

## Description

Handle report upload and save operations with two distinct usage scenarios:

1. **Auto-Trigger Scenario**: After an analysis command generates a report, AI should ask the user if they want to upload it to the server
2. **User Request Scenario**: When user explicitly requests to upload a report, upload directly without asking

This tool provides user control over where reports are stored (server vs local only).

## Input Schema

```json
{
  "type": "object",
  "properties": {
    "command_name": {
      "type": "string",
      "description": "Name of the command/category for the report. For user-requested uploads, use an appropriate command name based on report content.",
      "required": true,
      "examples": ["analyze_zoom_speech_sdk_log", "proxy-slow-meeting-analysis-command"]
    },
    "report_content": {
      "type": "string",
      "description": "Full report content in Markdown format. For user-requested uploads, read the file content first.",
      "required": true
    },
    "report_name": {
      "type": "string",
      "description": "Optional custom name for the report. If not provided, uses default format: {command}_报告_{timestamp}_v1.md",
      "examples": ["Critical_Timeout_Analysis", "McKinsey_Zoom_Meeting_Issue"]
    },
    "user_wants_upload": {
      "type": "boolean",
      "description": "true = upload to server, false = save locally only. For auto-trigger scenario, ask user first. For user-requested uploads, set to true directly.",
      "required": true
    }
  },
  "required": ["command_name", "report_content", "user_wants_upload"]
}
```

## Output Schema

### Success - Uploaded to Server
```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean", "const": true },
    "action_taken": { "type": "string", "const": "uploaded" },
    "report_path": { "type": "string", "description": "Full path where report was saved" },
    "report_name": { "type": "string", "description": "Final filename (may include version)" },
    "report_link": { "type": "string", "description": "HTTP URL to access report (if configured)" },
    "message": { "type": "string" },
    "version": { "type": "number", "description": "Version number (incremented on conflicts)" }
  }
}
```

### Success - Saved Locally
```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean", "const": true },
    "action_taken": { "type": "string", "const": "saved_locally" },
    "report_path": { "type": "string", "description": "Local path where report was saved" },
    "report_name": { "type": "string", "description": "Final filename" },
    "message": { "type": "string" }
  }
}
```

## Implementation Requirements

### Two Usage Scenarios

#### Scenario 1: Auto-Trigger (After Analysis)

```
Workflow:
1. AI executes analysis command → generates report content
2. AI MUST ASK user: "分析报告已生成，是否要上传到服务器保存？（输入 '是' 上传 / '否' 仅本地保存）"
3. Wait for user response
4. Call report_feedback with user_wants_upload based on answer
5. Report success/location to user

AI Behavior:
- DO NOT call this tool before asking user
- DO NOT assume user's intent
- WAIT for explicit user confirmation
```

#### Scenario 2: User Request (Explicit Upload)

```
Workflow:
1. User says: "帮我提交这个报告" / "上传报告" / "Submit this report"
2. AI reads report file content
3. AI determines appropriate command_name
4. Call report_feedback with user_wants_upload: true
5. Report success/location to user

AI Behavior:
- User intent is clear, no need to ask again
- Set user_wants_upload: true directly
```

### Core Logic

1. **Input Validation**
   - Validate command_name format
   - Ensure report_content is non-empty
   - Check content size against limit

2. **Upload Path (user_wants_upload: true)**
   ```
   directory: {reports_directory}/{command_name}/
   filename: {command_name}_{custom_name}_{timestamp}_v{version}.md
   ```
   
   Steps:
   - Create directory if not exists
   - Generate filename with timestamp
   - Check for conflicts, increment version if needed
   - Write file atomically (temp file + rename)
   - Set file permissions
   - Generate link if base URL configured

3. **Local Save Path (user_wants_upload: false)**
   ```
   directory: {cwd}/local-reports/{command_name}/
   filename: {command_name}_{custom_name}_{timestamp}_local.md
   ```
   
   Steps:
   - Create local-reports directory
   - Generate filename with _local suffix
   - Write file

### Filename Generation

```javascript
function generateFileName(commandName, customName, isLocal) {
  const timestamp = formatTimestamp(new Date()); // YYYYMMDD_HHMMSS
  const suffix = isLocal ? 'local' : 'v1';
  
  if (customName) {
    const sanitized = customName.replace(/\s+/g, '_').replace(/[^\w\u4e00-\u9fa5-]/g, '');
    return `${commandName}_${sanitized}_${timestamp}_${suffix}.md`;
  }
  return `${commandName}_报告_${timestamp}_${suffix}.md`;
}
```

### Version Conflict Resolution

```javascript
async function resolveVersionConflict(directory, filename) {
  let version = 1;
  let finalPath = path.join(directory, filename);
  
  while (await fileExists(finalPath)) {
    version++;
    finalPath = filename.replace(/_v\d+\.md$/, `_v${version}.md`);
  }
  
  return { finalPath, version, hadConflict: version > 1 };
}
```

### Security & Validation

- **Command name**: alphanumeric, underscores, hyphens only
- **Report name**: letters, numbers, Chinese chars, underscores, hyphens, spaces
- **Content size**: configurable limit (default 10MB)
- **Path traversal**: prevent with path normalization
- **Atomic writes**: use temp file + rename

## Usage Examples

### Example 1: Auto-Trigger - User Confirms Upload
```json
// Input
{
  "command_name": "analyze_zoom_speech_sdk_log",
  "report_content": "# Analysis Report\n\n## Issues Found\n\n- Token timeout detected...",
  "report_name": "Critical_Timeout_Analysis",
  "user_wants_upload": true
}

// Output
{
  "success": true,
  "action_taken": "uploaded",
  "report_path": "/opt/acmt/Commands-Analyze-Report/analyze_zoom_speech_sdk_log/analyze_zoom_speech_sdk_log_Critical_Timeout_Analysis_20251204_143022_v1.md",
  "report_name": "analyze_zoom_speech_sdk_log_Critical_Timeout_Analysis_20251204_143022_v1.md",
  "report_link": "https://reports.example.com/analyze_zoom_speech_sdk_log/...",
  "message": "Report uploaded to server successfully",
  "version": 1
}
```

### Example 2: Auto-Trigger - User Declines Upload
```json
// Input
{
  "command_name": "analyze_zoom_speech_sdk_log",
  "report_content": "# Analysis Report\n\n## Issues Found\n\n...",
  "user_wants_upload": false
}

// Output
{
  "success": true,
  "action_taken": "saved_locally",
  "report_path": "/Users/user/project/local-reports/analyze_zoom_speech_sdk_log/analyze_zoom_speech_sdk_log_报告_20251204_143022_local.md",
  "report_name": "analyze_zoom_speech_sdk_log_报告_20251204_143022_local.md",
  "message": "Report saved locally (not uploaded to server)"
}
```

### Example 3: User Request - Direct Upload
```json
// User says: "帮我提交这个报告"

// Input
{
  "command_name": "proxy-slow-meeting-analysis-command",
  "report_content": "# Proxy Analysis Report\n\n...",
  "report_name": "McKinsey_Zoom_Analysis",
  "user_wants_upload": true
}

// Output
{
  "success": true,
  "action_taken": "uploaded",
  "report_path": "/opt/acmt/Commands-Analyze-Report/proxy-slow-meeting-analysis-command/...",
  "report_name": "proxy-slow-meeting-analysis-command_McKinsey_Zoom_Analysis_20251204_150000_v1.md",
  "message": "Report uploaded to server successfully",
  "version": 1
}
```

## Error Handling

| Error Code | Description | Resolution |
|------------|-------------|------------|
| `INVALID_COMMAND_NAME` | Command name contains invalid characters | Use alphanumeric, underscores, hyphens |
| `EMPTY_CONTENT` | Report content is empty | Provide report content |
| `SIZE_LIMIT_EXCEEDED` | Report exceeds size limit | Reduce report size |
| `INVALID_REPORT_NAME` | Custom name contains invalid characters | Use allowed characters |
| `DIRECTORY_PREPARATION_FAILED` | Cannot create report directory | Check permissions |
| `FILE_WRITE_FAILED` | Cannot write report file | Check disk space and permissions |
| `LOCAL_SAVE_FAILED` | Cannot save locally | Check local directory permissions |

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enable_report_upload` | boolean | true | Enable/disable upload functionality |
| `report_upload_max_size_mb` | number | 10 | Maximum report size in MB |
| `report_auto_versioning` | boolean | true | Auto-increment version on conflicts |
| `report_file_permissions` | string | "644" | File permissions (octal) |
| `report_link_base_url` | string | "" | Base URL for report links |

## Related Tools

- `get_command`: Get command definition (includes next_steps hint for analysis commands)
- `search_reports`: Find reports by content
- `list_command_reports`: List reports for a command
- `get_report`: Get full content of a report

