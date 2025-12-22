# Tool Specification: list_commands

## Overview

| Property | Value |
|----------|-------|
| **Tool Name** | `list_commands` |
| **Category** | Command Discovery |
| **Purpose** | List all available commands with pagination |

## Description

List all available commands in the system with pagination support. Returns command names with basic metadata, useful for browsing available commands when a specific search query is not known.

## Input Schema

```json
{
  "type": "object",
  "properties": {
    "page": {
      "type": "number",
      "description": "Page number (1-indexed)",
      "default": 1,
      "minimum": 1
    },
    "page_size": {
      "type": "number",
      "description": "Number of items per page",
      "default": 50,
      "minimum": 1,
      "maximum": 100
    }
  },
  "required": []
}
```

## Output Schema

```json
{
  "type": "object",
  "properties": {
    "commands": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "description": "Command name (without extension)"
          },
          "description": {
            "type": "string",
            "description": "Brief description of the command"
          },
          "size": {
            "type": "number",
            "description": "File size in bytes"
          },
          "last_modified": {
            "type": "string",
            "format": "date-time",
            "description": "Last modification timestamp"
          }
        }
      }
    },
    "pagination": {
      "type": "object",
      "properties": {
        "page": {
          "type": "number",
          "description": "Current page number"
        },
        "page_size": {
          "type": "number",
          "description": "Items per page"
        },
        "total": {
          "type": "number",
          "description": "Total number of commands"
        },
        "total_pages": {
          "type": "number",
          "description": "Total number of pages"
        },
        "has_next": {
          "type": "boolean",
          "description": "Whether there are more pages"
        },
        "has_prev": {
          "type": "boolean",
          "description": "Whether there are previous pages"
        }
      }
    }
  }
}
```

## Implementation Requirements

### Core Logic

1. **Directory Scanning**
   - Read all `.md` files from commands directory
   - Filter out non-command files (e.g., README.md)
   - Sort alphabetically by name

2. **Dependency Filtering**
   - Parse frontmatter of each command
   - Exclude commands with `is_dependency: true`
   - Only show primary/user-facing commands

3. **Metadata Extraction**
   - Extract description from frontmatter or first paragraph
   - Get file size and modification time
   - Build command info objects

4. **Pagination**
   - Calculate total pages: `ceil(total / page_size)`
   - Slice array for requested page
   - Build pagination metadata

### Filtering Rules

```yaml
# Commands are excluded if:
- filename starts with "." (hidden files)
- filename is "README.md" (documentation)
- frontmatter contains: is_dependency: true
```

### Sorting

Default sort order: Alphabetical by command name (case-insensitive)

## Usage Examples

### Example 1: First Page
```json
// Input
{
  "page": 1,
  "page_size": 10
}

// Output
{
  "commands": [
    {
      "name": "analyze_plist_avatar_logic_log",
      "description": "Analyze plist avatar logic logs",
      "size": 3072,
      "last_modified": "2025-11-15T10:00:00.000Z"
    },
    {
      "name": "analyze_zoom_speech_sdk_log",
      "description": "Analyze Zoom Speech SDK logs",
      "size": 4096,
      "last_modified": "2025-11-20T10:30:00.000Z"
    },
    {
      "name": "proxy-slow-meeting-analysis-command",
      "description": "Analyze proxy logs for slow meeting joins",
      "size": 5120,
      "last_modified": "2025-12-01T08:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 10,
    "total": 3,
    "total_pages": 1,
    "has_next": false,
    "has_prev": false
  }
}
```

### Example 2: Empty Result
```json
// Input
{
  "page": 100,
  "page_size": 50
}

// Output
{
  "commands": [],
  "pagination": {
    "page": 100,
    "page_size": 50,
    "total": 3,
    "total_pages": 1,
    "has_next": false,
    "has_prev": true
  }
}
```

## Error Handling

| Error Code | Description | Resolution |
|------------|-------------|------------|
| `INVALID_PAGE` | Page number is less than 1 | Use page >= 1 |
| `INVALID_PAGE_SIZE` | Page size out of range | Use 1-100 |
| `DIRECTORY_NOT_FOUND` | Commands directory doesn't exist | Check configuration |

## Related Tools

- `search_commands`: Search for specific commands
- `get_command`: Get full details of a command


