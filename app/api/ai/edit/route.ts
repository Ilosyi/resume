import { readOpenAIConfig } from "@/lib/server-config"
import { createTextDoc } from "@/lib/resume-content"
import type { JSONContent, ModuleContentRow, ResumeData } from "@/types/resume"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const MAX_INSTRUCTION_LENGTH = 3000

const EDIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["notes", "modulePatches"],
  properties: {
    notes: { type: "string" },
    modulePatches: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["targetTitle", "title", "mode", "rows"],
        properties: {
          targetTitle: { type: "string" },
          title: { type: "string" },
          mode: { type: "string", enum: ["replaceRows", "appendRows"] },
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

function textFromContent(content?: JSONContent): string {
  if (!content) return ""
  if (typeof content.text === "string") return content.text
  return (content.content || []).map(textFromContent).filter(Boolean).join(" ")
}

function currentResumeDigest(resumeData: ResumeData) {
  return {
    title: resumeData.title,
    jobIntentions: resumeData.jobIntentionSection?.items?.map((item) => ({
      label: item.label,
      value: item.value,
    })) ?? [],
    modules: resumeData.modules
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((module) => ({
        title: module.title,
        rows: module.rows
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((row) => row.elements.map((element) => textFromContent(element.content)).filter(Boolean)),
      })),
  }
}

function createRow(moduleIndex: number, rowIndex: number, columns: string[]): ModuleContentRow {
  const safeColumns = columns.map((column) => column.trim()).filter(Boolean).slice(0, 4)
  const isTitleRow = rowIndex === 0 && safeColumns.length >= 2
  return {
    id: `ai-edit-row-${moduleIndex}-${rowIndex}-${Date.now()}`,
    type: "rich",
    columns: Math.max(1, safeColumns.length) as 1 | 2 | 3 | 4,
    elements: safeColumns.map((text, columnIndex) => ({
      id: `ai-edit-elem-${moduleIndex}-${rowIndex}-${columnIndex}-${Date.now()}`,
      content: createTextDoc(text, { boldAll: isTitleRow }),
      columnIndex,
    })),
    order: rowIndex,
  }
}

function titleMatches(moduleTitle: string, targetTitle: string) {
  const a = moduleTitle.replace(/\s/g, "")
  const b = targetTitle.replace(/\s/g, "")
  if (!a || !b) return false
  return a.includes(b) || b.includes(a)
}

function applyPatches(resumeData: ResumeData, patchResult: any): ResumeData {
  const modulePatches = Array.isArray(patchResult.modulePatches) ? patchResult.modulePatches : []
  let modules = resumeData.modules.map((module) => ({
    ...module,
    rows: module.rows.map((row) => ({ ...row })),
  }))

  for (const patch of modulePatches) {
    if (!patch || typeof patch.targetTitle !== "string" || !Array.isArray(patch.rows)) continue
    const moduleIndex = modules.findIndex((module) => titleMatches(module.title, patch.targetTitle))
    const rows = patch.rows
      .filter((row: any) => Array.isArray(row?.columns) && row.columns.some((column: unknown) => typeof column === "string" && column.trim()))
      .slice(0, 24)
      .map((row: any, rowIndex: number) => createRow(moduleIndex >= 0 ? moduleIndex : modules.length, rowIndex, row.columns.map(String)))

    if (moduleIndex >= 0) {
      const existing = modules[moduleIndex]
      modules[moduleIndex] = {
        ...existing,
        title: typeof patch.title === "string" && patch.title.trim() ? patch.title.trim() : existing.title,
        rows: patch.mode === "appendRows"
          ? [...existing.rows, ...rows].map((row, index) => ({ ...row, order: index }))
          : rows,
      }
      continue
    }

    modules.push({
      id: `ai-edit-module-${Date.now()}`,
      title: typeof patch.title === "string" && patch.title.trim() ? patch.title.trim() : patch.targetTitle,
      icon: undefined,
      order: modules.length,
      rows,
    })
  }

  modules = modules.map((module, index) => ({ ...module, order: index }))

  return {
    ...resumeData,
    modules,
    updatedAt: new Date().toISOString(),
  }
}

export async function POST(req: Request) {
  try {
    const config = readOpenAIConfig()
    if (!config) return json({ error: "未在 config.yaml 中配置 openai.apikey" }, 400)

    const body = await req.json().catch(() => null)
    const instruction = typeof body?.instruction === "string" ? body.instruction.trim() : ""
    const resumeData = body?.resumeData as ResumeData | undefined

    if (!instruction) return json({ error: "请输入局部修改指令" }, 400)
    if (instruction.length > MAX_INSTRUCTION_LENGTH) return json({ error: "局部修改指令不能超过 3000 字" }, 400)
    if (!resumeData?.personalInfoSection || !Array.isArray(resumeData.modules)) {
      return json({ error: "缺少当前简历数据" }, 400)
    }

    const digest = currentResumeDigest(resumeData)
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
                  "你是中文简历局部编辑器。你会读取当前简历结构，根据用户指令只修改必要模块，不要重写整份简历。",
                  "输出必须是模块补丁 JSON。只返回需要修改的 modulePatches；未提到的模块必须保持不变。",
                  "如果用户要求调整技能证书、证书、竞赛排版：优先 patch targetTitle=技能证书；每个证书/竞赛单独一行；推荐 2-3 列，最后一列放奖项/等级/排名以便对齐；不要把所有证书塞进一段。",
                  "如果用户要求项目排版：保留每个项目的标题行，后续用“项目描述：”“核心职责：”“技术栈：”等字段名。",
                  "不要编造新经历、新奖项、新时间。只能整理当前简历中已经存在的信息。",
                  "",
                  "用户局部修改指令：",
                  instruction,
                  "",
                  "当前简历摘要 JSON：",
                  JSON.stringify(digest),
                ].join("\n"),
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "resume_ai_edit_patch",
            schema: EDIT_SCHEMA,
            strict: true,
          },
        },
      }),
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok) return json({ error: payload?.error?.message || "AI 局部修改失败" }, 502)

    const patchResult = JSON.parse(extractResponseText(payload))
    return json({
      resumeData: applyPatches(resumeData, patchResult),
      notes: patchResult.notes || "",
    })
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("ai edit failed:", error instanceof Error ? error.message : "unknown error")
    }
    return json({ error: "AI 局部修改请求处理失败" }, 500)
  }
}
