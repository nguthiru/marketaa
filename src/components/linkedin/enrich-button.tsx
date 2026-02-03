"use client";

import { useState } from "react";
import { Linkedin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface EnrichButtonProps {
  leadId: string;
  linkedinUrl?: string | null;
  onEnriched?: () => void;
}

export function LinkedInEnrichButton({
  leadId,
  linkedinUrl,
  onEnriched,
}: EnrichButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    linkedinUrl: linkedinUrl || "",
    headline: "",
    currentTitle: "",
    currentCompany: "",
    location: "",
    industry: "",
    skills: "",
    summary: "",
  });

  const handleSubmit = async () => {
    if (!formData.linkedinUrl.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/linkedin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkedinUrl: formData.linkedinUrl,
          headline: formData.headline || undefined,
          currentTitle: formData.currentTitle || undefined,
          currentCompany: formData.currentCompany || undefined,
          location: formData.location || undefined,
          industry: formData.industry || undefined,
          skills: formData.skills
            ? formData.skills.split(",").map((s) => s.trim())
            : undefined,
          summary: formData.summary || undefined,
        }),
      });

      if (res.ok) {
        setOpen(false);
        onEnriched?.();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to enrich profile");
      }
    } catch (error) {
      console.error("Failed to enrich:", error);
      alert("Failed to enrich profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Linkedin className="h-4 w-4 mr-2 text-[#0077B5]" />
          {linkedinUrl ? "Update Profile" : "Add LinkedIn"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>LinkedIn Profile Enrichment</DialogTitle>
          <DialogDescription>
            Add LinkedIn profile data to enhance AI-powered email
            personalization.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="linkedinUrl">LinkedIn URL *</Label>
            <Input
              id="linkedinUrl"
              placeholder="https://linkedin.com/in/username"
              value={formData.linkedinUrl}
              onChange={(e) =>
                setFormData({ ...formData, linkedinUrl: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currentTitle">Current Title</Label>
              <Input
                id="currentTitle"
                placeholder="VP of Engineering"
                value={formData.currentTitle}
                onChange={(e) =>
                  setFormData({ ...formData, currentTitle: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentCompany">Company</Label>
              <Input
                id="currentCompany"
                placeholder="Acme Corp"
                value={formData.currentCompany}
                onChange={(e) =>
                  setFormData({ ...formData, currentCompany: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="headline">Headline</Label>
            <Input
              id="headline"
              placeholder="Building the future of..."
              value={formData.headline}
              onChange={(e) =>
                setFormData({ ...formData, headline: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="San Francisco, CA"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                placeholder="Technology"
                value={formData.industry}
                onChange={(e) =>
                  setFormData({ ...formData, industry: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="skills">Skills (comma-separated)</Label>
            <Input
              id="skills"
              placeholder="Leadership, Strategy, Product Management"
              value={formData.skills}
              onChange={(e) =>
                setFormData({ ...formData, skills: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">About / Summary</Label>
            <Textarea
              id="summary"
              placeholder="Professional summary or about section..."
              value={formData.summary}
              onChange={(e) =>
                setFormData({ ...formData, summary: e.target.value })
              }
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Profile"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
