"use client";

import { Message } from "ai";
import { cn } from "@/lib/utils";
import { User, Bot, Loader2 } from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { ToolInvocationBadge } from "./ToolInvocationBadge";

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  return (
    <div className="flex flex-col h-full overflow-y-auto px-4 py-8">
      <div className="space-y-8 max-w-3xl mx-auto w-full">
        {messages.map((message) => (
          <div
            key={message.id || message.content}
            className={cn(
              "flex gap-3",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {message.role === "assistant" && (
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              </div>
            )}

            <div className={cn(
              "flex flex-col gap-1.5 max-w-[80%]",
              message.role === "user" ? "items-end" : "items-start"
            )}>
              <div className={cn(
                "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                message.role === "user"
                  ? "bg-neutral-900 text-white rounded-tr-sm"
                  : "bg-neutral-100 text-neutral-900 rounded-tl-sm"
              )}>
                {message.parts ? (
                  <>
                    {message.parts.map((part, partIndex) => {
                      switch (part.type) {
                        case "text":
                          return message.role === "user" ? (
                            <span key={partIndex} className="whitespace-pre-wrap">{part.text}</span>
                          ) : (
                            <MarkdownRenderer
                              key={partIndex}
                              content={part.text}
                              className="prose-sm"
                            />
                          );
                        case "reasoning":
                          return (
                            <div key={partIndex} className="mt-3 p-3 bg-white/60 rounded-lg border border-neutral-200">
                              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1.5">Reasoning</span>
                              <span className="text-sm text-neutral-700">{part.reasoning}</span>
                            </div>
                          );
                        case "tool-invocation":
                          return (
                            <ToolInvocationBadge
                              key={partIndex}
                              toolInvocation={part.toolInvocation}
                            />
                          );
                        case "source":
                          return (
                            <div key={partIndex} className="mt-2 text-xs text-neutral-400">
                              Source: {JSON.stringify(part.source)}
                            </div>
                          );
                        case "step-start":
                          return partIndex > 0 ? <hr key={partIndex} className="my-3 border-neutral-200" /> : null;
                        default:
                          return null;
                      }
                    })}
                    {isLoading &&
                      message.role === "assistant" &&
                      messages.indexOf(message) === messages.length - 1 && (
                        <div className="flex items-center gap-2 mt-3 text-neutral-400">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span className="text-xs">Generating…</span>
                        </div>
                      )}
                  </>
                ) : message.content ? (
                  message.role === "user" ? (
                    <span className="whitespace-pre-wrap">{message.content}</span>
                  ) : (
                    <MarkdownRenderer content={message.content} className="prose-sm" />
                  )
                ) : isLoading &&
                  message.role === "assistant" &&
                  messages.indexOf(message) === messages.length - 1 ? (
                  <div className="flex items-center gap-2 text-neutral-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="text-xs">Generating…</span>
                  </div>
                ) : null}
              </div>
            </div>

            {message.role === "user" && (
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}