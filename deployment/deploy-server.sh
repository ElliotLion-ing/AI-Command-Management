#!/bin/bash

# AI Commands Management Tool - Server Deployment Script
# This script deploys the MCP server in SSE mode

set -e

echo "🚀 AI Commands Management Tool - Server Deployment"
echo "=================================================="

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
INSTALL_DIR="${INSTALL_DIR:-/opt/acmt}"
SERVICE_USER="${SERVICE_USER:-acmt}"
PORT="${PORT:-5090}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ This script must be run as root${NC}"
    echo "Please run: sudo ./deploy-server.sh"
    exit 1
fi

# Check Node.js version
echo "📋 Checking Node.js version..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js >= 18.0.0"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version must be >= 18.0.0${NC}"
    echo "Current version: $(node -v)"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v) detected${NC}"

# Create system user
echo "👤 Creating service user..."
if id "$SERVICE_USER" &>/dev/null; then
    echo -e "${YELLOW}⚠️  User $SERVICE_USER already exists${NC}"
else
    useradd -r -s /bin/false -d "$INSTALL_DIR" -c "ACMT MCP Service" "$SERVICE_USER"
    echo -e "${GREEN}✅ User $SERVICE_USER created${NC}"
fi

# Create directory structure
echo "📁 Creating directory structure..."
mkdir -p "$INSTALL_DIR"/{Commands,Commands-Analyze-Report,logs}
chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
echo -e "${GREEN}✅ Directories created at $INSTALL_DIR${NC}"

# Install package globally
echo "📦 Installing AI Commands Management Tool..."
npm install -g @elliotding/ai-command-tool-mcp@latest

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Package installed successfully${NC}"
else
    echo -e "${RED}❌ Failed to install package${NC}"
    exit 1
fi

# Create configuration file
echo "⚙️  Creating configuration file..."
cat > "$INSTALL_DIR/.ai-command-tool.json" << EOF
{
  "commands_directory": "$INSTALL_DIR/Commands",
  "reports_directory": "$INSTALL_DIR/Commands-Analyze-Report",
  "cache_ttl_seconds": 600,
  "cache_max_entries": 1000,
  "max_search_results": 20,
  "search_timeout_ms": 5000,
  "enable_cache": true,
  "report_link_base_url": "https://your-domain.com/reports/",
  "log_level": "info",
  "enable_report_upload": true,
  "report_upload_max_size_mb": 10,
  "report_auto_versioning": true,
  "report_file_permissions": "644"
}
EOF

chown "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR/.ai-command-tool.json"
echo -e "${GREEN}✅ Configuration created${NC}"

# Copy systemd service file
echo "🔧 Installing systemd service..."
cp deployment/acmt-mcp.service /etc/systemd/system/
sed -i "s|User=acmt|User=$SERVICE_USER|g" /etc/systemd/system/acmt-mcp.service
sed -i "s|Group=acmt|Group=$SERVICE_USER|g" /etc/systemd/system/acmt-mcp.service
sed -i "s|WorkingDirectory=/opt/acmt|WorkingDirectory=$INSTALL_DIR|g" /etc/systemd/system/acmt-mcp.service
sed -i "s|ReadWritePaths=/opt/acmt|ReadWritePaths=$INSTALL_DIR|g" /etc/systemd/system/acmt-mcp.service
sed -i "s|CONFIG_PATH=/opt/acmt/.ai-command-tool.json|CONFIG_PATH=$INSTALL_DIR/.ai-command-tool.json|g" /etc/systemd/system/acmt-mcp.service
sed -i "s|PORT=5090|PORT=$PORT|g" /etc/systemd/system/acmt-mcp.service

systemctl daemon-reload
echo -e "${GREEN}✅ Systemd service installed${NC}"

# Show next steps
echo ""
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Upload your Commands and Reports:"
echo -e "   ${YELLOW}scp -r ./Commands/* root@server:$INSTALL_DIR/Commands/${NC}"
echo -e "   ${YELLOW}scp -r ./Commands-Analyze-Report/* root@server:$INSTALL_DIR/Commands-Analyze-Report/${NC}"
echo ""
echo "2. Edit configuration (optional):"
echo -e "   ${YELLOW}nano $INSTALL_DIR/.ai-command-tool.json${NC}"
echo ""
echo "3. Start the service:"
echo -e "   ${YELLOW}systemctl start acmt-mcp${NC}"
echo ""
echo "4. Enable auto-start on boot:"
echo -e "   ${YELLOW}systemctl enable acmt-mcp${NC}"
echo ""
echo "5. Check service status:"
echo -e "   ${YELLOW}systemctl status acmt-mcp${NC}"
echo ""
echo "6. View logs:"
echo -e "   ${YELLOW}journalctl -u acmt-mcp -f${NC}"
echo ""
echo "📡 Server endpoints:"
echo -e "   SSE:    ${GREEN}http://$(hostname -f):${PORT}/sse${NC}"
echo -e "   Health: ${GREEN}http://$(hostname -f):${PORT}/health${NC}"
echo ""
echo "🔒 Important: Configure firewall or reverse proxy to expose port $PORT"
echo ""

