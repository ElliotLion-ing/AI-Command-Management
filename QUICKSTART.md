# 🚀 快速开始 - 5 分钟部署

## 服务器端（一键部署）

```bash
# 1. 安装包
npm install -g @elliotding/ai-command-tool-mcp@latest

# 2. 创建配置
sudo mkdir -p /opt/acmt/Commands /opt/acmt/Commands-Analyze-Report
sudo tee /opt/acmt/.ai-command-tool.json > /dev/null << 'EOF'
{
  "commands_directory": "/opt/acmt/Commands",
  "reports_directory": "/opt/acmt/Commands-Analyze-Report",
  "report_link_base_url": "https://your-domain.com/reports/"
}
EOF

# 3. 上传您的 Commands 和 Reports
scp -r ./Commands/* user@server:/opt/acmt/Commands/
scp -r ./Commands-Analyze-Report/* user@server:/opt/acmt/Commands-Analyze-Report/

# 4. 启动服务（临时测试）
PORT=5090 CONFIG_PATH=/opt/acmt/.ai-command-tool.json ai-command-tool

# 5. 测试
curl http://localhost:5090/health
```

---

## 用户端（Cursor 配置）

**文件位置**: `~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/mcp.json`

**配置内容**:

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

**替换**：
- `your-server-ip` → 您服务器的实际 IP 或域名
- 端口 `5090` → 如果修改了端口

**完成后**：
1. 保存文件
2. 重启 Cursor
3. 在 Cursor 中输入：`@ai-commands-management 列出命令`

---

## 生产部署（systemd 服务）

详见 `DEPLOYMENT.md`

---

## 验证部署

### 服务器

```bash
# 健康检查
curl http://localhost:5090/health
# 预期: {"status":"ok",...}
```

### 用户

```
在 Cursor 中输入:
@ai-commands-management 搜索 speech SDK 相关的命令
```

应该返回可用命令列表！✅

---

详细文档: 查看 `DEPLOYMENT.md`

