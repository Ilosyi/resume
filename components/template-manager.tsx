"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Icon } from "@iconify/react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import type { ResumeTemplateDefinition, StoredResumeTemplate } from "@/types/resume"
import { BUILTIN_RESUME_TEMPLATES, resolveTemplateDefinition } from "@/lib/templates/registry"
import { deleteCustomTemplate, getCustomTemplates, saveCustomTemplate } from "@/lib/templates/storage"
import { normalizeTemplateDefinition } from "@/lib/templates/schema"

interface TemplateManagerProps {
  activeTemplateId?: string
  activeTemplateDefinition?: ResumeTemplateDefinition
  onSelect: (template: ResumeTemplateDefinition) => void
}

const ACCEPTED_UPLOAD_TYPES = ".pdf,.png,.jpg,.jpeg,.webp"

function TemplateSwatch({ template }: { template: ResumeTemplateDefinition }) {
  return (
    <div className="h-16 w-12 overflow-hidden rounded border bg-white shadow-sm" style={{ borderColor: template.colors.border }}>
      {template.layout.mode === "sidebar" ? (
        <div className="flex h-full">
          <div style={{ width: `${template.layout.leftColumnPercent ?? 31}%`, backgroundColor: template.colors.sidebarBackground }} />
          <div className="flex-1 p-1">
            <div className="mb-1 h-1.5 w-8" style={{ backgroundColor: template.colors.primary }} />
            <div className="space-y-1">
              <div className="h-px w-full" style={{ backgroundColor: template.colors.border }} />
              <div className="h-px w-4/5" style={{ backgroundColor: template.colors.border }} />
              <div className="h-px w-full" style={{ backgroundColor: template.colors.border }} />
            </div>
          </div>
        </div>
      ) : (
        <div className="p-1.5">
          <div className="mb-2 h-2 w-8" style={{ backgroundColor: template.colors.primary }} />
          <div className="space-y-1">
            <div className="h-px w-full" style={{ backgroundColor: template.colors.border }} />
            <div className="h-px w-3/4" style={{ backgroundColor: template.colors.border }} />
            <div className="h-px w-full" style={{ backgroundColor: template.colors.border }} />
            <div className="h-px w-2/3" style={{ backgroundColor: template.colors.border }} />
          </div>
        </div>
      )}
    </div>
  )
}

export default function TemplateManager({ activeTemplateId, activeTemplateDefinition, onSelect }: TemplateManagerProps) {
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [customTemplates, setCustomTemplates] = useState<StoredResumeTemplate[]>([])
  const [uploading, setUploading] = useState(false)

  const activeTemplate = useMemo(
    () => resolveTemplateDefinition(activeTemplateDefinition, activeTemplateId),
    [activeTemplateDefinition, activeTemplateId],
  )

  const refreshCustomTemplates = () => {
    try {
      setCustomTemplates(getCustomTemplates())
    } catch {
      setCustomTemplates([])
    }
  }

  useEffect(() => {
    refreshCustomTemplates()
  }, [])

  const handleUpload: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/webp"]
    if (!allowed.includes(file.type)) {
      toast({ title: "上传失败", description: "仅支持 PDF、PNG、JPG、WEBP 文件", variant: "destructive" })
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "上传失败", description: "文件不能超过 10MB", variant: "destructive" })
      return
    }

    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const response = await fetch("/api/templates/clone", {
        method: "POST",
        body: form,
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || "模板复刻失败")
      }

      const template = normalizeTemplateDefinition(payload?.template)
      const saved = saveCustomTemplate({
        ...template,
        id: template.id || `generated-${Date.now()}`,
        source: "generated",
      })
      refreshCustomTemplates()
      onSelect(saved.definition)
      toast({
        title: "模板复刻完成",
        description: payload?.warnings?.length ? payload.warnings[0] : "已保存为自定义模板并应用到当前简历",
      })
    } catch (error) {
      toast({
        title: "复刻失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const selectTemplate = (template: ResumeTemplateDefinition) => {
    onSelect(template)
  }

  const removeCustomTemplate = (id: string) => {
    deleteCustomTemplate(id)
    refreshCustomTemplates()
    toast({ title: "模板已删除" })
  }

  return (
    <Card className="p-4">
      <input ref={inputRef} type="file" accept={ACCEPTED_UPLOAD_TYPES} className="hidden" onChange={handleUpload} />
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon icon="mdi:palette-swatch" className="h-5 w-5 text-primary" />
          <h2 className="font-medium">视觉模板</h2>
          <Badge variant="secondary" className="text-xs">{activeTemplate.name}</Badge>
        </div>
        <Button size="sm" variant="outline" className="gap-2 bg-transparent" disabled={uploading} onClick={() => inputRef.current?.click()}>
          <Icon icon={uploading ? "mdi:loading" : "mdi:upload"} className={`h-4 w-4 ${uploading ? "animate-spin" : ""}`} />
          {uploading ? "复刻中" : "上传复刻"}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {BUILTIN_RESUME_TEMPLATES.map((template) => {
          const active = activeTemplate.id === template.id && activeTemplate.source === "builtin"
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => selectTemplate(template)}
              className={`flex items-center gap-3 rounded-md border p-3 text-left transition hover:border-primary ${active ? "border-primary bg-primary/5" : "border-border bg-background"}`}
            >
              <TemplateSwatch template={template} />
              <span className="min-w-0">
                <span className="block font-medium">{template.name}</span>
                <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">{template.description}</span>
              </span>
            </button>
          )
        })}
      </div>

      {customTemplates.length > 0 ? (
        <div className="mt-4">
          <div className="mb-2 text-xs font-medium text-muted-foreground">我的模板</div>
          <div className="grid gap-3 sm:grid-cols-2">
            {customTemplates.map((item) => {
              const active = activeTemplate.id === item.definition.id && activeTemplate.source !== "builtin"
              return (
                <div key={item.id} className={`flex items-center gap-3 rounded-md border p-3 ${active ? "border-primary bg-primary/5" : "border-border bg-background"}`}>
                  <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => selectTemplate(item.definition)}>
                    <TemplateSwatch template={item.definition} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{item.name}</span>
                      <span className="block text-xs text-muted-foreground">自定义模板</span>
                    </span>
                  </button>
                  <Button size="icon" variant="ghost" onClick={() => removeCustomTemplate(item.id)} aria-label="删除模板">
                    <Icon icon="mdi:trash-can-outline" className="h-4 w-4" />
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </Card>
  )
}
