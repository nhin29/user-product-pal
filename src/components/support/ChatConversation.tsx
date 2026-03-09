import { useState, useRef, useEffect } from "react";
import { UserConversation, ChatMessage, useSupportChats } from "@/hooks/useSupportChats";
import { useSupportFolders } from "@/hooks/useSupportFolders";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Send, Loader2, Trash2, FolderInput, Inbox, Paperclip, X, FileText, Download } from "lucide-react";
import { formatNY, formatDistanceToNowNY } from "@/lib/dateUtils";
import { DeleteChatHistoryDialog } from "./DeleteChatHistoryDialog";
import { EmojiPicker } from "./EmojiPicker";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface ChatConversationProps {
  conversation: UserConversation;
  onChatDeleted?: () => void;
}

export function ChatConversation({ conversation, onChatDeleted }: ChatConversationProps) {
  const { sendMessage, deleteConversation, useConversationMessages } = useSupportChats();
  const { data: messages = [], isLoading: messagesLoading } = useConversationMessages(conversation.conversation_id);
  const { folders, moveConversation } = useSupportFolders();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation.conversation_id, messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAttachmentFile(file);

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setAttachmentPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setAttachmentPreview(null);
    }
  };

  const removeAttachment = () => {
    setAttachmentFile(null);
    setAttachmentPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadFile = async (file: File): Promise<{ url: string; type: string; name: string }> => {
    const ext = file.name.split(".").pop() || "bin";
    const filePath = `${conversation.conversation_id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from("chat-attachments")
      .upload(filePath, file);

    if (error) throw error;

    const { data: publicUrl } = supabase.storage
      .from("chat-attachments")
      .getPublicUrl(filePath);

    const type = file.type.startsWith("image/") ? "image" : "file";
    return { url: publicUrl.publicUrl, type, name: file.name };
  };

  const handleSend = async () => {
    const hasMessage = message.trim().length > 0;
    const hasAttachment = !!attachmentFile;
    if (!hasMessage && !hasAttachment) return;

    try {
      setIsUploading(hasAttachment);
      let attachmentData: { url: string; type: string; name: string } | null = null;

      if (attachmentFile) {
        attachmentData = await uploadFile(attachmentFile);
      }

      await sendMessage.mutateAsync({
        conversationId: conversation.conversation_id,
        message: message.trim() || (attachmentData ? `📎 ${attachmentData.name}` : ""),
        attachmentUrl: attachmentData?.url || null,
        attachmentType: attachmentData?.type || null,
        attachmentName: attachmentData?.name || null,
      });

      setMessage("");
      removeAttachment();
    } catch (err: any) {
      toast({
        title: "Failed to send",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newMsg = message.slice(0, start) + emoji + message.slice(end);
      setMessage(newMsg);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      setMessage((prev) => prev + emoji);
    }
  };

  const handleDelete = async () => {
    await deleteConversation.mutateAsync(conversation.conversation_id);
    setShowDeleteDialog(false);
    onChatDeleted?.();
  };

  const currentFolderName = folders.find((f) => f.id === conversation.folder_id)?.name || "Inbox";

  return (
    <>
      {/* Header */}
      <div className="p-3 border-b bg-muted/50 flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={conversation.avatar_url || undefined} />
          <AvatarFallback>
            {conversation.user_name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold">{conversation.user_name}</p>
          <p className="text-sm text-muted-foreground">{conversation.user_email}</p>
        </div>
        {conversation.last_seen && (
          <span className="text-xs text-muted-foreground">
            Last seen {formatDistanceToNowNY(conversation.last_seen, { addSuffix: true })}
          </span>
        )}

        {/* Move to folder */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <FolderInput className="h-4 w-4" />
              <span className="text-xs">{currentFolderName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              onClick={() => moveConversation.mutate({ conversationId: conversation.conversation_id, folderId: null })}
            >
              <Inbox className="h-3.5 w-3.5 mr-2" /> Inbox
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {folders.map((f) => (
              <DropdownMenuItem
                key={f.id}
                onClick={() =>
                  moveConversation.mutate({ conversationId: conversation.conversation_id, folderId: f.id })
                }
              >
                {f.parent_id && <span className="ml-3" />}
                {f.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash2 className="h-5 w-5" />
        </Button>
      </div>

      <DeleteChatHistoryDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        userName={conversation.user_name}
        onConfirm={handleDelete}
        isDeleting={deleteConversation.isPending}
      />

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messagesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                  <Skeleton className="h-16 w-[60%] rounded-lg" />
                </div>
              ))}
            </div>
          ) : (
            messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Attachment Preview */}
      {attachmentFile && (
        <div className="px-3 pt-2 border-t bg-muted/20">
          <div className="flex items-center gap-2 bg-muted rounded-lg p-2 max-w-xs">
            {attachmentPreview ? (
              <img src={attachmentPreview} alt="Preview" className="h-12 w-12 rounded object-cover" />
            ) : (
              <div className="h-12 w-12 rounded bg-muted-foreground/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{attachmentFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(attachmentFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={removeAttachment}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Reply Input */}
      <div className="p-3 border-t bg-muted/30">
        <div className="flex gap-2 items-end">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
            className="hidden"
            onChange={handleFileSelect}
          />
          <div className="flex flex-col gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              <Paperclip className="h-5 w-5 text-muted-foreground" />
            </Button>
            <EmojiPicker onEmojiSelect={handleEmojiSelect} />
          </div>
          <Textarea
            ref={textareaRef}
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={2}
            className="resize-none"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={(!message.trim() && !attachmentFile) || sendMessage.isPending || isUploading}
            className="shrink-0 self-end"
          >
            {sendMessage.isPending || isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isAdmin = msg.sender_role === "admin";
  const isImage = msg.attachment_type === "image";
  const hasAttachment = !!msg.attachment_url;

  return (
    <div className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-lg p-3 ${
          isAdmin
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        }`}
      >
        {hasAttachment && isImage && (
          <a href={msg.attachment_url!} target="_blank" rel="noopener noreferrer" className="block mb-2">
            <img
              src={msg.attachment_url!}
              alt={msg.attachment_name || "attachment"}
              className="max-h-60 rounded-md object-contain cursor-pointer hover:opacity-90 transition-opacity"
            />
          </a>
        )}
        {hasAttachment && !isImage && (
          <a
            href={msg.attachment_url!}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 mb-2 p-2 rounded-md transition-colors ${
              isAdmin ? "bg-primary-foreground/10 hover:bg-primary-foreground/20" : "bg-background hover:bg-accent"
            }`}
          >
            <FileText className="h-5 w-5 shrink-0" />
            <span className="text-sm truncate flex-1">{msg.attachment_name || "File"}</span>
            <Download className="h-4 w-4 shrink-0" />
          </a>
        )}

        {msg.message && !(hasAttachment && msg.message.startsWith("📎 ")) && (
          <p className="whitespace-pre-wrap">{msg.message}</p>
        )}

        <div className={`flex items-center gap-1.5 mt-1 ${isAdmin ? "justify-end" : ""}`}>
          <span className={`text-xs ${isAdmin ? "opacity-70" : "text-muted-foreground"}`}>
            {formatNY(msg.created_at, "MMM d, h:mm a")}
          </span>
          {isAdmin && (
            <span className={`text-xs ${msg.read_at ? "opacity-90" : "opacity-50"}`}>
              {msg.read_at
                ? `✓✓ Seen ${formatDistanceToNowNY(msg.read_at, { addSuffix: true })}`
                : "✓ Sent"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
