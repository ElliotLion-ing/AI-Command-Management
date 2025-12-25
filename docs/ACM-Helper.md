# ACM (AI Command Management) - 使用指南

> **本文档供 AI 阅读，用于回答用户关于 ACM 系统的问题**

---

## ⚠️ AI 行为准则（必须遵守）

**所有与 MCP Server 交互的操作都必须先询问用户确认，禁止自动执行！**

| 操作类型 | 是否需要确认 | 确认方式 |
|---------|-------------|---------|
| 上传 Command | ✅ 必须确认 | "即将上传命令 [xxx] 到 ACM，是否继续？" |
| 上传 Report | ✅ 必须确认 | "即将上传报告 [xxx] 到 [command] 文件夹，是否继续？" |
| 更新 Command | ✅ 必须确认 | "即将更新命令 [xxx] 版本到 [x.x.x]，是否继续？" |
| 搜索/查询 | ❌ 无需确认 | 可直接执行 |

**禁止行为**：
- ❌ 未经用户确认直接调用 `upload_command`
- ❌ 未经用户确认直接调用 `report_feedback`
- ❌ 假设用户意图自动执行上传

---

## 📋 快速索引

| 用户问题 | 跳转章节 |
|---------|---------|
| 如何配置/使用 ACM？ | [快速配置](#快速配置) |
| 在哪里查看已上传的内容？ | [Web 管理界面](#web-管理界面) |
| 创建 command 文件有什么规则？ | [Command 文件规则](#command-文件规则) |
| 如何创建子命令/依赖文件？ | [子命令创建规则](#子命令依赖文件) |
| 如何上传 command？ | [上传 Command](#上传-command) |
| 如何上传 report？ | [上传 Report](#上传-report) |
| 如何搜索/查看内容？ | [查询操作](#查询操作) |

---

## 快速配置

### Q: 如何配置 ACM？

在 Cursor 的 MCP 配置文件中添加配置即可。

**配置文件位置**：`~/.cursor/mcp.json`

**开发环境**：
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

**生产环境**：
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

配置完成后**重启 Cursor** 即可使用。

---

## Web 管理界面

### Q: 在哪里查看已上传的 Command 和 Report？

| 环境 | 地址 |
|------|------|
| **开发环境** | https://zct-dev.zoomdev.us/csp/aiCommandsManagement |
| **生产环境** | https://zct.zoomdev.us/csp/aiCommandsManagement |

---

## Command 文件规则

### Q: 创建 command 文件有哪些规则需要遵守？

#### ✅ 规则 1：命名规范

**格式**：`{Module}-xx-yy-zz.md`

| 部分 | 说明 | 示例 |
|------|------|------|
| `{Module}` | 技术模块名称，首字母建议大写 | zNet, ZMDB, SpeechSDK, Tool |
| `xx-yy-zz` | 用 `-` 分隔的描述，不能有空格 | proxy-slow-meeting-join |

**正确示例**：
- ✅ `zNet-proxy-slow-meeting-join.md`
- ✅ `ZMDB-log-analyze.md`
- ✅ `SpeechSDK-decode-timeout-check.md`
- ✅ `Tool-code-review-self.md`

**错误示例**：
- ❌ `proxy-slow-meeting.md` → 缺少 Module 前缀
- ❌ `Tool-code review.md` → 包含空格
- ❌ `zNet-proxy-command.md` → 冗余后缀 `-command`
- ❌ `zNet-proxy-analysis.md` → 冗余后缀 `-analysis`

#### ✅ 规则 2：文件格式

Command 文件是标准 Markdown 格式：

```markdown
# 命令标题

## 功能描述
这个命令用于...

## 使用步骤
1. 第一步
2. 第二步

## 注意事项
- 注意点 1
- 注意点 2
```

#### ✅ 规则 3：版本号

- **新建命令**：版本从 `0.0.1` 开始
- **更新命令**：
  - patch（小修复）：0.0.1 → 0.0.2
  - minor（新功能）：0.0.1 → 0.1.0
  - major（大改动）：0.0.1 → 1.0.0

---

## 子命令（依赖文件）

### Q: 如何创建子命令/依赖文件？

子命令是被主命令引用的辅助文件。

#### ✅ 规则 1：必须添加 frontmatter 标记

**⚠️ 关键**：子命令文件**必须**在开头添加以下内容：

```markdown
---
is_dependency: true
---

# 子命令标题

子命令内容...
```

#### ✅ 规则 2：判定逻辑

| 文件开头 | 判定结果 |
|---------|---------|
| 前 3 行包含 `is_dependency: true` | → 子命令 |
| 不包含此标记 | → 主命令 |

#### ✅ 规则 3：命名规范

子命令同样需要遵循 `{Module}-xx-yy-zz.md` 格式。

### Q: 主命令如何引用子命令？

在主命令中使用 `[[子命令名.md]]` 格式引用：

```markdown
# 主命令标题

## 依赖
- [[zNet-log-type-identification.md]]
- [[zNet-proxy-thread-identification.md]]

## 分析步骤
1. 首先识别日志类型（参考子命令）
2. 然后识别 proxy 线程
```

### Q: 完整的主+子命令示例？

**主命令 `zNet-proxy-slow-meeting-join.md`**：
```markdown
# Proxy 慢会议加入分析

## 依赖
- [[zNet-log-type-identification.md]]
- [[zNet-proxy-thread-identification.md]]

## 分析步骤
1. 首先识别日志类型
2. 然后识别 proxy 线程
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

---

## 上传 Command

### Q: 如何上传 command 文件？

#### 上传单个主命令

**用户操作**：
1. 准备好符合命名规范的 .md 文件
2. 告诉 AI："帮我上传 @MyCommand.md"

**AI 操作流程**：
1. 读取文件内容
2. 检查命名是否符合 `{Module}-xx-yy-zz` 规范
   - 不符合 → 建议新名称，**询问用户是否同意**
3. 获取用户邮箱（自动获取，失败才询问）
4. **⚠️ 必须询问确认**："即将上传命令 [xxx] 到 ACM，版本 0.0.1，是否继续？"
5. 用户确认后，调用 `upload_command`

#### 上传主命令 + 子命令

**用户操作**：
1. 准备好所有文件：
   - 主命令：普通 markdown
   - 子命令：开头添加 `is_dependency: true`
2. 告诉 AI："帮我上传主命令和它的依赖文件"

**AI 操作流程**：
1. 读取所有文件内容
2. 检查所有文件命名规范
   - 不符合 → 建议新名称，**询问用户是否同意**
3. **如果子命令需要重命名**：
   - 停止流程
   - 提示用户修改主命令中的引用
   - 用户修改后重新读取文件
4. 获取用户邮箱
5. **⚠️ 必须询问确认**："即将上传以下文件到 ACM：
   - 子命令：[xxx] (belong_to: [主命令])
   - 主命令：[yyy]
   是否继续？"
6. 用户确认后，先上传子命令，再上传主命令

### Q: 上传时需要提供什么信息？

| 信息 | 必需 | 说明 |
|------|------|------|
| 文件内容 | ✅ | 完整的 markdown 内容 |
| 命令名称 | ✅ | 符合 {Module}-xx-yy-zz 格式 |
| 版本号 | ✅ | 新建用 0.0.1 |
| 邮箱 | ✅ | AI 会自动获取 |
| 描述 | ❌ | 新建时可选 |
| 发布说明 | ❌ | 更新时可选 |

---

## 上传 Report

### Q: 如何上传分析报告？

**用户操作**：
1. 告诉 AI："帮我上传这个分析报告"

**AI 操作流程**：
1. 调用 `list_commands` 确认目标文件夹存在
   - 找到匹配 → 继续
   - 未找到 → **询问用户选择其他文件夹或取消**
2. 获取用户邮箱（自动获取，失败才询问）
3. **⚠️ 必须询问确认**："即将上传报告 [xxx.md] 到 [command] 文件夹，是否继续？"
4. 用户确认后，调用 `report_feedback`
5. 向用户展示上传结果（成功/失败）

### Q: 上传报告有什么规则？

| 规则 | 说明 |
|------|------|
| 目标文件夹 | 必须是已存在的 command 文件夹 |
| 文件名 | 使用你提供的原始文件名 |
| 冲突处理 | 同名文件会自动添加 _v1, _v2 后缀 |

---

## 查询操作

### Q: 如何搜索 command？

直接告诉 AI 你要找什么：
- "有没有分析 proxy 慢会议的工具？"
- "找一个分析 speech SDK 日志的命令"

### Q: 如何查看 command 内容？

- "显示 zNet-proxy-slow-meeting-join 的详细内容"
- "获取这个命令的完整定义"

### Q: 如何查看历史报告？

- "看看之前有什么 speech SDK 的分析报告"
- "列出 zNet-proxy-slow-meeting-join 的所有报告"

### Q: 如何获取报告内容？

- "获取这个报告的完整内容"
- "显示报告 xxx_20251223.md 的详情"

---

## 常见问题

### Q: 命名不符合规范怎么办？

AI 会自动检测并提示：
1. 告诉你哪里不符合规范
2. 建议一个符合规范的新名称
3. 询问你是否同意使用新名称

### Q: 子命令忘记添加 frontmatter 会怎样？

没有 `is_dependency: true` 标记的文件会被识别为主命令，无法建立正确的依赖关系。

### Q: 可以创建自定义的 report 文件夹吗？

不可以。报告只能上传到已存在的 command 文件夹下。

### Q: 邮箱需要手动输入吗？

不需要。AI 会自动从 Cursor 获取你的登录邮箱，只有获取失败时才会询问你。

---

## 工具参数参考

### search_commands
```json
{ "query": "关键词", "max_results": 10 }
```

### get_command
```json
{ "command_name": "命令名（不需要.md）" }
```

### list_commands
```json
{ "page": 1, "page_size": 50 }
```

### upload_command
```json
{
  "command_name": "命令名",
  "command_content": "markdown内容",
  "version": "0.0.1",
  "owner": "邮箱",
  "belong_to": "主命令名.md（子命令需要）",
  "description": "描述（新建时）",
  "release_note": "发布说明（更新时）"
}
```

### search_reports
```json
{ "query": "关键词", "command_filter": "限定命令", "max_results": 10 }
```

### list_command_reports
```json
{ "command_name": "命令名" }
```

### get_report
```json
{ "command_name": "命令名", "report_name": "报告文件名" }
```

### report_feedback
```json
{
  "command_name": "目标命令",
  "report_content": "报告内容",
  "report_name": "报告文件名",
  "user_wants_upload": true,
  "owner": "邮箱"
}
```

---

## 规则速查表

| 类别 | 规则 |
|------|------|
| **⚠️ 用户确认** | 所有上传操作必须先询问用户确认 |
| **命名格式** | `{Module}-xx-yy-zz.md` |
| **子命令标记** | 文件开头必须有 `is_dependency: true` |
| **新建版本** | 从 `0.0.1` 开始 |
| **上传顺序** | 子命令先于主命令 |
| **报告目标** | 只能上传到已存在的 command 文件夹 |
| **邮箱获取** | AI 自动获取，失败才询问 |

---

**文档版本**: 0.5.1  
**最后更新**: 2025-12-23
