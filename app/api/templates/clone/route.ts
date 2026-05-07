import { normalizeTemplateDefinition } from "@/lib/templates/schema"
import { readOpenAIConfig } from "@/lib/server-config"
import type { ResumeTemplateDefinition } from "@/types/resume"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = new Map([
  ["application/pdf", [".pdf"]],
  ["image/png", [".png"]],
  ["image/jpeg", [".jpg", ".jpeg"]],
  ["image/webp", [".webp"]],
])

const TEMPLATE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["id", "name", "source", "description", "layout", "typography", "colors", "header", "section"],
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    source: { type: "string", enum: ["generated"] },
    description: { type: "string" },
    layout: {
      type: "object",
      additionalProperties: false,
      required: ["mode", "pagePadding", "sectionGap", "leftColumnPercent", "density"],
      properties: {
        mode: { type: "string", enum: ["minimal", "sidebar", "configurable"] },
        pagePadding: { type: "number" },
        sectionGap: { type: "number" },
        leftColumnPercent: { type: "number" },
        density: { type: "string", enum: ["compact", "normal", "relaxed"] },
      },
    },
    typography: {
      type: "object",
      additionalProperties: false,
      required: ["fontFamily", "titleSize", "sectionTitleSize", "bodySize", "lineHeight"],
      properties: {
        fontFamily: {
          type: "string",
          enum: [
            "var(--font-noto-sans), sans-serif",
            "Georgia, serif",
            "Arial, sans-serif",
            "Times New Roman, serif",
          ],
        },
        titleSize: { type: "number" },
        sectionTitleSize: { type: "number" },
        bodySize: { type: "number" },
        lineHeight: { type: "number" },
      },
    },
    colors: {
      type: "object",
      additionalProperties: false,
      required: ["primary", "text", "muted", "border", "background", "sectionBackground", "sidebarBackground"],
      properties: {
        primary: { type: "string" },
        text: { type: "string" },
        muted: { type: "string" },
        border: { type: "string" },
        background: { type: "string" },
        sectionBackground: { type: "string" },
        sidebarBackground: { type: "string" },
      },
    },
    header: {
      type: "object",
      additionalProperties: false,
      required: ["align", "avatarPosition", "personalInfoStyle"],
      properties: {
        align: { type: "string", enum: ["left", "center", "split"] },
        avatarPosition: { type: "string", enum: ["none", "left", "right", "top"] },
        personalInfoStyle: { type: "string", enum: ["inline", "grid", "sidebar-list"] },
      },
    },
    section: {
      type: "object",
      additionalProperties: false,
      required: ["titleStyle", "iconVisible", "dividerVisible"],
      properties: {
        titleStyle: { type: "string", enum: ["underline", "bar", "badge", "plain"] },
        iconVisible: { type: "boolean" },
        dividerVisible: { type: "boolean" },
      },
    },
  },
}

function json(data: unknown, status = 200) {
  return Response.json(data, { status })
}

function getExtension(filename: string) {
  const match = filename.toLowerCase().match(/\.[^.]+$/)
  return match?.[0] ?? ""
}

function isAllowedFile(file: File) {
  const allowedExts = ALLOWED_TYPES.get(file.type)
  if (!allowedExts) return false
  return allowedExts.includes(getExtension(file.name))
}

function dataUrl(mime: string, buffer: Buffer) {
  return `data:${mime};base64,${buffer.toString("base64")}`
}

function fallbackTemplate(file: File): ResumeTemplateDefinition {
  const sidebar = file.type === "application/pdf"
  return normalizeTemplateDefinition({
    id: `generated-${Date.now()}`,
    name: sidebar ? "PDF 复刻模板" : "图片复刻模板",
    source: "generated",
    description: "未配置 AI Key 时生成的本地降级模板，可继续手动微调。",
    layout: {
      mode: sidebar ? "sidebar" : "configurable",
      pagePadding: sidebar ? 0 : 36,
      sectionGap: 18,
      leftColumnPercent: 31,
      density: "normal",
    },
    typography: {
      fontFamily: "var(--font-noto-sans), sans-serif",
      titleSize: 28,
      sectionTitleSize: 15,
      bodySize: 13,
      lineHeight: 1.5,
    },
    colors: {
      primary: "#0F766E",
      text: "#1F2937",
      muted: "#64748B",
      border: "#CBD5E1",
      background: "#FFFFFF",
      sectionBackground: "#F0FDFA",
      sidebarBackground: "#E6F4F1",
    },
    header: {
      align: sidebar ? "left" : "center",
      avatarPosition: sidebar ? "top" : "right",
      personalInfoStyle: sidebar ? "sidebar-list" : "grid",
    },
    section: {
      titleStyle: sidebar ? "bar" : "underline",
      iconVisible: false,
      dividerVisible: !sidebar,
    },
  })
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

async function callOpenAI(file: File, buffer: Buffer): Promise<ResumeTemplateDefinition> {
  const config = readOpenAIConfig()
  if (!config) {
    throw new Error("config.yaml 中缺少 openai.apikey")
  }

  const fileData = dataUrl(file.type, buffer)
  const content = [
    {
      type: "input_text",
      text: [
        "你是简历版式分析器。请分析上传的简历 PDF 或图片，只复刻视觉版式，不提取或保存个人隐私内容。",
        "输出必须是符合 schema 的模板 JSON。颜色使用 #RRGGBB；尺寸使用 px 数字；不要输出 HTML、CSS 或解释文字。",
        "如果版式是左右栏，mode 用 sidebar；如果极简单栏，mode 用 minimal；其他近似版式用 configurable。",
      ].join("\n"),
    },
    file.type === "application/pdf"
      ? {
        type: "input_file",
        filename: file.name || "resume.pdf",
        file_data: fileData,
      }
      : {
        type: "input_image",
        image_url: fileData,
        detail: "high",
      },
  ]

  const response = await fetch(`${config.baseURL}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      input: [{ role: "user", content }],
      text: {
        format: {
          type: "json_schema",
          name: "resume_template_definition",
          schema: TEMPLATE_SCHEMA,
          strict: true,
        },
      },
    }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error?.message || "OpenAI template analysis failed")
  }

  const text = extractResponseText(payload)
  const parsed = JSON.parse(text)
  return normalizeTemplateDefinition({
    ...parsed,
    id: `generated-${Date.now()}`,
    source: "generated",
  })
}

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get("file")
    if (!(file instanceof File)) {
      return json({ error: "Missing file" }, 400)
    }
    if (!isAllowedFile(file)) {
      return json({ error: "仅支持 PDF、PNG、JPG、WEBP 文件" }, 400)
    }
    if (file.size <= 0 || file.size > MAX_UPLOAD_SIZE) {
      return json({ error: "文件大小必须在 1B 到 10MB 之间" }, 400)
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const warnings: string[] = []
    let template: ResumeTemplateDefinition

    try {
      template = await callOpenAI(file, buffer)
    } catch (error) {
      template = fallbackTemplate(file)
      warnings.push(
        readOpenAIConfig()
          ? "AI 复刻失败，已使用本地降级模板。"
          : "未在 config.yaml 中配置 openai.apikey，已使用本地降级模板。",
      )
      if (process.env.NODE_ENV !== "production") {
        console.warn("template clone fallback:", error instanceof Error ? error.message : "unknown error")
      }
    }

    return json({
      template,
      confidence: warnings.length ? 0.45 : 0.82,
      warnings,
    })
  } catch {
    return json({ error: "模板复刻请求处理失败" }, 500)
  }
}
