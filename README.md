# 简易图片浏览器

一个使用 Next.js 和 Tailwind CSS 构建的简单图片预览和下载工具，支持子目录浏览。

## 功能特性

- 📁 **目录支持** - 自动读取指定目录及其子目录下的图片文件
- 🖼️ **响应式网格** - 自适应布局，支持多种屏幕尺寸
- 🔍 **图片预览** - 点击图片可查看大图模态框
- 🏷️ **文件搜索** - 支持按文件名搜索图片
- 📂 **目录筛选** - 可按目录筛选查看特定文件夹的图片
- ⬇️ **图片下载** - 支持单张图片下载
- 🔄 **批量操作** - 支持多选图片并批量下载多个文件
- 🌙 **深色模式** - 支持浅色/深色主题切换
- ⌨️ **键盘导航** - 支持方向键切换图片，ESC 键关闭预览
- 📊 **文件信息** - 显示图片大小、目录位置等详细信息
- ⚡ **性能优化** - 图片懒加载，智能缓存

## 开始使用

### 1. 安装依赖

```bash
npm install
```

### 2. 添加图片

将您要预览的图片放入 `public/images` 目录中，支持子目录组织。


支持的图片格式：
- .jpg / .jpeg
- .png
- .gif
- .webp
- .svg

### 3. 运行开发服务器

```bash
npm run dev
```

打开浏览器访问 [http://localhost:3000](http://localhost:3000) 查看效果。

### 4. 构建生产版本

```bash
npm run build
npm start
```

## Docker 部署

本项目支持使用 Docker 进行部署，提供了预构建的镜像。

### 使用预构建镜像

直接使用华为云镜像仓库的预构建镜像：

```bash
# 拉取镜像
docker pull swr.cn-south-1.myhuaweicloud.com/staryokina/simple-image-viewer:v1

# 运行容器
docker run -d \
  --name simple-image-viewer \
  -p 3000:3000 \
  -v /path/to/your/images:/app/public/images:ro \
  swr.cn-south-1.myhuaweicloud.com/staryokina/simple-image-viewer:v1
```

**参数说明:**
- `-d`: 后台运行容器
- `--name`: 设置容器名称
- `-p 3000:3000`: 映射端口，将容器的3000端口映射到主机的3000端口
- `-v /path/to/your/images:/app/public/images:ro`: 挂载本地图片目录到容器（只读模式）
  - 请将 `/path/to/your/images` 替换为您实际的图片目录路径

### 使用 Docker Compose

创建 `docker-compose.yml` 文件：

```yaml
version: '3.8'

services:
  simple-image-viewer:
    image: swr.cn-south-1.myhuaweicloud.com/staryokina/simple-image-viewer:v1
    ports:
      - "3000:3000"
    volumes:
      - /path/to/your/images:/app/public/images:ro
    environment:
      - NODE_ENV=production
      - PORT=3000
    restart: unless-stopped
    container_name: simple-image-viewer
```

然后运行：

```bash
docker-compose up -d
```

### 自行构建镜像

如果您想自行构建镜像：

```bash
# 构建镜像
docker build -t simple-image-viewer:local .

# 运行自构建镜像
docker run -d \
  --name simple-image-viewer \
  -p 3000:3000 \
  -v /path/to/your/images:/app/public/images:ro \
  simple-image-viewer:local
```

### Docker 注意事项

1. **图片目录挂载**: 务必将您的图片目录挂载到容器的 `/app/public/images` 路径
2. **只读挂载**: 建议使用 `:ro` 标志以只读方式挂载图片目录，确保安全性
3. **端口映射**: 默认应用运行在3000端口，您可以根据需要更改主机端口
4. **持久化**: 应用本身无状态，所有数据都在挂载的图片目录中

### 访问应用

容器启动后，打开浏览器访问 `http://localhost:3000` 即可使用图片浏览器。

## 项目结构

```
SimpleImageViewer/
├── pages/
│   ├── api/
│   │   └── images.ts       # API 路由：获取图片列表
│   ├── _app.tsx            # Next.js App 组件
│   └── index.tsx           # 主页面
├── public/
│   └── images/             # 存放图片的目录
├── styles/
│   └── globals.css         # 全局样式
├── Dockerfile              # Docker 镜像构建文件
├── docker-compose.yml      # Docker Compose 配置
├── .dockerignore          # Docker 忽略文件
├── package.json
├── tailwind.config.js      # Tailwind CSS 配置
├── tsconfig.json           # TypeScript 配置
└── next.config.js          # Next.js 配置
```

## 技术栈

- **Next.js 14** - React 框架
- **React 18** - UI 库
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式框架

## 使用说明

### 基本操作

1. **添加图片** - 将图片文件复制到 `public/images` 目录或其子目录中
2. **浏览图片** - 图片会自动以网格形式显示在主界面
3. **搜索图片** - 使用左侧搜索框按文件名查找图片
4. **筛选目录** - 点击左侧目录列表筛选特定文件夹的图片
5. **预览图片** - 点击图片缩略图进入全屏预览模式
6. **下载图片** - 在预览模式下点击"下载图片"按钮

### 批量操作

1. **进入多选模式** - 点击右上角"多选"按钮启用多选功能
2. **选择图片** - 点击图片左上角的复选框选中/取消选中图片
3. **全选操作** - 在多选模式下使用"全选"和"清空选择"快速操作
4. **批量下载** - 选中图片后点击"下载选中"按钮，系统会逐个下载选中的图片文件
5. **退出多选** - 点击"取消"按钮退出多选模式

### 预览模式操作

- **键盘导航**: 使用 `←` `→` 方向键切换上一张/下一张图片
- **关闭预览**: 按 `ESC` 键或点击右上角关闭按钮
- **图片信息**: 底部显示文件名、位置计数、目录和文件大小
- **下载功能**: 点击底部"下载图片"按钮保存当前图片

### 界面功能

- **深色模式**: 点击右上角月亮/太阳图标切换主题
- **响应式设计**: 支持桌面和移动设备
- **懒加载**: 图片按需加载，提升性能

### 图片信息显示

- 文件名和扩展名
- 所在目录路径
- 文件大小
- 图片位置计数（第几张/总数）

## 自定义配置

### 修改图片目录

如需修改图片存储目录，请编辑 `pages/api/images.ts` 文件中的路径：

```typescript
const imagesDirectory = path.join(process.cwd(), 'public', 'images');
```

### 调整网格布局

在 `pages/index.tsx` 中修改网格布局类名来调整显示效果：

```tsx
// 当前配置：1-5列响应式布局
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">

// 示例：调整为更密集的布局
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
```

### 修改缓存设置

在 `pages/api/images.ts` 中调整缓存时间：

```typescript
const CACHE_DURATION = 30 * 1000; // 30秒缓存，可调整
```

## 技术栈

- **Next.js 14.2.3** - React 框架
- **React 18** - UI 库
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式框架
- **Docker** - 容器化部署

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
