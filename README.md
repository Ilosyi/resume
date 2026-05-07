# 简历生成器

一个本地优先的简历编辑、排版、AI 整理与导出工具。项目支持多份简历管理、所见即所得编辑、多视觉模板、PDF/图片/JSON 导出，以及基于 OpenAI 兼容接口的模板复刻和简历内容整理。

数据默认保存在浏览器 `localStorage`，适合个人离线维护、反复微调和导出投递版本。

> 基于 [resume-builder](https://github.com/magicyan418/resume-builder) 二次开发，感谢原作者的开源。

## 功能特点

- **用户中心**：首页集中管理多份简历，支持检索、排序、批量选择、删除、克隆、导入和导出。
- **本地存储**：简历数据保存到浏览器 `localStorage`，支持 JSON 备份和恢复。
- **可视化编辑**：支持个人信息、求职意向、模块内容、头像、富文本、标签行和多列排版。
- **模块化简历**：模块可新增、删除、展开编辑、拖拽排序，也支持上移/下移按钮兜底调整顺序。
- **多视觉模板**：支持经典、极简、左右栏等视觉版式；自定义/AI 生成模板可随简历 JSON 导出。
- **模板复刻**：支持上传 PDF、PNG、JPG、WEBP，AI 分析后生成受控模板配置。
- **AI 整理润色**：支持粘贴原始文字，AI 自动整理为标题、个人信息、求职意向和简历模块。
- **AI 局部修改**：支持 AI 阅读当前简历后按指令只修改局部模块，例如只重排“技能证书”。
- **导出能力**：支持 PDF、PNG、JPG、WEBP、SVG、JSON；PDF 优先服务端生成，不可用时降级浏览器打印。
- **访问保护**：可通过 `SITE_PASSWORD` 启用简单访问密码。

## 技术栈

- **框架**：Next.js 16
- **语言**：TypeScript / React
- **样式**：Tailwind CSS
- **UI 基础组件**：Shadcn UI / Radix UI
- **富文本**：Tiptap
- **拖拽排序**：@hello-pangea/dnd
- **图标**：Iconify
- **PDF 生成**：puppeteer-core + @sparticuz/chromium
- **图片导出**：html-to-image
- **AI 接口**：OpenAI Responses API 兼容接口

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发运行

```bash
pnpm dev
```

应用默认运行在：

```txt
http://localhost:3000
```

### 构建生产版本

```bash
pnpm build
```

## AI 配置

AI 功能从项目根目录的 `config.yaml` 读取配置。该文件已加入 `.gitignore`，不要提交真实密钥。

可以复制 `config.example.yaml`：

```yaml
openai:
  baseurl: "https://api.openai.com/v1"
  apikey: "sk-your-api-key"
  model: "gpt-4.1-mini"
```

说明：

- `baseurl`：OpenAI 兼容接口地址，默认格式应包含 `/v1`。
- `apikey`：服务端 API Key。
- `model`：用于模板复刻、内容整理和局部修改的模型。
- 未配置 `config.yaml` 或 `openai.apikey` 时，上传复刻会返回本地降级模板；AI 内容整理和局部修改不可用。

## 项目结构

```txt
/
├── app/
│  ├── page.tsx                         # 首页：用户中心
│  ├── edit/
│  │  ├── new/page.tsx                  # 新建简历
│  │  └── [id]/page.tsx                 # 编辑本地简历
│  ├── view/[id]/page.tsx               # 预览本地简历
│  ├── print/page.tsx                   # 打印/PDF 专用页面
│  ├── pdf/preview/[filename]/page.tsx  # PDF 预览页
│  ├── auth/page.tsx                    # 访问口令页
│  └── api/
│     ├── ai/
│     │  ├── organize/route.ts          # AI 从原始文字整理整份简历
│     │  └── edit/route.ts              # AI 阅读当前简历后局部修改
│     ├── templates/clone/route.ts      # 上传 PDF/图片复刻视觉模板
│     ├── pdf/                          # PDF 生成接口
│     ├── image-proxy/route.ts          # 图片代理
│     └── auth/route.ts                 # 访问密码认证接口
├── components/
│  ├── user-center.tsx                  # 用户中心
│  ├── resume-builder.tsx               # 简历编辑器主界面
│  ├── resume-preview.tsx               # 预览分发入口
│  ├── resume-templates/                # 多视觉模板渲染组件
│  ├── template-manager.tsx             # 模板选择/上传复刻
│  ├── ai-organize-panel.tsx            # AI 整理与局部修改面板
│  ├── module-editor.tsx                # 简历模块编辑
│  ├── personal-info-editor.tsx         # 个人信息编辑
│  ├── job-intention-editor.tsx         # 求职意向编辑
│  ├── export-button.tsx                # 导出菜单
│  └── ui/                              # Shadcn UI 基础组件
├── lib/
│  ├── storage.ts                       # 简历 localStorage 存储
│  ├── templates/                       # 模板注册、校验与本地存储
│  ├── resume-content.ts                # 简历内容/Tiptap JSON 转换工具
│  ├── server-config.ts                 # config.yaml 读取
│  └── utils.ts                         # 通用工具
├── styles/
│  ├── print.css                        # 打印与 PDF 样式
│  └── tiptap.css                       # 富文本样式
├── public/
│  ├── template.json                    # 默认数据模板
│  ├── example.json                     # 示例数据模板
│  └── NotoSansSC-Medium.ttf            # 中文字体
├── docs/
│  └── template-system.md               # 模板与 AI 相关架构说明
├── types/
│  └── resume.ts                        # 简历数据类型
└── config.example.yaml                 # AI 配置示例
```

## 简历数据

核心数据结构：

```ts
export interface ResumeData {
  title: string
  templateId?: string
  templateDefinition?: ResumeTemplateDefinition
  centerTitle?: boolean
  personalInfoSection: PersonalInfoSection
  jobIntentionSection?: JobIntentionSection
  modules: ResumeModule[]
  avatar?: string
  createdAt: string
  updatedAt: string
}
```

导出的 JSON 会保存简历数据、当前模板 ID，以及自定义/AI 生成模板定义。因此自定义模板可以跟随简历一起迁移。

## 使用方法

### 1. 创建和管理简历

1. 打开首页用户中心。
2. 点击“创建简历”新建一份简历。
3. 可以从已有简历克隆，也可以导入 JSON 文件恢复旧简历。
4. 用户中心支持搜索、排序、批量删除和导出。

### 2. 编辑个人信息

个人信息支持：

- 修改标签和值，例如电话、邮箱、微信、GitHub。
- 设置值类型为文本或链接。
- 选择图标。
- 上传头像。
- 切换普通头像/一寸照片。
- 切换圆形/方形头像。
- 切换个人信息单行/多行布局。
- 控制是否显示标签文字，例如 `[微信图标] 微信：xxx`。

### 3. 编辑求职意向

求职意向支持工作经验、求职岗位、城市、薪资和自定义项。

每一项可设置“此项后换行”，适合在左右栏或紧凑模板里控制显示节奏。

### 4. 编辑简历模块

简历模块用于维护教育经历、项目经历、工作经历、技能证书、自我评价等内容。

支持：

- 新增/删除模块。
- 修改模块标题和图标。
- 拖拽调整模块顺序。
- 使用上移/下移按钮稳定调整顺序。
- 添加 1-4 列富文本行。
- 添加标签行。
- 对富文本设置加粗、颜色、字号、链接和对齐。

### 5. 切换视觉模板

编辑器顶部的“视觉模板”区域支持：

- 经典模板：兼容原始单栏版式。
- 极简模板：更克制的单栏样式。
- 左右栏模板：适合突出个人信息和技能结构。
- 自定义模板：上传复刻生成后会保存到本地。

模板切换会保留当前简历内容，只改变视觉表现。

### 6. 上传 PDF/图片复刻模板

1. 在编辑器中点击“上传复刻”。
2. 上传 PDF、PNG、JPG 或 WEBP。
3. 服务端校验文件类型和大小。
4. AI 分析版式，返回受控模板配置。
5. 前端保存为本地自定义模板并应用到当前简历。

限制：

- 单文件最大 10MB。
- 不保存原始上传文件。
- AI 只允许返回结构化模板 JSON，不允许生成任意 HTML/CSS/脚本。

### 7. AI 从原始文字整理简历

在“AI 整理润色”区域，可以粘贴零散材料，例如：

- 个人介绍。
- 教育背景。
- 技能栈。
- 项目经历。
- 获奖证书。
- 求职方向。

AI 会尝试整理为：

- 简历标题。
- 个人信息。
- 求职意向。
- 教育经历。
- 项目经历。
- 技能证书。
- 自我评价。

服务端会把 AI 返回的文本转换为项目内部的 Tiptap JSON，不让 AI 直接生成页面代码。

### 8. AI 阅读当前简历后局部修改

如果简历已经填好，不需要每次重新粘贴全量内容。可以直接输入局部修改指令，例如：

```txt
修改技能证书排版，每个竞赛/证书一行，每行之间奖项要对齐
```

局部修改接口会读取当前 `ResumeData`，让 AI 返回受控模块补丁，只替换相关模块内容，未提到的模块保持不变。

### 9. 导出

支持：

- JSON：用于备份和迁移。
- PDF：优先服务端 Chromium 生成。
- PNG/JPG/WEBP/SVG：用于图片投递或预览。

服务端 PDF 不可用时，会自动降级为浏览器打印，并提示：

- 关闭“页眉和页脚”。
- 勾选“背景图形”。

相关接口：

- `GET /api/pdf/health`
- `POST /api/pdf`
- `POST /api/pdf/:filename`
- `GET /api/pdf/:filename?token=...`
- `GET /api/image-proxy?url=...`

## 部署

### Vercel / Serverless

- PDF 接口使用 Node.js Runtime，不应部署为 Edge Runtime。
- PDF 依赖 `puppeteer-core` 和 `@sparticuz/chromium`。
- 建议提高函数超时和内存，例如 1024MB 或 1536MB。

### 可选环境变量

```txt
SITE_PASSWORD=访问密码
NEXT_PUBLIC_FORCE_SERVER_PDF=true
NEXT_PUBLIC_FORCE_PRINT=true
PUPPETEER_EXECUTABLE_PATH=/path/to/chrome
CHROME_PATH=/path/to/chrome
```

说明：

- `SITE_PASSWORD`：启用页面访问密码。
- `NEXT_PUBLIC_FORCE_SERVER_PDF`：强制使用服务端 PDF。
- `NEXT_PUBLIC_FORCE_PRINT`：强制使用浏览器打印。
- `PUPPETEER_EXECUTABLE_PATH` / `CHROME_PATH`：指定系统 Chrome。

## 当前不足

- **AI 输出仍需人工复核**：AI 会尽量不编造信息，但仍可能误分模块、过度润色或遗漏细节。
- **局部修改粒度有限**：当前主要支持模块 rows 级别的补丁，尚未做到单个文字 mark、单个标签、单个字段的精细 diff。
- **模板复刻不是像素级还原**：目前是把上传样式映射为受控模板配置，适合近似复刻，不适合完全还原商业模板。
- **自定义模板仍偏参数化**：复杂双栏、时间轴、图表化技能等版式还需要新增专门渲染组件。
- **数据仍是浏览器本地存储**：换浏览器或清理缓存可能丢失数据，需要主动导出 JSON 备份。
- **AI 配置是服务端文件**：目前通过根目录 `config.yaml` 配置，不支持在页面中动态切换 provider/model。
- **移动端编辑体验有限**：预览和复杂富文本编辑更适合桌面端。
- **类型检查存在历史依赖噪声**：项目中部分 Shadcn 可选组件引用的包未安装，`next build` 可通过，但完整 `tsc --noEmit` 会暴露历史依赖问题。

## TODO

### AI 能力

- [ ] 页面内配置 AI 服务商、Base URL、模型和 Key，并支持加密保存。
- [ ] 支持 OpenAI、Anthropic、Gemini、DeepSeek、DashScope 等多 Provider。
- [ ] 支持 JD 匹配：根据岗位描述自动改写简历重点。
- [ ] 支持 ATS 评分和关键词覆盖分析。
- [ ] 支持“改得更短 / 更正式 / 更技术 / 更校招”这类风格按钮。
- [ ] 支持真正的结构化 diff 预览，用户确认后再应用 AI 修改。
- [ ] 支持基于当前简历生成面试准备材料。

### 模板与排版

- [ ] 增加更多内置模板：校招、社招、后端、前端、产品、科研、双栏紧凑版等。
- [ ] 增加模板缩略图和模板预览页。
- [ ] 支持模板参数可视化编辑，例如主色、字号、模块间距、侧栏宽度。
- [ ] 支持更复杂的模板布局，例如时间轴、左右分栏内容流、技能熟练度图形。
- [ ] 提升 PDF/图片复刻精度，支持多页分析和更细的版式元素识别。

### 编辑体验

- [ ] 支持撤销/重做。
- [ ] 支持模块级复制、粘贴和保存为片段。
- [ ] 支持拖拽调整模块内部行顺序。
- [ ] 支持更强的表格/证书/竞赛结构化编辑。
- [ ] 支持一键压缩到一页、一键放宽排版。

### 数据与同步

- [ ] 支持 WebDAV、OneDrive、Google Drive 等远程同步。
- [ ] 支持本地加密备份。
- [ ] 支持多设备同步和历史版本。
- [ ] 支持浏览器 IndexedDB 存储大头像和更多模板资产。

### 工程质量

- [ ] 清理未使用的 Shadcn 可选组件或补齐相关依赖。
- [ ] 修复 Next 16 中 `next.config.mjs` 已废弃的 `eslint` 配置警告。
- [ ] 将 `middleware` 迁移到 Next 新的 `proxy` 文件约定。
- [ ] 增加核心工具函数、AI patch、模板渲染的单元测试。
- [ ] 增加端到端测试，覆盖创建、AI 修改、导出 PDF 的关键路径。

## 许可证

MIT
