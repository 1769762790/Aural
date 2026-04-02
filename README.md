# 🎵 Aural 音乐播放器

Aural 是一个现代化的桌面音乐播放器，提供丰富的音乐管理和播放功能，具有美观的用户界面和流畅的用户体验。

## 📋 项目概述

Aural 是一个功能完整的音乐播放器应用，使用 Electron 和 React 构建，支持音乐库管理、音频播放、歌词显示、播放列表管理、音乐搜索等核心功能。

### ✨ 主要特性

- 🎨 **现代化界面**：采用深色主题设计，响应式布局，支持自定义主题
- 📁 **音乐库管理**：支持导入本地音乐文件夹，自动扫描和索引音乐文件
- 🔊 **音频播放**：支持多种音频格式，提供均衡器和音效设置
- 📝 **歌词显示**：支持 LRC 歌词和嵌入式歌词，提供卡拉 OK 模式
- 📋 **播放列表**：支持创建、编辑和管理播放列表，智能推荐功能
- 🔍 **音乐搜索**：支持全文搜索，包括歌曲、艺术家、专辑和播放列表
- 📊 **数据可视化**：提供播放统计和音乐分析图表
- 💻 **多平台支持**：基于 Electron，支持 Windows、macOS 和 Linux

## 🛠️ 技术栈

### 🎨 前端技术

- **React 19** ⚛️：用于构建用户界面
- **TypeScript** 🔷：提供类型安全
- **Tailwind CSS** 🎨：用于样式管理
- **Radix UI** 🧩：提供基础 UI 组件
- **Recharts** 📊：用于数据可视化
- **Zustand** 🐻：状态管理
- **React Router** 🛣️：路由管理

### 🔧 后端技术

- **Electron** ⚡：桌面应用框架
- **Node.js** 🟢：运行时环境
- **SQLite** 🗃️：本地数据存储
- **FFmpeg** 🎵：音频处理

### 📦 项目管理

- **Monorepo** 📱：使用 npm workspaces 管理多包项目
- **Vite** ⚡：构建工具
- **Vitest** 🧪：测试框架

## 📁 项目结构

```
Aural/
├── apps/
│   └── desktop/          # 桌面应用
│       ├── src/
│       │   ├── main/     # Electron 主进程
│       │   ├── preload/  # 预加载脚本
│       │   └── renderer/ # 渲染进程
│       ├── package.json
│       └── vite.config.ts
├── packages/
│   ├── contracts/        # 类型定义
│   ├── data/             # 数据访问层
│   ├── domain/           # 领域模型
│   ├── library/          # 音乐库管理
│   ├── player/           # 音频播放
│   ├── search/           # 搜索功能
│   └── ui/               # 共享 UI 组件
├── package.json
└── tsconfig.base.json
```

### 🔍 核心模块

1. **desktop** 🖥️：主应用程序，包含 Electron 主进程和渲染进程
2. **contracts** 📝：定义应用程序的类型和接口
3. **data** 🗃️：数据访问层，负责与 SQLite 数据库交互
4. **domain** 🏗️：领域模型，定义核心业务逻辑
5. **library** 📚：音乐库管理，负责扫描和索引音乐文件
6. **player** 🎵：音频播放功能，处理音频流和歌词
7. **search** 🔍：搜索功能，提供全文搜索能力
8. **ui** 🎨：共享 UI 组件，提供一致的用户界面

## ✨ 核心功能

### 📚 音乐库管理

- 📁 支持导入本地音乐文件夹
- 🔄 自动扫描和索引音乐文件
- ✏️ 提供音乐文件元数据编辑
- 🖼️ 支持专辑封面和艺术家图片

### 🔊 音频播放

- 🎵 支持多种音频格式（MP3、FLAC、AAC、WAV 等）
- 🎮 提供播放控制（播放、暂停、上一曲、下一曲）
- 🔊 支持音量控制和静音
- ⏰ 提供播放进度控制

### 📝 歌词显示

- 📄 支持 LRC 歌词文件
- 🎵 支持嵌入式歌词
- 🎤 提供卡拉 OK 模式
- 🔄 实时歌词同步

### 📋 播放列表管理

- ➕ 支持创建和编辑播放列表
- 📝 支持添加和删除歌曲
- 📱 支持拖拽排序
- 🤖 支持智能播放列表

### 🔍 搜索功能

- 🔎 全文搜索（歌曲、艺术家、专辑、播放列表）
- 拼音 支持拼音搜索
- ⚡ 实时搜索结果
- 📖 搜索历史记录

### 📊 数据可视化

- 📈 播放统计图表
- 🎨 音乐风格分析
- 📅 听歌习惯分析
- 📋 年度听歌报告

## 🚀 开发指南

### 🛠️ 环境要求

- Node.js 18+ 🟢
- npm 9+ 📦
- Git 📡

### 📦 安装依赖

```bash
npm install
```

### 👨‍💻 开发模式

```bash
npm run dev
```

### 🏗️ 构建应用

```bash
npm run build
```

### ✅ 类型检查

```bash
npm run typecheck
```

### 🧪 运行测试

```bash
npm run test
```

## ⚙️ 项目配置

### 📄 主要配置文件

- **package.json** 📦：项目依赖和脚本
- **vite.config.ts** ⚡：Vite 构建配置
- **tsconfig.base.json** 🔷：TypeScript 基础配置
- **apps/desktop/package.json** 🖥️：桌面应用依赖

### 🌍 环境变量

- **VITE_DEV_SERVER_URL** 🌐：开发服务器 URL
- **NODE_ENV** 🏭：运行环境（development/production）

## 📦 部署

### 🏗️ 构建步骤

1. 安装依赖：`npm install` 📦
2. 构建应用：`npm run build` 🏗️
3. 打包应用：使用 Electron Builder 或类似工具 📦

### 📱 发布平台

- Windows 🪟：生成 .exe 安装包
- macOS 🍎：生成 .dmg 安装包
- Linux 🐧：生成 .deb 或 .rpm 包

## 🤝 贡献指南

### 📝 代码规范

- ✅ 使用 TypeScript 编写代码
- 📏 遵循 ESLint 规则
- 🎨 保持代码风格一致
- 🧪 编写单元测试

### 📬 提交规范

- 📝 使用语义化提交消息
- ✅ 提交前运行类型检查和测试
- 🎯 保持提交内容简洁明了

## 📄 许可证

MIT License 📄

## 📞 联系方式

- 项目地址：[https://github.com/yourusername/aural](https://github.com/yourusername/aural) 🔗
- 问题反馈：[https://github.com/yourusername/aural/issues](https://github.com/yourusername/aural/issues) 🐛



## 待完成

* 歌词换行scale 遮挡问题
* Output device 选择无效
* 增加git flow 工作流，完善提交代码commit 提交以及代码检测


## 分析接入@unblockneteasemusic/server 可行性以及如何切换本地和在线数据
https://github.com/UnblockNeteaseMusic/server
