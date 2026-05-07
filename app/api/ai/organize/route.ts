import { readOpenAIConfig } from "@/lib/server-config"
import { createTextDoc, makePersonalInfoItem } from "@/lib/resume-content"
import type { JobIntentionItem, ModuleContentRow, ResumeData, ResumeModule } from "@/types/resume"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const MAX_TEXT_LENGTH = 12000

const AI_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary", "personalInfo", "jobIntentions", "modules"],
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    personalInfo: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "value"],
        properties: {
          label: { type: "string" },
          value: { type: "string" },
        },
      },
    },
    jobIntentions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "value", "type", "breakAfter"],
        properties: {
          label: { type: "string" },
          value: { type: "string" },
          type: { type: "string", enum: ["workYears", "position", "city", "salary", "custom"] },
          breakAfter: { type: "boolean" },
        },
      },
    },
    modules: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "rows"],
        properties: {
          title: { type: "string" },
          rows: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["columns"],
              properties: {
                columns: {
                  type: "array",
                  minItems: 1,
                  maxItems: 4,
                  items: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  },
}

function json(data: unknown, status = 200) {
  return Response.json(data, { status })
}

function extractResponseText(payload: any): string {
  if (typeof payload?.output_text === "string") return payload.output_text
  const chunks: string[] = []
  for (const item of payload?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (typeof content?.text === "string") chunks.push(content.text)
    }
  }
  return chunks.join("\n")
}

function createRow(moduleIndex: number, rowIndex: number, columns: string[]): ModuleContentRow {
  const safeColumns = columns.slice(0, 4)
  const isTitleRow = rowIndex === 0 && safeColumns.length >= 2
  return {
    id: `ai-row-${moduleIndex}-${rowIndex}-${Date.now()}`,
    type: "rich",
    columns: Math.max(1, safeColumns.length) as 1 | 2 | 3 | 4,
    elements: safeColumns.map((text, columnIndex) => ({
      id: `ai-elem-${moduleIndex}-${rowIndex}-${columnIndex}-${Date.now()}`,
      content: createTextDoc(text, { boldAll: isTitleRow }),
      columnIndex,
    })),
    order: rowIndex,
  }
}

function moduleIcon(title: string) {
  if (/教育|学校|学历/.test(title)) return "<path fill=\"currentColor\" d=\"M12 3L1 9l11 6l9-4.91V17h2V9M5 13.18v4L12 21l7-3.82v-4L12 17z\"/>"
  if (/项目/.test(title)) return "<path fill=\"currentColor\" d=\"M22 4h-8l-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2M2 6H0v14a2 2 0 0 0 2 2h18v-2H2z\"/>"
  if (/技能|技术/.test(title)) return "<path fill=\"currentColor\" d=\"m21.71 20.29l-1.42 1.42a1 1 0 0 1-1.41 0L7 9.85A3.8 3.8 0 0 1 6 10a4 4 0 0 1-3.78-5.3l2.54 2.54l.53-.53l1.42-1.42l.53-.53L4.7 2.22A4 4 0 0 1 10 6a3.8 3.8 0 0 1-.15 1l11.86 11.88a1 1 0 0 1 0 1.41M2.29 18.88a1 1 0 0 0 0 1.41l1.42 1.42a1 1 0 0 0 1.41 0l5.47-5.46l-2.83-2.83M20 2l-4 2v2l-2.17 2.17l2 2L18 8h2l2-4Z\"/>"
  return "<path fill=\"currentColor\" d=\"M10 2h4a2 2 0 0 1 2 2v2h4a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8c0-1.11.89-2 2-2h4V4c0-1.11.89-2 2-2m4 4V4h-4v2z\"/>"
}

function normalizeModuleTitle(title: string) {
  if (/教育|学校|学历/.test(title)) return "教育经历"
  if (/项目/.test(title)) return "项目经历"
  if (/技能|技术|证书|竞赛|奖项|语言能力|专业技能/.test(title)) return "技能证书"
  if (/自我|评价|总结|优势/.test(title)) return "自我评价"
  if (/工作|实习/.test(title)) return "实习经历"
  return title.trim() || "其他经历"
}

function modulePriority(title: string) {
  if (title === "教育经历") return 10
  if (title === "实习经历") return 20
  if (title === "项目经历") return 30
  if (title === "技能证书") return 40
  if (title === "自我评价") return 50
  return 45
}

function normalizeAndSortModules(modules: ResumeModule[]): ResumeModule[] {
  const merged = new Map<string, ResumeModule>()

  for (const module of modules) {
    const title = normalizeModuleTitle(module.title)
    const existing = merged.get(title)
    const rows = module.rows.map((row) => ({ ...row }))
    if (!existing) {
      merged.set(title, {
        ...module,
        title,
        icon: moduleIcon(title),
        rows,
      })
      continue
    }
    existing.rows.push(...rows)
  }

  return Array.from(merged.values())
    .sort((a, b) => modulePriority(a.title) - modulePriority(b.title))
    .map((module, moduleIndex) => ({
      ...module,
      order: moduleIndex,
      rows: module.rows.map((row, rowIndex) => ({ ...row, order: rowIndex })),
    }))
}

function mergeResumeData(current: ResumeData, ai: any): ResumeData {
  const now = new Date().toISOString()
  const personalInfo = Array.isArray(ai.personalInfo)
    ? ai.personalInfo
      .filter((item: any) => typeof item?.label === "string" && typeof item?.value === "string" && item.value.trim())
      .slice(0, 12)
      .map((item: any, index: number) => makePersonalInfoItem(item.label.trim(), item.value.trim(), index))
    : current.personalInfoSection.personalInfo

  const jobIntentions: JobIntentionItem[] = Array.isArray(ai.jobIntentions)
    ? ai.jobIntentions
      .filter((item: any) => typeof item?.label === "string" && typeof item?.value === "string" && item.value.trim())
      .slice(0, 8)
      .map((item: any, index: number) => ({
        id: `ai-jii-${index}-${Date.now()}`,
        label: item.label.trim(),
        value: item.value.trim(),
        order: index,
        type: ["workYears", "position", "city", "salary", "custom"].includes(item.type) ? item.type : "custom",
        breakAfter: Boolean(item.breakAfter),
      }))
    : current.jobIntentionSection?.items ?? []

  const modules: ResumeModule[] = Array.isArray(ai.modules)
    ? ai.modules
      .filter((module: any) => typeof module?.title === "string" && Array.isArray(module.rows))
      .slice(0, 10)
      .map((module: any, moduleIndex: number) => ({
        id: `ai-module-${moduleIndex}-${Date.now()}`,
        title: normalizeModuleTitle(module.title || ""),
        icon: moduleIcon(module.title || ""),
        order: moduleIndex,
        rows: module.rows
          .filter((row: any) => Array.isArray(row?.columns) && row.columns.some((text: unknown) => typeof text === "string" && text.trim()))
          .slice(0, 20)
          .map((row: any, rowIndex: number) => createRow(moduleIndex, rowIndex, row.columns.map((text: unknown) => String(text || "").trim()).filter(Boolean))),
      }))
    : current.modules

  if (typeof ai.summary === "string" && ai.summary.trim()) {
    modules.push({
      id: `ai-summary-${Date.now()}`,
      title: "自我评价",
      icon: moduleIcon("自我评价"),
      order: modules.length,
      rows: [createRow(99, 0, [ai.summary.trim()])],
    })
  }

  const normalizedModules = normalizeAndSortModules(modules)

  return {
    ...current,
    title: typeof ai.title === "string" && ai.title.trim() ? ai.title.trim() : current.title,
    personalInfoSection: {
      ...current.personalInfoSection,
      personalInfo,
    },
    jobIntentionSection: {
      enabled: true,
      items: jobIntentions,
    },
    modules: normalizedModules,
    updatedAt: now,
  }
}

export async function POST(req: Request) {
  try {
    const config = readOpenAIConfig()
    if (!config) {
      return json({ error: "未在 config.yaml 中配置 openai.apikey" }, 400)
    }

    const body = await req.json().catch(() => null)
    const rawText = typeof body?.text === "string" ? body.text.trim() : ""
    const currentResume = body?.resumeData as ResumeData | undefined
    if (!rawText) return json({ error: "请输入需要整理的文字" }, 400)
    if (rawText.length > MAX_TEXT_LENGTH) return json({ error: "输入文字不能超过 12000 字" }, 400)
    if (!currentResume?.personalInfoSection || !Array.isArray(currentResume.modules)) {
      return json({ error: "缺少当前简历数据" }, 400)
    }

    const response = await fetch(`${config.baseURL}/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: [
                  "你是中文校园技术简历编辑专家。请把用户输入的零散文字整理为专业、克制、可投递的中文简历内容。",
                  "要求：不编造公司、学校、时间、数字；保留真实事实；把口语改成简洁成果描述。",
                  "模块结构优先使用：教育经历、项目经历、技能证书、自我评价。除非用户明确提供工作或实习经历，否则不要生成工作经历。",
                  "教育经历第一行用 3 列：学校、专业/学历、时间；后续用“主修课程：”“在校成绩：”等字段名。",
                  "项目经历每个项目第一行用 3 列：项目类型/角色、项目名称、时间；后续行使用“项目描述：”“核心职责：”“技术栈：”等字段名。核心职责尽量合并为一行或两行，不要把每条职责拆成巨大段落。",
                  "技能证书必须把专业技能、语言能力、证书、竞赛奖项合并到同一个模块，按“语言能力：”“专业技能：”“证书与竞赛：”等类别组织，不要生成单独的专业技能模块。",
                  "rows.columns 表示一行中的 1-4 列。标题行适合 3 列；类别/描述行适合 1 列或 2-3 列。",
                  "只输出符合 schema 的 JSON，不要输出解释。",
                  "",
                  `当前简历标题：${currentResume.title}`,
                  "用户原文：",
                  rawText,
                ].join("\n"),
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "resume_ai_organize_result",
            schema: AI_SCHEMA,
            strict: true,
          },
        },
      }),
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      return json({ error: payload?.error?.message || "AI 整理失败" }, 502)
    }

    const parsed = JSON.parse(extractResponseText(payload))
    return json({ resumeData: mergeResumeData(currentResume, parsed) })
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("ai organize failed:", error instanceof Error ? error.message : "unknown error")
    }
    return json({ error: "AI 整理请求处理失败" }, 500)
  }
}
