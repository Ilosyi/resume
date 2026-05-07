import type { ResumeTemplateDefinition } from "@/types/resume"
import { cloneTemplateDefinition, normalizeTemplateDefinition } from "./schema"

export const BUILTIN_RESUME_TEMPLATES: ResumeTemplateDefinition[] = [
  {
    id: "classic",
    name: "经典模板",
    source: "builtin",
    description: "保留原项目的单栏版式，兼容性最好。",
    layout: {
      mode: "classic",
      pagePadding: 32,
      sectionGap: 24,
      density: "normal",
    },
    typography: {
      fontFamily: "var(--font-noto-sans), sans-serif",
      titleSize: 24,
      sectionTitleSize: 18,
      bodySize: 14,
      lineHeight: 1.55,
    },
    colors: {
      primary: "#111827",
      text: "#111827",
      muted: "#4B5563",
      border: "#E5E7EB",
      background: "#FFFFFF",
      sectionBackground: "#F5F6F8",
    },
    header: {
      align: "center",
      avatarPosition: "top",
      personalInfoStyle: "inline",
    },
    section: {
      titleStyle: "underline",
      iconVisible: true,
      dividerVisible: true,
    },
  },
  {
    id: "minimal",
    name: "极简模板",
    source: "builtin",
    description: "细分割线、低装饰密度，适合投递系统和打印。",
    layout: {
      mode: "minimal",
      pagePadding: 38,
      sectionGap: 18,
      density: "compact",
    },
    typography: {
      fontFamily: "var(--font-noto-sans), sans-serif",
      titleSize: 28,
      sectionTitleSize: 14,
      bodySize: 13,
      lineHeight: 1.48,
    },
    colors: {
      primary: "#0F172A",
      text: "#1F2937",
      muted: "#64748B",
      border: "#CBD5E1",
      background: "#FFFFFF",
      sectionBackground: "#F8FAFC",
    },
    header: {
      align: "left",
      avatarPosition: "right",
      personalInfoStyle: "grid",
    },
    section: {
      titleStyle: "plain",
      iconVisible: false,
      dividerVisible: true,
    },
  },
  {
    id: "sidebar",
    name: "左右栏模板",
    source: "builtin",
    description: "侧栏集中展示个人信息和技能，主栏突出经历。",
    layout: {
      mode: "sidebar",
      pagePadding: 0,
      sectionGap: 18,
      leftColumnPercent: 31,
      density: "normal",
    },
    typography: {
      fontFamily: "var(--font-noto-sans), sans-serif",
      titleSize: 30,
      sectionTitleSize: 15,
      bodySize: 13,
      lineHeight: 1.5,
    },
    colors: {
      primary: "#0E7490",
      text: "#172033",
      muted: "#667085",
      border: "#D7DEE8",
      background: "#FFFFFF",
      sectionBackground: "#EFF6FF",
      sidebarBackground: "#EAF3F5",
    },
    header: {
      align: "left",
      avatarPosition: "top",
      personalInfoStyle: "sidebar-list",
    },
    section: {
      titleStyle: "bar",
      iconVisible: false,
      dividerVisible: false,
    },
  },
]

export function getBuiltinTemplateById(id?: string): ResumeTemplateDefinition {
  const found = BUILTIN_RESUME_TEMPLATES.find((template) => template.id === id)
  return cloneTemplateDefinition(found ?? BUILTIN_RESUME_TEMPLATES[0])
}

export function resolveTemplateDefinition(template?: ResumeTemplateDefinition | null, templateId?: string | null): ResumeTemplateDefinition {
  if (template) {
    return normalizeTemplateDefinition(template, getBuiltinTemplateById(template.id))
  }
  return getBuiltinTemplateById(templateId ?? undefined)
}
