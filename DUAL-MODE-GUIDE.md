# 🔀 双模式支持说明

## 📋 两种运行模式

| 模式 | 命令 | 传输方式 | 使用场景 |
|------|------|---------|---------|
| **stdio** | `ai-command-tool` | 标准输入输出 | 本地开发、SSH 远程 |
| **SSE** | `ai-command-tool-server` | HTTP Server-Sent Events | 远程服务器部署 |

---

## 🎯 模式选择指南

### 使用 stdio 模式（`ai-command-tool`）

**适用场景**：
- ✅ 本地开发测试
- ✅ 通过 SSH 连接远程服务器
- ✅ Cursor 作为子进程启动
- ✅ 不需要开放端口

**优点**：
- 🚀 无需配置端口
- 🔒 通过 SSH 加密传输
- 💡 简单易用
- 🔐 不暴露网络端口

**缺点**：
- ❌ 每次调用建立新连接
- ❌ 需要 SSH 权限（远程使用时）

---

### 使用 SSE 模式（`ai-command-tool-server`）

**适用场景**：
- ✅ 生产环境部署
- ✅ 多用户共享访问
- ✅ 远程 HTTP/HTTPS 访问
- ✅ 需要长连接

**优点**：
- 🚀 长连接，响应快
- 👥 支持多用户并发
- 🌐 可通过公网访问
- 📊 易于监控和管理

**缺点**：
- ❌ 需要开放端口
- ❌ 需要配置防火墙/Nginx
- ❌ 需要持续运行服务

---

## 🛠️ 使用方法

### 模式 1: stdio 本地开发

#### 安装
```bash
npm install -g @elliotding/ai-command-tool-mcp@latest
```

#### Cursor 配置
```json
{
  "mcpServers": {
    "ai-command-tool": {
      "command": "ai-command-tool",
      "args": [],
      "env": {
        "CONFIG_PATH": "/path/to/config.json"
      }
    }
  }
}
```

#### 配置文件示例
```json
{
  "commands_directory": "/Users/you/Commands",
  "reports_directory": "/Users/you/Commands-Analyze-Report",
  "report_link_base_url": "file:///Users/you/Commands-Analyze-Report/"
}
```

---

### 模式 2: stdio 远程 SSH

#### Cursor 配置
```json
{
  "mcpServers": {
    "ai-command-tool-remote": {
      "command": "ssh",
      "args": [
        "user@your-server.com",
        "CONFIG_PATH=/opt/acmt/.ai-command-tool.json",
        "ai-command-tool"
      ]
    }
  }
}
```

#### 服务器端配置
```bash
# 安装
npm install -g @elliotding/ai-command-tool-mcp@latest

# 创建配置
sudo tee /opt/acmt/.ai-command-tool.json > /dev/null << 'EOF'
{
  "commands_directory": "/opt/acmt/Commands",
  "reports_directory": "/opt/acmt/Commands-Analyze-Report",
  "report_link_base_url": "https://your-domain.com/reports/"
}
EOF

# 上传 Commands
scp -r ./Commands/* user@server:/opt/acmt/Commands/
```

---

### 模式 3: SSE 远程服务器（生产环境）

#### 服务器端部署
```bash
# 方案 A: 一键部署
sudo ./deployment/deploy-server.sh

# 方案 B: 手动启动
PORT=5090 CONFIG_PATH=/opt/acmt/.ai-command-tool.json ai-command-tool-server

# 方案 C: systemd 服务
sudo systemctl start acmt-mcp
```

#### Cursor 配置
```json
{
  "mcpServers": {
    "ai-command-tool-remote": {
      "url": "http://your-server-ip:5090/sse",
      "transport": "sse"
    }
  }
}
```

或使用 HTTPS（推荐）：
```json
{
  "mcpServers": {
    "ai-command-tool-remote": {
      "url": "https://your-domain.com/mcp/sse",
      "transport": "sse"
    }
  }
}
```

---

### 模式 4: SSE 本地测试

#### 快速启动
```bash
# 使用测试脚本
./test-local.sh

# 或手动启动
PORT=5090 CONFIG_PATH=/tmp/test-config.json node dist/index-sse.js
```

#### Cursor 配置
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

---

## 🔍 模式对比

| 特性 | stdio 模式 | SSE 模式 |
|------|-----------|---------|
| **网络需求** | 无（本地）或 SSH | HTTP/HTTPS |
| **端口暴露** | ❌ 不需要 | ✅ 需要（5090） |
| **连接方式** | 短连接 | 长连接 |
| **启动方式** | 按需启动 | 持续运行 |
| **多用户** | ❌ 不支持 | ✅ 支持 |
| **性能** | 中等 | 高 |
| **安全性** | 高（SSH） | 中（需配置） |
| **配置复杂度** | 低 | 中 |
| **适用场景** | 开发/个人 | 生产/团队 |

---

## 📊 性能对比

### stdio 模式
```
用户请求 → Cursor 启动进程 → MCP 读取文件 → 返回结果 → 进程退出
每次请求: ~200-500ms（包括进程启动时间）
```

### SSE 模式
```
用户请求 → 通过 SSE 连接 → MCP 读取文件（缓存） → 返回结果
每次请求: ~50-100ms（长连接，有缓存）
```

---

## 🧪 本地测试完整流程

### 1. 使用测试脚本（推荐）

```bash
# 1. 确保已构建
npm run build

# 2. 运行测试脚本
./test-local.sh

# 3. 配置 Cursor（按脚本输出的配置）

# 4. 在 Cursor 中测试
@ai-command-tool-local 列出命令
```

### 2. 手动测试

```bash
# 1. 构建
npm run build

# 2. 创建配置
cat > /tmp/test-config.json << 'EOF'
{
  "commands_directory": "./Commands",
  "reports_directory": "./Commands-Analyze-Report",
  "log_level": "debug"
}
EOF

# 3. 启动 SSE 服务器
PORT=5090 CONFIG_PATH=/tmp/test-config.json node dist/index-sse.js

# 4. 测试健康检查（新终端）
curl http://localhost:5090/health

# 5. 配置 Cursor 并测试
```

---

## 🎯 推荐配置

### 开发者本地开发
```
推荐: stdio 模式
命令: ai-command-tool
配置: 本地路径
```

### 个人远程服务器
```
推荐: stdio + SSH
命令: ssh user@server ai-command-tool
配置: SSH 免密登录
```

### 团队共享服务器
```
推荐: SSE 模式 + systemd
命令: ai-command-tool-server
配置: HTTPS + Nginx
```

---

## 🔧 故障排查

### stdio 模式问题

**问题**: `command not found: ai-command-tool`
```bash
# 检查安装
which ai-command-tool

# 重新安装
npm install -g @elliotding/ai-command-tool-mcp@latest

# 或使用 npm link（开发）
npm link
```

**问题**: 配置文件找不到
```bash
# 使用绝对路径
CONFIG_PATH=/absolute/path/to/config.json ai-command-tool
```

---

### SSE 模式问题

**问题**: 连接被拒绝
```bash
# 检查服务是否运行
curl http://localhost:5090/health

# 检查端口占用
lsof -i :5090

# 检查日志
sudo journalctl -u acmt-mcp -f
```

**问题**: 防火墙阻止
```bash
# 开放端口
sudo ufw allow 5090/tcp

# 或使用 Nginx 反向代理
```

---

## 📝 配置文件位置

### 默认搜索路径（两种模式通用）

1. `CONFIG_PATH` 环境变量指定的路径
2. `./.ai-command-tool.json`（当前目录）
3. `~/.ai-command-tool.json`（用户 Home）
4. `/etc/ai-command-tool/config.json`（系统级）

### 优先级
```
环境变量 > 当前目录 > 用户 Home > 系统级
```

---

## 🎉 总结

✅ **stdio 模式**：简单、安全、适合开发和个人使用  
✅ **SSE 模式**：强大、高效、适合生产和团队使用

**两者都支持，根据场景选择！**

