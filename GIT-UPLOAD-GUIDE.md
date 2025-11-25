# Git 上传指南

## 📋 需要上传的文件清单

### ✅ 必须上传（已准备好）

```
# 源代码
src/                            # 19 个 TypeScript 源文件

# 配置文件
package.json                    # npm 包配置
tsconfig.json                   # TypeScript 配置
vitest.config.ts                # 测试配置
.eslintrc.js                    # ESLint 配置
.gitignore                      # Git 忽略规则
.npmignore                      # npm 忽略规则
.gitattributes                  # Git 属性配置（新建）

# 文档
README.md                       # 项目说明
LICENSE                         # MIT 许可证
CHANGELOG.md                    # 版本历史

# 测试
tests/                          # 测试文件
test-mcp.js                     # MCP 测试脚本
test-simple.sh                  # 快速测试脚本
TESTING.md                      # 测试文档

# 脚本
publish.sh                      # 发布脚本

# 示例
examples/                       # 配置示例

# 设计文档（可选）
specs/                          # 规格文档
.specify/memory/constitution.md # 项目宪章
```

### ❌ 不上传（已在 .gitignore）

```
node_modules/                   # 依赖包
dist/                           # 构建产物
coverage/                       # 测试覆盖率
.DS_Store                       # 系统文件
*.log                           # 日志文件
.env                            # 环境变量
.ai-command-tool.json           # 用户配置
Commands/                       # 用户数据
Commands-Analyze-Report/        # 用户报告
package-lock.json               # 锁定文件（库项目不提交）
```

---

## 🚀 Git 上传步骤

### 步骤 1: 检查当前状态

```bash
cd /Users/ElliotDing/SourceCode/MCP-Package-Deploy/AI-Command-Management
git status
```

### 步骤 2: 添加所有需要的文件

```bash
# 添加源代码
git add src/

# 添加配置文件
git add package.json tsconfig.json vitest.config.ts .eslintrc.js
git add .gitignore .npmignore .gitattributes

# 添加文档
git add README.md LICENSE CHANGELOG.md TESTING.md

# 添加测试
git add tests/ test-mcp.js test-simple.sh

# 添加脚本
git add publish.sh

# 添加示例
git add examples/

# 添加设计文档（可选）
git add specs/
git add .specify/memory/constitution.md
```

**或者一次性添加所有（推荐）：**

```bash
git add .
```

因为 `.gitignore` 已经配置好了，不需要的文件会自动被排除！

### 步骤 3: 确认要提交的文件

```bash
git status
```

**预期输出**：
```
Changes to be committed:
  new file:   .eslintrc.js
  new file:   .gitattributes
  new file:   .gitignore
  new file:   .npmignore
  new file:   CHANGELOG.md
  new file:   LICENSE
  new file:   README.md
  new file:   TESTING.md
  new file:   examples/.ai-command-tool.dev.json
  new file:   examples/.ai-command-tool.json
  new file:   package.json
  new file:   publish.sh
  new file:   specs/...
  new file:   src/...
  new file:   test-mcp.js
  new file:   test-simple.sh
  new file:   tests/...
  new file:   tsconfig.json
  new file:   vitest.config.ts
  ...
```

**不应该看到**：
- ❌ `node_modules/`
- ❌ `dist/`
- ❌ `Commands/`
- ❌ `Commands-Analyze-Report/`
- ❌ `.DS_Store`

### 步骤 4: 提交更改

```bash
git commit -m "feat: initial release of AI Command Tool MCP v0.0.1

- Implement three-tier intelligent search (filename, content, reports)
- Add 5 MCP tools for command management
- Include comprehensive testing suite
- Add documentation and examples
- Configure TypeScript, ESLint, and Vitest
"
```

### 步骤 5: 推送到远程仓库

**如果还没有远程仓库，先创建并关联：**

```bash
# 在 GitHub/GitLab 创建仓库后
git remote add origin https://github.com/YOUR_USERNAME/ai-command-tool-mcp.git

# 或者如果是 SSH
git remote add origin git@github.com:YOUR_USERNAME/ai-command-tool-mcp.git
```

**推送到远程：**

```bash
git push -u origin main
```

如果当前分支是 `master`：
```bash
git push -u origin master
```

---

## 🔍 验证上传内容

### 本地验证

```bash
# 查看当前分支的所有文件
git ls-tree -r HEAD --name-only

# 查看文件数量
git ls-tree -r HEAD --name-only | wc -l
```

**预期数量**：~40-50 个文件

### 远程验证

推送后，访问您的 GitHub/GitLab 仓库，确认：

✅ 有 `src/` 目录
✅ 有 `package.json`
✅ 有 `README.md`
✅ 有 `.gitignore`
❌ 没有 `node_modules/`
❌ 没有 `dist/`
❌ 没有 `Commands/`

---

## 📦 仓库结构预览

```
your-repo/
├── .github/                    # GitHub Actions（可选，将来添加）
├── .gitattributes              # Git 属性
├── .gitignore                  # Git 忽略
├── .npmignore                  # npm 忽略
├── .eslintrc.js                # ESLint 配置
├── .specify/                   # Speckit 文件
│   └── memory/
│       └── constitution.md
├── CHANGELOG.md                # 更新日志
├── LICENSE                     # MIT 许可证
├── README.md                   # 项目说明
├── TESTING.md                  # 测试文档
├── examples/                   # 配置示例
│   ├── .ai-command-tool.json
│   └── .ai-command-tool.dev.json
├── package.json                # npm 配置
├── publish.sh                  # 发布脚本
├── specs/                      # 设计文档
│   └── 1-mcp-command-tool/
│       ├── spec.md
│       ├── plan.md
│       └── tasks.md
├── src/                        # 源代码 ⭐
│   ├── index.ts
│   ├── types/
│   ├── config/
│   ├── cache/
│   ├── utils/
│   ├── commands/
│   ├── reports/
│   ├── search/
│   └── tools/
├── test-mcp.js                 # 测试脚本
├── test-simple.sh              # 测试脚本
├── tests/                      # 测试文件
│   ├── setup.ts
│   └── unit/
├── tsconfig.json               # TypeScript 配置
└── vitest.config.ts            # Vitest 配置
```

---

## 🎯 常见问题

### Q1: 为什么不上传 `node_modules/`？

**A**: 因为：
1. 体积巨大（~100MB+）
2. 可以通过 `npm install` 自动安装
3. 不同平台可能需要不同的二进制包

### Q2: 为什么不上传 `dist/`？

**A**: 因为：
1. 构建产物应该在本地/CI 生成
2. 可以通过 `npm run build` 重新生成
3. 发布到 npm 时会自动构建（`prepublishOnly` 脚本）

### Q3: 为什么不上传 `package-lock.json`？

**A**: 对于**库项目**：
- ❌ 不提交 `package-lock.json`（让使用者决定版本）
- ✅ 让用户安装最新兼容版本

对于**应用项目**：
- ✅ 应该提交（确保部署一致性）

您的项目是**库项目**，所以不提交。

### Q4: `Commands/` 和 `Commands-Analyze-Report/` 怎么办？

**A**: 这些是**用户数据示例**：
- 已在 `.gitignore` 中排除
- 用户会在自己的服务器上创建
- 不应该上传到 Git

如果想提供示例，可以创建：
```
docs/examples/
├── sample-command.md
└── sample-report.md
```

---

## ✅ 完成后的检查清单

- [ ] 所有源代码已添加（`src/`）
- [ ] 配置文件已添加（`package.json`, `tsconfig.json` 等）
- [ ] 文档已添加（`README.md`, `LICENSE`, `CHANGELOG.md`）
- [ ] 测试文件已添加（`tests/`）
- [ ] `.gitignore` 正确配置
- [ ] 没有 `node_modules/` 在仓库中
- [ ] 没有 `dist/` 在仓库中
- [ ] 没有用户数据在仓库中
- [ ] 提交信息清晰描述了更改
- [ ] 成功推送到远程仓库

---

## 🚀 后续操作建议

### 1. 更新 `package.json` 的仓库地址

```json
{
  "repository": {
    "type": "git",
    "url": "git+https://github.com/YOUR_USERNAME/ai-command-tool-mcp.git"
  },
  "bugs": {
    "url": "https://github.com/YOUR_USERNAME/ai-command-tool-mcp/issues"
  },
  "homepage": "https://github.com/YOUR_USERNAME/ai-command-tool-mcp#readme"
}
```

### 2. 添加 CI/CD（可选）

创建 `.github/workflows/test.yml` 自动运行测试：

```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm test
      - run: npm run lint
      - run: npm run build
```

### 3. 添加徽章到 README

```markdown
[![npm version](https://img.shields.io/npm/v/@elliotding/ai-command-tool-mcp.svg)](https://www.npmjs.com/package/@elliotding/ai-command-tool-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
```

---

**祝上传顺利！** 🎉

