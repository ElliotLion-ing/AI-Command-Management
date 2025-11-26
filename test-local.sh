#!/bin/bash

# AI Commands Management Tool - Local Testing Script
# For testing on your development machine

set -e

echo "🧪 AI Commands Management Tool - Local Testing"
echo "=============================================="

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR"

# Configuration
PORT="${PORT:-5090}"
CONFIG_FILE="/tmp/acmt-test-config.json"

echo -e "${BLUE}📋 Test Configuration${NC}"
echo "  Project Root: $PROJECT_ROOT"
echo "  Port: $PORT"
echo "  Config: $CONFIG_FILE"
echo ""

# Check if build exists
if [ ! -f "$PROJECT_ROOT/dist/index-sse.js" ]; then
    echo -e "${YELLOW}⚠️  Build not found, building now...${NC}"
    npm run build
fi

# Create test configuration
echo -e "${BLUE}⚙️  Creating test configuration...${NC}"
cat > "$CONFIG_FILE" << EOF
{
  "commands_directory": "$PROJECT_ROOT/Commands",
  "reports_directory": "$PROJECT_ROOT/Commands-Analyze-Report",
  "cache_ttl_seconds": 60,
  "cache_max_entries": 100,
  "max_search_results": 10,
  "search_timeout_ms": 5000,
  "enable_cache": true,
  "report_link_base_url": "file://$PROJECT_ROOT/Commands-Analyze-Report/",
  "log_level": "debug"
}
EOF

echo -e "${GREEN}✅ Configuration created${NC}"
cat "$CONFIG_FILE"
echo ""

# Check if Commands directory exists
if [ ! -d "$PROJECT_ROOT/Commands" ]; then
    echo -e "${YELLOW}⚠️  Commands directory not found!${NC}"
    echo "Creating fake directory for testing..."
    mkdir -p "$PROJECT_ROOT/Commands"
    echo "# Test Command" > "$PROJECT_ROOT/Commands/test-command.md"
    echo ""
    echo "This is a test command for local development."
    echo "" >> "$PROJECT_ROOT/Commands/test-command.md"
fi

if [ ! -d "$PROJECT_ROOT/Commands-Analyze-Report" ]; then
    echo -e "${YELLOW}⚠️  Commands-Analyze-Report directory not found!${NC}"
    echo "Creating fake directory for testing..."
    mkdir -p "$PROJECT_ROOT/Commands-Analyze-Report/test-command-reports"
    echo "# Test Report" > "$PROJECT_ROOT/Commands-Analyze-Report/test-command-reports/test-report.md"
    echo "" >> "$PROJECT_ROOT/Commands-Analyze-Report/test-command-reports/test-report.md"
    echo "This is a test report."
fi

# Test health endpoint function
test_health() {
    echo -e "${BLUE}🔍 Testing health endpoint...${NC}"
    sleep 2  # Wait for server to start
    
    HEALTH_RESPONSE=$(curl -s http://localhost:$PORT/health)
    
    if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
        echo -e "${GREEN}✅ Health check passed!${NC}"
        echo "Response: $HEALTH_RESPONSE"
        return 0
    else
        echo -e "${YELLOW}⚠️  Health check failed${NC}"
        echo "Response: $HEALTH_RESPONSE"
        return 1
    fi
}

# Start server
echo ""
echo -e "${GREEN}🚀 Starting MCP Server (SSE mode)...${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo ""
echo -e "${BLUE}📝 Cursor Configuration:${NC}"
echo ""
echo '  File: ~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/mcp.json'
echo ""
echo '  Content:'
echo '  {'
echo '    "mcpServers": {'
echo '      "ai-command-tool-local": {'
echo "        \"url\": \"http://localhost:$PORT/sse\","
echo '        "transport": "sse"'
echo '      }'
echo '    }'
echo '  }'
echo ""
echo -e "${BLUE}🔗 Endpoints:${NC}"
echo "  SSE:    http://localhost:$PORT/sse"
echo "  Health: http://localhost:$PORT/health"
echo ""
echo "=========================================="
echo ""

# Run health test in background
(test_health) &

# Start server
PORT="$PORT" CONFIG_PATH="$CONFIG_FILE" node "$PROJECT_ROOT/dist/index-sse.js"

