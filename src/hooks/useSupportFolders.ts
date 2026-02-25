import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SupportFolder {
  id: string;
  name: string;
  parent_id: string | null;
  display_order: number;
  color: string | null;
  created_at: string;
}

export function useSupportFolders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: folders = [], isLoading } = useQuery({
    queryKey: ["support-folders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_folders")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as SupportFolder[];
    },
  });

  const createFolder = useMutation({
    mutationFn: async ({ name, parentId }: { name: string; parentId?: string | null }) => {
      const maxOrder = folders.reduce((max, f) => Math.max(max, f.display_order), -1);
      const { error } = await supabase.from("support_folders").insert({
        name,
        parent_id: parentId || null,
        display_order: maxOrder + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-folders"] });
      toast({ title: "Folder created" });
    },
    onError: (error) => {
      toast({ title: "Error creating folder", description: error.message, variant: "destructive" });
    },
  });

  const renameFolder = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("support_folders").update({ name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-folders"] });
      toast({ title: "Folder renamed" });
    },
    onError: (error) => {
      toast({ title: "Error renaming folder", description: error.message, variant: "destructive" });
    },
  });

  const deleteFolder = useMutation({
    mutationFn: async (id: string) => {
      // Move conversations in this folder back to inbox (null)
      await supabase.from("conversations").update({ folder_id: null }).eq("folder_id", id);
      const { error } = await supabase.from("support_folders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-folders"] });
      queryClient.invalidateQueries({ queryKey: ["support-conversations"] });
      toast({ title: "Folder deleted" });
    },
    onError: (error) => {
      toast({ title: "Error deleting folder", description: error.message, variant: "destructive" });
    },
  });

  const moveConversation = useMutation({
    mutationFn: async ({ conversationId, folderId }: { conversationId: string; folderId: string | null }) => {
      const { error } = await supabase
        .from("conversations")
        .update({ folder_id: folderId })
        .eq("id", conversationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-conversations"] });
    },
    onError: (error) => {
      toast({ title: "Error moving conversation", description: error.message, variant: "destructive" });
    },
  });

  // Build tree structure
  const rootFolders = folders.filter((f) => !f.parent_id);
  const getChildren = (parentId: string) => folders.filter((f) => f.parent_id === parentId);

  return {
    folders,
    rootFolders,
    getChildren,
    isLoading,
    createFolder,
    renameFolder,
    deleteFolder,
    moveConversation,
  };
}
