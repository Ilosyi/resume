# 简历视觉模板与上传复刻功能说明

本文档说明本次新增的多视觉模板体系、上传 PDF/图片复刻模板能力，以及日常使用和二次开发方式。

## 一、代码变化

### 1. 类型扩展

`types/resume.ts` 新增：

- `ResumeTemplateDefinition`：视觉模板定义，描述布局、字体、颜色、头部和模块标题样式。
- `StoredResumeTemplate`：本地保存的自定义模板结构。
- `ResumeData.templateId`：当前简历使用的模板 ID。
- `ResumeData.templateDefinition`：自定义或 AI 生成模板定义，会随简历 JSON 一起导出。

### 2. 模板注册与校验

新增目录 `lib/templates/`：

- `registry.ts`：内置模板注册表，目前包含：
  - `classic`：经典模板，兼容原始版式。
  - `minimal`：极简模板。
  - `sidebar`：左右栏模板。
- `schema.ts`：模板定义归一化和白名单校验，防止 AI 或用户输入注入任意 CSS/HTML。
- `storage.ts`：自定义模板的 localStorage 存储封装。

### 3. 渲染组件

新增目录 `components/resume-templates/`：

- `structured-template.tsx`：实现可配置单栏模板和左右栏模板。

更新 `components/resume-preview.tsx`：

- 现在是模板分发入口。
- `classic` 继续使用原有渲染逻辑。
- `minimal` / `configurable` 走 `ConfigurableTemplate`。
- `sidebar` 走 `SidebarTemplate`。

### 4. 编辑器模板管理

新增 `components/template-manager.tsx`：

- 展示内置模板。
- 展示本地自定义模板。
- 支持切换视觉模板。
- 支持上传 PDF/图片复刻模板。
- 支持删除自定义模板。

更新 `components/resume-builder.tsx`：

- 在编辑面板顶部加入“视觉模板”管理区。
- 切换内置模板时只保存 `templateId`。
- 使用上传复刻模板时保存完整 `templateDefinition`。

### 5. 上传复刻接口

新增接口：

```txt
POST /api/templates/clone
```

请求格式：

```txt
multipart/form-data
file: PDF/PNG/JPG/WEBP
```

限制：

- 最大 10MB。
- 仅允许 `pdf/png/jpg/jpeg/webp`。
- 服务端不会持久化原始上传文件。
- 如果当前目录下未配置 `config.yaml` 或缺少 `openai.apikey`，会返回一个本地降级模板，便于继续调试 UI 流程。

## 二、架构设计

核心原则是：

```txt
AI 负责识别版式，代码负责受控渲染。
```

系统不会让 AI 直接生成 React、HTML 或 CSS。AI 只能返回符合 `ResumeTemplateDefinition` 的 JSON，服务端再通过 `normalizeTemplateDefinition` 做白名单校验，最终由项目内置组件渲染。

整体流程：

```txt
用户上传 PDF/图片
  -> API 校验文件类型和大小
  -> 转为 data URL
  -> 调用视觉模型分析版式
  -> 返回受控 TemplateDefinition JSON
  -> 前端保存为本地自定义模板
  -> 应用到当前 ResumeData
  -> ResumePreview 按模板分发渲染
```

模板定义只包含这些受控字段：

- `layout`：经典、极简、左右栏、可配置；页面边距；栏目比例；模块间距。
- `typography`：字体族、标题字号、模块标题字号、正文字号、行高。
- `colors`：主色、正文色、弱文本色、边框色、背景色、侧栏背景色。
- `header`：标题对齐、头像位置、个人信息展示方式。
- `section`：模块标题样式、图标显示、分割线显示。

这种设计的好处：

- 模板可以长期维护，不会散落成不可控代码。
- AI 输出失败时可以降级。
- 导出 PDF、图片、JSON 都复用同一套渲染。
- 自定义模板可以跟随简历 JSON 跨设备迁移。

## 三、使用教程

### 1. 切换内置视觉模板

1. 进入简历编辑页。
2. 找到左侧编辑面板顶部的“视觉模板”区域。
3. 点击 `经典模板`、`极简模板` 或 `左右栏模板`。
4. 右侧预览会立即切换版式。
5. 点击保存，当前简历会记录所选模板。

### 2. 上传 PDF/图片复刻模板

1. 进入简历编辑页。
2. 点击“视觉模板”区域右上角的“上传复刻”。
3. 选择一个 PDF、PNG、JPG 或 WEBP 文件。
4. 等待接口返回结果。
5. 生成的模板会保存到“我的模板”，并自动应用到当前简历。
6. 点击保存简历。

### 3. 配置 AI 复刻

在项目根目录创建 `config.yaml`。该文件已加入 `.gitignore`，不要提交真实密钥。

```yaml
openai:
  baseurl: "https://api.openai.com/v1"
  apikey: "你的服务端 API Key"
  model: "gpt-4.1-mini"
```

也可以参考根目录的 `config.example.yaml`。`model` 可不填，默认使用 `gpt-4.1-mini`。

未配置 `config.yaml` 或 `openai.apikey` 时，上传功能仍可使用，但只会返回本地降级模板，不会真正分析原始文件。

### 4. 控制求职意向换行

左右栏模板和可配置模板支持对求职意向逐项换行：

1. 进入“求职意向”编辑区。
2. 在某个求职意向项右侧点击换行按钮。
3. 该项后会强制换行，左右栏模板不再只能依赖 `｜` 分隔。

### 5. AI 整理润色

编辑器内新增“AI 整理润色”区域，包含两个能力。

#### 从原始文字生成

用户可以粘贴零散文字，例如工作经历、项目经历、技能栈、教育背景或自我介绍。服务端会调用 `config.yaml` 中配置的 OpenAI 兼容接口，并返回受控结构：

- `title`：简历标题或姓名。
- `personalInfo`：电话、邮箱、微信、GitHub 等个人信息。
- `jobIntentions`：求职方向、城市、工作经验等。
- `modules`：整理后的简历模块、行和列。

AI 不会直接生成 HTML、CSS 或 React 代码。服务端会把 AI 返回的纯文本转换为项目已有的 Tiptap JSON 结构，然后应用到当前简历。当前视觉模板和头像会保留。

#### 读取当前简历后局部修改

用户可以不再重复粘贴全量材料，而是直接输入局部修改指令，例如：

```txt
修改技能证书排版，每个竞赛/证书一行，每行之间奖项要对齐
```

接口 `POST /api/ai/edit` 会读取当前 `ResumeData`，让 AI 返回受控的模块补丁，只替换相关模块的 rows。未被指令提到的模块会保持不变。

### 6. 导出和导入

- 导出 JSON 时，`templateId` 和 `templateDefinition` 会随简历数据保存。
- 导入 JSON 时，如果包含 `templateDefinition`，会自动归一化并恢复自定义版式。
- PDF 和图片导出继续复用 `ResumePreview`，因此会按当前模板输出。

## 四、继续扩展模板

新增内置模板时，修改：

```txt
lib/templates/registry.ts
```

添加一个新的 `ResumeTemplateDefinition`。如果新模板可以被现有渲染器表达，只需要使用：

- `mode: "minimal"`
- `mode: "sidebar"`
- `mode: "configurable"`

如果需要完全不同的布局，可以：

1. 在 `components/resume-templates/` 新增模板组件。
2. 在 `ResumeTemplateLayoutMode` 中新增模式。
3. 在 `components/resume-preview.tsx` 中增加分发逻辑。
4. 在 `normalizeTemplateDefinition` 中加入白名单。

## 五、安全边界

上传接口遵循以下约束：

- 文件类型和扩展名双重校验。
- 10MB 大小限制。
- 不保存原始上传文件。
- 不记录简历原文、手机号、邮箱等敏感内容。
- AI 输出必须经过 schema 约束和本地归一化。
- 不允许 AI 返回任意 HTML、CSS 或脚本。

如果后续接入账号体系，自定义模板需要按用户隔离存储，并为该接口增加用户级限流。
