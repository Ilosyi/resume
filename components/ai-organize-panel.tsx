"use client"

import { useState } from "react"
import { Icon } from "@iconify/react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import type { ResumeData } from "@/types/resume"

interface AIOrganizePanelProps {
  resumeData: ResumeData
  onApply: (resumeData: ResumeData) => void
}

export default function AIOrganizePanel({ resumeData, onApply }: AIOrganizePanelProps) {
  const { toast } = useToast()
  const [text, setText] = useState("")
  const [instruction, setInstruction] = useState("")
  const [organizing, setOrganizing] = useState(false)
  const [editing, setEditing] = useState(false)

  const handleOrganize = async () => {
    const raw = text.trim()
    if (!raw) {
      toast({ title: "请输入内容", description: "可以粘贴经历、项目、技能、教育背景等零散文字。", variant: "destructive" })
      return
    }
    if (raw.length > 12000) {
      toast({ title: "内容过长", description: "单次整理最多 12000 字。", variant: "destructive" })
      return
    }

    setOrganizing(true)
    try {
      const response = await fetch("/api/ai/organize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: raw, resumeData }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || "AI 整理失败")
      }
      onApply(payload.resumeData)
      toast({ title: "整理完成", description: "已将整理后的内容应用到当前简历，请检查后保存。" })
    } catch (error) {
      toast({
        title: "整理失败",
        description: error instanceof Error ? error.message : "请检查 config.yaml 配置后重试。",
        variant: "destructive",
      })
    } finally {
      setOrganizing(false)
    }
  }

  const handleEdit = async () => {
    const raw = instruction.trim()
    if (!raw) {
      toast({ title: "请输入修改指令", description: "例如：修改技能证书排版，每个竞赛/证书一行，每行之间奖项要对齐。", variant: "destructive" })
      return
    }
    if (raw.length > 3000) {
      toast({ title: "指令过长", description: "局部修改指令最多 3000 字。", variant: "destructive" })
      return
    }

    setEditing(true)
    try {
      const response = await fetch("/api/ai/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: raw, resumeData }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || "AI 局部修改失败")
      }
      onApply(payload.resumeData)
      toast({ title: "局部修改完成", description: payload.notes || "已按指令更新相关模块，请检查后保存。" })
    } catch (error) {
      toast({
        title: "局部修改失败",
        description: error instanceof Error ? error.message : "请检查 config.yaml 配置后重试。",
        variant: "destructive",
      })
    } finally {
      setEditing(false)
    }
  }

  return (
    <Card className="p-4 space-y-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon icon="mdi:sparkles" className="h-5 w-5 text-primary" />
          <h2 className="font-medium">AI 整理润色</h2>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium">从原始文字生成</div>
          <Button size="sm" onClick={handleOrganize} disabled={organizing || editing} className="gap-2">
            <Icon icon={organizing ? "mdi:loading" : "mdi:auto-fix"} className={`h-4 w-4 ${organizing ? "animate-spin" : ""}`} />
            {organizing ? "整理中" : "整理并应用"}
          </Button>
        </div>
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="粘贴你的原始文字，例如：项目经历、工作内容、技能栈、教育背景、求职方向。AI 会整理为模块、行列和要点，并直接应用到当前简历。"
          className="min-h-28 resize-y bg-background"
        />
      </div>

      <div className="space-y-2 border-t pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium">读取当前简历后局部修改</div>
          <Button size="sm" variant="outline" onClick={handleEdit} disabled={organizing || editing} className="gap-2 bg-transparent">
            <Icon icon={editing ? "mdi:loading" : "mdi:file-edit-outline"} className={`h-4 w-4 ${editing ? "animate-spin" : ""}`} />
            {editing ? "修改中" : "局部修改"}
          </Button>
        </div>
        <Textarea
          value={instruction}
          onChange={(event) => setInstruction(event.target.value)}
          placeholder="例如：修改技能证书排版，每个竞赛/证书一行，每行之间奖项要对齐。也可以说：把项目经历压缩一点，核心职责合并成一行。"
          className="min-h-20 resize-y bg-background"
        />
      </div>

      <div className="text-xs text-muted-foreground">
        内容会发送到服务端配置的 AI 接口；局部修改会读取当前简历结构，只改相关模块，不会重写未提到的部分。
      </div>
    </Card>
  )
}
