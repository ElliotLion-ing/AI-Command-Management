# AI Command Tool Management (ACMT)

> **用于智能命令发现和执行的 MCP 服务器**

[![npm version](https://img.shields.io/npm/v/@elliotding/ai-command-tool-mcp.svg)](https://www.npmjs.com/package/@elliotding/ai-command-tool-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

ACMT 是一个模型上下文协议 (MCP) 服务器，提供命令定义的智能搜索和管理。它支持 **stdio**（本地/SSH）和 **SSE**（远程 HTTP）两种传输模式，使用户能够发现和执行命令，而无需将命令复制到本地工作区。

---

## 📖 目录

- [功能特性](#-功能特性)
- [快速开始](#-快速开始)
- [安装](#-安装)
- [运行模式](#-运行模式)
- [配置](#-配置)
- [使用示例](#-使用示例)
- [命令组织](#-命令组织)
- [可用工具](#-可用工具)
- [部署](#-部署)
- [测试](#-测试)
- [开发](#-开发)
- [故障排除](#-故障排除)
- [贡献](#-贡献)

---

## ✨ 功能特性

- **🔀 双传输模式**
  - **stdio**：用于本地开发和 SSH 远程访问的标准 I/O
  - **SSE**：带心跳机制的服务器推送事件，实现稳定的长连接 🆕
  
- **🔍 三层智能搜索**
  - 第一层：文件名关键词匹配
  - 第二层：支持 frontmatter 的命令内容语义搜索 🆕
  - 第三层：通过历史分析报告发现
  
- **📁 智能命令管理**
  - 命令存储在远程服务器
  - 依赖过滤 - 隐藏辅助命令，仅显示主命令 🆕
  - 支持 Frontmatter 元数据进行命令组织 🆕
  - 无本地文件混乱
  - 集中版本控制

- **📊 报告发现与管理**
  - 跨历史分析报告搜索
  - 命令特定的报告过滤
  - 用户控制的报告上传（上传前询问）🆕
  - 自动日期提取和排序
  - 冲突时自动版本控制 🆕

- **⚡ 高性能**
  - 智能缓存系统（可配置 TTL）
  - 搜索优化与超时控制
  - 带心跳机制的 SSE 连接稳定性 🆕
  - 可配置的限制和阈值

- **🔒 安全性**
  - 路径验证和清理
  - 目录遍历防护
  - 所有查询的输入验证
  - SystemD 服务隔离（生产模式）
  - 报告大小限制和权限控制 🆕

---

## 🚀 快速开始

### 安装

```bash
npm install -g @elliotding/ai-command-tool-mcp@latest
```

### 本地测试（stdio 模式）

```bash
# 1. 创建配置
cat > /tmp/test-config.json << 'EOF'
{
  "commands_directory": "./Commands",
  "reports_directory": "./Commands-Analyze-Report"
}
EOF

# 2. 运行
CONFIG_PATH=/tmp/test-config.json ai-command-tool
```

### 本地测试（SSE 模式）

```bash
# 1. 运行测试脚本
./test-local.sh

# 2. 配置 Cursor（查看输出说明）

# 3. 在 Cursor 中测试
@ai-command-tool-local list commands
```

---

## 📦 安装

### 前置要求

- Node.js >= 18.0.0
- npm

### 全局安装（推荐）

```bash
npm install -g @elliotding/ai-command-tool-mcp@latest
```

这会安装**一个包**，包含**两个命令**：
- `ai-command-tool` - stdio 模式（本地/SSH）
- `ai-command-tool-server` - SSE 模式（HTTP 服务器）

### 本地开发

```bash
git clone https://github.com/ElliotLion-ing/AI-Command-Management.git
cd AI-Command-Management
npm install
npm run build
npm link
```

---

## 🔀 运行模式

ACMT 支持两种传输模式。根据需求选择：

| 模式 | 命令 | 传输方式 | 使用场景 | 设置复杂度 |
|------|------|---------|---------|----------|
| **stdio** | `ai-command-tool` | 标准 I/O | 本地开发、SSH 远程 | ⭐ 简单 |
| **SSE** | `ai-command-tool-server` | HTTP/SSE | 生产服务器、多用户 | ⭐⭐⭐ 高级 |

### 模式 1：stdio（简单、安全）

**适用于**：开发、个人使用、SSH 访问

**优点**：
- ✅ 无需端口配置
- ✅ 通过 SSH 加密
- ✅ 设置简单
- ✅ 无需防火墙更改

**缺点**：
- ❌ 每个请求新进程（较慢）
- ❌ 需要 SSH 访问（远程）

**Cursor 配置**（本地）：
```json
{
  "mcpServers": {
    "ai-command-tool": {
      "command": "ai-command-tool",
      "env": {
        "CONFIG_PATH": "/path/to/config.json"
      }
    }
  }
}
```

**Cursor 配置**（SSH 远程）：
```json
{
  "mcpServers": {
    "ai-command-tool": {
      "command": "ssh",
      "args": [
        "user@server.com",
        "CONFIG_PATH=/opt/acmt/.ai-command-tool.json",
        "ai-command-tool"
      ]
    }
  }
}
```

### 模式 2：SSE（生产、多用户）

**适用于**：生产部署、团队共享、多用户

**优点**：
- ✅ 快速（持久连接）
- ✅ 多用户支持
- ✅ 无需 SSH
- ✅ 易于监控
- ✅ 带心跳机制的稳定连接 🆕

**缺点**：
- ❌ 需要端口配置
- ❌ 需要防火墙设置
- ❌ 部署较复杂

**服务器启动**：
```bash
# 快速测试
PORT=5090 CONFIG_PATH=/opt/acmt/.ai-command-tool.json ai-command-tool-server

# 生产环境（使用 systemd）
sudo systemctl start acmt-mcp
```

**Cursor 配置**：
```json
{
  "mcpServers": {
    "ai-command-tool": {
      "url": "https://your-domain.com/mcp/sse",
      "transport": "sse"
    }
  }
}
```

---

## ⚙️ 配置

### 配置文件

在项目根目录或主目录创建 `.ai-command-tool.json`：

```json
{
  "commands_directory": "/path/to/Commands",
  "reports_directory": "/path/to/Commands-Analyze-Report",
  "cache_ttl_seconds": 600,
  "cache_max_entries": 1000,
  "max_search_results": 20,
  "search_timeout_ms": 5000,
  "enable_cache": true,
  "report_link_base_url": "https://reports.example.com/",
  "enable_report_upload": true,
  "report_upload_max_size_mb": 10,
  "report_auto_versioning": true,
  "report_file_permissions": "644",
  "log_level": "info"
}
```

### 配置选项

| 选项 | 类型 | 默认值 | 描述 |
|-----|------|--------|------|
| `commands_directory` | string | **必需** | Commands 目录路径 |
| `reports_directory` | string | **必需** | 报告目录路径 |
| `cache_ttl_seconds` | number | 3600 | 缓存生存时间（秒）|
| `cache_max_entries` | number | 1000 | 最大缓存条目数 |
| `max_search_results` | number | 10 | 最大搜索结果数（1-100）|
| `search_timeout_ms` | number | 5000 | 搜索超时（毫秒）|
| `enable_cache` | boolean | true | 启用/禁用缓存 |
| `report_link_base_url` | string | "" | 报告链接基础 URL（可选）|
| `enable_report_upload` | boolean | true | 启用/禁用报告上传功能 🆕 |
| `report_upload_max_size_mb` | number | 10 | 报告最大大小（MB）🆕 |
| `report_auto_versioning` | boolean | true | 冲突时自动增加版本 🆕 |
| `report_file_permissions` | string | "644" | 文件权限（八进制字符串）🆕 |
| `mcp_server_domain` | string | "" | 用于数据库同步的远程 API 服务器域名 🆕 |
| `log_level` | string | "info" | 日志级别：debug/info/warn/error |

### 环境变量

使用环境变量覆盖配置：

```bash
AICMD_COMMANDS_DIR=/path/to/commands
AICMD_REPORTS_DIR=/path/to/reports
AICMD_CACHE_TTL=600
AICMD_REPORT_BASE_URL=https://reports.example.com/
AICMD_MAX_RESULTS=20
AICMD_SEARCH_TIMEOUT=5000
AICMD_ENABLE_CACHE=true
AICMD_ENABLE_REPORT_UPLOAD=true
AICMD_REPORT_UPLOAD_MAX_SIZE_MB=10
AICMD_REPORT_AUTO_VERSIONING=true
AICMD_REPORT_FILE_PERMISSIONS=644
AICMD_MCP_SERVER_DOMAIN=https://your-api-server.com
AICMD_LOG_LEVEL=info
```

### 配置搜索路径

工具按以下顺序搜索配置：
1. `CONFIG_PATH` 环境变量
2. `./.ai-command-tool.json`（当前目录）
3. `~/.ai-command-tool.json`（用户主目录）
4. `/etc/ai-command-tool/config.json`（系统级）

---

## 💡 使用示例

### 示例 1：查找日志分析命令

```
用户在 Cursor 中："找一个分析 speech SDK 日志的工具"

MCP 响应：
{
  "results": [
    {
      "name": "analyze_zoom_speech_sdk_log",
      "score": 0.95,
      "description": "分析 Zoom Speech SDK 日志文件..."
    }
  ]
}
```

### 示例 2：获取命令详情

```
用户："显示 analyze_zoom_speech_sdk_log 的详细信息"

MCP 响应：
{
  "name": "analyze_zoom_speech_sdk_log",
  "content": "# Zoom Speech SDK 日志分析器\n\n## 目的\n...",
  "path": "Commands/analyze_zoom_speech_sdk_log.md"
}
```

### 示例 3：搜索报告

```
用户："查找关于解码超时问题的报告"

MCP 响应：
{
  "reports": [
    {
      "title": "Zoom Speech SDK 分析 - 解码响应",
      "command": "analyze_zoom_speech_sdk_log",
      "date": "2025-11-20",
      "link": "https://reports.example.com/..."
    }
  ]
}
```

---

## 📚 命令组织

### 依赖命令过滤 🆕

ACMT 支持通过将辅助命令标记为依赖项来组织复杂的命令结构。这使您的命令列表保持清洁，专注于主要命令，同时保持完整功能。

#### 工作原理

1. **标记依赖**：在辅助命令 markdown 文件中添加 frontmatter：

```markdown
---
is_dependency: true
---

# 日志类型识别规则

这个辅助命令提供日志类型识别逻辑...
```

2. **自动过滤**：依赖命令会：
   - ✅ 从 `list_commands` 结果中隐藏
   - ✅ 从 `search_commands` 结果中排除
   - ✅ 仍可通过直接 `get_command` 调用访问
   - ✅ 被主命令引用时完全功能

#### 使用案例示例

**主命令**：`proxy-slow-meeting-analysis-command.md`
```markdown
# Proxy 慢会议分析

此命令分析会议加入问题的 proxy 日志。

## 依赖项
- [日志类型识别](./log-type-identification.md)
- [Proxy 线程识别](./proxy-thread-identification.md)
- [会议加入流程](./meeting-join-proxy-process.md)

## 使用方法
...
```

**辅助命令**（标记为依赖）：
- `log-type-identification.md` - 日志类型检测的辅助逻辑
- `proxy-thread-identification.md` - 线程识别模式
- `meeting-join-proxy-process.md` - 会议加入流程参考

**结果**：用户在列表中只看到 `proxy-slow-meeting-analysis-command`，但它仍可以在内部引用和使用所有辅助命令。

#### 迁移指南

整理现有命令：

1. 识别辅助/依赖命令
2. 在每个依赖文件中添加 frontmatter：
```markdown
---
is_dependency: true
---
```
3. 无需代码更改 - 过滤自动进行！

---

## 🛠️ 可用工具

### 1. `search_commands`

使用智能三层搜索查找命令。

**输入**：
```json
{
  "query": "speech SDK 日志分析",
  "max_results": 10
}
```

**输出**：
```json
{
  "results": [
    {
      "name": "analyze_zoom_speech_sdk_log",
      "score": 0.95,
      "tier": "tier1",
      "description": "分析 Zoom Speech SDK 日志"
    }
  ],
  "search_time_ms": 45
}
```

### 2. `get_command`

通过名称获取完整命令定义。

**输入**：
```json
{
  "command_name": "analyze_zoom_speech_sdk_log"
}
```

**输出**：
```json
{
  "name": "analyze_zoom_speech_sdk_log",
  "content": "# 完整的 markdown 内容...",
  "path": "Commands/analyze_zoom_speech_sdk_log.md",
  "size_bytes": 2048
}
```

### 3. `list_commands`

列出所有可用命令，支持分页。

**输入**：
```json
{
  "page": 1,
  "page_size": 50
}
```

**输出**：
```json
{
  "commands": ["analyze_zoom_speech_sdk_log", "..."],
  "total": 10,
  "page": 1,
  "page_size": 50,
  "total_pages": 1
}
```

### 4. `search_reports`

跨所有或特定命令搜索分析报告。

**输入**：
```json
{
  "query": "解码超时",
  "command_filter": "analyze_zoom_speech_sdk_log",
  "max_results": 10
}
```

**输出**：
```json
{
  "reports": [
    {
      "title": "Zoom Speech SDK 分析",
      "command": "analyze_zoom_speech_sdk_log",
      "date": "2025-11-20",
      "link": "https://..."
    }
  ]
}
```

### 5. `list_command_reports`

列出特定命令的所有报告。

**输入**：
```json
{
  "command_name": "analyze_zoom_speech_sdk_log"
}
```

**输出**：
```json
{
  "command": "analyze_zoom_speech_sdk_log",
  "reports": [
    {
      "filename": "report_20251120.md",
      "date": "2025-11-20",
      "link": "https://..."
    }
  ],
  "total": 5
}
```

### 6. `get_report` 🆕

通过命令名和报告名获取报告的完整内容。

**输入**：
```json
{
  "command_name": "analyze_zoom_speech_sdk_log",
  "report_name": "Zoom_Speech_SDK_日志分析报告_20251120_decode_response_v6.md"
}
```

**输出**：
```json
{
  "name": "Zoom_Speech_SDK_日志分析报告_20251120_decode_response_v6.md",
  "command_name": "analyze_zoom_speech_sdk_log",
  "content": "# 完整的报告内容（markdown 格式）...",
  "metadata": {
    "path": "/opt/acmt/Commands-Analyze-Report/analyze_zoom_speech_sdk_log/Zoom_Speech_SDK_日志分析报告_20251120_decode_response_v6.md",
    "size": 11179,
    "date": "2025-11-20T00:00:00.000Z",
    "link": "https://..."
  }
}
```

**功能特性**：
- 📄 **完整内容**：返回报告的完整内容（不仅仅是摘要）
- 🔒 **安全性**：路径遍历防护
- 📊 **元数据**：包含文件大小、日期和可选的 HTTP 链接
- 🔍 **配套工具**：先使用 `list_command_reports` 或 `search_reports` 查找报告名称

### 7. `report_feedback`（推荐）

收集用户对分析报告的反馈，并根据用户决定处理上传/本地保存。

**重要**：这是现在**推荐**的报告管理方法，因为它提供更好的用户控制。生成分析报告后，AI 应调用此工具询问用户是否要将报告上传到服务器或仅本地保存。

**输入**：
```json
{
  "command_name": "analyze_zoom_speech_sdk_log",
  "report_content": "# 分析报告\n\n## 发现的问题\n\n- Token 超时...",
  "report_name": "关键超时分析",
  "user_wants_upload": true
}
```

**输出（已上传）**：
```json
{
  "success": true,
  "action_taken": "uploaded",
  "report_path": "/opt/acmt/Commands-Analyze-Report/analyze_zoom_speech_sdk_log/analyze_zoom_speech_sdk_log_关键超时分析_20251201_143022_v1.md",
  "report_name": "analyze_zoom_speech_sdk_log_关键超时分析_20251201_143022_v1.md",
  "report_link": "https://server.example.com/reports/...",
  "message": "报告已成功上传到服务器",
  "version": 1
}
```

**输出（仅本地）**：
```json
{
  "success": true,
  "action_taken": "saved_locally",
  "report_path": "/path/to/workspace/local-reports/analyze_zoom_speech_sdk_log/analyze_zoom_speech_sdk_log_关键超时分析_20251201_143022_local.md",
  "report_name": "analyze_zoom_speech_sdk_log_关键超时分析_20251201_143022_local.md",
  "message": "报告已本地保存（未上传到服务器）"
}
```

**功能特性**：
- ✅ **用户控制**：上传前询问用户
- 📝 **自定义命名**：用户提供的可选自定义报告名称
- 💾 **双模式**：上传到服务器或仅本地保存
- 🔄 **自动版本控制**：上传冲突时增加版本
- 📁 **智能组织**：本地报告在 `local-reports/`，上传报告在服务器目录
- 🔒 **安全性**：来自 upload_report 的所有验证和安全功能

**正确的工作流程**（⚠️ **关键 - 必须遵循**）：
1. **AI 生成报告**：完成分析
2. **AI 询问用户**：显示报告摘要并询问："分析报告已生成。是否上传到服务器存储？(输入'是'上传 / '否'仅本地保存)"
3. **等待用户响应**：在用户响应前不要继续
4. **用户响应**：
   - "是" 或 "上传" → 用户想要上传
   - "否" 或 "本地" → 用户想要仅本地保存
5. **AI 调用工具**与用户的选择：
   - 如果用户说"是"：`user_wants_upload: true`
   - 如果用户说"否"：`user_wants_upload: false`
6. **系统执行**并返回确认
7. **AI 向用户确认**：显示报告保存位置

⚠️ **不要**：
- ❌ 在询问用户前调用此工具
- ❌ 在没有用户确认的情况下决定 `user_wants_upload` 值
- ❌ 假设用户意图

---

## 🚀 部署

### 本地测试

```bash
# 使用测试脚本
./test-local.sh

# 或手动
PORT=5090 CONFIG_PATH=/tmp/test-config.json ai-command-tool-server

# 测试健康状态
curl http://localhost:5090/health
```

### 生产部署（SSE 模式）

#### 快速部署（自动化）

```bash
# 1. 下载并运行部署脚本
sudo ./deployment/deploy-server.sh

# 2. 上传 Commands 和 Reports
scp -r ./Commands/* user@server:/opt/acmt/Commands/
scp -r ./Commands-Analyze-Report/* user@server:/opt/acmt/Commands-Analyze-Report/

# 3. 启动服务
sudo systemctl start acmt-mcp
sudo systemctl enable acmt-mcp
```

#### 手动部署

```bash
# 1. 安装包
npm install -g @elliotding/ai-command-tool-mcp@latest

# 2. 创建系统用户（安全）
sudo useradd -r -s /bin/false -d /opt/acmt acmt

# 3. 创建目录
sudo mkdir -p /opt/acmt/{Commands,Commands-Analyze-Report}
sudo chown -R acmt:acmt /opt/acmt

# 4. 创建配置
sudo tee /opt/acmt/.ai-command-tool.json > /dev/null << 'EOF'
{
  "commands_directory": "/opt/acmt/Commands",
  "reports_directory": "/opt/acmt/Commands-Analyze-Report",
  "cache_ttl_seconds": 600,
  "report_link_base_url": "https://your-domain.com/reports/"
}
EOF

# 5. 安装 systemd 服务
sudo cp deployment/acmt-mcp.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl start acmt-mcp
sudo systemctl enable acmt-mcp

# 6. 检查状态
sudo systemctl status acmt-mcp
curl http://localhost:5090/health
```

#### 使用 Nginx 的 HTTPS（推荐）

```bash
# 1. 安装 Nginx 和 Certbot
sudo apt install nginx certbot python3-certbot-nginx

# 2. 获取 SSL 证书
sudo certbot --nginx -d your-domain.com

# 3. 配置 Nginx
sudo cp deployment/nginx-acmt.conf /etc/nginx/sites-available/acmt-mcp
# 编辑文件中的域名
sudo ln -s /etc/nginx/sites-available/acmt-mcp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 服务管理

```bash
# 启动服务
sudo systemctl start acmt-mcp

# 停止服务
sudo systemctl stop acmt-mcp

# 重启服务
sudo systemctl restart acmt-mcp

# 查看状态
sudo systemctl status acmt-mcp

# 查看日志
sudo journalctl -u acmt-mcp -f

# 启用开机自启
sudo systemctl enable acmt-mcp
```

---

## 🧪 测试

### 运行测试套件

```bash
# 安装依赖
npm install

# 运行所有测试
npm test

# 带覆盖率运行
npm run test:coverage

# 运行特定测试
npm test -- tests/unit/basic.test.ts
```

### 本地集成测试

```bash
# 1. 运行测试脚本
./test-local.sh

# 2. 在另一个终端测试健康状态
curl http://localhost:5090/health

# 3. 测试 SSE 连接
curl -N http://localhost:5090/sse

# 4. 配置 Cursor 并测试
```

### 测试两种模式

#### 测试 stdio 模式

```bash
# 链接以进行测试
npm link

# 创建测试配置
cat > /tmp/test-config.json << 'EOF'
{
  "commands_directory": "./Commands",
  "reports_directory": "./Commands-Analyze-Report"
}
EOF

# 测试（将等待 JSON-RPC 输入）
CONFIG_PATH=/tmp/test-config.json ai-command-tool

# 发送测试请求（在另一个终端）
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | CONFIG_PATH=/tmp/test-config.json ai-command-tool
```

#### 测试 SSE 模式

```bash
# 启动服务器
PORT=5090 CONFIG_PATH=/tmp/test-config.json ai-command-tool-server

# 测试健康状态
curl http://localhost:5090/health

# 测试 SSE 连接
curl -N http://localhost:5090/sse
```

---

## 🔧 开发

### 构建

```bash
# 构建两种模式
npm run build

# 开发构建（监视模式）
npm run dev

# 类型检查
npm run typecheck

# Lint
npm run lint
```

### 项目结构

```
AI-Command-Management/
├── src/
│   ├── index.ts              # stdio 模式入口点
│   ├── index-sse.ts          # SSE 模式入口点（带心跳）🆕
│   ├── config/               # 配置管理
│   ├── commands/
│   │   ├── loader.ts         # 带 frontmatter 解析的命令加载 🆕
│   │   └── parser.ts         # Markdown 解析
│   ├── reports/
│   │   ├── finder.ts         # 报告发现
│   │   ├── linker.ts         # 报告 URL 生成
│   │   └── uploader.ts       # 带版本控制的报告上传 🆕
│   ├── search/               # 三层搜索引擎
│   │   ├── engine.ts         # 主搜索逻辑
│   │   └── indexer.ts        # 内容索引
│   ├── tools/                # MCP 工具处理器
│   │   ├── search-commands.ts
│   │   ├── get-command.ts
│   │   ├── list-commands.ts
│   │   ├── search-reports.ts
│   │   ├── list-command-reports.ts
│   │   ├── get-report.ts       # 获取报告完整内容 🆕
│   │   └── report-feedback.ts  # 用户控制的报告上传
│   ├── utils/                # 工具（日志、错误、缓存等）
│   └── types/                # TypeScript 类型定义
├── tests/
│   ├── unit/                 # 单元测试
│   │   ├── basic.test.ts
│   │   ├── commands/
│   │   ├── reports/
│   │   └── tools/
│   ├── integration/          # 集成测试
│   └── fixtures/             # 测试数据
├── Commands/                 # 命令定义（markdown）
│   ├── *.md                  # 主命令
│   └── *.md (is_dependency: true)  # 依赖命令（隐藏）🆕
├── deployment/
│   ├── acmt-mcp.service      # SystemD 服务配置
│   ├── deploy-server.sh      # 部署脚本
│   └── nginx-acmt.conf       # 带 SSE 优化的 Nginx 配置 🆕
├── dist/                     # 构建输出
│   ├── index.js              # stdio 模式构建
│   └── index-sse.js          # SSE 模式构建
├── test-local.sh             # 本地测试脚本
└── publish.sh                # NPM 发布脚本
```

### 添加新功能

1. 创建功能分支
2. 实现功能并编写测试
3. 更新 CHANGELOG.md
4. 运行 `npm test` 和 `npm run lint`
5. 提交 PR

---

## 🐛 故障排除

### 常见问题

#### 问题：`command not found: ai-command-tool`

**解决方案**：
```bash
# 检查安装
which ai-command-tool

# 重新安装
npm install -g @elliotding/ai-command-tool-mcp@latest

# 或用于开发的 npm link
npm link
```

#### 问题："Connection refused"（SSE 模式）

**解决方案**：
```bash
# 检查服务器是否运行
sudo systemctl status acmt-mcp

# 检查端口
lsof -i :5090

# 检查日志
sudo journalctl -u acmt-mcp -n 50

# 重启服务
sudo systemctl restart acmt-mcp
```

#### 问题：找不到命令

**解决方案**：
```bash
# 检查配置
cat /opt/acmt/.ai-command-tool.json

# 检查目录权限
ls -la /opt/acmt/Commands/

# 作为服务用户检查
sudo -u acmt ls /opt/acmt/Commands/

# 检查日志
sudo journalctl -u acmt-mcp | grep "command"
```

#### 问题：防火墙阻止（SSE 模式）

**解决方案**：
```bash
# 开放端口
sudo ufw allow 5090/tcp

# 或使用 Nginx 反向代理（推荐）
# 参见部署部分
```

### 调试模式

```bash
# 启用调试日志
LOG_LEVEL=debug ai-command-tool

# 或在配置中
{
  "log_level": "debug"
}

# 查看详细日志
sudo journalctl -u acmt-mcp -f
```

---

## 📊 性能优化建议

### 优化缓存

```json
{
  "cache_ttl_seconds": 3600,      // 增加以获得更好性能
  "cache_max_entries": 5000,      // 增加以获得更多缓存
  "enable_cache": true            // 生产环境始终启用
}
```

### 优化搜索

```json
{
  "search_timeout_ms": 3000,      // 减少以更快超时
  "max_search_results": 10        // 减少以更快返回结果
}
```

### 监控性能

```bash
# 检查资源使用
systemctl status acmt-mcp

# 详细监控
top -p $(pgrep -f ai-command-tool-server)

# 或使用 htop
htop -p $(pgrep -f ai-command-tool-server)
```

---

## 🔐 安全最佳实践

### 生产部署

1. **使用 HTTPS**：始终使用带 SSL/TLS 的 Nginx
2. **系统用户**：以专用用户身份运行服务（非 root）
3. **防火墙**：仅暴露必要端口
4. **访问控制**：使用 IP 白名单或身份验证
5. **定期更新**：保持包更新

### SystemD 安全

提供的 systemd 服务包括：
- `ProtectSystem=strict` - 只读文件系统
- `ProtectHome=true` - 无法访问用户主目录
- `NoNewPrivileges=true` - 无法提升权限
- `PrivateTmp=true` - 隔离的 /tmp 目录

---

## 📝 常见问题

### 问：一个包还是两个？

**答**：一个包（`@elliotding/ai-command-tool-mcp`）包含两个命令：
- `ai-command-tool`（stdio 模式）
- `ai-command-tool-server`（SSE 模式）

### 问：我应该使用哪种模式？

**答**：
- **开发/个人**：使用 stdio 模式（更简单）
- **生产/团队**：使用 SSE 模式（更好的性能，多用户）

### 问：什么是 `report_link_base_url`？

**答**：用于生成可点击报告链接的基础 URL。示例：
- `"https://reports.example.com/"` - Web 服务器
- `"file:///opt/acmt/Reports/"` - 本地文件
- `""` - 无链接（仅返回内容）

### 问：本地测试需要部署脚本吗？

**答**：不需要！部署脚本（`deployment/deploy-server.sh`）用于生产部署。本地测试请使用 `./test-local.sh`。

---

## 🤝 贡献

欢迎贡献！请：

1. Fork 仓库
2. 创建功能分支
3. 为新功能添加测试
4. 更新文档
5. 提交 pull request

查看 [CHANGELOG.md](CHANGELOG.md) 了解版本历史。

---

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件。

---

## 📞 支持

- **GitHub**: https://github.com/ElliotLion-ing/AI-Command-Management
- **Issues**: https://github.com/ElliotLion-ing/AI-Command-Management/issues
- **npm**: https://www.npmjs.com/package/@elliotding/ai-command-tool-mcp

---

## 🙏 致谢

构建工具：
- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/sdk) - MCP 协议
- [fuse.js](https://fusejs.io/) - 模糊搜索
- [marked](https://marked.js.org/) - Markdown 解析
- [gray-matter](https://github.com/jonschlinkert/gray-matter) - Frontmatter 解析 🆕
- [TypeScript](https://www.typescriptlang.org/) - 类型安全

---

**版本**：0.5.1  
**最后更新**：2025-12-23

---

## 🆕 v0.2.2 新功能

### 新增工具：`get_report`
新增工具用于获取指定报告的完整内容。此前，`search_reports` 和 `list_command_reports` 只返回元数据和摘要。现在可以获取完整的报告内容。

**使用方法**：
```json
{
  "command_name": "analyze_zoom_speech_sdk_log",
  "report_name": "report_20251120.md"
}
```

### 移除：`upload_report`（旧版）
已移除废弃的 `upload_report` 工具。请改用 `report_feedback`，它提供：
- ✅ 上传前用户确认
- ✅ 仅本地保存选项
- ✅ 更好的用户体验

### 统一报告目录命名
报告目录现在直接使用命令名，不再添加后缀：
- ✅ 新格式：`analyze_zoom_speech_sdk_log/`
- ❌ 旧格式：`analyze_zoom_speech_sdk_log-reports/`

---

## 🆕 v0.2.0 新功能

### 依赖命令过滤
现在可以使用 frontmatter 元数据将命令标记为依赖项。依赖命令会自动从搜索和列表结果中隐藏，减少混乱，只显示用户需要的主要命令。

**示例**：
```markdown
---
is_dependency: true
---

# 辅助命令内容
此命令被其他命令用作依赖项...
```

**优势**：
- ✅ 更清洁的命令列表
- ✅ 更好的复杂命令结构组织
- ✅ 用户只看到需要直接使用的内容
- ✅ 主命令需要时依赖项仍可访问

### SSE 连接稳定性
SSE 服务器现在实现了心跳机制，每 30 秒发送周期性的保活事件。这可防止代理超时和空闲期间的连接断开。

**技术细节**：
- 心跳间隔：30 秒
- 连接关闭时自动清理
- 兼容 Nginx 代理配置
- 改进的长时间会话稳定性

### 增强的 Frontmatter 支持
命令现在支持用于元数据存储的 YAML frontmatter，实现：
- 命令分类
- 依赖标记
- 自定义元数据字段
- 更好的组织和过滤

**技术支持**：[gray-matter](https://github.com/jonschlinkert/gray-matter)

---

## 🆕 v0.3.0 新功能

### 报告数据库同步 🆕
通过 `report_feedback` 上传报告时，系统现在会自动将报告元数据同步到远程数据库。这实现了集中式报告跟踪和管理。

**配置**：
```json
{
  "mcp_server_domain": "https://your-api-server.com"
}
```

**功能特性**：
- ✅ Sync 在文件上传**之前**执行（符合 Sync-Mechanism-Requirements）
- ✅ Sync 失败时停止文件上传操作
- ✅ 所有者邮箱跟踪（自动从 Cursor 检测或手动提供）
- ✅ 每次同步尝试都有清晰的成功/失败状态反馈
- ✅ 自动重试机制（最多 4 次尝试）

### Sync 重试机制 🆕
同步过程现在包含健壮的重试机制：

**前置条件检查（不重试）**：
- `mcp_server_domain` 未配置 → 立即停止
- `owner` 未提供 → 立即停止
- `owner` 邮箱格式无效 → 立即停止

**重试逻辑**：
- 首次尝试 + 最多 3 次重试（共 4 次尝试）
- 重试间隔 1 秒
- 任意一次成功 → 继续文件上传
- 所有尝试失败 → 停止文件上传，显示详细错误

**输出示例**：

*成功（首次尝试）*：
```
✅ Sync 请求成功 (第1次尝试)

✅ 数据库同步成功，报告元数据已记录到 ZCT 数据库
```

*成功（重试后）*：
```
❌ Sync 请求失败 (第1次): HTTP 500 - Internal Server Error
❌ Sync 请求失败 (第2次): HTTP 503 - Service Unavailable
✅ Sync 请求成功 (第3次尝试)

✅ 数据库同步成功，报告元数据已记录到 ZCT 数据库
```

*失败（重试耗尽）*：
```
❌ Sync 请求失败 (第1次): HTTP 500 - Internal Server Error
❌ Sync 请求失败 (第2次): HTTP 500 - Internal Server Error
❌ Sync 请求失败 (第3次): HTTP 500 - Internal Server Error
❌ Sync 请求失败 (第4次): HTTP 500 - Internal Server Error

⛔ Sync 到 ZCT 数据库失败
错误信息: HTTP 500 - Internal Server Error
已停止 Command/Report 上传操作
```

*前置条件失败*：
```
⛔ Sync 失败: 未配置 mcp_server_domain
已停止所有后续操作
```

### 改进的版本后缀逻辑 🆕
报告文件名处理已改进：
- **无冲突**：使用原始文件名，不添加版本后缀
- **有冲突**：自动添加 `_v1`、`_v2` 等

**示例**：
```
首次上传：MyReport.md        （无后缀）
第二次上传：MyReport_v1.md     （检测到冲突）
第三次上传：MyReport_v2.md     （检测到冲突）
```

### 增强的所有者跟踪 🆕
`report_feedback` 工具现在支持 `owner` 参数：
- 自动从 Cursor 客户端缓存的邮箱检测（macOS/Windows/Linux）
- 自动检测失败时回退到询问用户
- 用于数据库同步以跟踪报告所有权

---

## 🆕 v0.4.0 新功能

### 新增工具：`upload_command` 🆕
新增用于上传和更新命令文件的工具。这实现了带版本控制的集中式命令管理。

**工作流程**：
1. **自动获取用户邮箱** - 从 Cursor 客户端获取（失败则询问用户）
2. **更新已有命令**：
   - 调用 `list_commands` 展示可用命令
   - 选择要更新的命令
   - 选择版本类型（patch/minor/major）
   - 提供 releaseNote
3. **上传新命令**：
   - 通过 `list_commands` 检查命令是否存在
   - 确认命令名称
   - 设置初始版本（默认：0.0.1）
   - 提供描述

**版本格式**：
- `patch`：x.y.z → x.y.(z+1)
- `minor`：x.y.z → x.(y+1).0
- `major`：x.y.z → (x+1).0.0

**输入示例**：
```json
{
  "command_name": "my_new_command",
  "command_content": "# My Command\n\n...",
  "version": "0.0.1",
  "owner": "user@example.com",
  "description": "新命令的描述",
  "release_note": "更新的发布说明",
  "belong_to": ""
}
```

| 参数 | 类型 | 必需 | 描述 |
|-----|------|------|------|
| `command_name` | string | ✅ | 命令名称（带或不带 .md）|
| `command_content` | string | ✅ | 完整的 markdown 内容 |
| `version` | string | ✅ | 语义化版本（如 "0.0.1"）|
| `owner` | string | ✅ | 用户邮箱（自动从 Cursor 获取）|
| `belong_to` | string | ❌ | 依赖文件的主命令名称 |
| `description` | string | ❌ | 描述（用于新命令）|
| `release_note` | string | ❌ | 发布说明（用于更新）|

**功能特性**：
- ✅ 上传新命令或更新已有命令
- ✅ 语义化版本支持（patch/minor/major）
- ✅ 通过 `/api/ai-commands/sync` 自动数据库同步
- ✅ 所有者跟踪（自动从 Cursor 检测）
- ✅ 文件名验证和规范化
- ✅ 命令命名规范强制检查
- ✅ 通过 `belong_to` 字段支持依赖关系

### 命令命名规范 🆕
命令必须遵循特定的命名格式以保持一致性：

**格式**：`{Module}-xx-yy-zz`
- **Module**：技术模块名称（大小写灵活）
- **xx-yy-zz**：用 `-` 分隔的描述部分
- 任何部分**不允许空格**
- **不需要冗余后缀**如 `-command` 或 `-analysis`

**示例**：
```
✅ 正确示例：
   zNet-proxy-slow-meeting-join
   ZMDB-log-analyze
   SpeechSDK-log-analyze
   Tool-code-review-self

❌ 错误示例：
   proxy-slow-meeting-analysis-command  (缺少 Module 前缀)
   Tool-code review-self                (包含空格)
```

**验证行为**：
如果名称不符合规范，AI 会：
1. 提示用户："当前命名不符合规则：{问题描述}"
2. 阐述命名规范
3. 自动生成符合规范的名称建议
4. 询问："建议使用 {建议名称}，是否同意？"

### 新增配置选项 🆕

| 选项 | 类型 | 默认值 | 描述 |
|-----|------|--------|------|
| `enable_command_upload` | boolean | true | 启用/禁用命令上传功能 |
| `command_upload_max_size_mb` | number | 5 | 命令文件最大大小（MB）|
| `command_file_permissions` | string | "644" | 上传命令的文件权限 |

---

## 🆕 v0.5.1 新功能

### 命令依赖上传支持 🆕
命令现在可以与其依赖关系一起上传。系统会自动检测文件类型并正确处理上传顺序。

**工作原理**：
1. **文件类型检测**：检查 markdown 文件前三行是否包含 `is_dependency: true`
2. **自动分析**：上传时，系统分析主文件内容以检测依赖引用
3. **智能上传顺序**：先上传依赖文件，后上传主文件

**支持的场景**：
| 场景 | 支持 | 处理方式 |
|-----|------|---------|
| 单个主文件（无依赖）| ✅ | 自动分析内容检测依赖引用 |
| 多个主文件（无依赖）| ✅ | 一起上传 |
| 单个主文件 + 依赖 | ✅ | 先传依赖，后传主文件 |
| 多主 + 多依赖 | ❌ | 需分批上传（每批 1个主文件 + 其依赖）|

**请求体增强**：
同步 API 请求现在包含 `belongTo` 字段：
- **主文件**：`belongTo = ""`（空）
- **依赖文件**：`belongTo = "parent-command.md"`（带 .md 后缀）

### 预上传验证 🆕
同时上传主文件和依赖文件之前：
1. 验证所有依赖文件名是否符合 `{Module}-xx-yy-zz` 规范
2. 如果任何依赖需要重命名：
   - 停止上传流程
   - 通知用户："依赖文件 {old_name} 需要重命名为 {new_name}"
   - 要求用户先修改主文件中的引用
3. 用户确认修改后，重新上传

**示例流程**：
```
用户：上传 Main-Command.md 和 Utils.md
AI：检测到 Utils.md 需要重命名为 Dep-Utils.md
AI："依赖文件命名不符合规范：
     Utils.md → Dep-Utils.md
     请先修改主文件中对 Utils 的引用为 Dep-Utils"
用户：修改 Main-Command.md，确认
AI：先上传 Dep-Utils.md，再上传 Main-Command.md
```

### 自动依赖检测 🆕
上传单个主文件时，AI 会：
1. 分析文件内容中的依赖引用（如 `@include`、`[[xxx.md]]`）
2. 如果检测到依赖：询问用户"检测到文件中引用了依赖: xxx.md，是否需要一起上传？"
3. 如果未检测到依赖：直接上传，无需询问

