# 🧪 本地测试指南

## 快速开始

### 方法 1：自动化测试脚本（推荐）

运行完整的测试套件：

```bash
node test-mcp.js
```

这会自动测试所有 5 个工具：
1. ✅ list_commands - 列出所有命令
2. ✅ search_commands - 搜索命令
3. ✅ get_command - 获取命令详情
4. ✅ search_reports - 搜索报告
5. ✅ list_command_reports - 列出命令报告

### 方法 2：简单 Shell 测试

```bash
./test-simple.sh
```

### 方法 3：手动测试单个工具

#### 列出所有命令
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_commands","arguments":{}}}' | node dist/index.js
```

#### 搜索命令
```bash
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search_commands","arguments":{"query":"speech SDK log"}}}' | node dist/index.js
```

#### 获取命令详情
```bash
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_command","arguments":{"command_name":"analyze_zoom_speech_sdk_log"}}}' | node dist/index.js
```

#### 搜索报告
```bash
echo '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"search_reports","arguments":{"query":"decode_response"}}}' | node dist/index.js
```

#### 列出特定命令的报告
```bash
echo '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"list_command_reports","arguments":{"command_name":"analyze_zoom_speech_sdk_log"}}}' | node dist/index.js
```

## 配置说明

测试使用配置文件：`.ai-command-tool.json`

当前配置指向：
- **Commands**: `/Users/ElliotDing/SourceCode/MCP-Package-Deploy/AI-Command-Management/Commands`
- **Reports**: `/Users/ElliotDing/SourceCode/MCP-Package-Deploy/AI-Command-Management/Commands-Analyze-Report`

## 验证测试结果

### ✅ 成功的测试应该返回：

#### 1. list_commands
```json
{
  "commands": [
    {
      "name": "analyze_zoom_speech_sdk_log",
      "description": "...",
      "size": 32768,
      "last_modified": "2025-11-25T..."
    },
    {
      "name": "analyze_plist_avatar_logic_log",
      "description": "...",
      "size": 12288,
      "last_modified": "2025-11-25T..."
    }
  ],
  "total": 2,
  "page": 1,
  "page_size": 50
}
```

#### 2. search_commands
```json
{
  "results": [
    {
      "name": "analyze_zoom_speech_sdk_log",
      "relevance_score": 100,
      "match_tier": 1,
      "match_reason": "Filename matches all keywords: speech, sdk, log"
    }
  ]
}
```

#### 3. get_command
```json
{
  "name": "analyze_zoom_speech_sdk_log",
  "content": "# Analyze Zoom Speech SDK Log\n\n...(完整内容)",
  "metadata": {
    "path": "/Users/.../Commands/analyze_zoom_speech_sdk_log.md",
    "size": 32768,
    "last_modified": "...",
    "description": "..."
  }
}
```

### ❌ 如果出现错误

#### 错误 1: 配置文件未找到
```
Invalid configuration: commands_directory does not exist
```
**解决**: 检查 `.ai-command-tool.json` 中的路径是否正确

#### 错误 2: 命令未找到
```
{
  "error": {
    "code": "COMMAND_NOT_FOUND",
    "message": "Command not found: xxx"
  }
}
```
**解决**: 确认命令文件存在于 Commands/ 目录

#### 错误 3: 编译错误
```
Cannot find module 'dist/index.js'
```
**解决**: 运行 `npm run build`

## 测试三层搜索

### Tier 1: 文件名匹配
```bash
# 应该匹配 analyze_zoom_speech_sdk_log.md
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_commands","arguments":{"query":"speech SDK"}}}' | node dist/index.js
```

### Tier 2: 内容匹配
```bash
# 搜索描述中的内容
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search_commands","arguments":{"query":"troubleshoot integration"}}}' | node dist/index.js
```

### Tier 3: 报告匹配
```bash
# 搜索报告中提到的问题
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"search_commands","arguments":{"query":"decode_response error"}}}' | node dist/index.js
```

## 性能测试

### 搜索性能
```bash
# 应该在 2 秒内完成
time echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_commands","arguments":{"query":"test"}}}' | node dist/index.js
```

### 预期结果
- ⚡ 搜索时间: < 2 秒
- 💾 内存使用: < 100MB
- ✅ 无错误日志

## 调试模式

查看详细日志：
```bash
# 日志输出到 stderr，可以查看调试信息
node dist/index.js 2>&1 | tee test.log
```

然后在另一个终端发送请求：
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_commands","arguments":{}}}' | nc localhost <port>
```

## 下一步

测试成功后，可以：
1. ✅ 部署到远程服务器
2. ✅ 在 Cursor 中配置 MCP 连接
3. ✅ 发布到 npm: `./publish.sh`

## 问题排查

| 问题 | 解决方案 |
|------|---------|
| 找不到命令 | 检查 Commands/ 目录和文件名 |
| 搜索无结果 | 确认搜索词与文件名/内容匹配 |
| 报告未找到 | 检查 Commands-Analyze-Report/ 目录结构 |
| 编译失败 | 运行 `npm install` 重新安装依赖 |
| 性能慢 | 启用缓存: `enable_cache: true` |

