# 📝 问题解答总结

## ❓ 问题 1: 这个 MCP 还支持 stdio 模式吗？

### 答案：✅ 现在支持了！

**之前状态**：
- ❌ 只支持 SSE 模式
- ❌ `src/index.ts`（stdio 实现）没有被构建

**现在状态**：
- ✅ **双模式支持**
- ✅ `ai-command-tool` - stdio 模式
- ✅ `ai-command-tool-server` - SSE 模式
- ✅ 两个文件都被构建到 `dist/`

**构建产物**：
```bash
dist/
├── index.js        # stdio 模式 (54 KB)
└── index-sse.js    # SSE 模式 (53 KB)
```

---

## ❓ 问题 2: 如何支持两种模式？

### 答案：两个独立命令

**package.json 配置**：
```json
{
  "bin": {
    "ai-command-tool": "dist/index.js",           // stdio 模式
    "ai-command-tool-server": "dist/index-sse.js" // SSE 模式
  },
  "scripts": {
    "build": "tsup src/index.ts src/index-sse.ts --format cjs --clean --no-dts"
  }
}
```

### 使用方法

#### stdio 模式
```bash
# 本地运行
ai-command-tool

# 或 SSH 远程
ssh user@server "CONFIG_PATH=/path/to/config.json ai-command-tool"
```

**Cursor 配置**：
```json
{
  "mcpServers": {
    "ai-command-tool": {
      "command": "ai-command-tool",
      "env": {"CONFIG_PATH": "/path/to/config.json"}
    }
  }
}
```

#### SSE 模式
```bash
# 启动服务器
PORT=5090 CONFIG_PATH=/path/to/config.json ai-command-tool-server

# 或使用 systemd
sudo systemctl start acmt-mcp
```

**Cursor 配置**：
```json
{
  "mcpServers": {
    "ai-command-tool": {
      "url": "http://server-ip:5090/sse",
      "transport": "sse"
    }
  }
}
```

### 为什么不能自动切换？

**原因**：MCP 的传输层是互斥的
- `StdioServerTransport` - 进程间通信
- `SSEServerTransport` - HTTP 网络通信

**这是完全不同的运行方式！**

---

## ❓ 问题 3: System User 的作用？

### 答案：🔒 安全隔离

### 创建的用户
```bash
sudo useradd -r -s /bin/false -d /opt/acmt -c "ACMT MCP Service" acmt
```

### 参数解释

| 参数 | 含义 | 安全效果 |
|------|------|---------|
| `-r` | 系统用户（UID < 1000） | 不是真实用户，不能登录 |
| `-s /bin/false` | Shell 禁用 | 即使知道密码也无法登录 |
| `-d /opt/acmt` | Home 目录 | 限制活动范围 |
| `acmt` | 用户名 | 服务专用身份 |

### 安全对比

#### ❌ 以 root 运行（危险）
```
MCP 服务被攻击 → 攻击者获得 root 权限 → 控制整个系统
```

#### ✅ 以 acmt 用户运行（安全）
```
MCP 服务被攻击 → 攻击者只有 acmt 权限 → 只能访问 /opt/acmt/
```

### systemd 额外保护

```ini
[Service]
User=acmt                    # 以 acmt 用户运行
Group=acmt
ProtectSystem=strict         # 系统目录只读
ReadWritePaths=/opt/acmt     # 只能写入这个目录
ProtectHome=true             # 无法访问其他用户 Home
NoNewPrivileges=true         # 无法提升权限
```

### 实际效果

**如果服务被入侵**：
- ❌ 无法读取 `/etc/shadow`（密码文件）
- ❌ 无法写入 `/usr/bin/`（系统程序）
- ❌ 无法访问其他用户文件
- ✅ 只能访问 `/opt/acmt/` 目录

---

## ❓ 问题 4: `report_link_base_url` 的作用？

### 答案：📎 生成报告访问链接

### 工作原理

#### 步骤 1: MCP 找到报告文件
```
/opt/acmt/Commands-Analyze-Report/
  └── analyze_zoom_speech_sdk_log-reports/
      └── Zoom_Speech_SDK_日志分析报告_20251120_decode_response_v6.md
```

#### 步骤 2: 生成访问链接
```json
{
  "report_link_base_url": "https://reports.example.com/"
}
```

生成链接：
```
https://reports.example.com/analyze_zoom_speech_sdk_log-reports/Zoom_Speech_SDK_日志分析报告_20251120_decode_response_v6.md
```

#### 步骤 3: 返回给用户
```json
{
  "reports": [
    {
      "title": "Zoom Speech SDK 日志分析报告",
      "link": "https://reports.example.com/...",
      "date": "2025-11-20"
    }
  ]
}
```

用户可以点击链接查看报告！

### 使用场景

#### 场景 A: 有 Web 服务器
```json
"report_link_base_url": "https://reports.yourcompany.com/"
```

配置 Nginx：
```nginx
server {
    location /reports/ {
        alias /opt/acmt/Commands-Analyze-Report/;
        autoindex on;
    }
}
```

#### 场景 B: 本地文件
```json
"report_link_base_url": "file:///opt/acmt/Commands-Analyze-Report/"
```

生成链接：
```
file:///opt/acmt/Commands-Analyze-Report/analyze_zoom_speech_sdk_log-reports/report.md
```

#### 场景 C: 不需要链接
```json
"report_link_base_url": ""
```

MCP 仍返回报告内容，只是没有可点击的链接。

---

## ❓ 问题 5: 本地测试怎么做？

### 答案：🏠 使用测试脚本

### 方案 A: 快速测试（推荐）

```bash
# 1. 运行测试脚本
./test-local.sh

# 脚本会自动：
#   - 检查并构建项目
#   - 创建测试配置
#   - 启动 SSE 服务器（port 5090）
#   - 显示 Cursor 配置方法

# 2. 按照输出配置 Cursor

# 3. 在 Cursor 中测试
@ai-command-tool-local 列出命令
```

### 方案 B: 手动测试

```bash
# 1. 构建
npm run build

# 2. 创建配置
cat > /tmp/test-config.json << 'EOF'
{
  "commands_directory": "/Users/ElliotDing/SourceCode/MCP-Package-Deploy/AI-Command-Management/Commands",
  "reports_directory": "/Users/ElliotDing/SourceCode/MCP-Package-Deploy/AI-Command-Management/Commands-Analyze-Report",
  "report_link_base_url": "",
  "log_level": "debug"
}
EOF

# 3. 启动服务（SSE 模式）
PORT=5090 CONFIG_PATH=/tmp/test-config.json node dist/index-sse.js

# 4. 测试健康检查（新终端）
curl http://localhost:5090/health
# 预期: {"status":"ok",...}
```

### 方案 C: stdio 模式测试

```bash
# 1. 构建
npm run build

# 2. 使用 npm link
npm link

# 3. 直接运行
CONFIG_PATH=/tmp/test-config.json ai-command-tool
# 会等待 JSON-RPC 输入
```

### Cursor 本地配置

**文件位置**:
```
~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/mcp.json
```

#### SSE 本地测试
```json
{
  "mcpServers": {
    "ai-command-tool-local": {
      "url": "http://localhost:5090/sse",
      "transport": "sse"
    }
  }
}
```

#### stdio 本地测试
```json
{
  "mcpServers": {
    "ai-command-tool-local": {
      "command": "ai-command-tool",
      "env": {
        "CONFIG_PATH": "/tmp/test-config.json"
      }
    }
  }
}
```

### ❌ 不需要运行 `deploy-server.sh`！

**为什么？**
- `deploy-server.sh` 是**生产部署脚本**
- 它会创建系统用户、安装 systemd 服务等
- **本地测试不需要这些**

**本地测试只需要**：
1. ✅ 构建项目（`npm run build`）
2. ✅ 创建配置文件
3. ✅ 启动服务（手动或脚本）
4. ✅ 配置 Cursor

---

## 🎯 快速参考

### 文件对照表

| 文件 | 用途 | 何时使用 |
|------|------|---------|
| `test-local.sh` | 本地测试脚本 | 开发调试 |
| `deployment/deploy-server.sh` | 生产部署脚本 | 服务器部署 |
| `DUAL-MODE-GUIDE.md` | 双模式详细说明 | 了解两种模式 |
| `DEPLOYMENT.md` | 完整部署指南 | 生产环境部署 |
| `QUICKSTART.md` | 5 分钟快速开始 | 快速体验 |

### 命令对照表

| 场景 | 命令 | 配置 |
|------|------|------|
| 本地 stdio 测试 | `ai-command-tool` | Cursor: command |
| 本地 SSE 测试 | `ai-command-tool-server` | Cursor: http://localhost:5090/sse |
| SSH 远程 | `ssh user@server ai-command-tool` | Cursor: ssh command |
| 生产 SSE | `systemctl start acmt-mcp` | Cursor: https://domain/mcp/sse |

### 配置对照表

| 场景 | `report_link_base_url` |
|------|------------------------|
| 本地测试 | `""` 或 `"file://..."` |
| 有 Web 服务器 | `"https://reports.example.com/"` |
| Nginx 托管 | `"https://yourdomain.com/reports/"` |
| 不需要链接 | `""` |

---

## 📚 相关文档

- **DUAL-MODE-GUIDE.md** - 双模式完整对比和使用指南
- **DEPLOYMENT.md** - 生产环境完整部署指南
- **QUICKSTART.md** - 5 分钟快速开始
- **test-local.sh** - 本地测试自动化脚本

---

## 💡 最佳实践建议

### 开发阶段
```
✅ 使用 stdio 模式（ai-command-tool）
✅ 使用 test-local.sh 快速测试
✅ report_link_base_url 设为空
```

### 个人使用
```
✅ 使用 stdio + SSH 模式
✅ 无需开放端口
✅ 简单安全
```

### 团队/生产
```
✅ 使用 SSE 模式（ai-command-tool-server）
✅ 配置 systemd 服务
✅ 使用 Nginx + HTTPS
✅ 创建系统用户隔离
✅ 配置 Web 服务器托管报告
```

