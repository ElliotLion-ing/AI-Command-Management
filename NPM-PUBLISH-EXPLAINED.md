# 📦 npm 发布说明 - 一个包，两个命令

## 🎯 核心概念

### 发布的是什么？

**只发布 1 个 npm 包**，但这个包**包含 2 个可执行命令**。

```
┌─────────────────────────────────────────┐
│  npm 包: @elliotding/ai-command-tool-mcp │
│  版本: 0.0.3 (单一版本号)                 │
│                                          │
│  包含内容:                                │
│  ├── dist/index.js (stdio 实现)          │
│  ├── dist/index-sse.js (SSE 实现)        │
│  ├── package.json (定义两个命令)          │
│  ├── README.md                           │
│  └── LICENSE                             │
└─────────────────────────────────────────┘
```

---

## 🔧 package.json 的魔法

### `bin` 字段的作用

```json
{
  "name": "@elliotding/ai-command-tool-mcp",
  "version": "0.0.3",
  
  "bin": {
    "ai-command-tool": "dist/index.js",
    "ai-command-tool-server": "dist/index-sse.js"
  }
}
```

**npm 会自动创建这些命令的符号链接！**

---

## 📊 发布和安装流程

### 1. 发布（你运行）

```bash
./publish.sh

# 过程:
# 1. 运行测试
# 2. 构建 dist/index.js 和 dist/index-sse.js
# 3. 打包所有内容
# 4. 发布到 npm (单一包)
```

### 2. 用户安装

```bash
npm install -g @elliotding/ai-command-tool-mcp

# npm 自动执行:
# 1. 下载包到: /usr/local/lib/node_modules/@elliotding/ai-command-tool-mcp/
# 2. 创建符号链接:
#    /usr/local/bin/ai-command-tool 
#      -> ../lib/node_modules/@elliotding/ai-command-tool-mcp/dist/index.js
#    /usr/local/bin/ai-command-tool-server 
#      -> ../lib/node_modules/@elliotding/ai-command-tool-mcp/dist/index-sse.js
```

### 3. 用户使用

```bash
# 两个命令都可用
ai-command-tool          # 运行 dist/index.js (stdio)
ai-command-tool-server   # 运行 dist/index-sse.js (SSE)

# 但它们来自同一个包
which ai-command-tool
# /usr/local/bin/ai-command-tool -> .../ai-command-tool-mcp/dist/index.js

which ai-command-tool-server
# /usr/local/bin/ai-command-tool-server -> .../ai-command-tool-mcp/dist/index-sse.js
```

---

## 🔍 验证包内容

### 运行 publish.sh 时会显示

```bash
./publish.sh

# 在发布前会显示包内容:
📦 Package contents:
npm notice 📦  @elliotding/ai-command-tool-mcp@0.0.3
npm notice === Tarball Contents === 
npm notice 54.1kB dist/index.js
npm notice 53.5kB dist/index-sse.js
npm notice 2.1kB  package.json
npm notice 15.3kB README.md
npm notice 1.1kB  LICENSE
npm notice === Tarball Details === 
npm notice name:          @elliotding/ai-command-tool-mcp
npm notice version:       0.0.3
npm notice filename:      @elliotding/ai-command-tool-mcp-0.0.3.tgz
npm notice package size:  45.2 kB
npm notice unpacked size: 125.1 kB
npm notice total files:   5
```

### 手动预览包内容

```bash
# 不实际发布，只查看包含的文件
npm pack --dry-run

# 或者真的打包成 .tgz（但不上传）
npm pack
# 生成: @elliotding-ai-command-tool-mcp-0.0.3.tgz

# 查看包内容
tar -tzf @elliotding-ai-command-tool-mcp-0.0.3.tgz
```

---

## 🎭 类比：其他 npm 包的例子

### 例子 1: `typescript` 包

```bash
npm install -g typescript

# 得到多个命令:
tsc        # TypeScript 编译器
tsserver   # 语言服务器

# 但只是一个包: typescript@5.x.x
```

**package.json**:
```json
{
  "name": "typescript",
  "version": "5.3.3",
  "bin": {
    "tsc": "./bin/tsc",
    "tsserver": "./bin/tsserver"
  }
}
```

### 例子 2: `npm` 包本身

```bash
npm install -g npm

# 得到多个命令:
npm
npx

# 但只是一个包: npm@10.x.x
```

### 你的包：一样的原理

```bash
npm install -g @elliotding/ai-command-tool-mcp

# 得到多个命令:
ai-command-tool
ai-command-tool-server

# 只是一个包: @elliotding/ai-command-tool-mcp@0.0.3
```

---

## 📋 发布清单

### 运行 `./publish.sh` 会做什么？

| 步骤 | 操作 | 结果 |
|------|------|------|
| 1 | 运行测试 | 确保代码质量 |
| 2 | 运行 lint | 检查代码风格 |
| 3 | **构建** | 生成 `dist/index.js` 和 `dist/index-sse.js` |
| 4 | 打包 | 创建 `.tgz` 包（包含两个 js 文件）|
| 5 | **发布** | 上传到 npm（**单一包，单一版本**）|
| 6 | 创建 git tag | 标记这个版本 |

### 用户安装后得到什么？

| 安装命令 | 结果 |
|---------|------|
| `npm install -g @elliotding/ai-command-tool-mcp@0.0.3` | ✅ 安装**一个包** |
| 自动创建 | ✅ 创建 `ai-command-tool` 命令（指向 `dist/index.js`）|
| 自动创建 | ✅ 创建 `ai-command-tool-server` 命令（指向 `dist/index-sse.js`）|

---

## 🔍 实际测试

### 发布前测试（推荐）

```bash
# 1. 构建
npm run build

# 2. 本地测试 "假装全局安装"
npm link

# 3. 测试两个命令
which ai-command-tool
which ai-command-tool-server

ai-command-tool --help
ai-command-tool-server --help

# 4. 清理
npm unlink -g @elliotding/ai-command-tool-mcp
```

### 发布到 npm

```bash
# 运行发布脚本
./publish.sh

# 选择版本类型（通常选 patch）
# 确认发布

# ✅ 发布完成！
```

### 发布后测试

```bash
# 卸载本地链接版本
npm unlink -g @elliotding/ai-command-tool-mcp

# 从 npm 安装正式版本
npm install -g @elliotding/ai-command-tool-mcp@latest

# 测试两个命令
ai-command-tool --version
ai-command-tool-server --version

# 两个命令都可用 ✅
```

---

## ❓ 常见问题

### Q1: 发布几个包？
**A**: **只发布 1 个包**  
包名: `@elliotding/ai-command-tool-mcp`  
版本: `0.0.3`

### Q2: 用户需要安装几次？
**A**: **只需要安装 1 次**  
`npm install -g @elliotding/ai-command-tool-mcp`

### Q3: 用户得到几个命令？
**A**: **自动得到 2 个命令**  
- `ai-command-tool` (stdio 模式)
- `ai-command-tool-server` (SSE 模式)

### Q4: 两个命令是不同的启动参数吗？
**A**: **不是！它们是不同的文件！**
- `ai-command-tool` → 运行 `dist/index.js`
- `ai-command-tool-server` → 运行 `dist/index-sse.js`

两个文件有**不同的传输层实现**：
- `index.js` 使用 `StdioServerTransport`
- `index-sse.js` 使用 `SSEServerTransport`

### Q5: 能只安装其中一个命令吗？
**A**: **不能**  
安装包就会得到两个命令。但用户可以**选择只使用其中一个**。

### Q6: 版本号怎么管理？
**A**: **统一的版本号**  
两个命令共享同一个版本号（`package.json` 中的 `version` 字段）

---

## 📊 版本对比表

### ❌ 如果是两个独立的包（不是这样）

| 场景 | 操作 |
|------|------|
| 发布 | 需要发布 2 次，管理 2 个版本号 |
| 安装 | 用户需要安装 2 次 |
| 更新 | 需要分别更新 2 个包 |
| 版本管理 | 复杂，容易不同步 |

### ✅ 实际情况（一个包，两个命令）

| 场景 | 操作 |
|------|------|
| 发布 | 只需发布 1 次，1 个版本号 |
| 安装 | 用户只需安装 1 次 |
| 更新 | 只需更新 1 个包，两个命令自动更新 |
| 版本管理 | 简单，永远同步 |

---

## 🎯 总结

### 核心答案

**运行 `publish.sh` 会发布：**
- ✅ **1 个 npm 包**
- ✅ 包名: `@elliotding/ai-command-tool-mcp`
- ✅ 版本: `0.0.3`（或你选择的版本）
- ✅ 自动提供 2 个命令：`ai-command-tool` 和 `ai-command-tool-server`

**不是：**
- ❌ 不是发布 2 个独立的包
- ❌ 不是同一个命令的不同参数
- ❌ 不是需要安装 2 次

**原理：**
- `package.json` 的 `bin` 字段定义了多个命令
- npm 会为每个命令创建全局可执行文件
- 两个命令指向不同的 js 文件（`index.js` vs `index-sse.js`）
- 这是 npm 的标准功能，很多流行包都这样做

---

## 🚀 下一步

准备发布了吗？

```bash
# 运行发布脚本
./publish.sh

# 按照提示操作即可！
```

**提示**：
- 首次发布选择 "use current version" (0.0.3)
- 后续更新选择 patch/minor/major
- 两个命令会**同时可用**，用户根据需要选择！

