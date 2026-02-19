import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { usePromptRequests } from "@/hooks/usePromptRequests";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { Check, X, Trash2, FileQuestion } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function RequestsPage() {
  const { requests, isLoading, updateAccess, deleteRequest } = usePromptRequests();

  return (
    <AdminLayout>
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Prompt Requests</h1>
          <p className="text-muted-foreground">Manage user prompt access requests</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileQuestion className="h-5 w-5" />
              Requests ({requests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileQuestion className="mx-auto h-10 w-10 mb-3 opacity-50" />
                <p>No prompt requests yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={req.user_avatar || undefined} />
                              <AvatarFallback>
                                {(req.user_name || "?").slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{req.user_name}</p>
                              <p className="text-xs text-muted-foreground">{req.user_email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {req.product_image ? (
                            <OptimizedImage
                              src={req.product_image}
                              alt="Product"
                              width={96}
                              height={96}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-muted" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={req.access ? "default" : "outline"} className={req.access ? "bg-green-600" : ""}>
                            {req.access ? "Granted" : "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {!req.access && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-green-600 hover:text-green-700"
                                onClick={() => updateAccess.mutate({ id: req.id, access: true })}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            {req.access && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-orange-600 hover:text-orange-700"
                                onClick={() => updateAccess.mutate({ id: req.id, access: false })}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => deleteRequest.mutate(req.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
