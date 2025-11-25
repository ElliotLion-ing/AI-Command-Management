# Task Breakdown: MCP Command Tool Management

**Feature ID**: 1-mcp-command-tool
**Created**: 2025-11-25
**Status**: Ready for Implementation
**Version**: 0.0.1
**Estimated Total Time**: 40-50 hours

## Task Categories
- 🏗️ Setup & Infrastructure
- 🔧 Core Implementation
- 🧪 Testing
- 📦 Packaging & Deployment
- 📚 Documentation

---

## Phase 1: Project Setup & Infrastructure (4-6 hours)

### Task 1.1: Initialize npm Package
**Priority**: P0
**Estimated Time**: 1 hour
**Dependencies**: None

**Subtasks**:
- [ ] Create project directory structure
- [ ] Initialize package.json with all dependencies
- [ ] Setup TypeScript configuration (tsconfig.json)
- [ ] Install dependencies (@modelcontextprotocol/sdk, fuse.js, marked, etc.)
- [ ] Verify Node.js version compatibility
- [ ] Understand MCP SDK transport handling (SSE, stdio)
- [ ] Note: No Express needed - MCP SDK handles all transport

**Acceptance Criteria**:
- `npm install` runs successfully
- `tsc --version` shows TypeScript 5.0+
- All directories created as per plan.md structure

**Files to Create**:
- `package.json`
- `tsconfig.json`
- `src/` directory tree

---

### Task 1.2: Setup Build & Testing Infrastructure
**Priority**: P0
**Estimated Time**: 2 hours
**Dependencies**: Task 1.1

**Subtasks**:
- [ ] Configure tsup for building (tsup.config.ts or package.json scripts)
- [ ] Setup Vitest (vitest.config.ts)
- [ ] Create test directory structure (unit/, integration/, fixtures/)
- [ ] Setup code coverage configuration
- [ ] Configure ESLint and TypeScript linting
- [ ] Create test fixtures (sample commands and reports)

**Acceptance Criteria**:
- `npm run build` successfully compiles TypeScript
- `npm run test` runs (even with no tests yet)
- `npm run lint` checks code style
- Coverage reports generate in correct format

**Files to Create**:
- `vitest.config.ts`
- `.eslintrc.js`
- `tests/setup.ts`
- `tests/fixtures/Commands/*.md` (sample files)
- `tests/fixtures/Commands-Analyze-Report/*/` (sample files)

---

### Task 1.3: Create TypeScript Type Definitions
**Priority**: P0
**Estimated Time**: 1 hour
**Dependencies**: Task 1.1

**Subtasks**:
- [ ] Define `ConfigSchema` interface
- [ ] Define `CommandMetadata` and `Command` interfaces
- [ ] Define `ReportMetadata` and `ReportMatch` interfaces
- [ ] Define `SearchResult` interface
- [ ] Define MCP tool parameter and response types
- [ ] Export all types from `src/types/index.ts`

**Acceptance Criteria**:
- All interfaces documented with TSDoc comments
- Types are exported and importable
- No TypeScript errors in types file

**Files to Create**:
- `src/types/index.ts`

---

## Phase 2: Core Modules Implementation (18-24 hours)

### Task 2.1: Configuration Management
**Priority**: P0
**Estimated Time**: 3 hours
**Dependencies**: Task 1.3

**Subtasks**:
- [ ] Implement config file loading (cosmiconfig)
- [ ] Implement environment variable parsing
- [ ] Implement validation logic for all config fields
- [ ] Implement default value fallbacks
- [ ] Implement path existence checks
- [ ] Export singleton Config instance
- [ ] Write unit tests (8+ test cases)

**Test Cases**:
- Load valid config file
- Environment variables override config file
- Missing config file uses defaults
- Invalid paths throw appropriate errors
- Invalid values (negative timeouts, etc.) are rejected
- URL validation works correctly
- Config singleton is reusable

**Acceptance Criteria**:
- All subtasks completed
- Unit tests pass with >90% coverage
- Config loads in under 100ms
- Clear error messages for validation failures

**Files to Create**:
- `src/config/index.ts`
- `tests/unit/config.test.ts`

---

### Task 2.2: Logging Utility
**Priority**: P1
**Estimated Time**: 2 hours
**Dependencies**: Task 2.1

**Subtasks**:
- [ ] Implement Logger class with debug/info/warn/error methods
- [ ] Implement JSON log formatting
- [ ] Implement log level filtering based on config
- [ ] Ensure logs go to stderr (not stdout)
- [ ] Add timestamp and metadata support
- [ ] Write unit tests (6+ test cases)

**Test Cases**:
- Logs formatted as JSON
- Log level filtering works
- Metadata included correctly
- Logs output to stderr only
- Timestamps in ISO format

**Acceptance Criteria**:
- All methods implemented
- Tests pass with >85% coverage
- Logs don't interfere with MCP protocol (stdout)

**Files to Create**:
- `src/utils/logger.ts`
- `tests/unit/logger.test.ts`

---

### Task 2.3: Validation Utilities
**Priority**: P1
**Estimated Time**: 2 hours
**Dependencies**: Task 1.3

**Subtasks**:
- [ ] Implement `validateCommandName()`
- [ ] Implement `validateQuery()`
- [ ] Implement `validatePath()`
- [ ] Implement `sanitizePath()` (prevent directory traversal)
- [ ] Write unit tests (10+ test cases)

**Test Cases**:
- Valid command names accepted
- Invalid characters rejected
- Query length limits enforced
- Directory traversal attempts blocked (..)
- Path sanitization works correctly
- Edge cases (empty, null, special characters)

**Acceptance Criteria**:
- All validators implemented
- Security tests pass (no directory traversal)
- Tests cover edge cases
- >90% coverage

**Files to Create**:
- `src/utils/validators.ts`
- `tests/unit/validators.test.ts`

---

### Task 2.4: Error Handling
**Priority**: P1
**Estimated Time**: 1.5 hours
**Dependencies**: Task 1.3

**Subtasks**:
- [ ] Define custom error classes (CommandNotFoundError, SearchTimeoutError, etc.)
- [ ] Implement `handleError()` function for MCP error conversion
- [ ] Add error codes and human-readable messages
- [ ] Write unit tests (5+ test cases)

**Test Cases**:
- Each error class instantiates correctly
- Error conversion produces MCP-compatible format
- Error codes are unique and descriptive
- Messages are clear and actionable

**Acceptance Criteria**:
- All error classes defined
- handleError() returns proper MCP error format
- Tests pass

**Files to Create**:
- `src/utils/errors.ts`
- `tests/unit/errors.test.ts`

---

### Task 2.5: Cache Implementation
**Priority**: P1
**Estimated Time**: 3 hours
**Dependencies**: Task 1.3, Task 2.1

**Subtasks**:
- [ ] Implement Cache class with Map storage
- [ ] Implement TTL tracking
- [ ] Implement size limits and LRU eviction
- [ ] Implement pattern-based clearing (RegExp)
- [ ] Implement automatic cleanup of expired entries
- [ ] Write unit tests (12+ test cases)

**Test Cases**:
- Set and get operations
- TTL expiration works correctly
- Size limit enforced
- LRU eviction when cache full
- Pattern clearing works
- clear() and has() methods
- Performance: 10,000 operations in <10ms

**Acceptance Criteria**:
- All cache operations implemented
- TTL and LRU work correctly
- Performance benchmark met
- Tests pass with >85% coverage

**Files to Create**:
- `src/cache/index.ts`
- `tests/unit/cache.test.ts`
- `tests/performance/cache-perf.test.ts`

---

### Task 2.6: Command Loader
**Priority**: P0
**Estimated Time**: 4 hours
**Dependencies**: Task 2.1, Task 2.3, Task 2.5

**Subtasks**:
- [ ] Implement `listAll()` method
- [ ] Implement `getCommand()` method
- [ ] Implement `getMetadata()` method
- [ ] Integrate caching for metadata and content
- [ ] Implement Markdown parsing for descriptions
- [ ] Handle file system errors gracefully
- [ ] Write unit tests (10+ test cases)
- [ ] Write integration tests (5+ test cases)

**Test Cases**:
- List all commands from fixture directory
- Get specific command by name
- Get metadata without loading full content
- Cache hit/miss scenarios
- Handle missing files
- Handle permission errors
- Description extraction from Markdown
- Performance: List 100 commands in <100ms

**Acceptance Criteria**:
- All methods implemented
- Caching reduces repeated reads
- Error handling is clear
- Integration tests pass with real files
- Performance benchmarks met

**Files to Create**:
- `src/commands/loader.ts`
- `tests/unit/commands/loader.test.ts`
- `tests/integration/commands/loader.test.ts`

---

### Task 2.7: Report Finder
**Priority**: P0
**Estimated Time**: 4 hours
**Dependencies**: Task 2.1, Task 2.3

**Subtasks**:
- [ ] Implement `search()` method (global and filtered)
- [ ] Implement `listForCommand()` method
- [ ] Implement date extraction from filenames
- [ ] Implement excerpt extraction
- [ ] Handle nested directory structure
- [ ] Write unit tests (10+ test cases)
- [ ] Write integration tests (5+ test cases)

**Test Cases**:
- Search all reports for query
- Filter search by command name
- List reports for specific command
- Date extraction from various filename patterns
- Excerpt extraction with context
- Handle reports with no date in filename
- Handle empty directories
- Performance: Search 500 reports in <3 seconds

**Acceptance Criteria**:
- All methods implemented
- Date extraction handles multiple patterns
- Excerpts show context around matches
- Tests pass
- Performance benchmarks met

**Files to Create**:
- `src/reports/finder.ts`
- `tests/unit/reports/finder.test.ts`
- `tests/integration/reports/finder.test.ts`

---

### Task 2.8: Report Linker
**Priority**: P1
**Estimated Time**: 1.5 hours
**Dependencies**: Task 2.1

**Subtasks**:
- [ ] Implement `generateLink()` method
- [ ] Handle path relativization
- [ ] Implement URL encoding
- [ ] Implement fallback to file:// URLs
- [ ] Write unit tests (8+ test cases)

**Test Cases**:
- Generate link with base URL from config
- Proper URL encoding of special characters
- Relative path calculation
- Fallback to file:// when base URL not configured
- Handle Windows paths
- Handle spaces and special characters in filenames

**Acceptance Criteria**:
- Links are properly formatted and encoded
- Fallback works
- Tests pass
- Cross-platform compatibility (Unix/Windows)

**Files to Create**:
- `src/reports/linker.ts`
- `tests/unit/reports/linker.test.ts`

---

### Task 2.9: Search Engine - Tier 1 (Filename)
**Priority**: P0
**Estimated Time**: 2.5 hours
**Dependencies**: Task 2.6

**Subtasks**:
- [ ] Implement keyword extraction from query
- [ ] Implement filename matching algorithm
- [ ] Implement scoring logic
- [ ] Remove stop words from keywords
- [ ] Write unit tests (8+ test cases)

**Test Cases**:
- Keyword extraction (split, lowercase)
- Stop word removal
- Exact filename match scores 100
- Partial matches scored correctly
- No match returns empty results
- Case-insensitive matching
- Special characters handled

**Acceptance Criteria**:
- Scoring algorithm is consistent and logical
- Tests pass with >85% coverage
- Performance: Search 1000 filenames in <200ms

**Files to Create**:
- `src/search/tier1-filename.ts`
- `tests/unit/search/tier1-filename.test.ts`

---

### Task 2.10: Search Engine - Tier 2 (Content)
**Priority**: P0
**Estimated Time**: 3 hours
**Dependencies**: Task 2.6

**Subtasks**:
- [ ] Integrate fuse.js library
- [ ] Configure fuse.js options (keys, threshold, etc.)
- [ ] Implement content search logic
- [ ] Convert fuse.js scores to 0-100 scale
- [ ] Index command content for search
- [ ] Write unit tests (6+ test cases)
- [ ] Write integration tests (3+ test cases)

**Test Cases**:
- Fuzzy matching works
- Semantic relevance scoring
- Score conversion to 0-100 scale
- Search description and full content
- Performance: Search 1000 command contents in <1.5 seconds

**Acceptance Criteria**:
- fuse.js integrated correctly
- Fuzzy search finds relevant commands
- Scoring is intuitive
- Performance benchmarks met
- Tests pass

**Files to Create**:
- `src/search/tier2-content.ts`
- `tests/unit/search/tier2-content.test.ts`
- `tests/integration/search/tier2-content.test.ts`

---

### Task 2.11: Search Engine - Tier 3 (Reports)
**Priority**: P0
**Estimated Time**: 3 hours
**Dependencies**: Task 2.7

**Subtasks**:
- [ ] Implement report search logic
- [ ] Implement command extraction from report paths
- [ ] Implement scoring with recency bonus
- [ ] Implement aggregation by command name
- [ ] Write unit tests (8+ test cases)
- [ ] Write integration tests (3+ test cases)

**Test Cases**:
- Search reports and identify commands
- Command name extraction from directory structure
- Recency bonus calculation
- Aggregation by command (multiple reports → one command result)
- Performance: Search 5000 reports in <3 seconds

**Acceptance Criteria**:
- Command discovery from reports works
- Scoring includes match count and recency
- Aggregation is correct
- Performance benchmarks met
- Tests pass

**Files to Create**:
- `src/search/tier3-reports.ts`
- `tests/unit/search/tier3-reports.test.ts`
- `tests/integration/search/tier3-reports.test.ts`

---

### Task 2.12: Search Engine Orchestrator
**Priority**: P0
**Estimated Time**: 3 hours
**Dependencies**: Task 2.9, Task 2.10, Task 2.11, Task 2.5

**Subtasks**:
- [ ] Implement SearchEngine class
- [ ] Implement tier execution logic (1 → 2 → 3)
- [ ] Implement result merging and deduplication
- [ ] Implement re-ranking of combined results
- [ ] Implement search result caching
- [ ] Handle search timeouts
- [ ] Write unit tests (10+ test cases)
- [ ] Write integration tests (5+ test cases)

**Test Cases**:
- Tier 1 returns sufficient results → stop
- Tier 1 insufficient → execute Tier 2
- Tier 1+2 insufficient → execute Tier 3
- Result deduplication works
- Re-ranking preserves relevance
- Search timeout handled gracefully
- Cache speeds up repeat searches
- Performance: Full search completes in <2 seconds

**Acceptance Criteria**:
- All tiers execute in correct order
- Deduplication and ranking work
- Timeout handling prevents hangs
- Performance benchmarks met
- Tests pass with >80% coverage

**Files to Create**:
- `src/search/index.ts`
- `tests/unit/search/index.test.ts`
- `tests/integration/search/index.test.ts`

---

### Task 2.13: MCP Tool Handlers
**Priority**: P0
**Estimated Time**: 4 hours
**Dependencies**: Task 2.6, Task 2.7, Task 2.8, Task 2.12, Task 2.4

**Subtasks**:
- [ ] Implement `SearchCommandsHandler` (search_commands tool)
- [ ] Implement `GetCommandHandler` (get_command tool)
- [ ] Implement `ListCommandsHandler` (list_commands tool)
- [ ] Implement `SearchReportsHandler` (search_reports tool)
- [ ] Implement `ListCommandReportsHandler` (list_command_reports tool)
- [ ] Implement input validation for all handlers
- [ ] Implement error handling and MCP error formatting
- [ ] Write unit tests (15+ test cases)
- [ ] Write integration tests (5+ test cases)

**Test Cases** (per handler):
- Valid input returns expected format
- Invalid input returns MCP error
- Handles empty results gracefully
- Pagination works (list_commands)
- Filtering works (search_reports with command_filter)
- Response format matches MCP spec

**Acceptance Criteria**:
- All 5 tools implemented
- Input validation prevents bad data
- Error responses are MCP-compatible
- Tests pass for all handlers
- Integration tests verify end-to-end flow

**Files to Create**:
- `src/tools/search-commands.ts`
- `src/tools/get-command.ts`
- `src/tools/list-commands.ts`
- `src/tools/search-reports.ts`
- `src/tools/list-command-reports.ts`
- `tests/unit/tools/*.test.ts` (5 files)
- `tests/integration/tools/all-tools.test.ts`

---

### Task 2.14: MCP Server Core
**Priority**: P0
**Estimated Time**: 3 hours
**Dependencies**: Task 2.13, Task 2.1, Task 2.2

**Subtasks**:
- [ ] Implement main entry point (src/index.ts)
- [ ] Initialize MCP Server from SDK
- [ ] Register all 5 tool handlers
- [ ] Let MCP SDK handle transport (no manual HTTP/SSE setup needed)
- [ ] Load configuration on startup
- [ ] Setup logging
- [ ] Implement graceful shutdown (SIGINT/SIGTERM)
- [ ] Export tool for MCP infrastructure to load
- [ ] Write integration tests (5+ test cases)
- [ ] Test with MCP SDK's stdio transport (for local dev)

**Test Cases**:
- Server initializes successfully
- All tools are registered with MCP SDK
- MCP handshake works (stdio transport for testing)
- Tool invocation works end-to-end
- Graceful shutdown on SIGINT/SIGTERM
- Invalid config prevents startup with clear error
- Tool can be loaded by MCP infrastructure

**Acceptance Criteria**:
- Tool initializes and registers with MCP SDK successfully
- All tools callable via MCP protocol
- Integration tests pass with stdio transport
- Tool can be deployed to MCP server infrastructure
- MCP SDK handles SSE transport in production (we don't manage it)
- Tool is transport-agnostic (works with any MCP transport)

**Files to Create**:
- `src/index.ts`
- `tests/integration/server.test.ts`

---

## Phase 3: Testing & Quality Assurance (8-10 hours)

### Task 3.1: Complete Unit Test Suite
**Priority**: P0
**Estimated Time**: 4 hours
**Dependencies**: All Phase 2 tasks

**Subtasks**:
- [ ] Review coverage report
- [ ] Write additional tests for uncovered branches
- [ ] Achieve >80% code coverage
- [ ] Fix any failing tests
- [ ] Add edge case tests

**Acceptance Criteria**:
- Overall coverage >80%
- All modules have >70% coverage minimum
- No skipped or commented-out tests
- `npm run test` passes all tests

**Files to Update**:
- Various test files

---

### Task 3.2: Integration Testing
**Priority**: P0
**Estimated Time**: 3 hours
**Dependencies**: Task 2.14

**Subtasks**:
- [ ] Test full MCP protocol flow
- [ ] Test all tools with real fixture data
- [ ] Test error scenarios (missing files, invalid config, etc.)
- [ ] Test concurrent tool invocations
- [ ] Test with large datasets (1000 commands, 5000 reports)

**Acceptance Criteria**:
- All integration tests pass
- Real-world scenarios covered
- Performance tests meet benchmarks

**Files to Create/Update**:
- `tests/integration/*.test.ts`

---

### Task 3.3: Performance Testing & Optimization
**Priority**: P1
**Estimated Time**: 3 hours
**Dependencies**: Task 2.14, Task 3.2

**Subtasks**:
- [ ] Run performance benchmarks
- [ ] Profile slow operations
- [ ] Optimize identified bottlenecks
- [ ] Verify cache effectiveness
- [ ] Load test with 100 concurrent searches
- [ ] Document performance results

**Performance Targets**:
- List 1000 commands: <500ms
- Search 1000 commands: <2 seconds
- Search 5000 reports: <3 seconds
- Cache operations: <10ms
- Memory usage: <500MB under load

**Acceptance Criteria**:
- All performance benchmarks met
- No memory leaks detected
- Optimizations documented

**Files to Create**:
- `tests/performance/*.test.ts`
- `docs/performance.md`

---

## Phase 4: Packaging & Deployment (4-6 hours)

### Task 4.1: Create publish.sh Script
**Priority**: P0
**Estimated Time**: 2 hours
**Dependencies**: Task 2.14

**Subtasks**:
- [ ] Write bash script with version selection
- [ ] Add npm authentication check
- [ ] Add test, lint, and build steps
- [ ] Add dry-run preview of package contents
- [ ] Add confirmation prompts
- [ ] Add success message with next steps
- [ ] Make script executable
- [ ] Test script in dry-run mode

**Acceptance Criteria**:
- Script runs without errors
- All validation steps work
- Dry-run shows correct package contents
- Script is well-commented

**Files to Create**:
- `publish.sh`

---

### Task 4.2: Create README.md
**Priority**: P0
**Estimated Time**: 2 hours
**Dependencies**: Task 2.14

**Subtasks**:
- [ ] Write overview and purpose
- [ ] Document installation instructions
- [ ] Document configuration options
- [ ] Provide usage examples
- [ ] Document all 5 MCP tools with examples
- [ ] Add troubleshooting section
- [ ] Add development instructions
- [ ] Add license and contribution guidelines

**Acceptance Criteria**:
- README is comprehensive and clear
- All code examples are tested and work
- Installation steps are accurate
- Configuration options documented

**Files to Create**:
- `README.md`

---

### Task 4.3: Create Example Configuration
**Priority**: P1
**Estimated Time**: 0.5 hours
**Dependencies**: Task 2.1

**Subtasks**:
- [ ] Create example config file
- [ ] Document all configuration fields with comments
- [ ] Provide multiple examples (dev, prod)
- [ ] Create example directory structure

**Acceptance Criteria**:
- Example config is valid and well-documented
- Users can copy and customize easily

**Files to Create**:
- `examples/.ai-command-tool.json`
- `examples/README.md`

---

### Task 4.4: Prepare for NPM Publish
**Priority**: P0
**Estimated Time**: 1 hour
**Dependencies**: Task 4.1, Task 4.2

**Subtasks**:
- [ ] Verify package.json metadata (name, description, keywords, etc.)
- [ ] Add LICENSE file (MIT)
- [ ] Create CHANGELOG.md
- [ ] Verify `files` field in package.json
- [ ] Test `npm pack` to preview package
- [ ] Verify `prepublishOnly` script works

**Acceptance Criteria**:
- `npm pack` produces correct package
- Only necessary files included (dist/, README, LICENSE)
- Metadata is accurate and professional

**Files to Create**:
- `LICENSE`
- `CHANGELOG.md`

**Files to Update**:
- `package.json`

---

### Task 4.5: Test Installation & Usage
**Priority**: P0
**Estimated Time**: 1.5 hours
**Dependencies**: Task 4.4

**Subtasks**:
- [ ] Test local installation (`npm install .`)
- [ ] Test tool loading by MCP SDK
- [ ] Test with sample config and data
- [ ] Test integration with MCP client (stdio mode)
- [ ] Verify tool can be deployed to MCP infrastructure
- [ ] Document deployment process
- [ ] Document any issues and fix

**Acceptance Criteria**:
- Installation works without errors
- Tool loads successfully in MCP SDK
- MCP client can connect and use tools
- All tools work end-to-end
- Ready for deployment to production MCP infrastructure

**Manual Testing**:
- Install package locally
- Load tool in MCP SDK (stdio mode)
- Create test config
- Use MCP client to invoke each tool
- Verify responses
- Document deployment to remote server (SSE mode)

---

## Phase 5: Documentation & Release (2-3 hours)

### Task 5.1: Write Additional Documentation
**Priority**: P1
**Estimated Time**: 1.5 hours
**Dependencies**: Task 4.2

**Subtasks**:
- [ ] Create architecture documentation
- [ ] Document API/tool interfaces
- [ ] Write troubleshooting guide
- [ ] Document configuration options in detail
- [ ] Add migration guide (if applicable)

**Acceptance Criteria**:
- Documentation is clear and comprehensive
- Examples are tested and accurate

**Files to Create**:
- `docs/architecture.md`
- `docs/api.md`
- `docs/troubleshooting.md`
- `docs/configuration.md`

---

### Task 5.2: Final QA & Release
**Priority**: P0
**Estimated Time**: 1.5 hours
**Dependencies**: All previous tasks

**Subtasks**:
- [ ] Run full test suite one final time
- [ ] Perform manual QA testing
- [ ] Review all documentation
- [ ] Update version to 0.0.1
- [ ] Run `publish.sh` script
- [ ] Verify package on npm
- [ ] Create git tag
- [ ] Push to repository
- [ ] Announce release

**Acceptance Criteria**:
- All tests pass
- Package published successfully to npm
- Installation from npm works
- Git tag created and pushed

**Commands**:
```bash
npm run test
npm run build
./publish.sh
# Select version: 0.0.1
# Confirm publish
git tag v0.0.1
git push --tags
```

---

## Summary

### Total Tasks: 29
- Phase 1 (Setup): 3 tasks
- Phase 2 (Implementation): 14 tasks
- Phase 3 (Testing): 3 tasks
- Phase 4 (Packaging): 5 tasks
- Phase 5 (Documentation): 4 tasks

### Estimated Total Time: 40-50 hours

### Critical Path
1. Task 1.1 → 1.2 → 1.3 (Setup)
2. Task 2.1 → 2.6 → 2.9 → 2.10 → 2.11 → 2.12 (Search pipeline)
3. Task 2.13 → 2.14 (MCP server)
4. Task 3.1 → 3.2 → 3.3 (Testing)
5. Task 4.1 → 4.2 → 4.4 → 4.5 (Packaging)
6. Task 5.2 (Release)

### Priority Breakdown
- **P0 (Critical)**: 20 tasks - Must be completed for MVP
- **P1 (High)**: 9 tasks - Important for quality and usability

### Recommended Implementation Order
1. **Week 1**: Phase 1 + Core utilities (Tasks 1.1-1.3, 2.1-2.5)
2. **Week 2**: File operations & search (Tasks 2.6-2.12)
3. **Week 3**: MCP integration & testing (Tasks 2.13-2.14, 3.1-3.3)
4. **Week 4**: Packaging & release (Tasks 4.1-4.5, 5.1-5.2)

---

## Next Steps

**✅ You are here**: Tasks breakdown complete
**⏭️ Next**: Obtain user approval before proceeding to implementation

**User should review**:
- Task breakdown completeness
- Time estimates
- Priority assignments
- Implementation order

**After approval**, proceed with `/speckit.implement` to begin implementation.

---

**Document Status**: ⚠️ **WAITING FOR USER APPROVAL**
**DO NOT PROCEED TO IMPLEMENTATION WITHOUT EXPLICIT USER CONFIRMATION**

