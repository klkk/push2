# 百度链接提交工具 - Cloudflare Pages 版本

一个部署在 Cloudflare Pages 上的自动化工具，用于每日定时提交网站链接到百度站点收录。

## 与 Workers 版本的区别

- 使用 Cloudflare Pages Functions 替代 Workers
- 通过 GitHub Actions 实现定时任务（Pages 不支持 cron triggers）
- API 路径调整为 `/api/*` 格式

## 部署步骤

### 1. 在 Cloudflare Pages 中创建项目

1. 登录 Cloudflare Dashboard
2. 进入 Pages 页面
3. 点击 "Create a project"
4. 选择 "Upload assets" 
5. 上传项目文件夹

### 2. 配置环境变量

在 Cloudflare Pages 项目设置中添加以下环境变量：

```
BAIDU_SITE=https://your-site.com
BAIDU_TOKEN=your-baidu-token
```

### 3. 创建 KV 命名空间

1. 在 Cloudflare Dashboard 中进入 "Workers & Pages" > "KV"
2. 创建新的命名空间，命名为 `SUBMITTED_LINKS`
3. 在 Pages 项目设置中绑定 KV 命名空间：
   - Variable name: `SUBMITTED_LINKS`
   - KV namespace: 选择刚创建的命名空间

### 4. 设置定时任务（可选）

如果需要自动定时提交，可以设置 GitHub Actions：

1. 在项目根目录创建 `.github/workflows/scheduled-submit.yml`
2. 在 GitHub 仓库设置中添加 Secret：
   - `PAGES_URL`: 你的 Pages 项目域名（如 `https://your-project.pages.dev`）

### 5. 获取百度推送 Token

1. 登录 [百度搜索资源平台](https://ziyuan.baidu.com/)
2. 选择你的网站
3. 进入 "数据引入" -> "链接提交" -> "自动提交" -> "推送工具"
4. 复制接口调用地址中的 token 参数

## 使用方法

### 访问管理界面

部署完成后，访问你的 Pages 域名即可看到管理界面。

### API 接口

- `GET /` - 管理界面
- `POST /api/upload` - 上传链接文件
- `GET /api/status` - 查看提交状态
- `POST /api/submit` - 手动提交链接
- `POST /api/scheduled` - 定时任务接口（由 GitHub Actions 调用）

### 上传链接文件

1. 准备 `.txt` 文件，每行一个 URL
2. 在管理界面中上传文件
3. 系统会自动去重并添加到待提交列表

### 手动提交

点击管理界面中的"手动提交"按钮，系统会立即提交最多20条待提交的链接。

## 定时任务说明

由于 Cloudflare Pages 不支持 cron triggers，我们使用 GitHub Actions 来实现定时任务：

1. GitHub Actions 每天上午9点（北京时间）自动运行
2. 调用 `/api/scheduled` 接口执行提交任务
3. 也可以在 GitHub 仓库中手动触发工作流

## 故障排除

### 1. 页面无法访问

检查以下项目：
- 确保 `public/index.html` 文件存在
- 检查 Pages 项目是否部署成功
- 查看 Pages 项目的构建日志

### 2. API 接口报错

- 检查环境变量是否正确配置
- 确认 KV 命名空间是否正确绑定
- 查看 Functions 日志

### 3. 定时任务不执行

- 检查 GitHub Actions 工作流是否启用
- 确认 `PAGES_URL` Secret 是否正确设置
- 查看 GitHub Actions 运行日志

### 4. 百度提交失败

- 验证百度 Token 是否正确
- 确认网站是否在百度站长平台验证
- 检查链接格式是否正确

## 项目结构

```
├── public/
│   └── index.html          # 管理界面
├── functions/
│   ├── _middleware.js      # 路由中间件
│   └── api/
│       └── scheduled.js    # 定时任务接口
├── .github/
│   └── workflows/
│       └── scheduled-submit.yml  # GitHub Actions 工作流
├── README-Pages.md         # Pages 版本说明
└── example-links.txt       # 示例链接文件
```

## 注意事项

1. **Pages 限制**: Cloudflare Pages 有请求限制，避免过于频繁的操作
2. **KV 存储**: 注意 KV 存储的读写限制
3. **定时任务**: GitHub Actions 的免费额度有限制
4. **链接格式**: 确保上传的链接格式正确

## 许可证

MIT License