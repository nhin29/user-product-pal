import { useState } from "react";
import { SupportFolder, useSupportFolders } from "@/hooks/useSupportFolders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Inbox,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  FolderPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FolderTreeProps {
  selectedFolderId: string | null; // null = Inbox
  onSelectFolder: (folderId: string | null) => void;
  folderCounts: Record<string, number>; // folder_id -> conversation count, "inbox" for null
}

export function FolderTree({ selectedFolderId, onSelectFolder, folderCounts }: FolderTreeProps) {
  const { rootFolders, getChildren, createFolder, renameFolder, deleteFolder } = useSupportFolders();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameDialog, setRenameDialog] = useState<{ id: string; name: string } | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCreate = () => {
    if (!newFolderName.trim()) return;
    createFolder.mutate({ name: newFolderName.trim(), parentId: createParentId });
    setNewFolderName("");
    setShowCreateDialog(false);
  };

  const handleRename = () => {
    if (!renameDialog || !renameDialog.name.trim()) return;
    renameFolder.mutate({ id: renameDialog.id, name: renameDialog.name.trim() });
    setRenameDialog(null);
  };

  const renderFolder = (folder: SupportFolder, depth: number = 0) => {
    const children = getChildren(folder.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;
    const count = folderCounts[folder.id] || 0;

    return (
      <div key={folder.id}>
        <div
          className={cn(
            "flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer group text-sm hover:bg-muted/50 transition-colors",
            isSelected && "bg-muted font-medium"
          )}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
          onClick={() => onSelectFolder(folder.id)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(folder.id);
              }}
              className="p-0.5 hover:bg-muted rounded"
            >
              {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          ) : (
            <span className="w-4.5" />
          )}
          {isExpanded ? (
            <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <span className="truncate flex-1">{folder.name}</span>
          {count > 0 && (
            <span className="text-xs text-muted-foreground">{count}</span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <button className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-opacity">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => setRenameDialog({ id: folder.id, name: folder.name })}>
                <Pencil className="h-3.5 w-3.5 mr-2" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setCreateParentId(folder.id);
                  setShowCreateDialog(true);
                }}
              >
                <FolderPlus className="h-3.5 w-3.5 mr-2" /> Add Subfolder
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => deleteFolder.mutate(folder.id)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {hasChildren && isExpanded && children.map((child) => renderFolder(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-0.5">
      {/* Inbox (virtual) */}
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm hover:bg-muted/50 transition-colors",
          selectedFolderId === null && "bg-muted font-medium"
        )}
        onClick={() => onSelectFolder(null)}
      >
        <Inbox className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1">Inbox</span>
        {(folderCounts["inbox"] || 0) > 0 && (
          <span className="text-xs text-muted-foreground">{folderCounts["inbox"]}</span>
        )}
      </div>

      {/* Folders */}
      {rootFolders.map((f) => renderFolder(f))}

      {/* New Folder button */}
      <Button
        variant="ghost"
        size="sm"
        className="justify-start gap-2 text-muted-foreground mt-1"
        onClick={() => {
          setCreateParentId(null);
          setShowCreateDialog(true);
        }}
      >
        <Plus className="h-3.5 w-3.5" /> New Folder
      </Button>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{createParentId ? "Create Subfolder" : "Create Folder"}</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newFolderName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={!!renameDialog} onOpenChange={(open) => !open && setRenameDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
          </DialogHeader>
          <Input
            value={renameDialog?.name || ""}
            onChange={(e) => setRenameDialog((prev) => prev ? { ...prev, name: e.target.value } : null)}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialog(null)}>Cancel</Button>
            <Button onClick={handleRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
