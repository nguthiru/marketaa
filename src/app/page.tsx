import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  SparklesIcon,
  FileTextIcon,
  UserIcon,
  ArrowRightIcon,
} from "lucide-react";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/projects");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="h-14 bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">M</span>
            </div>
            <span className="font-semibold text-foreground">Marketaa</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main>
        <div className="max-w-5xl mx-auto px-6 pt-20 pb-24">
          <div className="max-w-2xl">
            <Badge variant="secondary" className="mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
              AI-Powered Outreach
            </Badge>

            <h1 className="text-4xl sm:text-5xl font-semibold text-foreground leading-tight mb-4">
              Turn research into
              <br />
              <span className="text-primary">meaningful connections</span>
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed mb-6">
              An AI-assisted platform that helps teams discover context, craft personalized
              messages, and build relationships—while keeping humans in control.
            </p>

            <p className="text-muted-foreground mb-8">
              Built for institutional teams who value precision over automation.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/register">
                  Start for free
                  <ArrowRightIcon className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="border-t border-border bg-card">
          <div className="max-w-5xl mx-auto px-6 py-20">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-semibold text-foreground mb-3">
                Research-grade intelligence, human-centered design
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Every AI suggestion is traceable, editable, and under your control.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Card className="hover:border-primary/50 transition-colors">
                <CardContent className="p-6">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <SparklesIcon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Intelligent Enrichment</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    AI automatically gathers relevant context—role, organization, priorities—so you can personalize at scale.
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:border-primary/50 transition-colors">
                <CardContent className="p-6">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <FileTextIcon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Explainable Drafts</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Every AI-generated message shows its reasoning. See exactly what context influenced each draft.
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:border-primary/50 transition-colors">
                <CardContent className="p-6">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <UserIcon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Human in Control</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Review, edit, and approve everything before it goes out. AI assists your judgment—never replaces it.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="border-t border-border">
          <div className="max-w-5xl mx-auto px-6 py-16 text-center">
            <h2 className="text-2xl font-semibold text-foreground mb-3">
              Ready to transform your outreach?
            </h2>
            <p className="text-muted-foreground mb-6">
              Join teams who value thoughtful, personalized communication.
            </p>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/register">
                Get started free
                <ArrowRightIcon className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-bold">M</span>
            </div>
            <span>Marketaa</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Research · Reach · Connect
          </p>
        </div>
      </footer>
    </div>
  );
}
