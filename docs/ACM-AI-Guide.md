# ACM (AI Command Management) - 使用指南

> **本文档供 AI 阅读，用于指导 AI 如何帮助用户使用 ACM 系统**

---

## 📋 目录

1. [快速配置](#快速配置)
2. [Web 管理界面](#web-管理界面)
3. [如何创建命令文件](#如何创建命令文件)
4. [工具使用指南](#工具使用指南)
5. [常见场景示例](#常见场景示例)

---

## 快速配置

### 🔧 在 Cursor 中配置 ACM

用户只需在 Cursor 的 MCP 配置文件中添加以下内容即可使用 ACM：

**配置文件位置**：`~/.cursor/mcp.json`

**开发环境配置**：
```json
{
  "mcpServers": {
    "acm": {
      "url": "https://zct-dev.zoomdev.us/sse",
      "transport": "sse"
    }
  }
}
```

**生产环境配置**：
```json
{
  "mcpServers": {
    "acm": {
      "url": "https://zct.zoomdev.us/sse",
      "transport": "sse"
    }
  }
}
```

配置完成后重启 Cursor，即可使用 ACM 的所有功能。

---

## Web 管理界面

用户可以在浏览器中查看已上传的 Command 和 Report：

| 环境 | 地址 |
|------|------|
| **开发环境** | https://zct-dev.zoomdev.us/csp/aiCommandsManagement |
| **生产环境** | https://zct.zoomdev.us/csp/aiCommandsManagement |

---

## 如何创建命令文件

### 📄 主命令文件

主命令是独立的命令文件，用户直接使用。

**文件格式**：普通 Markdown 文件，无需特殊标记

```markdown
# 命令标题

## 功能描述
这个命令用于...

## 使用步骤
1. 第一步
2. 第二步
...
```

### 📄 子命令（依赖文件）

子命令是被主命令引用的辅助文件。**必须在文件开头添加特殊标记**。

**⚠️ 关键：子命令必须包含以下 frontmatter**

```markdown
---
is_dependency: true
---

# 子命令标题

这是一个被主命令引用的辅助文件...
```

**判定规则**：
- 文件**前 3 行**包含 `is_dependency: true` → 识别为子命令
- 未包含此标记 → 识别为主命令

### 📄 主+子命令组合示例

**主命令 `zNet-proxy-slow-meeting-join.md`**：
```markdown
# Proxy 慢会议加入分析

## 依赖
- [[zNet-log-type-identification.md]]
- [[zNet-proxy-thread-identification.md]]

## 分析步骤
1. 首先识别日志类型（参考子命令）
2. 然后识别 proxy 线程
...
```

**子命令 `zNet-log-type-identification.md`**：
```markdown
---
is_dependency: true
---

# 日志类型识别规则

## Log 类型判断
- 类型 A: 包含 xxx 关键字
- 类型 B: 包含 yyy 关键字
...
```

**子命令 `zNet-proxy-thread-identification.md`**：
```markdown
---
is_dependency: true
---

# Proxy 线程识别

## 线程模式
- 模式 1: ...
- 模式 2: ...
```

### 📝 命令命名规范

所有命令文件必须遵循 `{Module}-xx-yy-zz` 格式：

| 组成部分 | 说明 | 示例 |
|---------|------|------|
| `{Module}` | 技术模块名称 | zNet, ZMDB, SpeechSDK, Tool |
| `xx-yy-zz` | 用 `-` 分隔的描述 | proxy-slow-meeting-join |

**✅ 正确命名**：
- `zNet-proxy-slow-meeting-join`
- `ZMDB-log-analyze`
- `SpeechSDK-decode-timeout-check`
- `Tool-code-review-self`

**❌ 错误命名**：
- `proxy-slow-meeting` （缺少 Module 前缀）
- `Tool-code review` （包含空格）
- `zNet-proxy-slow-meeting-command` （冗余后缀 -command）

---

## 工具使用指南

### 🔑 用户邮箱获取

上传操作需要用户邮箱。**AI 必须先自动获取，失败后才询问用户**：

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

### 1. `search_commands` - 搜索命令

**用途**：根据关键词查找命令

**参数**：
| 参数 | 必需 | 描述 |
|------|------|------|
| `query` | ✅ | 搜索关键词 |
| `max_results` | ❌ | 最大结果数（默认 10）|

**示例**：
```json
{ "query": "proxy slow meeting", "max_results": 5 }
```

---

### 2. `get_command` - 获取命令详情

**用途**：获取命令的完整内容

**参数**：
| 参数 | 必需 | 描述 |
|------|------|------|
| `command_name` | ✅ | 命令名称（不需要 .md）|

**示例**：
```json
{ "command_name": "zNet-proxy-slow-meeting-join" }
```

---

### 3. `list_commands` - 列出所有命令

**用途**：查看所有可用命令列表

**参数**：
| 参数 | 必需 | 描述 |
|------|------|------|
| `page` | ❌ | 页码（默认 1）|
| `page_size` | ❌ | 每页数量（默认 50）|

**示例**：
```json
{ "page": 1, "page_size": 20 }
```

---

### 4. `upload_command` - 上传/更新命令

**用途**：上传新命令或更新已有命令

**参数**：
| 参数 | 必需 | 描述 |
|------|------|------|
| `command_name` | ✅ | 命令名称 |
| `command_content` | ✅ | 完整 markdown 内容 |
| `version` | ✅ | 版本号（新建用 "0.0.1"）|
| `owner` | ✅ | 用户邮箱（先自动获取）|
| `belong_to` | ❌ | 子命令的主命令名（带 .md）|
| `description` | ❌ | 描述（新建时）|
| `release_note` | ❌ | 发布说明（更新时）|
| `is_new_command` | ❌ | 是否为新命令 |

**版本规则**：
- 新命令：`0.0.1`
- patch：x.y.z → x.y.(z+1)
- minor：x.y.z → x.(y+1).0
- major：x.y.z → (x+1).0.0

---

### 5. `search_reports` - 搜索报告

**用途**：搜索历史分析报告

**参数**：
| 参数 | 必需 | 描述 |
|------|------|------|
| `query` | ✅ | 搜索关键词 |
| `command_filter` | ❌ | 限定特定命令 |
| `max_results` | ❌ | 最大结果数（默认 10）|

**示例**：
```json
{ "query": "decode timeout", "command_filter": "SpeechSDK-log-analyze" }
```

---

### 6. `list_command_reports` - 列出命令的报告

**用途**：查看某命令下的所有报告

**参数**：
| 参数 | 必需 | 描述 |
|------|------|------|
| `command_name` | ✅ | 命令名称 |

**示例**：
```json
{ "command_name": "zNet-proxy-slow-meeting-join" }
```

---

### 7. `get_report` - 获取报告内容

**用途**：获取报告的完整内容

**参数**：
| 参数 | 必需 | 描述 |
|------|------|------|
| `command_name` | ✅ | 报告所属命令 |
| `report_name` | ✅ | 报告文件名 |

**示例**：
```json
{ "command_name": "zNet-proxy-slow-meeting-join", "report_name": "分析报告_20251223.md" }
```

---

### 8. `report_feedback` - 上传报告

**用途**：将分析报告上传到服务器

**参数**：
| 参数 | 必需 | 描述 |
|------|------|------|
| `command_name` | ✅ | 报告所属命令（必须已存在）|
| `report_content` | ✅ | 完整报告内容 |
| `report_name` | ❌ | 报告文件名（用原始名）|
| `user_wants_upload` | ✅ | true=上传，false=仅本地 |
| `owner` | ❌ | 用户邮箱（先自动获取）|

**示例**：
```json
{
  "command_name": "zNet-proxy-slow-meeting-join",
  "report_content": "# 分析报告\n\n...",
  "report_name": "proxy分析_20251223.md",
  "user_wants_upload": true,
  "owner": "user@example.com"
}
```

---

## 常见场景示例

### 场景 1：用户想查找分析工具

```
用户：有没有分析 proxy 慢会议的工具？

AI 操作：
1. 调用 search_commands { query: "proxy slow meeting" }
2. 展示搜索结果给用户
3. 用户选择后调用 get_command 获取完整内容
```

### 场景 2：用户想上传一个主命令

```
用户：帮我上传 @MyCommand.md

AI 操作：
1. 读取文件内容
2. 检查命名是否符合 {Module}-xx-yy-zz 规范
   - 不符合 → 建议新名称，用户确认
3. 运行 sqlite3 命令获取用户邮箱
4. 调用 upload_command 上传
```

### 场景 3：用户想创建主+子命令组合

```
用户：我想创建一个复杂命令，有主文件和两个子文件

AI 指导：
1. 主文件：正常写 markdown，引用子文件
2. 子文件：必须在开头添加 frontmatter
   ---
   is_dependency: true
   ---
3. 所有文件名必须符合 {Module}-xx-yy-zz 格式

上传步骤：
1. 检查所有文件名规范
2. 如果子文件需要重命名：
   - 停止流程
   - 提示用户修改主文件中的引用
3. 先上传子文件（设置 belong_to 参数）
4. 再上传主文件
```

### 场景 4：用户想上传分析报告

```
用户：帮我上传这个分析报告

AI 操作：
1. 调用 list_commands 确认目标文件夹存在
2. 运行 sqlite3 命令获取用户邮箱
3. 确认："将报告[xxx.md]上传到[command]文件夹，确认？"
4. 用户确认后调用 report_feedback
```

### 场景 5：用户想查看历史报告

```
用户：看看之前 speech SDK 相关的分析报告

AI 操作：
1. 调用 search_reports { query: "speech SDK" }
2. 展示结果，用户选择
3. 调用 get_report 获取完整内容
```

---

## ⚠️ 关键注意事项

| 事项 | 说明 |
|------|------|
| **子命令标记** | 必须在文件前 3 行包含 `is_dependency: true` |
| **命名规范** | 所有文件必须符合 `{Module}-xx-yy-zz` 格式 |
| **邮箱获取** | 必须先自动获取，失败后才询问用户 |
| **上传顺序** | 子命令必须在主命令之前上传 |
| **报告文件夹** | 只能上传到已存在的命令文件夹 |
| **原始文件名** | 报告上传使用用户原始文件名 |

---

**文档版本**: 0.5.1  
**最后更新**: 2025-12-23
