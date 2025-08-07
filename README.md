# 百度链接提交工具

一个部署在 Cloudflare Workers 上的自动化工具，用于每日定时提交网站链接到百度站点收录。

## 功能特性

- ⏰ **定时提交**: 每天上午9点自动执行提交任务
- 📊 **批量处理**: 每次最多提交20条链接到百度
- 🔄 **防重复**: 已提交的链接会被标记，避免重复提交
- 📁 **文件上传**: 支持上传 .txt 格式的链接文件
- 🎛️ **管理界面**: 提供 Web 界面进行文件上传和状态查看
- 🚀 **手动触发**: 支持手动执行提交任务

## 部署步骤

### 1. 准备工作

确保你已经安装了 Node.js 和 npm，然后安装 Wrangler CLI：

```bash
npm install -g wrangler
```

### 2. 登录 Cloudflare

```bash
wrangler login
```

### 3. 创建 KV 命名空间

```bash
wrangler kv:namespace create "SUBMITTED_LINKS"
wrangler kv:namespace create "SUBMITTED_LINKS" --preview
```

记录返回的命名空间 ID，用于更新 `wrangler.toml` 配置。

### 4. 配置环境变量

编辑 `wrangler.toml` 文件，更新以下配置：

```toml
[[kv_namespaces]]
binding = "SUBMITTED_LINKS"
id = "your-kv-namespace-id"          # 替换为实际的 KV 命名空间 ID
preview_id = "your-preview-kv-namespace-id"  # 替换为预览环境的 KV 命名空间 ID

[vars]
BAIDU_SITE = "https://your-site.com"  # 替换为你的网站域名
BAIDU_TOKEN = "your-baidu-token"      # 替换为百度站长平台的推送 token
```

### 5. 获取百度推送 Token

1. 登录 [百度搜索资源平台](https://ziyuan.baidu.com/)
2. 选择你的网站
3. 进入 "数据引入" -> "链接提交" -> "自动提交" -> "推送工具"
4. 复制接口调用地址中的 token 参数

### 6. 部署到 Cloudflare

```bash
npm install
wrangler deploy
```

## 使用方法

### 1. 准备链接文件

创建一个 `.txt` 文件，每行包含一个完整的 URL：

```
https://example.com/page1
https://example.com/page2
https://example.com/page3
```

### 2. 上传链接文件

访问部署后的 Workers 域名，使用 Web 界面上传链接文件。

### 3. 查看提交状态

在 Web 界面中可以查看：
- 总链接数
- 已提交数量
- 待提交数量

### 4. 手动提交

如需立即提交，可以点击"手动提交"按钮。

## API 接口

### 上传链接文件
```
POST /upload
Content-Type: multipart/form-data

参数: file (txt文件)
```

### 查看状态
```
GET /status

返回: {
  "total": 100,
  "submitted": 20,
  "pending": 80,
  "lastUpdate": "2024-01-01T00:00:00.000Z"
}
```

### 手动提交
```
POST /submit

返回: {
  "success": true,
  "message": "手动提交完成"
}
```

## 定时任务

工具会在每天上午9点自动执行提交任务，你也可以修改 `wrangler.toml` 中的 cron 表达式来调整执行时间：

```toml
[triggers]
crons = ["0 9 * * *"]  # 每天上午9点
```

## 注意事项

1. **百度限制**: 百度站长平台对提交频率有限制，建议不要过于频繁提交
2. **链接格式**: 确保链接以 `http://` 或 `https://` 开头
3. **文件大小**: 建议单个文件不超过 1MB
4. **存储限制**: Cloudflare KV 有存储限制，注意定期清理旧数据

## 故障排除

### 查看日志
```bash
wrangler tail
```

### 常见问题

1. **提交失败**: 检查百度 token 是否正确，网站是否已在百度站长平台验证
2. **定时任务不执行**: 检查 cron 表达式格式是否正确
3. **文件上传失败**: 检查文件格式和大小是否符合要求

## 许可证

MIT License