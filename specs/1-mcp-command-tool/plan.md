# Implementation Plan: MCP Command Tool Management

**Feature ID**: 1-mcp-command-tool
**Created**: 2025-11-25
**Status**: Draft
**Version**: 0.0.1

## Executive Summary

This document outlines the technical implementation plan for the AI-Command-Tool-Management MCP server. The system will be built as a TypeScript-based npm package that implements the Model Context Protocol to provide intelligent command discovery, search, and execution capabilities.

### Technology Stack
- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.0+
- **MCP Framework**: @modelcontextprotocol/sdk (handles SSE transport)
- **Search**: fuse.js (fuzzy search library)
- **Markdown**: marked (Markdown parser)
- **Configuration**: cosmiconfig
- **Testing**: Vitest
- **Build**: tsup (TypeScript bundler)

**Note**: MCP SDK handles all network transport (SSE). Our tool only implements tool handlers and business logic.

### Architecture Overview
```
User's Local Machine:
┌──────────────────────────────────────────────────────────┐
│                 MCP Client (Cursor)                      │
│  mcp.json:                                               │
│  {                                                       │
│    "acmt": {                                             │
│      "url": "https://server.example.com/csp/acmt/sse",  │
│      "transport": "sse"                                  │
│    }                                                     │
│  }                                                       │
└───────────────────────┬──────────────────────────────────┘
                        │ 
                        │ SSE (Server-Sent Events)
                        │ MCP Protocol (handled by SDK)
                        │ 
Remote Server Machine:  │
┌───────────────────────▼──────────────────────────────────┐
│             MCP Server Infrastructure                    │
│  ┌──────────────────────────────────────────────────┐   │
│  │  MCP Runtime (provided by infrastructure)        │   │
│  │  - Handles SSE connections                       │   │
│  │  - Routes MCP protocol messages                  │   │
│  │  - Invokes registered tools                      │   │
│  └─────┬────────────────────────────────────────────┘   │
│        │                                                 │
│  ┌─────▼────────────────────────────────────────────┐   │
│  │  ACMT Tool (Our Implementation)                  │   │
│  │  ┌──────────────────────────────────────────┐   │   │
│  │  │  Tool Handlers                           │   │   │
│  │  │  - search_commands()                     │   │   │
│  │  │  - get_command()                         │   │   │
│  │  │  - list_commands()                       │   │   │
│  │  │  - search_reports()                      │   │   │
│  │  │  - list_command_reports()                │   │   │
│  │  └─────┬────────────────────────────────────┘   │   │
│  │        │                                         │   │
│  │  ┌─────▼────────┐  ┌──────────────────────┐   │   │
│  │  │ Search Engine│  │  Command Loader      │   │   │
│  │  │ - Tier 1     │  │  - File discovery    │   │   │
│  │  │ - Tier 2     │  │  - Metadata extract  │   │   │
│  │  │ - Tier 3     │  │  - Content parsing   │   │   │
│  │  └─────┬────────┘  └────────┬─────────────┘   │   │
│  │        │                    │                  │   │
│  │  ┌─────▼────────────────────▼─────────────┐   │   │
│  │  │  Cache Layer                            │   │   │
│  │  │  - Command metadata cache               │   │   │
│  │  │  - Search index cache                   │   │   │
│  │  └─────┬───────────────────────────────────┘   │   │
│  └────────┼───────────────────────────────────────┘   │
│           │ Local File System Operations              │
│  ┌────────▼────────────────────────────────────────┐   │
│  │  Local File System                              │   │
│  │  /mnt/storage/Commands/*.md                     │   │
│  │  /mnt/storage/Commands-Analyze-Report/          │   │
│  │      └── {command}-reports/*.md                 │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Key Architecture Points**:
1. **Transport Layer**: MCP SDK handles SSE; our tool doesn't manage network connections
2. **Tool Responsibility**: We only implement tool handlers (search, get, list logic)
3. **File Access**: All file operations are LOCAL to the server (no network FS access)
4. **User Experience**: User configures remote URL in Cursor; commands appear seamless
5. **Deployment**: Tool is deployed as npm package to MCP server infrastructure

## Module Breakdown

### Module 1: MCP Server Core
**Purpose**: Implement MCP protocol server and tool registration

**Components**:

#### 1.1 Server Initialization (`src/index.ts`)
```typescript
// Main entry point
- Initialize MCP Server from SDK
- Register all tool handlers
- Load configuration
- Setup error handlers
- Start server (transport handled by MCP SDK)
```

**Key Responsibilities**:
- Create `Server` instance from MCP SDK
- Register 5 MCP tools (search_commands, get_command, list_commands, search_reports, list_command_reports)
- Let MCP SDK handle transport (SSE, stdio, etc.) - we don't manage this
- Initialize logging
- Load configuration from file and environment
- Export tool for MCP infrastructure to load

**Transport Handling**:
- MCP SDK handles all transport (SSE for production, stdio for dev)
- Our tool is transport-agnostic - same code works with any MCP transport
- Infrastructure decides transport mode (not our tool)

**Dependencies**:
- `@modelcontextprotocol/sdk`: MCP framework (handles all transport)
- Configuration module (1.2)
- All tool handler modules (Module 2)

**Testing**:
- Unit test: Server instantiation
- Unit test: Tool registration
- Integration test: MCP protocol handshake
- Integration test: Tool invocation flow

#### 1.2 Configuration Management (`src/config/index.ts`)
```typescript
// Configuration loader and validator
- Define ConfigSchema interface
- Load from .ai-command-tool.json
- Override with environment variables
- Validate paths and values
- Provide default values
```

**Configuration Schema**:
```typescript
interface ConfigSchema {
  // File system paths (local to server)
  commands_directory: string;        // Path to Commands/ (e.g., /mnt/storage/Commands)
  reports_directory: string;         // Path to Commands-Analyze-Report/
  
  // Performance
  cache_ttl_seconds: number;         // Cache lifetime (default: 3600)
  max_search_results: number;        // Max results per search (default: 10)
  search_timeout_ms: number;         // Search timeout (default: 5000)
  enable_cache: boolean;             // Enable/disable caching (default: true)
  
  // External services
  report_link_base_url: string;      // Base URL for report links
  
  // Logging
  log_level: 'debug' | 'info' | 'warn' | 'error'; // Logging level
}
```

**Note**: No server/transport configuration needed - MCP SDK and infrastructure handle that.

**Environment Variables**:
- `AICMD_COMMANDS_DIR` → `commands_directory`
- `AICMD_REPORTS_DIR` → `reports_directory`
- `AICMD_CACHE_TTL` → `cache_ttl_seconds`
- `AICMD_REPORT_BASE_URL` → `report_link_base_url`
- `AICMD_MAX_RESULTS` → `max_search_results`
- `AICMD_SEARCH_TIMEOUT` → `search_timeout_ms`
- `AICMD_ENABLE_CACHE` → `enable_cache`
- `AICMD_LOG_LEVEL` → `log_level`

**Validation Rules**:
- Commands directory must exist and be readable
- Reports directory must exist and be readable
- Timeouts must be positive integers
- Max results between 1 and 100
- URLs must be valid format

**Dependencies**:
- `cosmiconfig`: Config file loading
- `dotenv`: Environment variable loading
- `zod`: Schema validation (optional, or use manual validation)
- Node.js `fs`: Path validation

**Testing**:
- Unit test: Config file parsing
- Unit test: Environment variable override
- Unit test: Validation rules
- Unit test: Default values
- Integration test: Invalid config handling

### Module 2: MCP Tool Handlers
**Purpose**: Implement the 5 MCP tool functions

#### 2.1 Search Commands Handler (`src/tools/search-commands.ts`)
```typescript
// Tool: search_commands
Input: {
  query: string,
  max_results?: number
}
Output: {
  results: Array<{
    name: string,
    description: string,
    relevance_score: number,
    match_tier: 1 | 2 | 3,
    match_reason: string,
    path: string,
    last_modified: string
  }>
}
```

**Implementation Flow**:
1. Validate input query (non-empty, reasonable length)
2. Call SearchEngine.search() with query
3. Limit results to max_results (from config or parameter)
4. Format and return results
5. Handle errors gracefully

**Dependencies**:
- Search Engine module (3.1)
- Configuration module (1.2)

**Error Handling**:
- Empty query → Return empty results
- Search timeout → Return partial results with warning
- File system error → Return error with clear message

**Testing**:
- Unit test: Input validation
- Unit test: Result formatting
- Integration test: End-to-end search
- Integration test: Error scenarios

#### 2.2 Get Command Handler (`src/tools/get-command.ts`)
```typescript
// Tool: get_command
Input: {
  command_name: string
}
Output: {
  name: string,
  content: string,  // Full Markdown content
  metadata: {
    path: string,
    size: number,
    last_modified: string,
    description: string
  }
}
```

**Implementation Flow**:
1. Validate command name (alphanumeric, underscores, hyphens, .md extension handling)
2. Call CommandLoader.getCommand()
3. Read full file content
4. Extract metadata
5. Return formatted response

**Dependencies**:
- Command Loader module (4.1)
- Configuration module (1.2)

**Error Handling**:
- Invalid name → Return error "Invalid command name"
- Command not found → Return error "Command not found: {name}"
- Read error → Return error with details

**Testing**:
- Unit test: Name validation
- Unit test: Response formatting
- Integration test: Load existing command
- Integration test: Handle missing command

#### 2.3 List Commands Handler (`src/tools/list-commands.ts`)
```typescript
// Tool: list_commands
Input: {
  page?: number,
  page_size?: number
}
Output: {
  commands: Array<{
    name: string,
    description: string,
    size: number,
    last_modified: string
  }>,
  total: number,
  page: number,
  page_size: number
}
```

**Implementation Flow**:
1. Call CommandLoader.listAll()
2. Apply pagination (default: page=1, page_size=50)
3. Sort by name or last_modified
4. Return paginated results

**Dependencies**:
- Command Loader module (4.1)
- Cache module (5.1)

**Testing**:
- Unit test: Pagination logic
- Integration test: List all commands
- Integration test: Pagination boundaries

#### 2.4 Search Reports Handler (`src/tools/search-reports.ts`)
```typescript
// Tool: search_reports
Input: {
  query: string,
  command_filter?: string,  // Optional command name to filter by
  max_results?: number
}
Output: {
  results: Array<{
    report_name: string,
    command_name: string,
    date: string,
    excerpt: string,  // Context around match
    link: string,
    path: string
  }>
}
```

**Implementation Flow**:
1. Validate query
2. If command_filter provided, search only that command's reports
3. Otherwise, search all report directories
4. Call ReportFinder.search()
5. Generate links for each result
6. Return formatted results

**Dependencies**:
- Report Finder module (4.2)
- Report Linker module (4.3)
- Configuration module (1.2)

**Testing**:
- Unit test: Query validation
- Integration test: Global report search
- Integration test: Command-filtered search
- Integration test: Link generation

#### 2.5 List Command Reports Handler (`src/tools/list-command-reports.ts`)
```typescript
// Tool: list_command_reports
Input: {
  command_name: string
}
Output: {
  reports: Array<{
    name: string,
    date: string,
    size: number,
    link: string,
    path: string
  }>,
  command_name: string,
  total: number
}
```

**Implementation Flow**:
1. Validate command name
2. Build report directory path: `{reports_dir}/{command_name}-reports/`
3. List all .md files in directory
4. Extract dates from filenames
5. Sort by date descending
6. Generate links
7. Return formatted list

**Dependencies**:
- Report Finder module (4.2)
- Report Linker module (4.3)

**Testing**:
- Integration test: List reports for existing command
- Integration test: Handle command with no reports
- Integration test: Date extraction and sorting

### Module 3: Search Engine
**Purpose**: Implement three-tier search algorithm

#### 3.1 Search Orchestrator (`src/search/index.ts`)
```typescript
// Main search interface
class SearchEngine {
  search(query: string, maxResults: number): Promise<SearchResult[]>
}
```

**Search Algorithm**:
```
1. Execute Tier 1 (Filename Search)
   - If results >= maxResults: Return top maxResults
   - If results >= 3: Return all Tier 1 results

2. Execute Tier 2 (Content Search)
   - Merge with Tier 1 results
   - Remove duplicates
   - Re-rank combined results
   - If results >= 2: Return top maxResults

3. Execute Tier 3 (Report Search)
   - Find commands mentioned in matching reports
   - Merge with Tier 1+2 results
   - Remove duplicates
   - Final ranking
   - Return top maxResults
```

**Dependencies**:
- Tier 1 module (3.2)
- Tier 2 module (3.3)
- Tier 3 module (3.4)
- Cache module (5.1)

**Testing**:
- Unit test: Tier execution logic
- Unit test: Result merging and deduplication
- Integration test: Full search flow
- Performance test: Search 1000 commands under 2 seconds

#### 3.2 Tier 1: Filename Search (`src/search/tier1-filename.ts`)
```typescript
// Keyword matching against filenames
class FileNameSearcher {
  search(query: string, commands: CommandMetadata[]): SearchResult[]
}
```

**Algorithm**:
1. Extract keywords from query (split, lowercase, remove stop words)
2. For each command filename:
   - Convert to lowercase
   - Count keyword matches
   - Calculate score = (matches / total_keywords) * 100
3. Filter results with score > 0
4. Sort by score descending
5. Return results

**Scoring Example**:
```
Query: "speech SDK log analyze"
Keywords: ["speech", "sdk", "log", "analyze"]

File: "analyze_zoom_speech_sdk_log.md"
Matches: "analyze", "speech", "sdk", "log" = 4/4
Score: 100

File: "parse_meeting_log.md"
Matches: "log" = 1/4
Score: 25
```

**Dependencies**:
- Command Loader (for metadata)

**Testing**:
- Unit test: Keyword extraction
- Unit test: Scoring algorithm
- Unit test: Edge cases (empty query, special characters)

#### 3.3 Tier 2: Content Search (`src/search/tier2-content.ts`)
```typescript
// Semantic search of Markdown content
class ContentSearcher {
  search(query: string, commands: CommandMetadata[]): SearchResult[]
}
```

**Algorithm**:
1. Use fuse.js for fuzzy search
2. Search in command content (description, examples, usage)
3. Configure fuse.js options:
   ```typescript
   {
     keys: ['description', 'content'],
     threshold: 0.4,  // Moderate fuzziness
     includeScore: true,
     minMatchCharLength: 3
   }
   ```
4. Convert fuse scores to 0-100 scale
5. Return sorted results

**Content Indexing**:
- Extract description from first paragraph of Markdown
- Index full content for search
- Cache parsed content for performance

**Dependencies**:
- `fuse.js`: Fuzzy search
- `marked`: Markdown parsing
- Command Loader (for content)

**Testing**:
- Unit test: Fuse.js integration
- Unit test: Score conversion
- Integration test: Semantic matching
- Performance test: Search 1000 command contents

#### 3.4 Tier 3: Report Search (`src/search/tier3-reports.ts`)
```typescript
// Find commands based on report content
class ReportSearcher {
  search(query: string, reports: ReportMetadata[]): SearchResult[]
}
```

**Algorithm**:
1. Search all report files for query
2. For each matching report:
   - Extract command name from directory path
   - Calculate relevance score based on match frequency
   - Record recent match date (from filename)
3. Group by command name
4. Aggregate scores per command
5. Sort by score descending
6. Return as SearchResult[] with match_tier=3

**Scoring**:
```
Score = (match_count * 10) + (recency_bonus)
- match_count: Number of query occurrences in report
- recency_bonus: 20 if within 30 days, 10 if within 90 days, 0 otherwise
```

**Dependencies**:
- Report Finder module (4.2)

**Testing**:
- Unit test: Command extraction from path
- Unit test: Score calculation
- Integration test: Report-based discovery
- Performance test: Search across 5000 reports

### Module 4: File System Operations
**Purpose**: Handle all file system interactions

#### 4.1 Command Loader (`src/commands/loader.ts`)
```typescript
// Command file discovery and loading
class CommandLoader {
  async listAll(): Promise<CommandMetadata[]>
  async getCommand(name: string): Promise<Command>
  async getMetadata(name: string): Promise<CommandMetadata>
}

interface CommandMetadata {
  name: string;
  path: string;
  size: number;
  last_modified: Date;
  description: string;  // First 200 chars of content
}

interface Command extends CommandMetadata {
  content: string;  // Full Markdown content
}
```

**Implementation**:
1. **listAll()**:
   - Read commands directory
   - Filter for .md files
   - Extract metadata for each file
   - Cache results (invalidate after TTL)
   - Return array of CommandMetadata

2. **getCommand(name)**:
   - Construct path: `{commands_dir}/{name}.md`
   - Read file content
   - Parse Markdown for description
   - Return full Command object

3. **getMetadata(name)**:
   - Check cache first
   - If miss, stat file for size and mtime
   - Read first 200 chars for description
   - Cache and return

**Caching Strategy**:
- Cache all metadata in memory
- Invalidate after cache_ttl_seconds
- Provide manual refresh method
- Cache per-file content on demand

**Error Handling**:
- Directory not found → Throw with helpful message
- Permission denied → Throw with permission guidance
- File not found → Return null or throw NotFoundError

**Dependencies**:
- Node.js `fs/promises`
- `marked` (for Markdown parsing)
- Cache module (5.1)

**Testing**:
- Unit test: Metadata extraction
- Unit test: Description parsing
- Integration test: List real commands
- Integration test: Load command content
- Performance test: List 1000 commands under 500ms

#### 4.2 Report Finder (`src/reports/finder.ts`)
```typescript
// Report file discovery and searching
class ReportFinder {
  async search(query: string, commandFilter?: string): Promise<ReportMatch[]>
  async listForCommand(commandName: string): Promise<ReportMetadata[]>
}

interface ReportMetadata {
  name: string;
  command_name: string;
  path: string;
  date: Date;
  size: number;
}

interface ReportMatch extends ReportMetadata {
  excerpt: string;  // Context around match
  match_count: number;
}
```

**Implementation**:
1. **search(query, commandFilter)**:
   - Determine search scope:
     - If commandFilter: `{reports_dir}/{commandFilter}-reports/`
     - Else: All subdirectories in reports_dir
   - For each .md file in scope:
     - Read content
     - Search for query (case-insensitive)
     - If match found, extract excerpt (100 chars around match)
   - Return sorted by relevance

2. **listForCommand(commandName)**:
   - Build path: `{reports_dir}/{commandName}-reports/`
   - List all .md files
   - Extract date from filename pattern
   - Return sorted by date descending

**Date Extraction**:
```typescript
// Pattern: *_YYYYMMDD*.md or *_YYYY-MM-DD*.md
function extractDate(filename: string): Date | null {
  const match = filename.match(/(\d{8}|\d{4}-\d{2}-\d{2})/);
  if (match) {
    const dateStr = match[1].replace(/-/g, '');
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));
    return new Date(year, month, day);
  }
  return null;
}
```

**Excerpt Extraction**:
```typescript
function extractExcerpt(content: string, query: string, contextChars: number = 100): string {
  const index = content.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return '';
  
  const start = Math.max(0, index - contextChars);
  const end = Math.min(content.length, index + query.length + contextChars);
  
  let excerpt = content.substring(start, end);
  if (start > 0) excerpt = '...' + excerpt;
  if (end < content.length) excerpt = excerpt + '...';
  
  return excerpt;
}
```

**Dependencies**:
- Node.js `fs/promises`
- Configuration module (1.2)

**Testing**:
- Unit test: Date extraction from filenames
- Unit test: Excerpt extraction
- Integration test: Search all reports
- Integration test: Command-filtered search
- Integration test: List command reports
- Performance test: Search 5000 reports under 3 seconds

#### 4.3 Report Linker (`src/reports/linker.ts`)
```typescript
// Generate accessible links to reports
class ReportLinker {
  generateLink(reportPath: string): string
}
```

**Implementation**:
```typescript
function generateLink(reportPath: string): string {
  // Get base URL from config
  const baseUrl = config.report_link_base_url;
  
  // Convert absolute path to relative path
  const reportsDir = config.reports_directory;
  const relativePath = path.relative(reportsDir, reportPath);
  
  // URL encode the path
  const encodedPath = encodeURIComponent(relativePath);
  
  // Construct full URL
  return `${baseUrl}/${encodedPath}`;
}
```

**URL Encoding**:
- Handle spaces, special characters
- Preserve directory separators
- Support both Unix and Windows paths

**Fallback**:
- If report_link_base_url not configured, return file:// URL
- Example: `file:///path/to/report.md`

**Dependencies**:
- Node.js `path`
- Configuration module (1.2)

**Testing**:
- Unit test: URL encoding
- Unit test: Path relativization
- Unit test: Fallback to file:// URLs
- Integration test: Generate links for real reports

### Module 5: Performance Optimization
**Purpose**: Caching and performance enhancements

#### 5.1 Cache Layer (`src/cache/index.ts`)
```typescript
// In-memory cache with TTL
class Cache<T> {
  set(key: string, value: T, ttl?: number): void
  get(key: string): T | null
  has(key: string): boolean
  clear(): void
  clearPattern(pattern: RegExp): void
}
```

**Implementation**:
- Use Map for storage
- Track expiry timestamps
- Automatic cleanup of expired entries
- Size limits (max 1000 entries)
- LRU eviction when full

**Cache Keys**:
- Command list: `commands:list`
- Command metadata: `command:meta:{name}`
- Command content: `command:content:{name}`
- Search results: `search:{query_hash}` (short TTL: 300s)
- Report list: `reports:{command_name}:list`

**Cache Invalidation**:
- Time-based (TTL from config)
- Manual via clear() methods
- Pattern-based (e.g., clear all command:*)

**Dependencies**: None (pure TypeScript)

**Testing**:
- Unit test: Set and get
- Unit test: TTL expiration
- Unit test: Size limits and LRU eviction
- Unit test: Pattern-based clearing
- Performance test: 10,000 get operations under 10ms

### Module 6: Utilities
**Purpose**: Shared utility functions

#### 6.1 Logger (`src/utils/logger.ts`)
```typescript
// Structured logging
class Logger {
  debug(message: string, meta?: object): void
  info(message: string, meta?: object): void
  warn(message: string, meta?: object): void
  error(message: string, error?: Error, meta?: object): void
}
```

**Implementation**:
- Log to stderr (stdout reserved for MCP protocol)
- JSON format for structured logs
- Include timestamps, log levels
- Respect log_level from config
- Sanitize sensitive data (file paths optionally)

**Log Format**:
```json
{
  "timestamp": "2025-11-25T15:30:45.123Z",
  "level": "info",
  "message": "Command search completed",
  "meta": {
    "query": "speech sdk",
    "results_count": 5,
    "duration_ms": 234
  }
}
```

**Dependencies**: None

**Testing**:
- Unit test: Log formatting
- Unit test: Level filtering
- Unit test: Metadata inclusion

#### 6.2 Error Handler (`src/utils/errors.ts`)
```typescript
// Custom error classes
class CommandNotFoundError extends Error {}
class SearchTimeoutError extends Error {}
class InvalidConfigError extends Error {}
class FileSystemError extends Error {}

function handleError(error: Error): MCPError {
  // Convert errors to MCP-compatible format
}
```

**Error Response Format**:
```typescript
{
  error: {
    code: string,      // ERROR_CODE (e.g., "COMMAND_NOT_FOUND")
    message: string,   // Human-readable message
    details?: object   // Additional context
  }
}
```

**Dependencies**:
- MCP SDK (for error types)

**Testing**:
- Unit test: Error conversion
- Unit test: Error codes and messages

#### 6.3 Validators (`src/utils/validators.ts`)
```typescript
// Input validation functions
function validateCommandName(name: string): boolean
function validateQuery(query: string): boolean
function validatePath(path: string): boolean
function sanitizePath(path: string): string
```

**Validation Rules**:
- Command name: alphanumeric, underscores, hyphens, optional .md extension
- Query: 1-500 characters, no control characters
- Path: No directory traversal (..), must be within allowed directories

**Dependencies**: None

**Testing**:
- Unit test: Each validation function
- Unit test: Sanitization
- Security test: Directory traversal prevention

## Data Flow Diagrams

### Search Command Flow
```
User Request
     ↓
MCP Client (Cursor)
     ↓ [MCP Protocol: search_commands(query)]
MCP Server
     ↓
SearchCommandsHandler.handle()
     ↓
SearchEngine.search(query)
     ↓
┌─────────────┬─────────────┬─────────────┐
│   Tier 1    │   Tier 2    │   Tier 3    │
│  Filename   │  Content    │  Reports    │
└──────┬──────┴──────┬──────┴──────┬──────┘
       │             │             │
       └──────┬──────┴──────┬──────┘
              │             │
         [Merge & Dedupe]   │
              │             │
         [Re-rank Results]  │
              ↓             ↓
         SearchResult[]
              ↓
         Format Response
              ↓
     [MCP Protocol Response]
              ↓
         MCP Client
              ↓
         User sees results
```

### Get Command Flow
```
User Request
     ↓
MCP Client
     ↓ [get_command(name)]
MCP Server
     ↓
GetCommandHandler.handle()
     ↓
CommandLoader.getCommand(name)
     ↓
Cache.get(key)?
     ↓
   YES: Return cached
     │
   NO:  ↓
   Read file from disk
     ↓
   Parse Markdown
     ↓
   Cache.set(key, content)
     ↓
   Return Command
     ↓
Format Response
     ↓
MCP Client
     ↓
User receives command content
```

### Report Search Flow
```
User Request
     ↓
MCP Client
     ↓ [search_reports(query, filter?)]
MCP Server
     ↓
SearchReportsHandler.handle()
     ↓
ReportFinder.search(query, filter)
     ↓
Determine scope (filtered or global)
     ↓
For each report file:
  ├─ Read content
  ├─ Search for query
  └─ Extract excerpt if match
     ↓
Sort by relevance
     ↓
ReportLinker.generateLink() for each
     ↓
Return ReportMatch[]
     ↓
Format Response
     ↓
MCP Client
     ↓
User sees report results with links
```

## Build & Packaging

### Project Structure
```
ai-command-tool-management/
├── src/
│   ├── index.ts                    # MCP server entry point
│   ├── config/
│   │   └── index.ts                # Configuration management
│   ├── tools/
│   │   ├── search-commands.ts      # Tool handler
│   │   ├── get-command.ts          # Tool handler
│   │   ├── list-commands.ts        # Tool handler
│   │   ├── search-reports.ts       # Tool handler
│   │   └── list-command-reports.ts # Tool handler
│   ├── search/
│   │   ├── index.ts                # Search orchestrator
│   │   ├── tier1-filename.ts       # Filename search
│   │   ├── tier2-content.ts        # Content search
│   │   └── tier3-reports.ts        # Report search
│   ├── commands/
│   │   └── loader.ts               # Command file operations
│   ├── reports/
│   │   ├── finder.ts               # Report file operations
│   │   └── linker.ts               # Report link generation
│   ├── cache/
│   │   └── index.ts                # Cache implementation
│   ├── utils/
│   │   ├── logger.ts               # Logging utility
│   │   ├── errors.ts               # Error handling
│   │   └── validators.ts           # Input validation
│   └── types/
│       └── index.ts                # TypeScript interfaces
├── tests/
│   ├── unit/                       # Unit tests
│   ├── integration/                # Integration tests
│   └── fixtures/                   # Test data
├── examples/
│   ├── .ai-command-tool.json       # Example config
│   └── README.md                   # Usage examples
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── publish.sh                      # NPM publish script
├── README.md
├── LICENSE
└── CHANGELOG.md
```

### package.json
```json
{
  "name": "@ai-command-mgmt/mcp-server",
  "version": "0.0.1",
  "description": "MCP server for intelligent command discovery and execution",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "ai-command-tool": "dist/index.js"
  },
  "files": [
    "dist/",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "build": "tsup src/index.ts --format cjs --dts --clean",
    "dev": "tsup src/index.ts --format cjs --watch",
    "test": "vitest run",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src --ext .ts",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "npm run build && npm run test"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "fuse.js": "^7.0.0",
    "marked": "^12.0.0",
    "cosmiconfig": "^9.0.0",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "tsup": "^8.0.0",
    "vitest": "^1.0.0",
    "@vitest/coverage-v8": "^1.0.0",
    "eslint": "^8.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "keywords": [
    "mcp",
    "model-context-protocol",
    "command-management",
    "cursor",
    "ai-tools"
  ],
  "author": "Your Name",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/ai-command-tool-management"
  }
}
```

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "moduleResolution": "node",
    "rootDir": "./src",
    "outDir": "./dist",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### vitest.config.ts
```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'dist/**',
        'tests/**',
        '**/*.d.ts',
        '**/*.config.*'
      ]
    },
    setupFiles: ['./tests/setup.ts']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

### publish.sh
```bash
#!/bin/bash

# AI Command Tool Management - NPM Publish Script
set -e  # Exit on error

echo "🚀 AI Command Tool Management - NPM Publish"
echo "==========================================="

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Are you in the project root?${NC}"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ Error: npm is not installed${NC}"
    exit 1
fi

# Check if logged into npm
if ! npm whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  You are not logged into npm${NC}"
    echo "Please run: npm login"
    exit 1
fi

echo -e "${GREEN}✅ npm authentication verified${NC}"

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "📦 Current version: ${GREEN}${CURRENT_VERSION}${NC}"

# Ask for version bump type
echo ""
echo "Select version bump type:"
echo "  1) patch (bug fixes: $CURRENT_VERSION -> $(npm version patch --no-git-tag-version --dry-run | tail -n 1))"
echo "  2) minor (new features: $CURRENT_VERSION -> $(npm version minor --no-git-tag-version --dry-run | tail -n 1))"
echo "  3) major (breaking changes: $CURRENT_VERSION -> $(npm version major --no-git-tag-version --dry-run | tail -n 1))"
echo "  4) custom version"
echo "  5) use current version (no bump)"
read -p "Enter choice [1-5]: " VERSION_CHOICE

case $VERSION_CHOICE in
    1)
        npm version patch --no-git-tag-version
        ;;
    2)
        npm version minor --no-git-tag-version
        ;;
    3)
        npm version major --no-git-tag-version
        ;;
    4)
        read -p "Enter version (e.g., 1.2.3): " CUSTOM_VERSION
        npm version $CUSTOM_VERSION --no-git-tag-version
        ;;
    5)
        echo "Using current version: $CURRENT_VERSION"
        ;;
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

NEW_VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}📦 Publishing version: ${NEW_VERSION}${NC}"

# Run tests
echo ""
echo "🧪 Running tests..."
npm run test || {
    echo -e "${RED}❌ Tests failed. Aborting publish.${NC}"
    exit 1
}
echo -e "${GREEN}✅ Tests passed${NC}"

# Type check
echo ""
echo "🔍 Running type check..."
npm run typecheck || {
    echo -e "${RED}❌ Type check failed. Aborting publish.${NC}"
    exit 1
}
echo -e "${GREEN}✅ Type check passed${NC}"

# Lint
echo ""
echo "📝 Running linter..."
npm run lint || {
    echo -e "${YELLOW}⚠️  Linting issues found. Continue anyway? (y/n)${NC}"
    read -p "" CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        exit 1
    fi
}
echo -e "${GREEN}✅ Linting complete${NC}"

# Build
echo ""
echo "🔨 Building package..."
npm run build || {
    echo -e "${RED}❌ Build failed. Aborting publish.${NC}"
    exit 1
}
echo -e "${GREEN}✅ Build successful${NC}"

# Check build output
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ dist/ directory not found after build${NC}"
    exit 1
fi

echo ""
echo "📦 Package contents:"
npm pack --dry-run

# Confirm publish
echo ""
echo -e "${YELLOW}⚠️  You are about to publish:${NC}"
echo -e "   Package: @ai-command-mgmt/mcp-server"
echo -e "   Version: ${GREEN}${NEW_VERSION}${NC}"
echo -e "   Registry: $(npm config get registry)"
read -p "Continue with publish? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ]; then
    echo "❌ Publish cancelled"
    exit 1
fi

# Publish to npm
echo ""
echo "📤 Publishing to npm..."
npm publish --access public || {
    echo -e "${RED}❌ Publish failed${NC}"
    exit 1
}

echo ""
echo -e "${GREEN}🎉 Successfully published @ai-command-mgmt/mcp-server@${NEW_VERSION}!${NC}"
echo ""
echo "Next steps:"
echo "  1. Commit and push version bump: git add package.json && git commit -m 'Bump version to ${NEW_VERSION}' && git push"
echo "  2. Create git tag: git tag v${NEW_VERSION} && git push --tags"
echo "  3. Update CHANGELOG.md with release notes"
echo "  4. Create GitHub release (optional)"
echo ""
echo "Installation command:"
echo -e "  ${GREEN}npm install @ai-command-mgmt/mcp-server@${NEW_VERSION}${NC}"
```

### Build Process
1. **Development**: `npm run dev` - Watch mode with hot reload
2. **Testing**: `npm run test` - Run test suite
3. **Building**: `npm run build` - Compile TypeScript to dist/
4. **Publishing**: `./publish.sh` - Interactive publish workflow

### NPM Package Configuration
- **Scope**: `@ai-command-mgmt` (organization scope)
- **Access**: Public
- **Registry**: npm public registry
- **Entry point**: `dist/index.js` (CommonJS)
- **Binary**: `ai-command-tool` command

## Testing Strategy

### Unit Tests (Target: 80%+ coverage)

#### Module 1: Configuration
- Load config from file
- Environment variable override
- Default values
- Validation errors
- Path existence checks

#### Module 2: Tool Handlers
- Input validation
- Response formatting
- Error handling
- Parameter defaults

#### Module 3: Search Engine
- Keyword extraction
- Scoring algorithms
- Result merging
- Deduplication
- Tier execution logic

#### Module 4: File Operations
- Command discovery
- Metadata extraction
- Report listing
- Date parsing
- Excerpt extraction
- Link generation

#### Module 5: Cache
- Set and get operations
- TTL expiration
- Size limits
- LRU eviction
- Pattern clearing

### Integration Tests

#### Search Integration
- End-to-end search flow
- Multi-tier execution
- Cache hit/miss scenarios
- Error handling

#### Command Operations
- List all commands
- Get specific command
- Handle missing commands

#### Report Operations
- Search all reports
- Command-filtered search
- List command reports
- Link generation

#### MCP Protocol
- Server initialization
- Tool registration
- Request/response cycle
- Error responses

### Performance Tests

#### Benchmarks
- List 1000 commands: < 500ms
- Search 1000 commands: < 2 seconds
- Search 5000 reports: < 3 seconds
- Cache operations: < 10ms per operation
- Memory usage: < 500MB under load

#### Load Testing
- 100 concurrent searches
- 1000 sequential command gets
- Cache effectiveness measurement

### Test Data
- 100 sample command files
- 500 sample report files
- Various filename patterns
- Edge cases (empty files, large files, special characters)

## Deployment

### Local Development Setup
```bash
# Clone repository
git clone https://github.com/yourusername/ai-command-tool-management
cd ai-command-tool-management

# Install dependencies
npm install

# Create config file
cp examples/.ai-command-tool.json .ai-command-tool.json

# Edit config with your paths
nano .ai-command-tool.json

# Run development server
npm run dev

# In another terminal, test with MCP client
# (Configure Cursor to use local server)
```

### Production Deployment

#### Step 1: Publish to NPM
```bash
# Run publish script
./publish.sh

# Select version bump
# Script will test, build, and publish
```

#### Step 2: Install on MCP Server Infrastructure
```bash
# On remote server (e.g., https://zct-dev.zoomdev.us)
npm install @ai-command-mgmt/mcp-server

# Create config file
mkdir -p /path/to/mcp/config
nano /path/to/mcp/config/.ai-command-tool.json

# Add configuration:
{
  "commands_directory": "/mnt/storage/Commands",
  "reports_directory": "/mnt/storage/Commands-Analyze-Report",
  "report_link_base_url": "https://reports.example.com",
  "cache_ttl_seconds": 3600
}

# Register with MCP infrastructure (infrastructure-specific)
# The infrastructure will:
# - Load our tool
# - Expose it at configured URL (e.g., /csp/acmt/sse)
# - Handle SSE transport
```

#### Step 3: Configure MCP Client (Cursor)
```json
// Add to Cursor's mcp.json
{
  "mcpServers": {
    "acmt": {
      "url": "https://zct-dev.zoomdev.us/csp/acmt/sse",
      "transport": "sse"
    }
  }
}
```

**Note**: 
- User configures the **remote server URL** in Cursor's mcp.json
- URL is provided by server infrastructure (where ACMT is deployed)
- No need to specify file paths in Cursor (paths are configured on the server)
- Transport is "sse" (Server-Sent Events)
- Server infrastructure must be running and accessible from user's network

#### Step 4: Verify Installation
```bash
# Tool is loaded by MCP infrastructure
# Check infrastructure logs to verify tool registration

# From Cursor, test tool availability:
# 1. Open Cursor
# 2. Check MCP connection status
# 3. Try invoking a tool (e.g., list_commands)
# 4. Verify response from server
```

### Environment-Specific Configuration

#### Development (Local Testing with stdio)
```json
{
  "commands_directory": "./tests/fixtures/Commands",
  "reports_directory": "./tests/fixtures/Reports",
  "report_link_base_url": "file://./tests/fixtures/Reports",
  "log_level": "debug",
  "enable_cache": false
}
```

#### Production (Remote Server with SSE)
```json
{
  "commands_directory": "/mnt/storage/Commands",
  "reports_directory": "/mnt/storage/Commands-Analyze-Report",
  "report_link_base_url": "https://reports.company.com",
  "cache_ttl_seconds": 3600,
  "log_level": "info",
  "enable_cache": true,
  "max_search_results": 20
}
```

**Note**: Transport configuration (SSE, stdio) is handled by MCP infrastructure, not our tool config.

## Monitoring & Maintenance

### Logging
- All operations logged to stderr (JSON format)
- Log levels: debug, info, warn, error
- Include duration metrics for performance monitoring
- Log file rotation (if writing to file)

### Metrics to Track
- Search query performance (p50, p95, p99)
- Cache hit rate
- File system operation latency
- Error rates by type
- Memory usage over time
- Number of commands/reports indexed

### Error Monitoring
- File system errors (permissions, not found)
- Search timeouts
- Configuration errors
- MCP protocol errors

### Maintenance Tasks
- Clear cache periodically (automatic via TTL)
- Update command index (automatic or manual trigger)
- Review and optimize slow queries
- Update dependencies monthly
- Review error logs weekly

## Risk Mitigation

### Risk 1: Slow File System Access
**Mitigation**:
- Implement aggressive caching
- Use metadata cache for listings
- Lazy-load full content
- Consider indexing service for very large deployments

### Risk 2: Search Performance Degradation
**Mitigation**:
- Implement search timeouts
- Cache frequent queries
- Optimize tier execution order
- Profile and optimize hot paths

### Risk 3: Configuration Errors
**Mitigation**:
- Comprehensive validation
- Clear error messages
- Example configuration files
- Startup checks for all paths

### Risk 4: MCP Protocol Changes
**Mitigation**:
- Pin MCP SDK version
- Thorough integration tests
- Monitor MCP SDK releases
- Version compatibility matrix

### Risk 5: Memory Leaks
**Mitigation**:
- Set cache size limits
- Implement LRU eviction
- Monitor memory usage
- Stress testing
- Cleanup on shutdown

## Success Metrics

### Launch Criteria (MVP)
- [ ] All 5 MCP tools implemented and tested
- [ ] Three-tier search working correctly
- [ ] npm package published successfully
- [ ] Documentation complete (README, examples)
- [ ] Test coverage > 80%
- [ ] Performance benchmarks met (see Success Criteria in spec.md)
- [ ] publish.sh script tested and working

### Post-Launch Metrics (First 30 Days)
- 50+ npm downloads
- 90% search success rate (user finds desired command in top 3 results)
- < 1% error rate
- Average search time < 1.5 seconds
- User feedback collected and reviewed

## Next Steps

After completing this plan:

1. **Create Tasks Breakdown** (`/speckit.tasks`)
   - Break each module into specific implementable tasks
   - Assign priorities and time estimates
   - Create dependency graph

2. **Setup Project Structure**
   - Initialize npm package
   - Create directory structure
   - Setup build tooling
   - Configure testing framework

3. **Implementation Phase**
   - Build modules in dependency order
   - Write tests alongside implementation
   - Regular integration testing
   - Code reviews

4. **Testing & Refinement**
   - Complete test suite
   - Performance optimization
   - Documentation review
   - Example creation

5. **Release Preparation**
   - Final QA pass
   - README completion
   - CHANGELOG creation
   - Version tagging

6. **Launch**
   - npm publish via publish.sh
   - Deployment to server
   - User documentation
   - Feedback collection

---

**Document Status**: Ready for Task Breakdown
**Next Phase**: Create task list (`/speckit.tasks`)

