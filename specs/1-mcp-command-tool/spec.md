# Feature Specification: MCP Command Tool Management

**Feature ID**: 1-mcp-command-tool
**Created**: 2025-11-25
**Status**: Draft
**Version**: 0.0.1

## Feature Overview

### Summary
AI-Command-Tool-Management is an MCP (Model Context Protocol) tool that enables users to discover, search, and execute command definitions stored remotely as Markdown files. The tool eliminates the need to copy commands to local workspaces by providing intelligent search across command definitions and their historical analysis reports.

### Problem Statement
Users currently need to manually copy command files to their local `.cursor/commands` directory to use them. This creates several problems:
- Version inconsistencies across different workspaces
- Workspace clutter from numerous command files
- Difficulty discovering relevant commands from large command libraries
- No visibility into historical usage and analysis reports
- Redundant storage of identical commands

### Deployment Architecture
```
┌─────────────────────────────────────────────────────────┐
│  User's Local Machine (Cursor)                         │
│  mcp.json:                                              │
│  {                                                      │
│    "acmt": {                                            │
│      "url": "https://server.example.com/csp/acmt/sse", │
│      "transport": "sse"                                 │
│    }                                                    │
│  }                                                      │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ SSE (Server-Sent Events)
                   │ MCP Protocol over SSE
                   │
┌──────────────────▼──────────────────────────────────────┐
│  Remote Server (e.g., https://server.example.com)      │
│  ┌────────────────────────────────────────────────────┐ │
│  │  MCP Server Runtime (provided by infrastructure)   │ │
│  │  - Handles SSE connections                         │ │
│  │  - Routes MCP protocol messages                    │ │
│  └─────────────┬──────────────────────────────────────┘ │
│                │                                          │
│  ┌─────────────▼──────────────────────────────────────┐ │
│  │  ACMT Tool (Our Implementation)                    │ │
│  │  - Registers MCP tools                             │ │
│  │  - Processes tool requests                         │ │
│  │  - Accesses local file system                      │ │
│  └─────────────┬──────────────────────────────────────┘ │
│                │ Local File System Operations           │
│  ┌─────────────▼──────────────────────────────────────┐ │
│  │  Server's Local File System                        │ │
│  │  ├── /mnt/storage/Commands/*.md                    │ │
│  │  └── /mnt/storage/Commands-Analyze-Report/         │ │
│  │      └── {command}-reports/*.md                    │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Key Architecture Notes**:
- **Transport**: MCP SDK handles SSE transport; our tool doesn't manage network layer
- **User Config**: Users only configure remote URL in Cursor's mcp.json
- **File Access**: Commands and reports are local files on the MCP server machine
- **Deployment**: Tool is deployed to remote server infrastructure (not user's machine)

### Proposed Solution
An MCP tool that:
1. Provides intelligent three-tier search across remote command repositories
2. Allows users to discover commands through fuzzy descriptions or exact names
3. Executes remote commands seamlessly as if they were local
4. Searches historical analysis reports to help users learn from past work
5. Deploys as an npm package for easy installation on MCP servers

## User Scenarios & Testing

### Scenario 1: Fuzzy Command Discovery
**User Goal**: Find a logging analysis tool without knowing its exact name

**Flow**:
1. User requests: "I need a tool to analyze speech SDK logs"
2. System performs three-tier search:
   - Tier 1: Searches filenames for keywords "speech", "SDK", "log", "analyze"
   - Tier 2: Searches command file content if no filename matches
   - Tier 3: Searches historical report content if needed
3. System presents ranked list of matching commands with descriptions
4. User selects "analyze_zoom_speech_sdk_log.md" from the list
5. System displays full command description and capabilities
6. User confirms execution
7. System executes the command with current workspace context

**Acceptance Criteria**:
- Search returns relevant results in under 2 seconds
- Results are ranked by relevance (exact matches first)
- At least 3 candidate commands shown when multiple matches exist
- Each result includes: command name, brief description, last usage date

### Scenario 2: Direct Command Invocation
**User Goal**: Execute a specific command by exact name

**Flow**:
1. User requests: "Use analyze_zoom_speech_sdk_log to analyze logs in current directory"
2. System recognizes exact command name
3. System skips search, directly loads command definition
4. System executes command with specified parameters
5. System generates analysis report

**Acceptance Criteria**:
- Exact name matching bypasses search layer
- Command executes within 1 second of request
- Execution behavior identical to local `.cursor/commands` invocation
- Generated reports are stored in appropriate directory structure

### Scenario 3: Historical Report Search
**User Goal**: Find if a specific issue has been analyzed before

**Flow**:
1. User requests: "Show me reports about decode_response issues"
2. System searches all report files for "decode_response" keyword
3. System presents list of matching reports with:
   - Report title and date
   - Source command name
   - Brief excerpt showing keyword context
   - Link to full report
4. User selects a report to view
5. System displays or links to the full report content

**Acceptance Criteria**:
- Search covers all reports across all command subdirectories
- Results include report metadata (date, command, excerpt)
- Links are valid and accessible
- Search completes within 3 seconds for 1000+ reports

### Scenario 4: Command-Specific Report Search
**User Goal**: Find all reports generated by a specific command

**Flow**:
1. User requests: "Show me all analyze_zoom_speech_sdk_log reports"
2. System identifies command name from request
3. System searches only in `analyze_zoom_speech_sdk_log-reports/` directory
4. System presents chronologically sorted list of reports
5. User can filter by date range or keyword within these reports

**Acceptance Criteria**:
- System correctly maps command names to report directories
- Reports sorted newest first by default
- Each report shows: date, file size, brief summary
- User can navigate to reports directly from list

## Functional Requirements

### FR1: Multi-Tier Command Search
**Priority**: P0 (Critical)

The system shall implement a three-tier search mechanism with automatic fallback:

1. **Tier 1 - Filename Keyword Search**:
   - Extract keywords from user query
   - Search command filenames for keyword matches
   - Score matches by number of matching keywords
   - Return ranked results with filename match confidence

2. **Tier 2 - Content Analysis Search**:
   - Activated when Tier 1 returns fewer than 3 results
   - Parse Markdown content of all command files
   - Analyze command descriptions, purposes, and examples
   - Match against user query semantically
   - Score by content relevance

3. **Tier 3 - Historical Report Search**:
   - Activated when Tier 2 returns fewer than 2 results
   - Search through all report Markdown files
   - Identify commands associated with matching reports
   - Score commands by report relevance and recency
   - Surface commands that solved similar problems

**Testing**:
- Verify each tier activates only when previous tier insufficient
- Confirm scoring algorithm produces consistent rankings
- Test with 100+ commands and 500+ reports

### FR2: Local Command Access (from Server Perspective)
**Priority**: P0 (Critical)

The system shall access command definitions from the server's local file system:

**Architecture**:
- MCP server runs on a remote server machine
- `Commands/` and `Commands-Analyze-Report/` directories are stored on the same server machine (local to MCP server)
- Users configure Cursor with the remote server's HTTP address
- Cursor communicates with MCP server via HTTP/network protocol
- MCP server accesses Commands as **local file system operations** (not remote from server's perspective)

**Requirements**:
- MCP server must have read access to local `Commands/` directory
- Support configurable local path for command storage (e.g., `/mnt/storage/Commands`)
- Cache command metadata (name, description, size) in memory for search performance
- Refresh cache on-demand or periodically
- Handle file system errors gracefully with clear error messages
- No network operations needed for file access (files are local to MCP server)

**Testing**:
- Verify commands load from local file system path
- Test with file system latency simulation
- Confirm cache invalidation works correctly
- Test error handling when file path unreachable or permission denied
- Test MCP tool integration with MCP SDK (SSE transport handled by SDK)

### FR3: Command Execution Interface
**Priority**: P0 (Critical)

The system shall provide MCP tool functions for:

1. **search_commands(query: string, max_results: number)**:
   - Returns array of matching commands with metadata
   - Includes: name, description, relevance_score, last_modified

2. **get_command(command_name: string)**:
   - Returns full command definition as Markdown
   - Includes all command content and metadata

3. **list_commands()**:
   - Returns all available commands
   - Supports pagination for large command sets

4. **invoke_command(command_name: string, context: object)**:
   - Executes command with provided context
   - Returns execution result or error

**Testing**:
- Validate each function signature and return type
- Test with edge cases (empty results, invalid names, etc.)
- Verify MCP protocol compliance
- Test concurrent function calls

### FR4: Report Discovery System
**Priority**: P1 (High)

The system shall provide report search capabilities:

1. **search_reports(query: string, command_filter: string | null)**:
   - Searches report content for query
   - Optionally filters by source command name
   - Returns array of matching reports with excerpts

2. **list_command_reports(command_name: string)**:
   - Lists all reports for a specific command
   - Sorted by date (newest first)
   - Includes report metadata

3. **get_report_link(report_path: string)**:
   - Generates accessible link to report
   - Link format determined by storage server configuration

**Testing**:
- Test report search across multiple command directories
- Verify filtering works correctly
- Test link generation for various report paths
- Confirm chronological sorting

### FR5: NPM Package Structure
**Priority**: P0 (Critical)

The system shall be packaged as a standard npm package:

- Package name: `@ai-command-mgmt/mcp-server` (or similar available name)
- Entry point: MCP server implementation
- Dependencies: All runtime requirements (MCP SDK, file system libraries, search utilities)
- Configuration: Support for environment variables or config file for:
  - Command directory path
  - Report directory path
  - Cache settings
  - Server URL for report links
- No bundled commands or reports (user-provided)

**Package structure**:
```
package/
├── src/
│   ├── index.ts (MCP server entry)
│   ├── search/
│   │   ├── tier1-filename.ts
│   │   ├── tier2-content.ts
│   │   └── tier3-reports.ts
│   ├── commands/
│   │   ├── loader.ts
│   │   └── executor.ts
│   ├── reports/
│   │   ├── finder.ts
│   │   └── linker.ts
│   └── config.ts
├── package.json
├── tsconfig.json
├── README.md
└── publish.sh
```

**Testing**:
- Verify package builds successfully
- Test installation via npm install
- Confirm all dependencies resolve
- Validate package.json metadata

### FR6: Configuration System
**Priority**: P1 (High)

The system shall support flexible configuration:

**Configuration file** (`.ai-command-tool.json`):
```json
{
  "commands_directory": "/path/to/Commands",
  "reports_directory": "/path/to/Commands-Analyze-Report",
  "cache_ttl_seconds": 3600,
  "report_link_base_url": "https://reports.example.com",
  "max_search_results": 10,
  "search_timeout_ms": 5000
}
```

**Environment variables** (override config file):
- `AICMD_COMMANDS_DIR`
- `AICMD_REPORTS_DIR`
- `AICMD_CACHE_TTL`
- `AICMD_REPORT_BASE_URL`

**Testing**:
- Test config file parsing
- Verify environment variable precedence
- Test with missing config (should use defaults)
- Validate configuration values (paths exist, URLs valid)

## Success Criteria

### Performance Metrics
1. **Search Speed**: 90% of searches complete within 2 seconds
2. **Command Execution**: Commands execute within 1 second of invocation
3. **Scalability**: System handles 1000+ commands and 5000+ reports efficiently
4. **Availability**: MCP server maintains 99.9% uptime

### User Experience Metrics
1. **Search Accuracy**: Users find desired command within top 3 results 85% of the time
2. **Execution Success**: 95% of command invocations complete successfully
3. **Ease of Use**: Users require zero training to search and invoke commands
4. **Discovery**: Users discover relevant historical reports 70% of times when querying

### Technical Metrics
1. **Package Size**: npm package under 10MB (excluding node_modules)
2. **Memory Usage**: MCP server uses less than 500MB RAM under normal load
3. **Cache Efficiency**: Cache reduces search time by 60%+ on repeated queries
4. **Error Rate**: Less than 1% of requests result in errors

## Key Entities

### Command Definition
- **Attributes**:
  - name: string (filename without .md)
  - path: string (full file path)
  - content: string (Markdown content)
  - description: string (extracted from content)
  - keywords: string[] (extracted for search)
  - last_modified: timestamp
  - file_size: number
  
### Analysis Report
- **Attributes**:
  - report_name: string (filename)
  - command_name: string (parent command)
  - path: string (full file path)
  - date: timestamp (extracted from filename or content)
  - content: string (Markdown content)
  - link: string (accessible URL)
  - file_size: number

### Search Result
- **Attributes**:
  - command: Command Definition
  - relevance_score: number (0-100)
  - match_tier: 1 | 2 | 3
  - match_reason: string (why this command matched)
  - excerpt: string (relevant content snippet)

### MCP Tool Definition
- **Attributes**:
  - name: string (tool identifier)
  - description: string (tool purpose)
  - parameters: object (expected input schema)
  - handler: function (implementation)

## Assumptions

1. **Deployment Model**: MCP tool runs on a remote server machine; Commands and reports are stored on the same server machine (local to the tool)
2. **Network Communication**: MCP SDK handles SSE (Server-Sent Events) transport; our tool doesn't manage network layer
3. **MCP Infrastructure**: Server infrastructure provides MCP runtime and handles SSE connections
4. **File System Access**: Tool has read access to local command and report directories on the server machine
5. **Markdown Format**: All commands and reports are valid Markdown files with .md extension
6. **Naming Convention**: Report directories follow pattern `{command-name}-reports/`
7. **File System**: Standard file system operations (read, list, stat) are available
8. **Report Links**: Report link server is accessible and provides valid URLs (may be the same server or different)
9. **Node.js Runtime**: Tool runs in Node.js 18+ environment on the remote server
10. **MCP Protocol**: Tool implements standard MCP tool interface; transport handled by SDK
11. **Character Encoding**: All files use UTF-8 encoding
12. **File Size**: Individual command/report files are under 10MB each
13. **Concurrent Access**: File system supports multiple concurrent reads
14. **Server Persistence**: Remote server infrastructure remains running to handle user requests
15. **User Configuration**: Users configure tool via remote URL in Cursor's mcp.json (transport: "sse")

## Dependencies

### External Dependencies
1. **MCP SDK**: For implementing MCP server protocol
2. **File System Library**: Native Node.js `fs` module
3. **Markdown Parser**: Library for parsing and extracting Markdown content (e.g., `marked`)
4. **Search/Indexing**: Text search library (e.g., `fuse.js` for fuzzy search)
5. **Configuration**: Config file parser (e.g., `dotenv`, `cosmiconfig`)

### System Dependencies
1. **Remote Storage Server**: Hosts command and report directories
2. **Report Link Server**: Generates and serves report links
3. **MCP Client**: Cursor or other MCP-compatible client
4. **NPM Registry**: For package publication and distribution

### Infrastructure Dependencies
1. **Network Connectivity**: Between MCP server and storage server
2. **File System Permissions**: Read access to command/report directories
3. **Compute Resources**: Sufficient CPU/memory for search operations

## Out of Scope

The following items are explicitly NOT included in this feature:

1. **Command Creation/Editing**: Tool only reads commands, does not create or modify them
2. **Report Generation**: Actual analysis logic that creates reports (handled by commands themselves)
3. **User Authentication**: No user-based access control (relies on MCP client authentication)
4. **Command Versioning**: No version control for command definitions
5. **Web UI**: No graphical interface; purely MCP tool interface
6. **Command Validation**: No validation of command Markdown syntax or logic
7. **Report Parsing**: No semantic understanding of report content structure
8. **Real-time Collaboration**: No multi-user editing or locking
9. **Command Dependencies**: No dependency resolution between commands
10. **Execution Sandboxing**: No isolation of command execution environments
11. **Rate Limiting**: No throttling of search or execution requests
12. **Analytics/Metrics**: No usage tracking or analytics collection
13. **Command Marketplace**: No browsing or downloading of public commands
14. **Local Command Sync**: No synchronization with `.cursor/commands` directory

## Non-Functional Requirements

### Security
- Read-only access to command/report directories (no writes)
- Input validation on all user queries (prevent injection attacks)
- Sanitize file paths (prevent directory traversal)
- No execution of arbitrary code from command files
- Configuration values validated before use

### Reliability
- Graceful degradation when remote storage unavailable (use cache)
- Retry logic for transient network failures (3 retries with exponential backoff)
- Clear error messages for all failure modes
- No data loss or corruption under any conditions

### Maintainability
- Modular architecture with clear separation of concerns
- Comprehensive inline code documentation
- TypeScript for type safety
- Unit test coverage above 80%
- Integration tests for all MCP tool functions

### Scalability
- Efficient caching to minimize file system reads
- Incremental search index updates
- Support for lazy-loading of command content
- Memory-efficient handling of large result sets

## Future Enhancements

Potential future additions (not in current scope):

1. **Semantic Search**: Use embeddings for more intelligent command matching
2. **Command Templates**: Support for parameterized command templates
3. **Report Statistics**: Aggregate analytics across reports
4. **Command Recommendations**: Suggest commands based on workspace context
5. **Offline Mode**: Full functionality with cached data when offline
6. **Command Collections**: Group related commands into collections
7. **Natural Language Queries**: More conversational search interface
8. **Report Summarization**: AI-generated summaries of lengthy reports
9. **Command Changelog**: Track changes to command definitions over time
10. **Integration Plugins**: Connect with other development tools (GitHub, JIRA, etc.)

---

**Document Status**: Ready for Technical Planning
**Next Phase**: Create implementation plan (`/speckit.plan`)

