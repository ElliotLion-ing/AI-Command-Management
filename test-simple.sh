#!/bin/bash

# 简单的 MCP 工具测试脚本
# 使用 stdio 模式与 MCP 服务器交互

echo "🚀 启动 MCP 服务器测试"
echo "======================================"
echo ""

# 1. 列出所有命令
echo "📋 测试 1: 列出所有命令"
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_commands","arguments":{"page":1,"page_size":10}}}' | node dist/index.js 2>&1 | grep -v "timestamp"

echo ""
echo "---"
echo ""

# 2. 搜索命令
echo "🔍 测试 2: 搜索命令 'speech SDK'"
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search_commands","arguments":{"query":"speech SDK","max_results":5}}}' | node dist/index.js 2>&1 | grep -v "timestamp"

echo ""
echo "---"
echo ""

# 3. 获取特定命令
echo "📄 测试 3: 获取命令详情"
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_command","arguments":{"command_name":"analyze_zoom_speech_sdk_log"}}}' | node dist/index.js 2>&1 | grep -v "timestamp"

echo ""
echo "---"
echo ""

# 4. 搜索报告
echo "📊 测试 4: 搜索报告 'decode'"
echo '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"search_reports","arguments":{"query":"decode","max_results":5}}}' | node dist/index.js 2>&1 | grep -v "timestamp"

echo ""
echo "======================================"
echo "✅ 测试完成！"

