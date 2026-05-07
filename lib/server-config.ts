import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

export interface OpenAIConfig {
  baseURL: string
  apiKey: string
  model: string
}

function stripComment(line: string) {
  let quote: "'" | "\"" | null = null
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if ((ch === "'" || ch === "\"") && line[i - 1] !== "\\") {
      quote = quote === ch ? null : quote || ch
    }
    if (ch === "#" && !quote) {
      return line.slice(0, i)
    }
  }
  return line
}

function parseScalar(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ""
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

/**
 * 只解析本项目需要的简单 YAML：顶层 key/value 和一层对象。
 * 不支持数组、锚点等高级 YAML 语法，避免为了读取密钥引入额外依赖。
 */
function parseSimpleYaml(content: string): Record<string, unknown> {
  const root: Record<string, unknown> = {}
  const sections: Record<string, Record<string, string>> = {}
  let currentSection: string | null = null

  for (const rawLine of content.split(/\r?\n/)) {
    const lineWithoutComment = stripComment(rawLine)
    if (!lineWithoutComment.trim()) continue

    const indent = lineWithoutComment.match(/^\s*/)?.[0].length ?? 0
    const line = lineWithoutComment.trim()
    const idx = line.indexOf(":")
    if (idx <= 0) continue

    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim()

    if (indent === 0) {
      if (!value) {
        currentSection = key
        sections[currentSection] = sections[currentSection] || {}
        root[currentSection] = sections[currentSection]
      } else {
        currentSection = null
        root[key] = parseScalar(value)
      }
      continue
    }

    if (currentSection) {
      sections[currentSection][key] = parseScalar(value)
    }
  }

  return root
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {}
}

function readString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return ""
}

export function readOpenAIConfig(): OpenAIConfig | null {
  const configPath = path.join(process.cwd(), "config.yaml")
  if (!existsSync(configPath)) return null

  const parsed = parseSimpleYaml(readFileSync(configPath, "utf8"))
  const openai = asRecord(parsed.openai)
  const aliased = { ...parsed, ...openai }
  const apiKey = readString(aliased, ["apikey", "apiKey", "api_key", "key"])
  if (!apiKey) return null

  const rawBaseURL = readString(aliased, ["baseurl", "baseUrl", "baseURL", "base_url", "url"])
  const baseURL = (rawBaseURL || "https://api.openai.com/v1").replace(/\/+$/, "")
  const model = readString(aliased, ["model", "templateModel", "template_model"]) || "gpt-4.1-mini"

  return { baseURL, apiKey, model }
}
