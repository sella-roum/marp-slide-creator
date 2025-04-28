"use client";

import React, { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileIcon, FilePlusIcon, TrashIcon, EditIcon, ChevronDownIcon } from "lucide-react";
import type { DocumentType } from "@/lib/types";

interface DocumentDropdownProps {
  documents: DocumentType[];
  currentDocument: DocumentType | null;
  onDocumentChange: (doc: DocumentType) => void;
  onCreateNew: () => void;
  onRename: (id: string, newTitle: string) => Promise<void>; // Promise を返すように変更
  onDelete: (id: string) => Promise<void>; // Promise を返すように変更
}

export function DocumentDropdown({
  documents,
  currentDocument,
  onDocumentChange,
  onCreateNew,
  onRename,
  onDelete,
}: DocumentDropdownProps) {
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDocForRename, setSelectedDocForRename] = useState<DocumentType | null>(null);
  const [selectedDocForDelete, setSelectedDocForDelete] = useState<DocumentType | null>(null);
  const [newTitle, setNewTitle] = useState("");

  const handleRenameClick = (doc: DocumentType) => {
    setSelectedDocForRename(doc);
    setNewTitle(doc.title);
    setIsRenameDialogOpen(true);
  };

  const handleDeleteClick = (doc: DocumentType) => {
    setSelectedDocForDelete(doc);
    setIsDeleteDialogOpen(true);
  };

  const handleRenameSubmit = async () => {
    if (selectedDocForRename && newTitle.trim()) {
      try {
        await onRename(selectedDocForRename.id, newTitle.trim());
        setIsRenameDialogOpen(false);
        setSelectedDocForRename(null);
        setNewTitle("");
      } catch (error) {
        console.error("Rename failed:", error);
        // エラー表示 (Toastなど)
      }
    }
  };

  const handleDeleteConfirm = async () => {
    if (selectedDocForDelete) {
      try {
        await onDelete(selectedDocForDelete.id);
        setIsDeleteDialogOpen(false);
        setSelectedDocForDelete(null);
      } catch (error) {
        console.error("Delete failed:", error);
        // エラー表示 (Toastなど)
      }
    }
  };

  // ドキュメントリストを更新日時の降順でソート
  const sortedDocuments = [...documents].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="min-w-[150px] justify-between">
            <span className="max-w-[120px] truncate">
              {currentDocument ? currentDocument.title : "ドキュメント選択"}
            </span>
            <ChevronDownIcon className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end">
          <DropdownMenuLabel>ドキュメント操作</DropdownMenuLabel>
          <DropdownMenuItem onClick={onCreateNew}>
            <FilePlusIcon className="mr-2 h-4 w-4" />
            <span>新規作成</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>既存のドキュメント</DropdownMenuLabel>
            {sortedDocuments.length > 0 ? (
              sortedDocuments.map((doc) => (
                <DropdownMenuSub key={doc.id}>
                  <DropdownMenuSubTrigger
                    className={`justify-between ${currentDocument?.id === doc.id ? "bg-accent" : ""}`}
                    onClick={() => onDocumentChange(doc)} // クリックで選択
                  >
                    <span className="truncate">{doc.title}</span>
                    {/* サブメニューを開くアイコンはデフォルトで表示される */}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => onDocumentChange(doc)}>
                        <FileIcon className="mr-2 h-4 w-4" />
                        開く
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleRenameClick(doc)}>
                        <EditIcon className="mr-2 h-4 w-4" />
                        名前を変更
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(doc)}
                        className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                        disabled={documents.length <= 1} // 最後の1つは消せないようにする
                      >
                        <TrashIcon className="mr-2 h-4 w-4" />
                        削除
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              ))
            ) : (
              <DropdownMenuItem disabled>ドキュメントがありません</DropdownMenuItem>
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Rename Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ドキュメント名の変更</DialogTitle>
            <DialogDescription>新しいドキュメント名を入力してください。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                名前
              </Label>
              <Input
                id="name"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="col-span-3"
                onKeyDown={(e) => e.key === "Enter" && handleRenameSubmit()}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                キャンセル
              </Button>
            </DialogClose>
            <Button type="submit" onClick={handleRenameSubmit} disabled={!newTitle.trim()}>
              変更
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ドキュメントの削除</DialogTitle>
            <DialogDescription>
              ドキュメント「{selectedDocForDelete?.title}
              」を削除しますか？この操作は元に戻せません。関連するチャット履歴も削除されます。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                キャンセル
              </Button>
            </DialogClose>
            <Button type="button" variant="destructive" onClick={handleDeleteConfirm}>
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
