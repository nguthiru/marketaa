"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface TeamMember {
  id: string;
  role: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface TeamInvite {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
}

export default function TeamSettingsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite form
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchTeamData();
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        if (data.length > 0) {
          setSelectedProject(data[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamData = async () => {
    try {
      const [membersRes, invitesRes] = await Promise.all([
        fetch(`/api/projects/${selectedProject}/team`),
        fetch(`/api/projects/${selectedProject}/team/invites`),
      ]);

      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data);
      }

      if (invitesRes.ok) {
        const data = await invitesRes.json();
        setInvites(data);
      }
    } catch (error) {
      console.error("Failed to fetch team data:", error);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setInviteError("");

    try {
      const res = await fetch(`/api/projects/${selectedProject}/team/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      if (res.ok) {
        setShowInvite(false);
        setInviteEmail("");
        setInviteRole("member");
        fetchTeamData();
      } else {
        const data = await res.json();
        setInviteError(data.error || "Failed to send invite");
      }
    } catch (error) {
      setInviteError("Failed to send invite");
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Remove this team member?")) return;

    try {
      await fetch(`/api/projects/${selectedProject}/team/${memberId}`, {
        method: "DELETE",
      });
      fetchTeamData();
    } catch (error) {
      console.error("Failed to remove member:", error);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      await fetch(`/api/projects/${selectedProject}/team/invites/${inviteId}`, {
        method: "DELETE",
      });
      fetchTeamData();
    } catch (error) {
      console.error("Failed to cancel invite:", error);
    }
  };

  const handleResendInvite = async (inviteId: string) => {
    try {
      await fetch(`/api/projects/${selectedProject}/team/invites/${inviteId}/resend`, {
        method: "POST",
      });
      alert("Invite resent!");
    } catch (error) {
      console.error("Failed to resend invite:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="mb-6">
            <Link
              href="/settings"
              className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Settings
            </Link>
          </div>
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <p className="text-slate-600">Create a project first to manage team members.</p>
            <Link href="/projects" className="text-teal-600 hover:underline mt-2 inline-block">
              Go to Projects
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/settings"
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Settings
          </Link>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Team Management</h1>
            <p className="text-slate-600 mt-1">Manage who has access to your projects</p>
          </div>
          <Button variant="default" onClick={() => setShowInvite(true)}>
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Invite Member
          </Button>
        </div>

        {/* Project Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Select Project
          </label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full max-w-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        {/* Team Members */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">Team Members</h2>
          </div>
          {members.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No team members yet. Invite someone to collaborate!
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {members.map((member) => (
                <div key={member.id} className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-semibold">
                      {(member.user.name || member.user.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {member.user.name || member.user.email}
                      </p>
                      <p className="text-sm text-slate-500">{member.user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      member.role === "admin"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      {member.role}
                    </span>
                    {member.role !== "owner" && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="p-1 text-slate-400 hover:text-red-500"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Invites */}
        {invites.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900">Pending Invites</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {invites.map((invite) => (
                <div key={invite.id} className="px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{invite.email}</p>
                    <p className="text-sm text-slate-500">
                      Expires {new Date(invite.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
                      {invite.role}
                    </span>
                    <button
                      onClick={() => handleResendInvite(invite.id)}
                      className="text-xs text-teal-600 hover:underline"
                    >
                      Resend
                    </button>
                    <button
                      onClick={() => handleCancelInvite(invite.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invite Modal */}
        {showInvite && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                <h2 className="font-semibold text-slate-900">Invite Team Member</h2>
                <button onClick={() => setShowInvite(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleInvite} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                    placeholder="colleague@company.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="member">Member - Can view and edit</option>
                    <option value="admin">Admin - Full access</option>
                  </select>
                </div>

                {inviteError && (
                  <p className="text-sm text-red-600">{inviteError}</p>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowInvite(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="default" loading={inviting} className="flex-1">
                    Send Invite
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
