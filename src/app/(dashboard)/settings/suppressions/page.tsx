"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, Trash2, Upload, Ban } from "lucide-react";

interface Suppression {
  id: string;
  email: string;
  reason: string;
  source: string;
  createdAt: string;
}

export default function SuppressionsPage() {
  const [suppressions, setSuppressions] = useState<Suppression[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [bulkEmails, setBulkEmails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const limit = 20;

  useEffect(() => {
    fetchSuppressions();
  }, [page, search]);

  const fetchSuppressions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(page * limit),
        ...(search && { search }),
      });

      const res = await fetch(`/api/suppressions?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSuppressions(data.suppressions);
        setTotal(data.total);
      }
    } catch (error) {
      console.error("Failed to fetch suppressions:", error);
    } finally {
      setLoading(false);
    }
  };

  const addSuppression = async () => {
    if (!newEmail.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/suppressions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail.trim(), reason: "manual" }),
      });

      if (res.ok) {
        setNewEmail("");
        setAddModalOpen(false);
        fetchSuppressions();
      }
    } catch (error) {
      console.error("Failed to add suppression:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const bulkAddSuppressions = async () => {
    const emails = bulkEmails
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter((e) => e.includes("@"));

    if (emails.length === 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/suppressions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails, reason: "manual" }),
      });

      if (res.ok) {
        const data = await res.json();
        setBulkEmails("");
        setBulkModalOpen(false);
        fetchSuppressions();
        alert(`Added ${data.added} emails. Skipped ${data.skipped}.`);
      }
    } catch (error) {
      console.error("Failed to bulk add suppressions:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const removeSuppression = async (email: string) => {
    if (!confirm(`Remove ${email} from suppression list?`)) return;

    try {
      const res = await fetch(
        `/api/suppressions?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        fetchSuppressions();
      }
    } catch (error) {
      console.error("Failed to remove suppression:", error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getReasonBadge = (reason: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      unsubscribe: "secondary",
      bounce: "destructive",
      complaint: "destructive",
      manual: "outline",
    };
    return <Badge variant={variants[reason] || "default"}>{reason}</Badge>;
  };

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      one_click: "One-click",
      link: "Email link",
      manual: "Manual",
      webhook: "Webhook",
    };
    return labels[source] || source;
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Suppression List</h1>
        <p className="text-muted-foreground mt-1">
          Manage email addresses that should not receive outreach emails.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search emails..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          <Dialog open={bulkModalOpen} onOpenChange={setBulkModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Bulk Import
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Import Emails</DialogTitle>
                <DialogDescription>
                  Paste email addresses separated by commas, semicolons, or new
                  lines.
                </DialogDescription>
              </DialogHeader>
              <Textarea
                placeholder="email1@example.com&#10;email2@example.com&#10;email3@example.com"
                value={bulkEmails}
                onChange={(e) => setBulkEmails(e.target.value)}
                rows={8}
              />
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setBulkModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={bulkAddSuppressions} disabled={submitting}>
                  {submitting ? "Adding..." : "Add Emails"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Email
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add to Suppression List</DialogTitle>
                <DialogDescription>
                  This email address will not receive any outreach emails.
                </DialogDescription>
              </DialogHeader>
              <Input
                placeholder="email@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSuppression()}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={addSuppression} disabled={submitting}>
                  {submitting ? "Adding..." : "Add Email"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Date Added</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                </TableCell>
              </TableRow>
            ) : suppressions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Ban className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    {search
                      ? "No suppressed emails match your search"
                      : "No suppressed emails yet"}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              suppressions.map((suppression) => (
                <TableRow key={suppression.id}>
                  <TableCell className="font-mono text-sm">
                    {suppression.email}
                  </TableCell>
                  <TableCell>{getReasonBadge(suppression.reason)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {getSourceLabel(suppression.source)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(suppression.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSuppression(suppression.email)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {page * limit + 1}-
              {Math.min((page + 1) * limit, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages - 1}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
