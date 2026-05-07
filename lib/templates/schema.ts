import type { ResumeTemplateDefinition } from "@/types/resume"

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/

const DEFAULT_TEMPLATE: ResumeTemplateDefinition = {
  id: "classic",
  name: "经典模板",
  source: "builtin",
  description: "与当前默认预览一致，适合通用中文简历。",
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
}

function asNumber(value: unknown, fallback: number, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

function asEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && allowed.includes(value as T) ? value as T : fallback
}

function asColor(value: unknown, fallback: string) {
  return typeof value === "string" && HEX_COLOR_RE.test(value) ? value.toUpperCase() : fallback
}

function asString(value: unknown, fallback: string, max = 80) {
  if (typeof value !== "string") return fallback
  const trimmed = value.trim()
  if (!trimmed) return fallback
  return trimmed.slice(0, max)
}

/**
 * 对模板定义做白名单归一化。AI 或用户输入只能影响受控字段，不能注入任意 CSS/HTML。
 */
export function normalizeTemplateDefinition(input: unknown, fallback = DEFAULT_TEMPLATE): ResumeTemplateDefinition {
  const raw = typeof input === "object" && input !== null ? input as Record<string, unknown> : {}
  const layout = typeof raw.layout === "object" && raw.layout !== null ? raw.layout as Record<string, unknown> : {}
  const typography = typeof raw.typography === "object" && raw.typography !== null ? raw.typography as Record<string, unknown> : {}
  const colors = typeof raw.colors === "object" && raw.colors !== null ? raw.colors as Record<string, unknown> : {}
  const header = typeof raw.header === "object" && raw.header !== null ? raw.header as Record<string, unknown> : {}
  const section = typeof raw.section === "object" && raw.section !== null ? raw.section as Record<string, unknown> : {}

  const mode = asEnum(layout.mode, ["classic", "minimal", "sidebar", "configurable"] as const, fallback.layout.mode)

  return {
    id: asString(raw.id, fallback.id, 64).replace(/[^a-zA-Z0-9_-]/g, "-"),
    name: asString(raw.name, fallback.name, 40),
    source: asEnum(raw.source, ["builtin", "custom", "generated"] as const, fallback.source),
    description: typeof raw.description === "string" ? raw.description.trim().slice(0, 120) : fallback.description,
    layout: {
      mode,
      pagePadding: asNumber(layout.pagePadding, fallback.layout.pagePadding, 12, 64),
      sectionGap: asNumber(layout.sectionGap, fallback.layout.sectionGap, 8, 40),
      leftColumnPercent: asNumber(layout.leftColumnPercent, fallback.layout.leftColumnPercent ?? 32, 22, 42),
      density: asEnum(layout.density, ["compact", "normal", "relaxed"] as const, fallback.layout.density ?? "normal"),
    },
    typography: {
      fontFamily: asEnum(
        typography.fontFamily,
        [
          "var(--font-noto-sans), sans-serif",
          "Georgia, serif",
          "Arial, sans-serif",
          "Times New Roman, serif",
        ] as const,
        fallback.typography.fontFamily,
      ),
      titleSize: asNumber(typography.titleSize, fallback.typography.titleSize, 18, 36),
      sectionTitleSize: asNumber(typography.sectionTitleSize, fallback.typography.sectionTitleSize, 12, 22),
      bodySize: asNumber(typography.bodySize, fallback.typography.bodySize, 10, 16),
      lineHeight: asNumber(typography.lineHeight, fallback.typography.lineHeight, 1.2, 1.9),
    },
    colors: {
      primary: asColor(colors.primary, fallback.colors.primary),
      text: asColor(colors.text, fallback.colors.text),
      muted: asColor(colors.muted, fallback.colors.muted),
      border: asColor(colors.border, fallback.colors.border),
      background: asColor(colors.background, fallback.colors.background),
      sectionBackground: asColor(colors.sectionBackground, fallback.colors.sectionBackground ?? "#F5F6F8"),
      sidebarBackground: asColor(colors.sidebarBackground, fallback.colors.sidebarBackground ?? "#F3F4F6"),
    },
    header: {
      align: asEnum(header.align, ["left", "center", "split"] as const, fallback.header.align),
      avatarPosition: asEnum(header.avatarPosition, ["none", "left", "right", "top"] as const, fallback.header.avatarPosition),
      personalInfoStyle: asEnum(header.personalInfoStyle, ["inline", "grid", "sidebar-list"] as const, fallback.header.personalInfoStyle),
    },
    section: {
      titleStyle: asEnum(section.titleStyle, ["underline", "bar", "badge", "plain"] as const, fallback.section.titleStyle),
      iconVisible: typeof section.iconVisible === "boolean" ? section.iconVisible : fallback.section.iconVisible,
      dividerVisible: typeof section.dividerVisible === "boolean" ? section.dividerVisible : fallback.section.dividerVisible,
    },
  }
}

export function cloneTemplateDefinition(template: ResumeTemplateDefinition): ResumeTemplateDefinition {
  return normalizeTemplateDefinition(JSON.parse(JSON.stringify(template)), template)
}
