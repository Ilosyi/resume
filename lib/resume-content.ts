import type { JSONContent, PersonalInfoItem } from "@/types/resume"

const ICONS: Record<string, string> = {
  电话: "<path fill=\"currentColor\" d=\"M6.62 10.79c1.44 2.83 3.76 5.15 6.59 6.59l2.2-2.2c.28-.28.67-.36 1.02-.25c1.12.37 2.32.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57c.11.35.03.74-.25 1.02z\"/>",
  手机: "<path fill=\"currentColor\" d=\"M6.62 10.79c1.44 2.83 3.76 5.15 6.59 6.59l2.2-2.2c.28-.28.67-.36 1.02-.25c1.12.37 2.32.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57c.11.35.03.74-.25 1.02z\"/>",
  邮箱: "<path fill=\"currentColor\" d=\"m20 8l-8 5l-8-5V6l8 5l8-5m0-2H4c-1.11 0-2 .89-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2\"/>",
  微信: "<path fill=\"currentColor\" d=\"M9.5 3C5.36 3 2 5.69 2 9c0 1.89 1.1 3.58 2.82 4.68L4.2 16l2.63-1.31c.83.2 1.73.31 2.67.31c.16 0 .32 0 .48-.01A5.55 5.55 0 0 1 9.8 13.6c0-3.04 2.99-5.5 6.7-5.5c.12 0 .23 0 .35.01C16.22 5.2 13.13 3 9.5 3m-2 3.5A1.5 1.5 0 1 1 6 8a1.5 1.5 0 0 1 1.5-1.5m5 0A1.5 1.5 0 1 1 11 8a1.5 1.5 0 0 1 1.5-1.5M16.5 9C13.46 9 11 10.99 11 13.45S13.46 17.9 16.5 17.9c.67 0 1.31-.1 1.9-.27L21 19l-.66-2.13c1.02-.81 1.66-2.02 1.66-3.42C22 10.99 19.54 9 16.5 9m-1.75 2.5a1.1 1.1 0 1 1 0 2.2a1.1 1.1 0 0 1 0-2.2m3.5 0a1.1 1.1 0 1 1 0 2.2a1.1 1.1 0 0 1 0-2.2\"/>",
  Github: "<path fill=\"currentColor\" d=\"M12 2C6.48 2 2 6.58 2 12.26c0 4.54 2.87 8.39 6.84 9.75c.5.1.68-.22.68-.49v-1.72c-2.78.62-3.37-1.37-3.37-1.37c-.45-1.18-1.11-1.49-1.11-1.49c-.91-.64.07-.63.07-.63c1 .07 1.53 1.06 1.53 1.06c.89 1.56 2.34 1.11 2.91.85c.09-.66.35-1.11.63-1.37c-2.22-.26-4.56-1.14-4.56-5.06c0-1.12.39-2.03 1.03-2.75c-.1-.26-.45-1.3.1-2.71c0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 6.1c.85 0 1.71.12 2.51.34c1.9-1.33 2.74-1.05 2.74-1.05c.55 1.41.2 2.45.1 2.71c.64.72 1.03 1.63 1.03 2.75c0 3.93-2.34 4.8-4.57 5.05c.36.32.68.94.68 1.9v2.82c0 .27.18.59.69.49A10.15 10.15 0 0 0 22 12.26C22 6.58 17.52 2 12 2\"/>",
  GitHub: "<path fill=\"currentColor\" d=\"M12 2C6.48 2 2 6.58 2 12.26c0 4.54 2.87 8.39 6.84 9.75c.5.1.68-.22.68-.49v-1.72c-2.78.62-3.37-1.37-3.37-1.37c-.45-1.18-1.11-1.49-1.11-1.49c-.91-.64.07-.63.07-.63c1 .07 1.53 1.06 1.53 1.06c.89 1.56 2.34 1.11 2.91.85c.09-.66.35-1.11.63-1.37c-2.22-.26-4.56-1.14-4.56-5.06c0-1.12.39-2.03 1.03-2.75c-.1-.26-.45-1.3.1-2.71c0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 6.1c.85 0 1.71.12 2.51.34c1.9-1.33 2.74-1.05 2.74-1.05c.55 1.41.2 2.45.1 2.71c.64.72 1.03 1.63 1.03 2.75c0 3.93-2.34 4.8-4.57 5.05c.36.32.68.94.68 1.9v2.82c0 .27.18.59.69.49A10.15 10.15 0 0 0 22 12.26C22 6.58 17.52 2 12 2\"/>",
  地址: "<path fill=\"currentColor\" d=\"M12 2A7 7 0 0 0 5 9c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7m0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5\"/>",
  城市: "<path fill=\"currentColor\" d=\"M12 2A7 7 0 0 0 5 9c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7m0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5\"/>",
}

export function getPersonalInfoIcon(label: string): string {
  const normalized = label.trim()
  return ICONS[normalized] || "<path fill=\"currentColor\" d=\"M11 17h2v-6h-2zm1-14A10 10 0 1 0 22 13A10 10 0 0 0 12 3m0 18a8 8 0 1 1 8-8a8 8 0 0 1-8 8m-1-11h2V7h-2z\"/>"
}

function inlineTextWithBoldLabel(text: string, boldAll = false): JSONContent[] {
  if (!text) return []
  if (boldAll) return [{ type: "text", text, marks: [{ type: "bold" }] }]

  const match = text.match(/^([^：:]{2,12}[：:])(.+)$/)
  if (!match) return [{ type: "text", text }]

  return [
    { type: "text", text: match[1], marks: [{ type: "bold" }] },
    { type: "text", text: match[2] },
  ]
}

export function createTextDoc(text: string, options: { boldAll?: boolean } = {}): JSONContent {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return { type: "doc", content: [{ type: "paragraph", content: [] }] }
  }

  const bulletLines = lines.filter((line) => /^[-*•]\s+/.test(line))
  if (bulletLines.length >= Math.max(2, Math.floor(lines.length * 0.6))) {
    return {
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: lines.map((line) => ({
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: inlineTextWithBoldLabel(line.replace(/^[-*•]\s+/, "")),
              },
            ],
          })),
        },
      ],
    }
  }

  return {
    type: "doc",
    content: lines.map((line) => ({
      type: "paragraph",
      content: inlineTextWithBoldLabel(line, options.boldAll),
    })),
  }
}

export function makePersonalInfoItem(label: string, content: string, order: number): PersonalInfoItem {
  const isLink = /^https?:\/\//i.test(content)
  return {
    id: `info-${Date.now()}-${order}-${Math.random().toString(36).slice(2, 8)}`,
    label,
    value: {
      content,
      type: isLink ? "link" : "text",
      title: isLink ? content.replace(/^https?:\/\//i, "").replace(/\/$/, "") : undefined,
    },
    icon: getPersonalInfoIcon(label),
    order,
  }
}
