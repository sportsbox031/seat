"use client"

import * as React from "react"
import { GripVerticalIcon } from "lucide-react"
import { Group, Panel, Separator } from "react-resizable-panels"

import { cn } from "@/lib/utils"

const ResizablePanelGroup = React.forwardRef<
  React.ElementRef<typeof Group>,
  React.ComponentPropsWithoutRef<typeof Group>
>((props, ref) => <Group ref={ref} storage={null} {...props} />)
ResizablePanelGroup.displayName = "ResizablePanelGroup"

const ResizablePanel = React.forwardRef<
  React.ElementRef<typeof Panel>,
  React.ComponentPropsWithoutRef<typeof Panel>
>((props, ref) => <Panel ref={ref} {...props} />)
ResizablePanel.displayName = "ResizablePanel"

function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof Separator> & {
  withHandle?: boolean
}) {
  return (
    <Separator
      className={cn(
        "relative flex w-4 items-center justify-center bg-slate-200 hover:bg-slate-300 transition-colors cursor-col-resize",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        "[&[data-orientation=vertical]]:h-4 [&[data-orientation=vertical]]:w-full [&[data-orientation=vertical]]:cursor-row-resize",
        className
      )}
      {...props}
    >
      {withHandle && (
        <div className="z-10 flex h-8 w-4 items-center justify-center rounded-sm border border-slate-300 bg-white shadow-sm">
          <GripVerticalIcon className="h-4 w-4 text-slate-400" />
        </div>
      )}
    </Separator>
  )
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
