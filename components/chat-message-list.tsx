"use client";

import React, { useRef, useEffect, type HTMLAttributes, type ClassAttributes } from "react";
import ReactMarkdown, { type Options as ReactMarkdownOptions } from 'react-markdown';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  BotIcon,
  UserIcon,
  CopyIcon,
  CheckIcon,
  Loader2Icon,
  ClipboardPasteIcon,
  PaletteIcon,
  InfoIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChatMessageType } from "@/lib/types";
import { cn } from "@/lib/utils";

// rehype-sanitize のスキーマ
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code || []), 'className', 'style'],
    span: [...(defaultSchema.attributes?.span || []), 'className', 'style'],
    div: [...(defaultSchema.attributes?.div || []), 'className', 'style'],
    pre: [...(defaultSchema.attributes?.pre || []), 'className', 'style'],
    '*': [...(defaultSchema.attributes?.['*'] || []), 'className', 'style'],
  },
};


interface ChatMessageListProps {
  messages: ChatMessageType[];
  isLoading: boolean;
  isHistoryLoading: boolean;
  copiedStates: Record<string, boolean>;
  onCopyMarkdown: (code: string | null | undefined, messageId: string) => void;
  onCopyCss: (code: string | null | undefined, messageId: string) => void;
  onApplyMarkdown: (codeToApply: string | null | undefined) => void;
  onApplyCss: (codeToApply: string | null | undefined) => void;
  setViewportRef: (element: HTMLDivElement | null) => void;
}

interface CodeProps extends HTMLAttributes<HTMLElement> {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const ChatMessageList = React.memo(
  ({
    messages,
    isLoading,
    isHistoryLoading,
    copiedStates,
    onCopyMarkdown,
    onCopyCss,
    onApplyMarkdown,
    onApplyCss,
    setViewportRef,
  }: ChatMessageListProps) => {
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (scrollAreaRef.current) {
        const viewportElement = scrollAreaRef.current.querySelector<HTMLDivElement>(
          "div[data-radix-scroll-area-viewport]"
        );
        setViewportRef(viewportElement);
      }
    }, [setViewportRef]);

    // explanation を表示するヘルパーコンポーネント
    const ExplanationDisplay = ({ text }: { text: string }) => (
      <div className="mt-2 pt-2 border-t border-muted-foreground/20 text-xs text-muted-foreground italic">
         <div className="flex items-start gap-1">
            <InfoIcon className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <p className="flex-1">{text}</p>
         </div>
      </div>
    );

    // ★ CSSコードブロックを表示するヘルパーコンポーネント
    const CssCodeBlock = ({ code }: { code: string }) => (
        <pre className={cn(
            "p-2 rounded overflow-x-auto my-2 text-xs", // text-xs を追加
            "bg-gray-100 text-gray-900 dark:bg-black/80 dark:text-white"
            )}>
            <code className="font-mono bg-transparent dark:text-white">
                {code}
            </code>
        </pre>
    );

    return (
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {isHistoryLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isHistoryLoading && messages.length === 0 && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              チャット履歴はありません。
            </div>
          )}
          {!isHistoryLoading &&
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-2 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <Avatar className="h-6 w-6 flex-shrink-0">
                    <AvatarFallback>
                      <BotIcon className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                {message.role !== "system" && (
                  <div
                    className={cn(
                      "max-w-[95%] sm:max-w-[85%] md:max-w-[80%] rounded-lg p-3 break-words",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {/* ★ アシスタントメッセージの表示ロジックを修正 */}
                    {message.role === "assistant" ? (
                      <>
                        {/* slideMarkdown があればそれを表示 */}
                        {message.slideMarkdown ? (
                          <div className={cn(
                            "prose prose-sm dark:prose-invert max-w-none",
                            "prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-pre:my-2 prose-blockquote:my-1"
                          )}>
                            <ReactMarkdown rehypePlugins={[[rehypeSanitize, schema]]}>
                              {message.slideMarkdown}
                            </ReactMarkdown>
                          </div>
                        ) : message.cssCode ? (
                          // cssCode があればそれをコードブロックで表示
                          <CssCodeBlock code={message.cssCode} />
                        ) : (
                          // どちらもなければ content (explanation等) を表示
                          <div className={cn(
                            "prose prose-sm dark:prose-invert max-w-none",
                            "prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-pre:my-2 prose-blockquote:my-1"
                          )}>
                            <ReactMarkdown rehypePlugins={[[rehypeSanitize, schema]]}>
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        )}
                        {/* explanation があり、かつコードも表示している場合に補足表示 */}
                        {message.explanation && (message.slideMarkdown || message.cssCode) && (
                          <ExplanationDisplay text={message.explanation} />
                        )}
                      </>
                    ) : (
                      // ユーザーメッセージは従来通り content を表示
                      <div className={cn(
                        "prose prose-sm dark:prose-invert max-w-none",
                        "prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-pre:my-2 prose-blockquote:my-1",
                        "prose-headings:text-primary-foreground",
                        "prose-p:text-primary-foreground",
                        "prose-strong:text-primary-foreground",
                        "prose-ul:text-primary-foreground",
                        "prose-ol:text-primary-foreground",
                        "prose-li:text-primary-foreground",
                        "prose-blockquote:text-primary-foreground/90",
                        "prose-a:text-primary-foreground/90 hover:prose-a:text-primary-foreground",
                        "prose-code:text-primary-foreground dark:prose-code:text-primary-foreground",
                        "prose-code:bg-primary/20 dark:prose-code:bg-primary/30",
                      )}>
                        <ReactMarkdown rehypePlugins={[[rehypeSanitize, schema]]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    )}
                    {/* ★ ここまで表示ロジック修正 */}

                    {/* ボタン表示ロジック */}
                    {message.role === "assistant" && (message.slideMarkdown || message.cssCode) && (
                      <div className="mt-2 flex flex-wrap gap-2 border-t border-muted-foreground/20 pt-2">
                        {message.slideMarkdown && (
                          <>
                            <Button
                              variant="ghost" size="sm" className="h-7 px-2 text-xs"
                              onClick={() => onCopyMarkdown(message.slideMarkdown, message.id)}
                              aria-label={`メッセージ ${message.id} のMarkdownコードをコピー`}
                            >
                              {copiedStates[`md-${message.id}`] ? <CheckIcon className="mr-1 h-3 w-3" /> : <CopyIcon className="mr-1 h-3 w-3" />}
                              Markdownコピー
                            </Button>
                            <Button
                              variant="ghost" size="sm" className="h-7 px-2 text-xs"
                              onClick={() => onApplyMarkdown(message.slideMarkdown)}
                              aria-label={`メッセージ ${message.id} のMarkdownコードをエディタに適用`}
                            >
                              <ClipboardPasteIcon className="mr-1 h-3 w-3" />
                              エディタに適用
                            </Button>
                          </>
                        )}
                        {message.cssCode && (
                          <>
                            <Button
                              variant="ghost" size="sm" className="h-7 px-2 text-xs"
                              onClick={() => onCopyCss(message.cssCode, message.id)}
                              aria-label={`メッセージ ${message.id} のCSSコードをコピー`}
                            >
                              {copiedStates[`css-${message.id}`] ? <CheckIcon className="mr-1 h-3 w-3" /> : <CopyIcon className="mr-1 h-3 w-3" />}
                              CSSコピー
                            </Button>
                            <Button
                              variant="ghost" size="sm" className="h-7 px-2 text-xs"
                              onClick={() => onApplyCss(message.cssCode)}
                              aria-label={`メッセージ ${message.id} のCSSコードをカスタムCSSに適用`}
                            >
                              <PaletteIcon className="mr-1 h-3 w-3" />
                              CSSに適用
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {message.role === "user" && (
                  <Avatar className="h-6 w-6 flex-shrink-0">
                    <AvatarFallback>
                      <UserIcon className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
          {isLoading && !isHistoryLoading && (
            <div className="flex items-start gap-2">
              <Avatar className="h-6 w-6 flex-shrink-0">
                <AvatarFallback>
                  <BotIcon className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="max-w-[80%] rounded-lg bg-muted p-3">
                <Skeleton className="flex h-4 w-16 items-center">
                  <Loader2Icon className="h-3 w-3 animate-spin" />
                </Skeleton>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    );
  }
);

ChatMessageList.displayName = "ChatMessageList";
