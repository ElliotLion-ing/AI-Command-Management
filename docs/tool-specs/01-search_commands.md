# Tool Specification: search_commands

## Overview

| Property | Value |
|----------|-------|
| **Tool Name** | `search_commands` |
| **Category** | Command Discovery |
| **Purpose** | Intelligent search for commands using multi-tier search strategy |

## Description

Search for commands using an intelligent three-tier search strategy that progressively expands the search scope to find the most relevant commands.

### Three-Tier Search Strategy

1. **Tier 1 - Filename Match**: Direct keyword matching against command filenames (highest relevance)
2. **Tier 2 - Content Search**: Semantic search within command content, including frontmatter metadata
3. **Tier 3 - Report Discovery**: Search historical analysis reports to find commands that have been used for similar problems

## Input Schema

```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Search query - keywords or natural language description of what you're looking for",
      "required": true,
      "examples": ["speech SDK log analysis", "proxy configuration", "meeting join issue"]
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
          "name": {
            "type": "string",
            "description": "Command name (without .md extension)"
          },
          "score": {
            "type": "number",
            "description": "Relevance score (0-1, higher is better)"
          },
          "tier": {
            "type": "string",
            "enum": ["tier1", "tier2", "tier3"],
            "description": "Which search tier found this result"
          },
          "description": {
            "type": "string",
            "description": "Brief description extracted from command"
          },
          "match_reason": {
            "type": "string",
            "description": "Why this command matched the query"
          }
        }
      }
    },
    "search_time_ms": {
      "type": "number",
      "description": "Time taken to execute search in milliseconds"
    },
    "total_found": {
      "type": "number",
      "description": "Total number of matches found"
    }
  }
}
```

## Implementation Requirements

### Core Logic

1. **Query Preprocessing**
   - Normalize query (lowercase, trim whitespace)
   - Extract keywords for filename matching
   - Prepare query for fuzzy search

2. **Tier 1: Filename Search**
   - Match query keywords against command filenames
   - Use word boundary matching for precision
   - Score based on keyword coverage and position

3. **Tier 2: Content Search**
   - Use fuzzy search library (e.g., Fuse.js) for semantic matching
   - Search in: title, description, content, tags
   - Consider frontmatter metadata for enhanced matching

4. **Tier 3: Report Search**
   - Search historical analysis reports
   - Find commands that produced reports matching the query
   - Use report content as indirect evidence of command capability

5. **Result Merging**
   - Combine results from all tiers
   - Remove duplicates (prefer higher tier)
   - Sort by relevance score
   - Apply max_results limit

### Filtering Rules

- **Exclude dependency commands**: Commands marked with `is_dependency: true` in frontmatter should be hidden from results
- **Active commands only**: Only return commands that exist and are readable

### Performance Considerations

- Implement caching for command metadata
- Set search timeout (default: 5000ms)
- Use async/parallel processing for tier searches

## Usage Examples

### Example 1: Find Log Analysis Tool
```json
// Input
{
  "query": "speech SDK log analysis"
}

// Output
{
  "results": [
    {
      "name": "analyze_zoom_speech_sdk_log",
      "score": 0.95,
      "tier": "tier1",
      "description": "Analyzes Zoom Speech SDK log files for issues",
      "match_reason": "Filename contains 'speech', 'sdk', 'log', 'analyze'"
    }
  ],
  "search_time_ms": 45,
  "total_found": 1
}
```

### Example 2: Find by Problem Description
```json
// Input
{
  "query": "meeting join slow proxy"
}

// Output
{
  "results": [
    {
      "name": "proxy-slow-meeting-analysis-command",
      "score": 0.88,
      "tier": "tier1",
      "description": "Analyzes proxy logs for slow meeting join issues",
      "match_reason": "Filename contains 'proxy', 'slow', 'meeting'"
    }
  ],
  "search_time_ms": 52,
  "total_found": 1
}
```

## Error Handling

| Error Code | Description | Resolution |
|------------|-------------|------------|
| `INVALID_QUERY` | Query is empty or contains only whitespace | Provide a valid search query |
| `SEARCH_TIMEOUT` | Search exceeded timeout limit | Reduce query complexity or increase timeout |
| `DIRECTORY_NOT_FOUND` | Commands directory doesn't exist | Check configuration |

## Related Tools

- `get_command`: Get full content of a found command
- `list_commands`: Browse all available commands

