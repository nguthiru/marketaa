"use client";

import { Linkedin, MapPin, Building2, Briefcase, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface LinkedInProfileCardProps {
  linkedinUrl?: string | null;
  profile?: {
    headline?: string;
    summary?: string;
    location?: string;
    industry?: string;
    currentCompany?: string;
    currentTitle?: string;
    skills?: string[];
    experience?: Array<{
      title: string;
      company: string;
      duration?: string;
      current?: boolean;
    }>;
    education?: Array<{
      school: string;
      degree?: string;
      field?: string;
    }>;
  } | null;
  compact?: boolean;
}

export function LinkedInProfileCard({
  linkedinUrl,
  profile,
  compact = false,
}: LinkedInProfileCardProps) {
  if (!profile && !linkedinUrl) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Linkedin className="h-4 w-4 text-[#0077B5]" />
        {profile?.headline ? (
          <span className="text-muted-foreground truncate max-w-[200px]">
            {profile.headline}
          </span>
        ) : linkedinUrl ? (
          <a
            href={linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#0077B5] hover:underline"
          >
            View Profile
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-[#0077B5]/10 flex items-center justify-center">
            <Linkedin className="h-5 w-5 text-[#0077B5]" />
          </div>
          <div>
            <h4 className="font-medium">LinkedIn Profile</h4>
            {linkedinUrl && (
              <a
                href={linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#0077B5] hover:underline"
              >
                View on LinkedIn
              </a>
            )}
          </div>
        </div>
      </div>

      {profile && (
        <div className="space-y-3">
          {/* Headline */}
          {profile.headline && (
            <p className="text-sm font-medium">{profile.headline}</p>
          )}

          {/* Current Position */}
          {(profile.currentTitle || profile.currentCompany) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Briefcase className="h-4 w-4" />
              <span>
                {profile.currentTitle}
                {profile.currentTitle && profile.currentCompany && " at "}
                {profile.currentCompany}
              </span>
            </div>
          )}

          {/* Location */}
          {profile.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{profile.location}</span>
            </div>
          )}

          {/* Industry */}
          {profile.industry && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>{profile.industry}</span>
            </div>
          )}

          {/* Skills */}
          {profile.skills && profile.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {profile.skills.slice(0, 6).map((skill, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {profile.skills.length > 6 && (
                <Badge variant="outline" className="text-xs">
                  +{profile.skills.length - 6}
                </Badge>
              )}
            </div>
          )}

          {/* Experience Preview */}
          {profile.experience && profile.experience.length > 0 && (
            <div className="border-t pt-3 mt-3">
              <h5 className="text-xs font-medium text-muted-foreground mb-2">
                Experience
              </h5>
              <div className="space-y-2">
                {profile.experience.slice(0, 2).map((exp, i) => (
                  <div key={i} className="text-sm">
                    <p className="font-medium">{exp.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {exp.company}
                      {exp.duration && ` · ${exp.duration}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education Preview */}
          {profile.education && profile.education.length > 0 && (
            <div className="border-t pt-3 mt-3">
              <h5 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <GraduationCap className="h-3 w-3" />
                Education
              </h5>
              <div className="space-y-1">
                {profile.education.slice(0, 2).map((edu, i) => (
                  <div key={i} className="text-sm">
                    <p className="font-medium">{edu.school}</p>
                    {(edu.degree || edu.field) && (
                      <p className="text-muted-foreground text-xs">
                        {edu.degree}
                        {edu.degree && edu.field && ", "}
                        {edu.field}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {profile.summary && (
            <div className="border-t pt-3 mt-3">
              <h5 className="text-xs font-medium text-muted-foreground mb-1">
                About
              </h5>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {profile.summary}
              </p>
            </div>
          )}
        </div>
      )}

      {!profile && linkedinUrl && (
        <p className="text-sm text-muted-foreground">
          No profile data enriched yet. Add profile details to enhance AI
          personalization.
        </p>
      )}
    </div>
  );
}
