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

const VIDEO_PRODUCT_OPTIONS = [
  { id: "prod_U552iYMyRrUwsG", label: "15 Prompts" },
  { id: "prod_U552aJz8KOYu50", label: "50 Prompts" },
];

const AMAZON_PRODUCT_OPTIONS = [
  { id: "prod_U4RqVgotWRlWFY", label: "30 Prompts" },
  { id: "prod_TmW6D8HwME3dsX", label: "Full Access" },
];

const SHOPIFY_PRODUCT_OPTIONS = [
  { id: "prod_TxMHw09aCtGsOM", label: "30 Prompts" },
  { id: "prod_TxzgveYwNQur3j", label: "100+ Prompts" },
];

const META_PRODUCT_OPTIONS = [
  { id: "prod_U1stXv6wWzqBVe", label: "30 Prompts" },
  { id: "prod_U1sv6wPAwnrTLZ", label: "100+ Prompts" },
];

const WOO_PRODUCT_OPTIONS = [
  { id: "prod_U4Rs6EDtHY284g", label: "30 Prompts" },
  { id: "prod_U4RtwRe75EKFQ3", label: "Full Access" },
];

const SUBSCRIPTION_PRODUCT_OPTIONS = [
  { id: "prod_U3DJqmft6ONyxk", label: "Monthly (100 credits/mo)" },
  { id: "prod_U4sQ5jX7kNnc14", label: "Quarterly (100 credits/mo)" },
  { id: "prod_U4sSoxZsz5Ix9Z", label: "Yearly (100 credits/mo)" },
];

const SUBSCRIPTION_IDS = SUBSCRIPTION_PRODUCT_OPTIONS.map((p) => p.id);

interface EditUserDialogProps {
  user: UserProfile | null;
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
  
  const [creditLimit, setCreditLimit] = useState<number>(4);
  const [originalCreditLimit, setOriginalCreditLimit] = useState<number>(4);
  const [usedCount, setUsedCount] = useState<number>(0);
  const [creditStatus, setCreditStatus] = useState<string>("trial");
  const [isLoadingCredits, setIsLoadingCredits] = useState(false);
  const [subscriptionProductId, setSubscriptionProductId] = useState<string | null>(null);
  const [subscriptionStart, setSubscriptionStart] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || "");
      setEmail(user.email || "");
      setSelectedProductIds(user.product_ids || []);
      setSelectedRole(user.role || "viewer");
      setIsAnalytics(user.is_analytics ?? true);
      setIsRefund(user.is_refund ?? false);
      
      // Fetch credit limit for this user
      setIsLoadingCredits(true);
      import("@/integrations/supabase/client").then(({ supabase }) => {
        Promise.all([
          supabase
            .from("user_credits")
            .select("credit_limit, used_count, status")
            .eq("user_id", user.user_id)
            .maybeSingle(),
          supabase
            .from("user_subscriptions")
            .select("product_id, current_period_start, status")
            .eq("user_id", user.user_id)
            .eq("status", "active")
            .maybeSingle(),
        ]).then(([creditsRes, subRes]) => {
          const limit = creditsRes.data?.credit_limit ?? 4;
          setCreditLimit(limit);
          setOriginalCreditLimit(limit);
          setUsedCount(creditsRes.data?.used_count ?? 0);
          setCreditStatus((creditsRes.data as any)?.status ?? "trial");
          setSubscriptionProductId(subRes.data?.product_id ?? null);
          setSubscriptionStart(subRes.data?.current_period_start ?? null);
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

  const handleSubscriptionToggle = (productId: string, checked: boolean) => {
    if (checked) {
      // Remove other subscription IDs, add this one (radio behavior)
      setSelectedProductIds((prev) => [
        ...prev.filter((id) => !SUBSCRIPTION_IDS.includes(id)),
        productId,
      ]);
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
    const creditLimitChanged = creditLimit !== originalCreditLimit;
    
    await onSave(
      user.user_id, 
      displayName, 
      newEmail, 
      productIdsChanged ? selectedProductIds : undefined,
      roleChanged ? selectedRole : undefined,
      analyticsChanged ? isAnalytics : undefined,
      refundChanged ? isRefund : undefined,
      undefined,
      creditLimitChanged ? creditLimit : undefined
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
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
                onCheckedChange={(checked) => {
                  setIsRefund(checked);
                  if (checked) {
                    setSelectedProductIds([]);
                  }
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="creditLimit">Credit Limit</Label>
              {creditStatus === "subscribed" ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50/50 p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border border-emerald-500 text-emerald-700 bg-emerald-500/15">
                        Subscribed
                      </span>
                      <span className="text-sm font-medium">100 credits / mo</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {usedCount} / 100 used
                    </span>
                  </div>
                  <div className="w-full bg-emerald-100 rounded-full h-1.5">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (usedCount / 100) * 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{Math.max(0, 100 - usedCount)} credits remaining</span>
                    {(() => {
                      const PLAN_MONTHS: Record<string, number> = {
                        "prod_U3DJqmft6ONyxk": 1,
                        "prod_U4sQ5jX7kNnc14": 3,
                        "prod_U4sSoxZsz5Ix9Z": 12,
                      };
                      const totalMonths = subscriptionProductId ? PLAN_MONTHS[subscriptionProductId] ?? 0 : 0;
                      let remainingMonths = totalMonths;
                      if (subscriptionStart && totalMonths > 0) {
                        const start = new Date(subscriptionStart);
                        const now = new Date();
                        const elapsed = Math.max(0, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)));
                        remainingMonths = Math.max(0, totalMonths - elapsed);
                      }
                      return totalMonths > 0 ? (
                        <span>{remainingMonths}/{totalMonths} mo left</span>
                      ) : null;
                    })()}
                  </div>
                </div>
              ) : (
                <>
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
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                      Remaining: {Math.max(0, creditLimit - usedCount)} credits
                    </p>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                      creditStatus === "expired"
                      ? "border-red-500 text-red-700 bg-red-500/15"
                      : creditStatus === "free"
                      ? "border-gray-400 text-gray-600 bg-gray-400/15"
                      : "border-yellow-500 text-yellow-700 bg-yellow-500/15"
                    }`}>
                      {creditStatus.charAt(0).toUpperCase() + creditStatus.slice(1)}
                    </span>
                  </div>
                </>
              )}
            </div>
            </div>
            <div className="space-y-4 sm:col-span-1">
            <div className="grid gap-2">
              <Label>Video Product Access</Label>
              <div className="space-y-2 rounded-md border p-3">
                {VIDEO_PRODUCT_OPTIONS.map((product) => (
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
            <div className="grid gap-2">
              <Label>WooCommerce Product Access</Label>
              <div className="space-y-2 rounded-md border p-3">
                {WOO_PRODUCT_OPTIONS.map((product) => (
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
              <Label>Subscription Access</Label>
              <div className="space-y-2 rounded-md border p-3">
                {SUBSCRIPTION_PRODUCT_OPTIONS.map((product) => (
                  <div key={product.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={product.id}
                      checked={selectedProductIds.includes(product.id)}
                      onCheckedChange={(checked) => 
                        handleSubscriptionToggle(product.id, checked as boolean)
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
