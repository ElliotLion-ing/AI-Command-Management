# ACM (AI Command Management) - AI 使用指南

> **本文档供 AI 阅读，用于指导 AI 如何使用 ACM MCP 工具**

---

## 📋 目录

1. [环境与配置](#环境与配置)
2. [工具列表概览](#工具列表概览)
3. [命令管理工具](#命令管理工具)
   - [search_commands](#1-search_commands---搜索命令)
   - [get_command](#2-get_command---获取命令详情)
   - [list_commands](#3-list_commands---列出所有命令)
   - [upload_command](#4-upload_command---上传更新命令)
4. [报告管理工具](#报告管理工具)
   - [search_reports](#5-search_reports---搜索报告)
   - [list_command_reports](#6-list_command_reports---列出命令的报告)
   - [get_report](#7-get_report---获取报告内容)
   - [report_feedback](#8-report_feedback---上传报告)
5. [常见场景示例](#常见场景示例)

---

## 环境与配置

### 🌐 Web 管理界面

用户可以在以下地址查看已上传的 Command 和 Report：

| 环境 | 地址 |
|------|------|
| **开发环境 (Dev)** | https://zct-dev.zoomdev.us/csp/aiCommandsManagement |
| **生产环境 (Prod)** | https://zct.zoomdev.us/csp/aiCommandsManagement |

### ⚙️ MCP Server 配置

ACM 需要配置 `.ai-command-tool.json` 文件：

```json
{
  "commands_directory": "/path/to/Commands",
  "reports_directory": "/path/to/Commands-Analyze-Report",
  "mcp_server_domain": "https://your-api-server.com",
  "enable_report_upload": true,
  "enable_command_upload": true,
  "cache_ttl_seconds": 600,
  "log_level": "info"
}
```

**关键配置项**：
- `mcp_server_domain`: 远程 API 服务器地址，用于同步元数据到数据库
- `commands_directory`: 命令文件存储目录
- `reports_directory`: 报告文件存储目录

### 🔑 用户邮箱获取

上传操作需要用户邮箱（owner）。**必须先自动获取，失败后才询问用户**：

```bash
# macOS
sqlite3 ~/Library/Application\ Support/Cursor/User/globalStorage/state.vscdb \
  "SELECT value FROM ItemTable WHERE key='cursorAuth/cachedEmail';"

# Windows
sqlite3 %APPDATA%\Cursor\User\globalStorage\state.vscdb \
  "SELECT value FROM ItemTable WHERE key='cursorAuth/cachedEmail';"

# Linux
sqlite3 ~/.config/Cursor/User/globalStorage/state.vscdb \
  "SELECT value FROM ItemTable WHERE key='cursorAuth/cachedEmail';"
```

---

## 工具列表概览

| 工具名称 | 功能 | 主要用途 |
|---------|------|---------|
| `search_commands` | 智能搜索命令 | 根据关键词查找命令 |
| `get_command` | 获取命令详情 | 读取命令完整内容 |
| `list_commands` | 列出所有命令 | 查看可用命令列表 |
| `upload_command` | 上传/更新命令 | 新建或更新命令定义 |
| `search_reports` | 搜索报告 | 根据关键词查找历史报告 |
| `list_command_reports` | 列出命令的报告 | 查看某命令的所有报告 |
| `get_report` | 获取报告内容 | 读取报告完整内容 |
| `report_feedback` | 上传报告 | 保存分析报告到服务器 |

---

## 命令管理工具

### 1. `search_commands` - 搜索命令

**功能**：使用三层智能搜索查找命令（文件名匹配 → 内容语义搜索 → 历史报告发现）

**输入参数**：
| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `query` | string | ✅ | 搜索关键词 |
| `max_results` | number | ❌ | 最大结果数（默认：10）|

**调用示例**：
```json
{
  "query": "proxy slow meeting",
  "max_results": 5
}
```

**使用场景**：
- 用户询问"有没有分析 XX 的命令"
- 用户描述问题，需要找到相关工具

---

### 2. `get_command` - 获取命令详情

**功能**：根据命令名称获取完整的命令定义内容

**输入参数**：
| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `command_name` | string | ✅ | 命令名称（不需要 .md 后缀）|

**调用示例**：
```json
{
  "command_name": "zNet-proxy-slow-meeting-join"
}
```

**使用场景**：
- 执行命令前获取完整指令
- 查看命令的使用说明和步骤

---

### 3. `list_commands` - 列出所有命令

**功能**：分页列出所有可用命令

**输入参数**：
| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `page` | number | ❌ | 页码（默认：1）|
| `page_size` | number | ❌ | 每页数量（默认：50，最大：100）|

**调用示例**：
```json
{
  "page": 1,
  "page_size": 20
}
```

**使用场景**：
- 查看所有可用命令
- 上传报告前确认目标命令文件夹存在

---

### 4. `upload_command` - 上传/更新命令

**功能**：上传新命令或更新已有命令，支持主命令和依赖命令

#### 📌 命令命名规范

**格式**：`{Module}-xx-yy-zz`

| 规则 | 说明 |
|------|------|
| Module | 技术模块名称（如 zNet, ZMDB, SpeechSDK）|
| xx-yy-zz | 用 `-` 分隔的描述部分 |
| 禁止空格 | 任何部分不允许空格 |
| 无冗余后缀 | 不需要 `-command` 或 `-analysis` |

**正确示例**：
- ✅ `zNet-proxy-slow-meeting-join`
- ✅ `ZMDB-log-analyze`
- ✅ `Tool-code-review-self`

**错误示例**：
- ❌ `proxy-slow-meeting` （缺少 Module 前缀）
- ❌ `Tool-code review` （包含空格）

#### 📌 输入参数

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `command_name` | string | ✅ | 命令名称（带或不带 .md）|
| `command_content` | string | ✅ | 完整的 markdown 内容 |
| `version` | string | ✅ | 语义化版本（如 "0.0.1"）|
| `owner` | string | ✅ | 用户邮箱（先自动获取）|
| `belong_to` | string | ❌ | 依赖文件的主命令名（带 .md）|
| `description` | string | ❌ | 命令描述（新建时）|
| `release_note` | string | ❌ | 发布说明（更新时）|
| `is_new_command` | boolean | ❌ | 是否为新命令 |

#### 📌 版本规则

| 场景 | 版本 |
|------|------|
| 新命令 | 从 `0.0.1` 开始 |
| patch 更新 | x.y.z → x.y.(z+1) |
| minor 更新 | x.y.z → x.(y+1).0 |
| major 更新 | x.y.z → (x+1).0.0 |

#### 📌 上传工作流程

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: 自动获取用户邮箱                                      │
│   运行 sqlite3 命令获取 Cursor 缓存邮箱                        │
│   失败后才询问用户                                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: 检测文件类型                                         │
│   检查文件前3行是否包含: is_dependency: true                   │
│   - 是 → 依赖文件，需指定 belong_to                           │
│   - 否 → 主文件，检查是否有依赖引用                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: 处理文件关系                                         │
│                                                              │
│ ┌─ 单个主文件（无依赖）                                       │
│ │   分析内容检测依赖引用 (@include, [[xxx.md]])                │
│ │   检测到依赖 → 询问是否一起上传                              │
│ │   未检测到 → 直接上传                                       │
│ │                                                            │
│ ├─ 多个主文件（无依赖）✅ 支持                                 │
│ │   所有文件无依赖 → 一起上传                                  │
│ │   有依赖 → 要求分批上传                                     │
│ │                                                            │
│ ├─ 单个主文件 + 依赖 ✅ 支持                                   │
│ │   收集依赖文件内容 → 先传依赖后传主文件                       │
│ │                                                            │
│ └─ 多主 + 多依赖 ❌ 拒绝                                       │
│     提示分批上传：每批 [1个主文件 + 其依赖]                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: 预上传验证                                           │
│   验证所有文件名符合 {Module}-xx-yy-zz 规范                    │
│   不符合 → 建议新名称，用户确认后继续                          │
│   依赖需重命名 → 停止，要求用户修改主文件引用                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 5: 执行上传                                             │
│   依赖文件优先上传                                            │
│   主文件最后上传                                              │
│   同步元数据到数据库                                          │
└─────────────────────────────────────────────────────────────┘
```

#### 📌 依赖文件格式

依赖文件必须在开头包含 frontmatter：

```markdown
---
is_dependency: true
---

# 依赖文件内容
...
```

#### 📌 调用示例

**上传新主命令**：
```json
{
  "command_name": "zNet-proxy-slow-meeting-join",
  "command_content": "# Proxy Slow Meeting Join Analysis\n\n...",
  "version": "0.0.1",
  "owner": "user@example.com",
  "description": "分析 proxy 慢会议加入问题",
  "is_new_command": true
}
```

**上传依赖文件**：
```json
{
  "command_name": "zNet-proxy-thread-identification",
  "command_content": "---\nis_dependency: true\n---\n\n# Thread Identification\n...",
  "version": "0.0.1",
  "owner": "user@example.com",
  "belong_to": "zNet-proxy-slow-meeting-join.md"
}
```

---

## 报告管理工具

### 5. `search_reports` - 搜索报告

**功能**：跨所有命令或特定命令搜索历史分析报告

**输入参数**：
| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `query` | string | ✅ | 搜索关键词 |
| `command_filter` | string | ❌ | 限定特定命令的报告 |
| `max_results` | number | ❌ | 最大结果数（默认：10）|

**调用示例**：
```json
{
  "query": "decode timeout",
  "command_filter": "SpeechSDK-log-analyze",
  "max_results": 5
}
```

**使用场景**：
- 查找历史分析案例
- 参考类似问题的解决方案

---

### 6. `list_command_reports` - 列出命令的报告

**功能**：列出特定命令下的所有报告

**输入参数**：
| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `command_name` | string | ✅ | 命令名称 |

**调用示例**：
```json
{
  "command_name": "zNet-proxy-slow-meeting-join"
}
```

**使用场景**：
- 查看某命令的所有历史报告
- 选择报告进行查看

---

### 7. `get_report` - 获取报告内容

**功能**：获取特定报告的完整内容

**输入参数**：
| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `command_name` | string | ✅ | 报告所属的命令名称 |
| `report_name` | string | ✅ | 报告文件名（如 "报告_20251126.md"）|

**调用示例**：
```json
{
  "command_name": "zNet-proxy-slow-meeting-join",
  "report_name": "proxy_analysis_20251201_v1.md"
}
```

**使用场景**：
- 阅读历史报告内容
- 参考分析方法和结论

---

### 8. `report_feedback` - 上传报告

**功能**：将分析报告上传到服务器或保存到本地

#### 📌 输入参数

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `command_name` | string | ✅ | 报告所属命令（必须是已存在的命令）|
| `report_content` | string | ✅ | 完整的报告内容（Markdown）|
| `report_name` | string | ❌ | 报告文件名（使用原始文件名）|
| `user_wants_upload` | boolean | ✅ | true=上传服务器，false=仅本地保存 |
| `owner` | string | ❌ | 用户邮箱（先自动获取）|

#### 📌 上传工作流程

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: 调用 list_commands 确认目标文件夹存在                  │
│   找到匹配命令 → 继续                                         │
│   未找到 → 询问用户选择其他文件夹或取消                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: 自动获取用户邮箱                                      │
│   运行 sqlite3 命令                                          │
│   失败后才询问用户                                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: 确认上传                                             │
│   询问用户："将报告[文件名]上传到[command]文件夹，确认？"        │
│   用户确认 → 继续                                            │
│   用户取消 → 结束                                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: 执行上传                                             │
│   同步元数据到数据库                                          │
│   同步成功 → 写入文件                                         │
│   同步失败 → 停止上传，显示错误                                │
└─────────────────────────────────────────────────────────────┘
```

#### 📌 调用示例

**上传报告到服务器**：
```json
{
  "command_name": "zNet-proxy-slow-meeting-join",
  "report_content": "# 分析报告\n\n## 问题描述\n...",
  "report_name": "proxy_slow_analysis_20251223.md",
  "user_wants_upload": true,
  "owner": "user@example.com"
}
```

**仅本地保存**：
```json
{
  "command_name": "zNet-proxy-slow-meeting-join",
  "report_content": "# 分析报告\n\n...",
  "user_wants_upload": false
}
```

#### 📌 重要提示

1. **不要自动生成报告名称**：使用用户提供的原始文件名
2. **必须使用已存在的命令**：不允许创建自定义文件夹
3. **版本冲突自动处理**：同名文件会自动添加 `_v1`, `_v2` 后缀

---

## 常见场景示例

### 场景 1：用户想查找分析工具

```
用户：有没有分析 proxy 慢会议的工具？

AI 操作：
1. 调用 search_commands { query: "proxy slow meeting" }
2. 展示搜索结果给用户
3. 用户选择后调用 get_command 获取详情
```

### 场景 2：用户想查看历史报告

```
用户：看看之前有什么 speech SDK 的分析报告

AI 操作：
1. 调用 search_reports { query: "speech SDK" }
2. 或调用 list_command_reports { command_name: "SpeechSDK-log-analyze" }
3. 用户选择后调用 get_report 获取内容
```

### 场景 3：用户想上传分析报告

```
用户：帮我上传这个分析报告

AI 操作：
1. 调用 list_commands 确认目标文件夹
2. 运行 sqlite3 命令获取用户邮箱
3. 确认："将报告[xxx.md]上传到[command]文件夹，确认？"
4. 用户确认后调用 report_feedback
```

### 场景 4：用户想上传新命令

```
用户：帮我上传这个命令文件 @MyCommand.md

AI 操作：
1. 读取文件内容
2. 检查文件名是否符合 {Module}-xx-yy-zz 规范
3. 如不符合，建议新名称并确认
4. 运行 sqlite3 命令获取用户邮箱
5. 调用 upload_command 上传
```

### 场景 5：上传主命令 + 依赖文件

```
用户：上传 Main-Command.md，它有依赖 Helper.md

AI 操作：
1. 读取两个文件内容
2. 验证文件名规范
3. 如果 Helper.md 需重命名：
   - 停止流程
   - 提示用户修改主文件中的引用
   - 用户确认修改后重新读取文件
4. 先上传 Helper.md（设置 belong_to: "Main-Command.md"）
5. 后上传 Main-Command.md
```

---

## ⚠️ 关键注意事项

1. **邮箱获取顺序**：必须先自动获取，失败后才询问用户
2. **命名规范验证**：上传前必须验证 `{Module}-xx-yy-zz` 格式
3. **依赖上传顺序**：依赖文件必须在主文件之前上传
4. **同步失败处理**：同步数据库失败时停止文件上传
5. **原始文件名**：报告上传使用用户原始文件名，不自动生成

---

**文档版本**: 0.5.1  
**最后更新**: 2025-12-23

