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
  { id: "prod_U3DJqmft6ONyxk", label: "Monthly" },
  { id: "prod_U4sQ5jX7kNnc14", label: "Quarterly" },
  { id: "prod_U4sSoxZsz5Ix9Z", label: "Yearly" },
];

const ONETIME_CREDIT_OPTIONS = [
  { id: "prod_UAkro7xtZ7WWVV", label: "30 credits" },
  { id: "prod_UAktSMnUZSNut0", label: "50 credits" },
];

const ONETIME_IDS = ONETIME_CREDIT_OPTIONS.map((p) => p.id);

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
      // Remove other subscription IDs AND one-time IDs (mutually exclusive), add this one
      setSelectedProductIds((prev) => [
        ...prev.filter((id) => !SUBSCRIPTION_IDS.includes(id) && !ONETIME_IDS.includes(id)),
        productId,
      ]);
    } else {
      setSelectedProductIds((prev) => prev.filter((id) => id !== productId));
    }
  };

  const handleOnetimeToggle = (productId: string, checked: boolean) => {
    if (checked) {
      // Remove other one-time IDs AND subscription IDs (mutually exclusive), add this one
      setSelectedProductIds((prev) => [
        ...prev.filter((id) => !ONETIME_IDS.includes(id) && !SUBSCRIPTION_IDS.includes(id)),
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

  const promptPlatforms = [
    { label: "Video", options: VIDEO_PRODUCT_OPTIONS },
    { label: "Amazon", options: AMAZON_PRODUCT_OPTIONS },
    { label: "Shopify", options: SHOPIFY_PRODUCT_OPTIONS },
    { label: "Meta", options: META_PRODUCT_OPTIONS },
    { label: "WooCommerce", options: WOO_PRODUCT_OPTIONS },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[780px] max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-lg">Edit User</DialogTitle>
          <DialogDescription>Update user profile information.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr] gap-0 sm:divide-x divide-border">
            {/* LEFT COLUMN — Profile & Settings */}
            <div className="px-6 py-5 space-y-5">
              <div className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Profile</h3>
                <div className="space-y-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="email" className="text-xs">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter email" className="h-9" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="displayName" className="text-xs">Display Name</Label>
                    <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Enter display name" className="h-9" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="role" className="text-xs">Role</Label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger id="role" className="h-9">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((role) => (
                          <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="h-px bg-border" />

              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Settings</h3>
                <div className="flex items-center justify-between py-1">
                  <Label htmlFor="is_analytics" className="text-sm cursor-pointer">Analytics</Label>
                  <Switch id="is_analytics" checked={isAnalytics} onCheckedChange={setIsAnalytics} />
                </div>
                <div className="flex items-center justify-between py-1">
                  <Label htmlFor="is_refund" className="text-sm cursor-pointer">Refund</Label>
                  <Switch id="is_refund" checked={isRefund} onCheckedChange={(checked) => { setIsRefund(checked); if (checked) setSelectedProductIds([]); }} />
                </div>
              </div>

              <div className="h-px bg-border" />

              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Credits</h3>
                {creditStatus === "subscribed" ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border border-emerald-500 text-emerald-700 bg-emerald-500/15">Subscribed</span>
                        <span className="text-sm font-medium">100 / mo</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{usedCount} / 100 used</span>
                    </div>
                    <div className="w-full bg-emerald-100 rounded-full h-1.5">
                      <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, (usedCount / 100) * 100)}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{Math.max(0, 100 - usedCount)} remaining</span>
                      {(() => {
                        const PLAN_MONTHS: Record<string, number> = { "prod_U3DJqmft6ONyxk": 1, "prod_U4sQ5jX7kNnc14": 3, "prod_U4sSoxZsz5Ix9Z": 12 };
                        const totalMonths = subscriptionProductId ? PLAN_MONTHS[subscriptionProductId] ?? 0 : 0;
                        let remainingMonths = totalMonths;
                        if (subscriptionStart && totalMonths > 0) {
                          const start = new Date(subscriptionStart);
                          const now = new Date();
                          const elapsed = Math.max(0, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)));
                          remainingMonths = Math.max(0, totalMonths - elapsed);
                        }
                        return totalMonths > 0 ? <span>{remainingMonths}/{totalMonths} mo left</span> : null;
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Input id="creditLimit" type="number" min={0} value={creditLimit} onChange={(e) => setCreditLimit(Number(e.target.value))} placeholder="Limit" disabled={isLoadingCredits} className="flex-1 h-9" />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{usedCount} / {creditLimit} used</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">{Math.max(0, creditLimit - usedCount)} remaining</p>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                        creditStatus === "expired" ? "border-red-500 text-red-700 bg-red-500/15"
                        : creditStatus === "free" ? "border-gray-400 text-gray-600 bg-gray-400/15"
                        : "border-yellow-500 text-yellow-700 bg-yellow-500/15"
                      }`}>
                        {creditStatus.charAt(0).toUpperCase() + creditStatus.slice(1)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN — Access */}
            <div className="px-6 py-5 space-y-5">
              {/* Prompt Access */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prompt Access</h3>
                <div className="grid grid-cols-2 gap-3">
                  {promptPlatforms.map((platform) => (
                    <div key={platform.label} className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">{platform.label}</Label>
                      <div className="rounded-lg border bg-muted/30 p-2.5 space-y-2">
                        {platform.options.map((product) => (
                          <div key={product.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={product.id}
                              checked={selectedProductIds.includes(product.id)}
                              onCheckedChange={(checked) => handleProductToggle(product.id, checked as boolean)}
                            />
                            <label htmlFor={product.id} className="text-xs font-medium leading-none cursor-pointer">{product.label}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* Generation Access */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Generation Access</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-0.5">
                    <Label className="text-xs text-muted-foreground">Subscription</Label>
                    <p className="text-[10px] text-muted-foreground/70">100 credits/month</p>
                    <div className="rounded-lg border bg-muted/30 p-2.5 space-y-2">
                      {SUBSCRIPTION_PRODUCT_OPTIONS.map((product) => (
                        <div key={product.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={product.id}
                            checked={selectedProductIds.includes(product.id)}
                            onCheckedChange={(checked) => handleSubscriptionToggle(product.id, checked as boolean)}
                          />
                          <label htmlFor={product.id} className="text-xs font-medium leading-none cursor-pointer">{product.label}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">One-time</Label>
                    <div className="rounded-lg border bg-muted/30 p-2.5 space-y-2">
                      {ONETIME_CREDIT_OPTIONS.map((product) => (
                        <div key={product.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={product.id}
                            checked={selectedProductIds.includes(product.id)}
                            onCheckedChange={(checked) => handleOnetimeToggle(product.id, checked as boolean)}
                          />
                          <label htmlFor={product.id} className="text-xs font-medium leading-none cursor-pointer">{product.label}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-muted/20">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={isLoading}>{isLoading ? "Saving..." : "Save Changes"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
