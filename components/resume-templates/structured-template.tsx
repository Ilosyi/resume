/* eslint-disable @next/next/no-img-element */
"use client"

import { Icon } from "@iconify/react"
import type { JobIntentionItem, PersonalInfoItem, ResumeData, ResumeModule, ResumeTemplateDefinition } from "@/types/resume"
import RichTextRenderer from "@/components/rich-text-renderer"

interface StructuredTemplateProps {
  resumeData: ResumeData
  template: ResumeTemplateDefinition
}

function sortedPersonalInfo(resumeData: ResumeData): PersonalInfoItem[] {
  return (resumeData.personalInfoSection?.personalInfo || []).slice().sort((a, b) => a.order - b.order)
}

function sortedModules(resumeData: ResumeData): ResumeModule[] {
  return (resumeData.modules || []).slice().sort((a, b) => a.order - b.order)
}

function getJobIntentionItems(resumeData: ResumeData): JobIntentionItem[] {
  if (!resumeData.jobIntentionSection?.enabled || !resumeData.jobIntentionSection.items.length) return []
  return resumeData.jobIntentionSection.items
    .slice()
    .sort((a, b) => a.order - b.order)
    .filter((item) => item.value || item.salaryRange?.min || item.salaryRange?.max)
}

function getPersonalInfoLayout(resumeData: ResumeData) {
  return {
    mode: resumeData.personalInfoSection?.layout?.mode ?? "grid",
    itemsPerRow: resumeData.personalInfoSection?.layout?.itemsPerRow ?? 2,
    showLabels: resumeData.personalInfoSection?.showPersonalInfoLabels !== false,
  }
}

function getAvatarShape(resumeData: ResumeData) {
  const isIdPhoto = resumeData.personalInfoSection?.avatarType === "idPhoto"
  return isIdPhoto ? "square" : (resumeData.personalInfoSection?.avatarShape === "square" ? "square" : "circle")
}

function getAvatarSizing(shape: "circle" | "square", variant: "header" | "sidebar", borderColor: string, minimal = false) {
  if (variant === "sidebar") {
    return shape === "square"
      ? { className: "mb-6 h-28 w-24 object-cover rounded-none", style: { border: `2px solid ${borderColor}` } }
      : { className: "mb-6 h-24 w-24 object-cover rounded-full", style: { border: `2px solid ${borderColor}` } }
  }

  if (minimal) {
    return shape === "square"
      ? { className: "h-20 w-20 object-cover rounded-none", style: { border: "none" } }
      : { className: "h-20 w-20 object-cover rounded-full", style: { border: "none" } }
  }

  return shape === "square"
    ? { className: "h-24 w-20 object-cover rounded-none", style: { border: `1px solid ${borderColor}` } }
    : { className: "h-24 w-24 object-cover rounded-full", style: { border: `1px solid ${borderColor}` } }
}

function JobIntentionFlow({
  items,
  template,
  variant,
}: {
  items: JobIntentionItem[]
  template: ResumeTemplateDefinition
  variant: "header" | "sidebar"
}) {
  if (items.length === 0) return null
  const isSidebar = variant === "sidebar"

  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 ${isSidebar ? "mb-6" : "mt-2"}`}
      style={{ color: template.colors.muted, fontSize: template.typography.bodySize }}
    >
      {items.map((item, index) => (
        <span key={item.id} className="contents">
          <span
            className={isSidebar ? "min-w-0 py-0.5" : "min-w-0"}
          >
            <span style={{ color: template.colors.text }}>{item.label}</span>
            <span>：{item.value}</span>
          </span>
          {!item.breakAfter && index < items.length - 1 && !isSidebar ? (
            <span aria-hidden="true" style={{ color: template.colors.border }}>｜</span>
          ) : null}
          {item.breakAfter ? <span className="basis-full" aria-hidden="true" /> : null}
        </span>
      ))}
    </div>
  )
}

function PersonalInfoList({
  items,
  template,
  variant,
  showLabels,
  layoutMode,
  itemsPerRow,
}: {
  items: PersonalInfoItem[]
  template: ResumeTemplateDefinition
  variant: "inline" | "grid" | "sidebar"
  showLabels: boolean
  layoutMode: "inline" | "grid"
  itemsPerRow: number
}) {
  const isSidebar = variant === "sidebar"
  const isInline = layoutMode === "inline"
  const containerClass = isSidebar
    ? (isInline ? "flex flex-wrap gap-x-4 gap-y-1.5" : "space-y-2")
    : (isInline ? "flex flex-wrap gap-x-4 gap-y-1.5" : "grid gap-x-4 gap-y-1.5")
  const containerStyle = isSidebar || isInline
    ? undefined
    : { gridTemplateColumns: `repeat(${Math.max(1, itemsPerRow)}, minmax(0, 1fr))` }
  return (
    <div
      className={containerClass}
      style={{ ...containerStyle, color: template.colors.muted, fontSize: template.typography.bodySize }}
    >
      {items.map((item) => (
        <div key={item.id} className={isSidebar ? "flex items-start gap-2" : "inline-flex items-center gap-1"}>
          {item.icon ? (
            <svg
              className="mt-[0.15em] h-[1em] w-[1em] shrink-0"
              fill="currentColor"
              viewBox="0 0 24 24"
              dangerouslySetInnerHTML={{ __html: item.icon }}
            />
          ) : null}
          <span className={isSidebar ? "min-w-0 break-all" : "whitespace-nowrap"}>
            {showLabels ? <span style={{ color: template.colors.text }}>{item.label}：</span> : null}
            {item.value.type === "link" && item.value.content ? (
              <a href={item.value.content} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
                {item.value.title || item.value.content}
              </a>
            ) : (
              item.value.content || "未填写"
            )}
          </span>
        </div>
      ))}
    </div>
  )
}

function SectionTitle({ module, template }: { module: ResumeModule; template: ResumeTemplateDefinition }) {
  const baseStyle = {
    color: template.colors.primary,
    fontSize: template.typography.sectionTitleSize,
  }

  if (template.section.titleStyle === "badge") {
    return (
      <div className="mb-3 inline-flex items-center rounded px-2.5 py-1 font-semibold" style={{ ...baseStyle, backgroundColor: template.colors.sectionBackground }}>
        {module.title}
      </div>
    )
  }

  if (template.section.titleStyle === "bar") {
    return (
      <div className="mb-3 flex items-center gap-2 font-semibold tracking-wide" style={baseStyle}>
        <span className="h-4 w-1 rounded-sm" style={{ backgroundColor: template.colors.primary }} />
        {module.title}
      </div>
    )
  }

  return (
    <div
      className="mb-3 flex items-center gap-2 font-semibold"
      style={{
        ...baseStyle,
        borderBottom: template.section.dividerVisible ? `1px solid ${template.colors.border}` : undefined,
        paddingBottom: template.section.dividerVisible ? 6 : 0,
      }}
    >
      {template.section.iconVisible && module.icon ? (
        <svg
          width={18}
          height={18}
          viewBox="0 0 24 24"
          dangerouslySetInnerHTML={{ __html: module.icon }}
        />
      ) : null}
      {module.title}
    </div>
  )
}

function ModuleBlock({ module, template }: { module: ResumeModule; template: ResumeTemplateDefinition }) {
  return (
    <section className="resume-module">
      <SectionTitle module={module} template={template} />
      <div className="space-y-[0.35em]" style={{ color: template.colors.text, fontSize: template.typography.bodySize, lineHeight: template.typography.lineHeight }}>
        {module.rows
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((row) => row.type === "tags" ? (
            <div key={row.id} className="flex flex-wrap gap-1.5">
              {(row.tags || []).map((tag, idx) => (
                <span
                  key={`${row.id}-${idx}`}
                  className="rounded-full border px-2 py-0.5 text-[0.82em]"
                  style={{ borderColor: template.colors.border, color: template.colors.muted }}
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <div key={row.id} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${row.columns}, minmax(0, 1fr))` }}>
              {row.elements.map((element) => (
                <div key={element.id} className="min-w-0">
                  <RichTextRenderer content={element.content} />
                </div>
              ))}
            </div>
          ))}
      </div>
    </section>
  )
}

function EmptyState() {
  return (
    <div className="no-print py-12 text-center text-muted-foreground">
      <Icon icon="mdi:file-document-outline" className="mx-auto mb-4 h-12 w-12 opacity-50" />
      <p>暂无简历内容，请在左侧编辑区域添加模块</p>
    </div>
  )
}

export function ConfigurableTemplate({ resumeData, template }: StructuredTemplateProps) {
  const personalInfo = sortedPersonalInfo(resumeData)
  const modules = sortedModules(resumeData)
  const jobIntentionItems = getJobIntentionItems(resumeData)
  const personalInfoLayout = getPersonalInfoLayout(resumeData)
  const isMinimal = template.layout.mode === "minimal"
  const headerCentered = resumeData.centerTitle || template.header.align === "center"
  const avatarShape = getAvatarShape(resumeData)
  const avatarSizing = getAvatarSizing(avatarShape, "header", template.colors.border, isMinimal)

  return (
    <div
      className="resume-preview resume-content"
      style={{
        backgroundColor: template.colors.background,
        color: template.colors.text,
        fontFamily: template.typography.fontFamily,
        padding: template.layout.pagePadding,
      }}
    >
      <header className={headerCentered ? "mb-7 text-center" : "mb-7 flex items-start justify-between gap-6"}>
        {headerCentered ? (
          <div className="w-full">
            {resumeData.avatar && template.header.avatarPosition !== "none" ? (
              <img
                src={resumeData.avatar}
                alt="头像"
                className={`mx-auto mb-4 ${avatarSizing.className}`}
                style={{ ...avatarSizing.style, borderColor: template.colors.border, backgroundColor: template.colors.background }}
              />
            ) : null}
            <h1 className="font-bold" style={{ color: template.colors.primary, fontSize: template.typography.titleSize }}>
              {resumeData.title || "简历标题"}
            </h1>
            <JobIntentionFlow items={jobIntentionItems} template={template} variant="header" />
            <div className="mt-4">
              <PersonalInfoList
                items={personalInfo}
                template={template}
                variant={personalInfoLayout.mode === "inline" ? "inline" : "grid"}
                layoutMode={personalInfoLayout.mode}
                itemsPerRow={personalInfoLayout.itemsPerRow}
                showLabels={personalInfoLayout.showLabels}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="min-w-0 flex-1">
              <h1 className="font-bold" style={{ color: template.colors.primary, fontSize: template.typography.titleSize }}>
                {resumeData.title || "简历标题"}
              </h1>
              <JobIntentionFlow items={jobIntentionItems} template={template} variant="header" />
              <div className="mt-4">
                <PersonalInfoList
                  items={personalInfo}
                  template={template}
                  variant={personalInfoLayout.mode === "inline" ? "inline" : "grid"}
                  layoutMode={personalInfoLayout.mode}
                  itemsPerRow={personalInfoLayout.itemsPerRow}
                  showLabels={personalInfoLayout.showLabels}
                />
              </div>
            </div>
            {resumeData.avatar && template.header.avatarPosition !== "none" ? (
              <img
                src={resumeData.avatar}
                alt="头像"
                className={avatarSizing.className}
                style={{ ...avatarSizing.style, borderColor: template.colors.border, backgroundColor: template.colors.background }}
              />
            ) : null}
          </>
        )}
      </header>

      <div className="space-y-0" style={{ display: "grid", gap: template.layout.sectionGap }}>
        {modules.map((module) => <ModuleBlock key={module.id} module={module} template={template} />)}
      </div>
      {modules.length === 0 ? <EmptyState /> : null}
    </div>
  )
}

export function SidebarTemplate({ resumeData, template }: StructuredTemplateProps) {
  const personalInfo = sortedPersonalInfo(resumeData)
  const modules = sortedModules(resumeData)
  const jobIntentionItems = getJobIntentionItems(resumeData)
  const personalInfoLayout = getPersonalInfoLayout(resumeData)
  const left = template.layout.leftColumnPercent ?? 31
  const headerCentered = resumeData.centerTitle || template.header.align === "center"
  const avatarShape = getAvatarShape(resumeData)
  const avatarSizing = getAvatarSizing(avatarShape, "sidebar", template.colors.background)

  return (
    <div
      className="resume-preview resume-content grid overflow-hidden"
      style={{
        backgroundColor: template.colors.background,
        color: template.colors.text,
        fontFamily: template.typography.fontFamily,
        gridTemplateColumns: `${left}% ${100 - left}%`,
      }}
    >
      <aside
        className="min-h-full"
        style={{
          backgroundColor: template.colors.sidebarBackground,
          padding: 28,
        }}
      >
        {resumeData.avatar ? (
          <img
            src={resumeData.avatar}
            alt="头像"
            className={avatarSizing.className}
            style={{ ...avatarSizing.style, borderColor: template.colors.background }}
          />
        ) : null}
        <h1 className={`mb-2 font-bold leading-tight ${headerCentered ? "text-center" : ""}`} style={{ color: template.colors.primary, fontSize: template.typography.titleSize }}>
          {resumeData.title || "简历标题"}
        </h1>
        <JobIntentionFlow items={jobIntentionItems} template={template} variant="sidebar" />
        <div className="mb-6 h-px" style={{ backgroundColor: template.colors.border }} />
        <PersonalInfoList
          items={personalInfo}
          template={template}
          variant={personalInfoLayout.mode === "inline" ? "inline" : "sidebar"}
          layoutMode={personalInfoLayout.mode}
          itemsPerRow={personalInfoLayout.itemsPerRow}
          showLabels={personalInfoLayout.showLabels}
        />
      </aside>

      <main
        style={{
          padding: 34,
          display: "grid",
          gap: template.layout.sectionGap,
        }}
      >
        {modules.map((module) => <ModuleBlock key={module.id} module={module} template={template} />)}
        {modules.length === 0 ? <EmptyState /> : null}
      </main>
    </div>
  )
}
