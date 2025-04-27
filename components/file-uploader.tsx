"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { ImageIcon, FileTextIcon, FileIcon, XIcon, UploadIcon } from "lucide-react"

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void
  maxFiles?: number
  acceptedFileTypes?: string
}

export function FileUploader({
  onFilesSelected,
  maxFiles = 1,
  acceptedFileTypes = "image/*,application/pdf,text/plain,text/markdown",
}: FileUploaderProps) {
  const { toast } = useToast()
  const [dragActive, setDragActive] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [progress, setProgress] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Handle drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  // Handle drop event
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files))
    }
  }

  // Handle file input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()

    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files))
    }
  }

  // Process selected files
  const handleFiles = (selectedFiles: File[]) => {
    // Check if max files limit is reached
    if (selectedFiles.length > maxFiles) {
      toast({
        title: "エラー",
        description: `アップロードできるファイルは最大${maxFiles}個です`,
        variant: "destructive",
      })
      return
    }

    // Filter files by accepted types
    const acceptedTypes = acceptedFileTypes.split(",")
    const validFiles = selectedFiles.filter((file) => {
      const isValid = acceptedTypes.some((type) => {
        if (type.endsWith("/*")) {
          const category = type.replace("/*", "")
          return file.type.startsWith(category)
        }
        return file.type === type
      })

      if (!isValid) {
        toast({
          title: "エラー",
          description: `${file.name}は対応していないファイル形式です`,
          variant: "destructive",
        })
      }

      return isValid
    })

    if (validFiles.length === 0) return

    // Simulate upload progress
    setProgress(0)
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + 10
      })
    }, 50)

    // Set files and call callback
    setTimeout(() => {
      setFiles(validFiles)
      onFilesSelected(validFiles)

      toast({
        title: "アップロード完了",
        description: `${validFiles.length}個のファイルをアップロードしました`,
      })

      // Reset file input
      if (inputRef.current) {
        inputRef.current.value = ""
      }
    }, 600)
  }

  // Remove a file
  const removeFile = (index: number) => {
    const newFiles = [...files]
    newFiles.splice(index, 1)
    setFiles(newFiles)
    onFilesSelected(newFiles)
  }

  // Get file icon based on type
  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) {
      return <ImageIcon className="h-6 w-6" />
    } else if (file.type === "application/pdf") {
      return <FileTextIcon className="h-6 w-6" />
    } else {
      return <FileIcon className="h-6 w-6" />
    }
  }

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center ${
          dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
        }`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          multiple={maxFiles > 1}
          accept={acceptedFileTypes}
          onChange={handleChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <UploadIcon className="h-10 w-10 text-muted-foreground" />
          <p className="text-lg font-medium">ファイルをドラッグ&ドロップ</p>
          <p className="text-sm text-muted-foreground">または</p>
          <Button variant="outline" onClick={() => inputRef.current?.click()}>
            ファイルを選択
          </Button>
          <p className="text-xs text-muted-foreground mt-2">対応形式: 画像, PDF, テキスト, Markdown</p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">アップロードされたファイル:</p>

          {progress < 100 ? (
            <Progress value={progress} className="h-2" />
          ) : (
            <div className="space-y-2">
              {files.map((file, index) => (
                <Card key={index} className="p-2 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getFileIcon(file)}
                    <div>
                      <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeFile(index)}>
                    <XIcon className="h-4 w-4" />
                  </Button>
                </Card>
              ))}

              <div className="flex justify-between">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    // Switch to chat tab and use the files
                    const event = new CustomEvent("useUploadedFiles", { detail: { files } })
                    document.dispatchEvent(event)
                  }}
                >
                  チャットで使用する
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFiles([])
                    onFilesSelected([])
                  }}
                >
                  すべて削除
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
