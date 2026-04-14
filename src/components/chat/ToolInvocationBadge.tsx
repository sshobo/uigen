"use client";

import { ToolInvocation } from "ai";
import { Loader2 } from "lucide-react";

export function getToolLabel(tool: ToolInvocation): string {
  const args = tool.args as Record<string, unknown> | undefined;
  if (!args?.path) return tool.toolName;

  const filename =
    (args.path as string).split("/").filter(Boolean).pop() ?? tool.toolName;

  if (tool.toolName === "str_replace_editor") {
    switch (args.command) {
      case "create":
        return `Creating ${filename}`;
      case "str_replace":
      case "insert":
      case "undo_edit":
        return `Editing ${filename}`;
      case "view":
        return `Reading ${filename}`;
      default:
        return tool.toolName;
    }
  }

  if (tool.toolName === "file_manager") {
    switch (args.command) {
      case "delete":
        return `Deleting ${filename}`;
      case "rename": {
        const newFilename = (args.new_path as string | undefined)
          ?.split("/")
          .filter(Boolean)
          .pop();
        return newFilename
          ? `Renaming ${filename} → ${newFilename}`
          : `Renaming ${filename}`;
      }
      default:
        return tool.toolName;
    }
  }

  return tool.toolName;
}

export function ToolInvocationBadge({
  toolInvocation,
}: {
  toolInvocation: ToolInvocation;
}) {
  const label = getToolLabel(toolInvocation);
  const isDone =
    toolInvocation.state === "result" && toolInvocation.result != null;

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <>
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-neutral-700">{label}</span>
        </>
      ) : (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
          <span className="text-neutral-700">{label}</span>
        </>
      )}
    </div>
  );
}
