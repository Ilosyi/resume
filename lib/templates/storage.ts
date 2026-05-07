"use client"

import type { ResumeTemplateDefinition, StoredResumeTemplate } from "@/types/resume"
import { normalizeTemplateDefinition } from "./schema"

export const LOCAL_TEMPLATE_STORAGE_KEY = "resume.templates"

function isClient() {
  return typeof window !== "undefined"
}

function readAll(): StoredResumeTemplate[] {
  if (!isClient()) return []
  try {
    const raw = window.localStorage.getItem(LOCAL_TEMPLATE_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null
        const record = item as StoredResumeTemplate
        return {
          id: record.id,
          name: record.name,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
          previewImage: record.previewImage,
          definition: normalizeTemplateDefinition(record.definition),
        }
      })
      .filter(Boolean) as StoredResumeTemplate[]
  } catch {
    return []
  }
}

function writeAll(list: StoredResumeTemplate[]) {
  if (!isClient()) return
  window.localStorage.setItem(LOCAL_TEMPLATE_STORAGE_KEY, JSON.stringify(list))
}

export function getCustomTemplates(): StoredResumeTemplate[] {
  return readAll()
}

export function getCustomTemplateById(id: string): StoredResumeTemplate | null {
  return readAll().find((template) => template.id === id) ?? null
}

export function saveCustomTemplate(definition: ResumeTemplateDefinition, previewImage?: string): StoredResumeTemplate {
  const now = new Date().toISOString()
  const normalized = normalizeTemplateDefinition({
    ...definition,
    source: definition.source === "builtin" ? "custom" : definition.source,
  })
  const entry: StoredResumeTemplate = {
    id: normalized.id || `template-${Date.now()}`,
    name: normalized.name,
    createdAt: now,
    updatedAt: now,
    definition: normalized,
    previewImage,
  }
  const list = readAll()
  const idx = list.findIndex((item) => item.id === entry.id)
  if (idx >= 0) {
    entry.createdAt = list[idx].createdAt
    list[idx] = entry
  } else {
    list.unshift(entry)
  }
  writeAll(list)
  return entry
}

export function deleteCustomTemplate(id: string) {
  writeAll(readAll().filter((template) => template.id !== id))
}
