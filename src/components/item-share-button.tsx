"use client"

import { useState } from "react"
import { RecordItem } from "@/lib/data"
import { ShareDialog } from "./share-dialog"
import { Button } from "./ui/button"
import { Share2 } from "lucide-react"

interface ItemShareButtonProps {
  item: RecordItem
}

export function ItemShareButton({ item }: ItemShareButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Share2 className="w-4 h-4" />
        分享
      </Button>
      <ShareDialog item={item} open={open} onOpenChange={setOpen} />
    </>
  )
}
