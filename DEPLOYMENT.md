# 🚀 AI Commands Management Tool - SSE 部署指南

## 📋 目录

1. [服务器部署](#服务器部署)
2. [配置说明](#配置说明)
3. [服务管理](#服务管理)
4. [用户 Cursor 配置](#用户-cursor-配置)
5. [故障排查](#故障排查)

---

## 🖥️ 服务器部署

### 前置要求

- ✅ Node.js >= 18.0.0
- ✅ npm
- ✅ systemd (Linux)
- ✅ Root 权限

### 快速部署

```bash
# 1. 下载部署脚本
wget https://raw.githubusercontent.com/ElliotLion-ing/AI-Command-Management/main/deployment/deploy-server.sh

# 2. 赋予执行权限
chmod +x deploy-server.sh

# 3. 运行部署脚本
sudo ./deploy-server.sh
```

### 手动部署步骤

#### 步骤 1: 安装包

```bash
# 全局安装
npm install -g @elliotding/ai-command-tool-mcp@latest

# 验证安装
which ai-command-tool
# 输出: /usr/local/bin/ai-command-tool
```

#### 步骤 2: 创建服务用户

```bash
# 创建系统用户（无登录权限）
sudo useradd -r -s /bin/false -d /opt/acmt -c "ACMT MCP Service" acmt
```

#### 步骤 3: 创建目录结构

```bash
# 创建目录
sudo mkdir -p /opt/acmt/{Commands,Commands-Analyze-Report,logs}

# 设置权限
sudo chown -R acmt:acmt /opt/acmt
```

#### 步骤 4: 创建配置文件

```bash
sudo tee /opt/acmt/.ai-command-tool.json > /dev/null << 'EOF'
{
  "commands_directory": "/opt/acmt/Commands",
  "reports_directory": "/opt/acmt/Commands-Analyze-Report",
  "cache_ttl_seconds": 600,
  "cache_max_entries": 1000,
  "max_search_results": 20,
  "search_timeout_ms": 5000,
  "enable_cache": true,
  "report_link_base_url": "https://your-domain.com/reports/",
  "log_level": "info"
}
EOF

# 设置权限
sudo chown acmt:acmt /opt/acmt/.ai-command-tool.json
sudo chmod 600 /opt/acmt/.ai-command-tool.json
```

#### 步骤 5: 上传 Commands 和 Reports

```bash
# 从本地上传到服务器
scp -r ./Commands/* root@server:/opt/acmt/Commands/
scp -r ./Commands-Analyze-Report/* root@server:/opt/acmt/Commands-Analyze-Report/

# 设置权限
sudo chown -R acmt:acmt /opt/acmt/Commands
sudo chown -R acmt:acmt /opt/acmt/Commands-Analyze-Report
```

#### 步骤 6: 安装 systemd 服务

```bash
# 下载服务配置
sudo wget -O /etc/systemd/system/acmt-mcp.service \
  https://raw.githubusercontent.com/ElliotLion-ing/AI-Command-Management/main/deployment/acmt-mcp.service

# 重新加载 systemd
sudo systemctl daemon-reload
```

#### 步骤 7: 启动服务

```bash
# 启动服务
sudo systemctl start acmt-mcp

# 设置开机自启
sudo systemctl enable acmt-mcp

# 查看状态
sudo systemctl status acmt-mcp
```

---

## ⚙️ 配置说明

### 配置文件位置

```
/opt/acmt/.ai-command-tool.json
```

### 配置选项

```json
{
  "commands_directory": "/opt/acmt/Commands",        // Commands 目录路径
  "reports_directory": "/opt/acmt/Commands-Analyze-Report",  // Reports 目录路径
  "cache_ttl_seconds": 600,                          // 缓存过期时间（秒）
  "cache_max_entries": 1000,                         // 最大缓存条目
  "max_search_results": 20,                          // 搜索最大结果数
  "search_timeout_ms": 5000,                         // 搜索超时时间（毫秒）
  "enable_cache": true,                              // 是否启用缓存
  "report_link_base_url": "https://your-domain.com/reports/",  // 报告链接基础 URL
  "log_level": "info"                                // 日志级别: debug/info/warn/error
}
```

### 环境变量（优先级更高）

```bash
# 在 systemd 服务或 shell 中设置
PORT=5090                                           # 服务端口
CONFIG_PATH=/opt/acmt/.ai-command-tool.json        # 配置文件路径
NODE_ENV=production                                 # 运行环境
```

---

## 🔧 服务管理

### 基本命令

```bash
# 启动服务
sudo systemctl start acmt-mcp

# 停止服务
sudo systemctl stop acmt-mcp

# 重启服务
sudo systemctl restart acmt-mcp

# 查看状态
sudo systemctl status acmt-mcp

# 设置开机自启
sudo systemctl enable acmt-mcp

# 取消开机自启
sudo systemctl disable acmt-mcp
```

### 查看日志

```bash
# 查看实时日志
sudo journalctl -u acmt-mcp -f

# 查看最近 100 行日志
sudo journalctl -u acmt-mcp -n 100

# 查看今天的日志
sudo journalctl -u acmt-mcp --since today

# 查看特定时间的日志
sudo journalctl -u acmt-mcp --since "2025-11-25 10:00:00"
```

### 服务健康检查

```bash
# HTTP 健康检查
curl http://localhost:5090/health

# 预期输出:
# {"status":"ok","service":"AI Commands Management Tool MCP Server","version":"0.0.3"}

# 或者通过域名
curl https://your-domain.com/mcp/health
```

---

## 👥 用户 Cursor 配置

### 配置文件位置

**macOS**:
```
~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/mcp.json
```

**Windows**:
```
%APPDATA%\Cursor\User\globalStorage\saoudrizwan.claude-dev\settings\mcp.json
```

**Linux**:
```
~/.config/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/mcp.json
```

### 配置内容

#### 方案 A: 直接 HTTP 连接（局域网/VPN）

```json
{
  "mcpServers": {
    "ai-commands-management": {
      "url": "http://your-server-ip:5090/sse",
      "transport": "sse"
    }
  }
}
```

#### 方案 B: HTTPS 连接（推荐）

```json
{
  "mcpServers": {
    "ai-commands-management": {
      "url": "https://your-domain.com/mcp/sse",
      "transport": "sse"
    }
  }
}
```

### 配置示例

**假设服务器地址**：`mcp-server.example.com`

```json
{
  "mcpServers": {
    "ai-commands-management": {
      "url": "https://mcp-server.example.com/mcp/sse",
      "transport": "sse"
    }
  }
}
```

---

## 🔒 安全配置（可选但推荐）

### 使用 Nginx 反向代理（HTTPS）

#### 1. 安装 Nginx

```bash
sudo apt update
sudo apt install nginx
```

#### 2. 安装 SSL 证书（Let's Encrypt）

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

#### 3. 配置 Nginx

```bash
# 复制配置文件
sudo cp deployment/nginx-acmt.conf /etc/nginx/sites-available/acmt-mcp

# 修改域名
sudo sed -i 's/your-domain.com/YOUR_ACTUAL_DOMAIN/g' /etc/nginx/sites-available/acmt-mcp

# 启用站点
sudo ln -s /etc/nginx/sites-available/acmt-mcp /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重新加载 Nginx
sudo systemctl reload nginx
```

#### 4. 更新用户配置

```json
{
  "mcpServers": {
    "ai-commands-management": {
      "url": "https://your-domain.com/mcp/sse",
      "transport": "sse"
    }
  }
}
```

---

## 🧪 测试部署

### 服务器端测试

```bash
# 1. 检查服务状态
sudo systemctl status acmt-mcp

# 2. 测试健康检查
curl http://localhost:5090/health
# 预期: {"status":"ok","service":"AI Commands Management Tool MCP Server","version":"0.0.3"}

# 3. 测试 SSE 连接
curl -N http://localhost:5090/sse
# 应该保持连接打开

# 4. 检查日志
sudo journalctl -u acmt-mcp -n 50
```

### 客户端测试（Cursor）

1. 配置 `mcp.json`（见上面）
2. 重启 Cursor
3. 在 Cursor 中测试：
   ```
   @ai-commands-management 列出所有可用的命令
   ```

---

## 🔍 故障排查

### 问题 1: 服务无法启动

```bash
# 查看详细错误
sudo journalctl -u acmt-mcp -n 100

# 常见原因：
# 1. 端口被占用
sudo lsof -i :5090

# 2. 配置文件错误
cat /opt/acmt/.ai-command-tool.json

# 3. 目录权限问题
ls -la /opt/acmt/

# 4. Node.js 版本
node -v  # 需要 >= 18.0.0
```

### 问题 2: 用户无法连接

```bash
# 1. 检查防火墙
sudo ufw status
sudo ufw allow 5090/tcp  # 如果直接暴露端口

# 2. 检查 Nginx（如果使用）
sudo nginx -t
sudo systemctl status nginx

# 3. 测试连接
curl -v http://SERVER_IP:5090/health

# 4. 检查 DNS（如果使用域名）
nslookup your-domain.com
```

### 问题 3: Commands 找不到

```bash
# 1. 检查目录
ls -la /opt/acmt/Commands/

# 2. 检查配置
cat /opt/acmt/.ai-command-tool.json | grep commands_directory

# 3. 检查权限
sudo -u acmt ls /opt/acmt/Commands/

# 4. 查看服务日志
sudo journalctl -u acmt-mcp | grep "command"
```

### 问题 4: SSE 连接断开

```bash
# 1. 检查超时设置（Nginx）
grep proxy_read_timeout /etc/nginx/sites-available/acmt-mcp

# 2. 检查服务日志
sudo journalctl -u acmt-mcp | grep "SSE connection"

# 3. 重启服务
sudo systemctl restart acmt-mcp
```

---

## 📊 监控和维护

### 资源监控

```bash
# CPU 和内存使用
systemctl status acmt-mcp

# 详细资源使用
top -p $(pgrep -f ai-command-tool)

# 或使用 htop
htop -p $(pgrep -f ai-command-tool)
```

### 日志管理

```bash
# 查看日志大小
sudo journalctl --disk-usage

# 清理旧日志（保留最近 7 天）
sudo journalctl --vacuum-time=7d

# 限制日志大小
sudo journalctl --vacuum-size=500M
```

### 定期维护

```bash
# 更新到最新版本
sudo npm update -g @elliotding/ai-command-tool-mcp

# 重启服务应用更新
sudo systemctl restart acmt-mcp

# 检查新版本
npm view @elliotding/ai-command-tool-mcp version
```

---

## 🌐 网络架构

### 架构图

```
用户 Cursor (本地)
    ↓ HTTPS/SSE
Nginx 反向代理 (443)
    ↓ HTTP (内网)
MCP Server (5090)
    ↓ 本地文件系统
Commands/ 和 Reports/
```

### 端口说明

| 端口 | 用途 | 访问权限 |
|------|------|----------|
| 5090 | MCP SSE 服务 | 内网（通过 Nginx） |
| 443  | HTTPS (Nginx) | 公网 |
| 80   | HTTP重定向 | 公网 |

---

## 📝 配置示例

### 开发环境

```json
{
  "commands_directory": "/home/dev/Commands",
  "reports_directory": "/home/dev/Commands-Analyze-Report",
  "cache_ttl_seconds": 60,
  "log_level": "debug"
}
```

### 生产环境

```json
{
  "commands_directory": "/opt/acmt/Commands",
  "reports_directory": "/opt/acmt/Commands-Analyze-Report",
  "cache_ttl_seconds": 3600,
  "cache_max_entries": 5000,
  "max_search_results": 50,
  "enable_cache": true,
  "log_level": "warn"
}
```

---

## 🔐 安全最佳实践

### 1. 使用 HTTPS

- ✅ 强制使用 SSL/TLS
- ✅ 使用 Let's Encrypt 免费证书
- ✅ 在 Nginx 中配置安全头

### 2. 防火墙配置

```bash
# 只开放必要的端口
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP (重定向)
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable

# 不要直接暴露 5090 端口！
```

### 3. 访问控制（可选）

在 Nginx 中添加 IP 白名单：

```nginx
location /mcp/sse {
    # 只允许特定 IP 访问
    allow 192.168.1.0/24;   # 公司内网
    allow 10.0.0.0/8;        # VPN 网段
    deny all;
    
    proxy_pass http://acmt_backend/sse;
    # ... 其他配置
}
```

### 4. 认证（高级，需要额外实现）

添加 API key 或 JWT 认证：

```nginx
location /mcp/sse {
    # 检查认证头
    if ($http_authorization != "Bearer YOUR_SECRET_TOKEN") {
        return 401;
    }
    
    proxy_pass http://acmt_backend/sse;
}
```

---

## 📊 性能优化

### 1. 缓存配置

```json
{
  "cache_ttl_seconds": 3600,      // 增加缓存时间
  "cache_max_entries": 5000,      // 增加缓存容量
  "enable_cache": true
}
```

### 2. Node.js 性能

```bash
# 在 systemd 服务中添加：
Environment="NODE_OPTIONS=--max-old-space-size=2048"
```

### 3. 并发连接

```nginx
# Nginx 优化
upstream acmt_backend {
    server 127.0.0.1:5090;
    keepalive 128;  # 增加 keepalive 连接数
}
```

---

## 🎯 完整部署清单

### 服务器端

- [ ] Node.js >= 18.0.0 已安装
- [ ] npm 包已全局安装
- [ ] 系统用户 `acmt` 已创建
- [ ] 目录 `/opt/acmt` 已创建
- [ ] Commands/ 已上传
- [ ] Commands-Analyze-Report/ 已上传
- [ ] 配置文件 `.ai-command-tool.json` 已创建
- [ ] systemd 服务已安装
- [ ] 服务已启动并设置开机自启
- [ ] 健康检查通过（curl http://localhost:5090/health）
- [ ] Nginx 反向代理已配置（如果使用 HTTPS）
- [ ] SSL 证书已安装（如果使用 HTTPS）
- [ ] 防火墙已配置

### 用户端

- [ ] Cursor 的 `mcp.json` 已配置
- [ ] 服务器地址正确
- [ ] 网络连接正常
- [ ] Cursor 已重启
- [ ] MCP 工具可用（在 Cursor 中测试）

---

## 📞 技术支持

- **GitHub Issues**: https://github.com/ElliotLion-ing/AI-Command-Management/issues
- **文档**: https://github.com/ElliotLion-ing/AI-Command-Management

---

**部署版本**: 0.0.3  
**更新日期**: 2025-11-26

