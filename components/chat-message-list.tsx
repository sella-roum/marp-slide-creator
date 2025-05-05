"use client";

import React, { useRef, useEffect, type HTMLAttributes, type ClassAttributes } from "react";
import ReactMarkdown, { type Options as ReactMarkdownOptions } from 'react-markdown';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  BotIcon,
  UserIcon,
  CopyIcon,
  CheckIcon,
  Loader2Icon,
  ClipboardPasteIcon,
  PaletteIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChatMessageType } from "@/lib/types";
import { cn } from "@/lib/utils";

// rehype-sanitize のスキーマをカスタマイズしてクラス属性を許可
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
                    className={cn( // cnユーティリティを使用
                      "max-w-[95%] sm:max-w-[85%] md:max-w-[80%] rounded-lg p-3 break-words",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground" // ユーザーメッセージの背景と基本文字色
                        : "bg-muted" // アシスタントメッセージの背景
                    )}
                  >
                    {/* proseクラスを適用するラッパーdiv */}
                    <div className={cn(
                       "prose prose-sm dark:prose-invert max-w-none",
                       "prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-pre:my-2 prose-blockquote:my-1",
                       // ▼ ユーザーメッセージの場合、proseのデフォルト色を上書き ▼
                       message.role === 'user' && [
                         "prose-headings:text-primary-foreground",
                         "prose-p:text-primary-foreground",
                         "prose-strong:text-primary-foreground",
                         "prose-ul:text-primary-foreground",
                         "prose-ol:text-primary-foreground",
                         "prose-li:text-primary-foreground",
                         "prose-blockquote:text-primary-foreground/90",
                         "prose-a:text-primary-foreground/90 hover:prose-a:text-primary-foreground",
                         // ★ インラインコードの色を調整 (ライト/ダーク)
                         "prose-code:text-primary-foreground dark:prose-code:text-primary-foreground",
                         "prose-code:bg-primary/20 dark:prose-code:bg-primary/30", // 背景も少し調整
                       ]
                       // ▲ ユーザーメッセージの場合、proseのデフォルト色を上書き ▲
                    )}>
                      <ReactMarkdown
                        rehypePlugins={[[rehypeSanitize, schema]]}
                        components={{
                          pre({ node, className, children, ...props }) {
                            const preProps = props as ClassAttributes<HTMLPreElement> & HTMLAttributes<HTMLPreElement>;
                            // ★ コードブロックの背景と文字色をテーマに合わせて調整
                            return (
                              <pre className={cn(
                                className,
                                "p-2 rounded overflow-x-auto my-2",
                                // ライトテーマ: 暗い文字、明るい背景
                                "bg-gray-100 text-gray-900 dark:bg-black/80 dark:text-white"
                                )} {...preProps}>
                                {children}
                              </pre>
                            );
                          },
                          code({ node, inline, className, children, ...props }: CodeProps) {
                            const codeProps = props as ClassAttributes<HTMLElement> & HTMLAttributes<HTMLElement>;
                            const match = /language-(\w+)/.exec(className || '');
                            // ★ インラインコードは prose-code で指定されるため、ブロックレベルコードのみ調整
                            return !inline ? (
                              <code className={cn(
                                className,
                                "font-mono text-xs p-0 bg-transparent",
                                // ★ ブロックレベルコードの文字色を pre と合わせる (ダークテーマ時のみ白)
                                "dark:text-white"
                                )} {...codeProps}>
                                {children}
                              </code>
                            ) : (
                              // ★ インラインコードのスタイル (prose-codeで指定されるが念のため)
                              <code className={cn(
                                className,
                                "rounded px-1 py-0.5 font-mono text-xs",
                                // ユーザーメッセージの場合は prose-code:... で上書きされる
                                message.role !== 'user' && "bg-muted text-foreground dark:bg-muted dark:text-foreground"
                                )} {...codeProps}>
                                {children}
                              </code>
                            );
                          },
                          a({ node, ...props }) {
                             const anchorProps = props as ClassAttributes<HTMLAnchorElement> & HTMLAttributes<HTMLAnchorElement>;
                             // prose-a で色指定されるので、ここではクラス付与のみ
                             return <a target="_blank" rel="noopener noreferrer" className="hover:underline" {...anchorProps} />;
                          }
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>

                    {/* ボタン表示ロジック (変更なし) */}
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
                {/* {message.role === "system" && (
                  <div className="my-2 w-full rounded bg-destructive/10 px-2 py-1 text-center text-xs italic text-destructive">
                    {message.content}
                  </div>
                )} */}
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
