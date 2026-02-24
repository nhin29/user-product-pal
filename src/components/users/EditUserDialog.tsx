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
import { Switch } from "@/components/ui/switch";
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
  { id: "prod_TxzgveYwNQur3j", label: "100+ Prompts" },
];

const META_PRODUCT_OPTIONS = [
  { id: "prod_U1stXv6wWzqBVe", label: "30 Prompts" },
  { id: "prod_U1sv6wPAwnrTLZ", label: "100+ Prompts" },
];

interface EditUserDialogProps {
  user: (UserProfile & { is_new?: boolean }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (userId: string, displayName: string, email?: string, productIds?: string[], role?: string, isAnalytics?: boolean, isRefund?: boolean, isNew?: boolean, creditLimit?: number) => Promise<void>;
  isLoading: boolean;
}

export function EditUserDialog({ user, open, onOpenChange, onSave, isLoading }: EditUserDialogProps) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("viewer");
  const [isAnalytics, setIsAnalytics] = useState<boolean>(true);
  const [isRefund, setIsRefund] = useState<boolean>(false);
  const [isNew, setIsNew] = useState<boolean>(true);
  const [creditLimit, setCreditLimit] = useState<number>(4);
  const [originalCreditLimit, setOriginalCreditLimit] = useState<number>(4);
  const [usedCount, setUsedCount] = useState<number>(0);
  const [isLoadingCredits, setIsLoadingCredits] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || "");
      setEmail(user.email || "");
      setSelectedProductIds(user.product_ids || []);
      setSelectedRole(user.role || "viewer");
      setIsAnalytics(user.is_analytics ?? true);
      setIsRefund(user.is_refund ?? false);
      setIsNew(user.is_new ?? true);
      
      // Fetch credit limit for this user
      setIsLoadingCredits(true);
      import("@/integrations/supabase/client").then(({ supabase }) => {
        supabase
          .from("user_credits")
          .select("credit_limit, used_count")
          .eq("user_id", user.user_id)
          .maybeSingle()
          .then(({ data }) => {
            const limit = data?.credit_limit ?? 4;
            setCreditLimit(limit);
            setOriginalCreditLimit(limit);
            setUsedCount(data?.used_count ?? 0);
            setIsLoadingCredits(false);
          });
      });
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
    const analyticsChanged = isAnalytics !== (user.is_analytics ?? true);
    const refundChanged = isRefund !== (user.is_refund ?? false);
    const newChanged = isNew !== (user.is_new ?? true);
    const creditLimitChanged = creditLimit !== originalCreditLimit;
    
    await onSave(
      user.user_id, 
      displayName, 
      newEmail, 
      productIdsChanged ? selectedProductIds : undefined,
      roleChanged ? selectedRole : undefined,
      analyticsChanged ? isAnalytics : undefined,
      refundChanged ? isRefund : undefined,
      newChanged ? isNew : undefined,
      creditLimitChanged ? creditLimit : undefined
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 py-4">
            <div className="space-y-4 sm:col-span-1">
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
            <div className="flex items-center justify-between">
              <Label htmlFor="is_analytics">Analytics</Label>
              <Switch
                id="is_analytics"
                checked={isAnalytics}
                onCheckedChange={setIsAnalytics}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is_refund">Refund</Label>
              <Switch
                id="is_refund"
                checked={isRefund}
                onCheckedChange={setIsRefund}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is_new">New User</Label>
              <Switch
                id="is_new"
                checked={isNew}
                onCheckedChange={setIsNew}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="creditLimit">Credit Limit</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="creditLimit"
                  type="number"
                  min={0}
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(Number(e.target.value))}
                  placeholder="Credit limit"
                  disabled={isLoadingCredits}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  Used: {usedCount} / {creditLimit}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Remaining: {Math.max(0, creditLimit - usedCount)} credits
              </p>
            </div>
            </div>
            <div className="space-y-4 sm:col-span-1">
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
            <div className="grid gap-2">
              <Label>Meta Product Access</Label>
              <div className="space-y-2 rounded-md border p-3">
                {META_PRODUCT_OPTIONS.map((product) => (
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
