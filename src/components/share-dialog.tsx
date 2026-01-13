"use client"

import { useState, useRef } from "react"
import { RecordItem } from "@/lib/data"
import { ShareCard } from "./share-card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Copy, Check, Download } from "lucide-react"
import { toPng } from "html-to-image"

interface ShareDialogProps {
  item: RecordItem
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShareDialog({ item, open, onOpenChange }: ShareDialogProps) {
  const [imageCopied, setImageCopied] = useState(false)
  const [textCopied, setTextCopied] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  const generateImage = async () => {
    // Use preview element for capture (it's visible)
    if (!previewRef.current) return null

    // Wait for images to load
    const images = previewRef.current.querySelectorAll("img")
    await Promise.all(
      Array.from(images).map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) resolve()
            img.addEventListener("load", () => resolve())
            img.addEventListener("error", () => resolve())
            setTimeout(resolve, 3000)
          })
      )
    )

    // Wait for fonts
    if (document.fonts) {
      await document.fonts.ready
    }

    const dataUrl = await toPng(previewRef.current, {
      quality: 1,
      pixelRatio: 2,
      cacheBust: true,
    } as any)

    return dataUrl
  }

  const handleCopyImage = async () => {
    if (!previewRef.current || isGenerating) return

    setIsGenerating(true)
    try {
      const dataUrl = await generateImage()
      if (!dataUrl) return

      // Convert dataUrl to blob
      const response = await fetch(dataUrl)
      const blob = await response.blob()

      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ])
      setImageCopied(true)
      setTimeout(() => setImageCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy image:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyText = async () => {
    const year = new Date().getFullYear()
    const text = `#${year}记录#\n\n${item.title}\n${item.rating ? `★ ${item.rating}/10\n` : ""}${item.notes || ""}`

    try {
      await navigator.clipboard.writeText(text)
      setTextCopied(true)
      setTimeout(() => setTextCopied(false), 2000)
    } catch (err) {
      // Fallback
      const textArea = document.createElement("textarea")
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      setTextCopied(true)
      setTimeout(() => setTextCopied(false), 2000)
    }
  }

  const handleDownloadImage = async () => {
    if (!previewRef.current || isGenerating) return

    setIsGenerating(true)
    try {
      const dataUrl = await generateImage()
      if (!dataUrl) return

      // Download the image
      const a = document.createElement("a")
      a.href = dataUrl
      a.download = `${item.title}-share.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (error) {
      console.error("Failed to download image:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>分享卡片</DialogTitle>
          <DialogDescription>
            生成包含封面、评分和评价的分享卡片
          </DialogDescription>
        </DialogHeader>

        {/* Preview - card will be captured */}
        <div className="flex justify-center py-4 bg-[#f5f3ef] rounded-2xl overflow-hidden">
          <ShareCard ref={previewRef} item={item} />
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleCopyImage}
            disabled={imageCopied || isGenerating}
          >
            {imageCopied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                已复制图片
              </>
            ) : isGenerating ? (
              <>
                <Download className="w-4 h-4 mr-2 animate-pulse" />
                生成中...
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                复制图片
              </>
            )}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleDownloadImage}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Download className="w-4 h-4 mr-2 animate-pulse" />
                生成中...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                下载图片
              </>
            )}
          </Button>
        </div>

        <Button
          className="w-full"
          onClick={handleCopyText}
          disabled={textCopied}
        >
          {textCopied ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              已复制文本
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-2" />
              复制文本（话题+评价）
            </>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
