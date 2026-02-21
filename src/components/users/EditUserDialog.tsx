import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserProfile } from "@/hooks/useUsers";

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "viewer", label: "Viewer" },
] as const;

const AMAZON_PRODUCT_OPTIONS = [
  { id: "prod_TreWrcz8uVHqIT", label: "Home & Electronics" },
  { id: "prod_TreWtW6ekESits", label: "Pets" },
  { id: "prod_TreV0wplqggLBW", label: "Health & Beauty" },
  { id: "prod_TmW6D8HwME3dsX", label: "Bundle (All)" },
];

const SHOPIFY_PRODUCT_OPTIONS = [
  { id: "prod_TxMHw09aCtGsOM", label: "30 Prompts" },
  { id: "prod_TxzgveYwNQur3j", label: "100 Prompts" },
];

interface EditUserDialogProps {
  user: (UserProfile & { is_new?: boolean }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (userId: string, displayName: string, email?: string, productIds?: string[], role?: string) => Promise<void>;
  isLoading: boolean;
}

export function EditUserDialog({ user, open, onOpenChange, onSave, isLoading }: EditUserDialogProps) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("viewer");

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || "");
      setEmail(user.email || "");
      setSelectedProductIds(user.product_ids || []);
      setSelectedRole(user.role || "viewer");
    }
  }, [user]);

  const handleProductToggle = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProductIds((prev) => [...prev, productId]);
    } else {
      setSelectedProductIds((prev) => prev.filter((id) => id !== productId));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const newEmail = email !== user.email ? email : undefined;
    const productIdsChanged = JSON.stringify(selectedProductIds.sort()) !== JSON.stringify((user.product_ids || []).sort());
    const roleChanged = selectedRole !== (user.role || "viewer");
    
    await onSave(
      user.user_id, 
      displayName, 
      newEmail, 
      productIdsChanged ? selectedProductIds : undefined,
      roleChanged ? selectedRole : undefined
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit User
            {user && (
              user.is_new ? (
                <span className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/20 px-2.5 py-0.5 text-xs font-semibold text-blue-600">New</span>
              ) : (
                <span className="inline-flex items-center rounded-full border bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">Old</span>
              )
            )}
          </DialogTitle>
          <DialogDescription>
            Update user profile information.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter display name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Amazon Product Access</Label>
              <div className="space-y-2 rounded-md border p-3">
                {AMAZON_PRODUCT_OPTIONS.map((product) => (
                  <div key={product.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={product.id}
                      checked={selectedProductIds.includes(product.id)}
                      onCheckedChange={(checked) => 
                        handleProductToggle(product.id, checked as boolean)
                      }
                    />
                    <label
                      htmlFor={product.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {product.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Shopify Product Access</Label>
              <div className="space-y-2 rounded-md border p-3">
                {SHOPIFY_PRODUCT_OPTIONS.map((product) => (
                  <div key={product.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={product.id}
                      checked={selectedProductIds.includes(product.id)}
                      onCheckedChange={(checked) => 
                        handleProductToggle(product.id, checked as boolean)
                      }
                    />
                    <label
                      htmlFor={product.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {product.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
