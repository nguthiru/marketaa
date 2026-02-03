import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Logo, LogoIcon } from "@/components/logo";
import { PLANS, CURRENCY, getPlansWithPricing } from "@/lib/paystack";

// Get currency symbol
function getCurrencySymbol(currency?: string): string {
  const symbols: Record<string, string> = {
    NGN: "₦",
    USD: "$",
    GBP: "£",
    EUR: "€",
  };
  return symbols[currency || CURRENCY.code] || CURRENCY.symbol;
}

// Format price for display
function formatPrice(amount: number, currency?: string): string {
  const symbol = getCurrencySymbol(currency);
  if (amount === 0) return `${symbol}0`;
  const value = amount / 100;
  // Format large numbers with k suffix
  if (value >= 1000) {
    return `${symbol}${(value / 1000).toFixed(0)}k`;
  }
  return `${symbol}${value.toLocaleString()}`;
}
import {
  ArrowRightIcon,
  CheckIcon,
  SparklesIcon,
  MailIcon,
  BarChart3Icon,
  ShieldCheckIcon,
  ZapIcon,
  BrainIcon,
  MousePointerClickIcon,
  ReplyIcon,
  UsersIcon,
  TrendingUpIcon,
  FolderIcon,
  TargetIcon,
  ClockIcon,
  LayersIcon,
  FileTextIcon,
  UsersRoundIcon,
  DatabaseIcon,
  GitBranchIcon,
} from "lucide-react";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/projects");
  }

  // Fetch plans with live pricing from Paystack
  const plans = await getPlansWithPricing();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Nav */}
      <nav className="h-16 border-b border-white/10 sticky top-0 z-50 bg-slate-950/80 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <LogoIcon className="w-8 h-8" />
            <span className="font-semibold text-lg">Marketaa</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button className="bg-pink-500 hover:bg-pink-600 text-white" asChild>
              <Link href="/register">Start free</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-pink-500/10 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-pink-500/20 rounded-full blur-[120px]" />

        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-32">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="bg-pink-500/10 text-pink-400 border-pink-500/20 mb-6">
              <SparklesIcon className="w-3 h-3 mr-1" />
              AI that learns your voice
            </Badge>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] mb-6 tracking-tight">
              Cold outreach that
              <br />
              <span className="bg-gradient-to-r from-pink-400 to-pink-600 bg-clip-text text-transparent">
                sounds like you
              </span>
            </h1>

            <p className="text-xl text-slate-400 leading-relaxed mb-8 max-w-2xl mx-auto">
              Stop sending generic emails that get ignored. Marketaa researches your leads,
              writes personalized emails in your voice, and tracks every open and reply.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button size="lg" className="bg-pink-500 hover:bg-pink-600 text-white text-lg px-8 h-14" asChild>
                <Link href="/register">
                  Start for free
                  <ArrowRightIcon className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 text-lg px-8 h-14" asChild>
                <Link href="#how-it-works">See how it works</Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-8 text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <CheckIcon className="w-4 h-4 text-pink-500" />
                No credit card required
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <CheckIcon className="w-4 h-4 text-pink-500" />
                Free plan available
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <CheckIcon className="w-4 h-4 text-pink-500" />
                Cancel anytime
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pain Points */}
      <section className="py-20 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Why cold emails fail
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              You already know generic outreach doesn&apos;t work. Here&apos;s what&apos;s actually broken.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-slate-900/50 border-slate-800 hover:border-pink-500/30 transition-colors">
              <CardContent className="p-6">
                <div className="text-4xl mb-4">📧</div>
                <h3 className="font-semibold text-lg mb-2 text-white">&ldquo;Dear {'{first_name}'}&rdquo;</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Merge tags aren&apos;t personalization. Your prospects get 50 emails like this daily. They delete without reading.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800 hover:border-pink-500/30 transition-colors">
              <CardContent className="p-6">
                <div className="text-4xl mb-4">🤖</div>
                <h3 className="font-semibold text-lg mb-2 text-white">AI that sounds like AI</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  ChatGPT emails are obvious. &ldquo;I hope this message finds you well&rdquo; screams automation. People ignore robots.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800 hover:border-pink-500/30 transition-colors">
              <CardContent className="p-6">
                <div className="text-4xl mb-4">⏰</div>
                <h3 className="font-semibold text-lg mb-2 text-white">Real personalization takes hours</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Research each lead, check LinkedIn, write custom emails... You can&apos;t do this for 100 leads. So you don&apos;t.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Solution intro */}
      <section className="py-20 border-t border-white/5 bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <Badge className="bg-pink-500/10 text-pink-400 border-pink-500/20 mb-6">
            The solution
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            AI that writes like you,<br />researches like an assistant
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Marketaa learns your writing style, researches every lead, and drafts emails
            that sound authentically you—at scale.
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-slate-900">
        <div className="max-w-6xl mx-auto px-6">
          {/* Feature 1 - Style Learning */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-32">
            <div>
              <div className="inline-flex items-center gap-2 text-pink-400 text-sm font-medium mb-4">
                <BrainIcon className="w-4 h-4" />
                AI Style Learning
              </div>
              <h3 className="text-3xl font-bold mb-4">
                AI that writes in your voice
              </h3>
              <p className="text-slate-400 text-lg mb-6">
                Every time you edit an AI draft, Marketaa learns. After just 5 emails,
                it knows your tone, your phrases, what you add, what you delete.
                New drafts sound like you wrote them.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-slate-300">
                  <CheckIcon className="w-5 h-5 text-pink-500 mt-0.5 shrink-0" />
                  <span>Learns from your edits automatically</span>
                </li>
                <li className="flex items-start gap-3 text-slate-300">
                  <CheckIcon className="w-5 h-5 text-pink-500 mt-0.5 shrink-0" />
                  <span>Remembers phrases you always add or remove</span>
                </li>
                <li className="flex items-start gap-3 text-slate-300">
                  <CheckIcon className="w-5 h-5 text-pink-500 mt-0.5 shrink-0" />
                  <span>Gets better with every email you send</span>
                </li>
              </ul>
            </div>
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <SparklesIcon className="w-4 h-4 text-pink-500" />
                  Learned from 12 emails
                </div>
                <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                  <div className="text-sm text-slate-500 mb-2">Your style preferences:</div>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-pink-500/10 text-pink-400 rounded text-xs">Direct opener</span>
                    <span className="px-2 py-1 bg-pink-500/10 text-pink-400 rounded text-xs">Short sentences</span>
                    <span className="px-2 py-1 bg-pink-500/10 text-pink-400 rounded text-xs">No fluff</span>
                    <span className="px-2 py-1 bg-slate-700 text-slate-400 rounded text-xs line-through">Hope this finds you well</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2 - Lead Research */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-32">
            <div className="order-2 lg:order-1 bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 text-sm font-medium">JD</div>
                    <div>
                      <div className="font-medium text-white">Jane Doe</div>
                      <div className="text-xs text-slate-400">VP Sales @ TechCorp</div>
                    </div>
                  </div>
                  <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">Enriched</Badge>
                </div>
                <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                  <div className="text-xs text-slate-500 mb-2">Context found:</div>
                  <div className="space-y-1 text-sm text-slate-300">
                    <div>• 15+ years in enterprise sales</div>
                    <div>• Previously at Salesforce</div>
                    <div>• Focused on team efficiency</div>
                    <div>• Active on LinkedIn about AI tools</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 text-pink-400 text-sm font-medium mb-4">
                <UsersIcon className="w-4 h-4" />
                Lead Enrichment
              </div>
              <h3 className="text-3xl font-bold mb-4">
                Research done for you
              </h3>
              <p className="text-slate-400 text-lg mb-6">
                Add a lead and Marketaa automatically gathers context from LinkedIn,
                company info, and more. Every email references something real about them.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-slate-300">
                  <CheckIcon className="w-5 h-5 text-pink-500 mt-0.5 shrink-0" />
                  <span>LinkedIn profile enrichment</span>
                </li>
                <li className="flex items-start gap-3 text-slate-300">
                  <CheckIcon className="w-5 h-5 text-pink-500 mt-0.5 shrink-0" />
                  <span>Company and role context</span>
                </li>
                <li className="flex items-start gap-3 text-slate-300">
                  <CheckIcon className="w-5 h-5 text-pink-500 mt-0.5 shrink-0" />
                  <span>AI-generated talking points</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Feature 3 - Tracking */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-32">
            <div>
              <div className="inline-flex items-center gap-2 text-pink-400 text-sm font-medium mb-4">
                <BarChart3Icon className="w-4 h-4" />
                Full Visibility
              </div>
              <h3 className="text-3xl font-bold mb-4">
                Know exactly what&apos;s working
              </h3>
              <p className="text-slate-400 text-lg mb-6">
                Track every open, click, and reply. AI classifies responses automatically
                so you know who&apos;s interested, who&apos;s not, and who needs follow-up.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-slate-300">
                  <MousePointerClickIcon className="w-5 h-5 text-pink-500 mt-0.5 shrink-0" />
                  <span>Real-time open and click tracking</span>
                </li>
                <li className="flex items-start gap-3 text-slate-300">
                  <ReplyIcon className="w-5 h-5 text-pink-500 mt-0.5 shrink-0" />
                  <span>AI reply classification (interested, not interested, OOO)</span>
                </li>
                <li className="flex items-start gap-3 text-slate-300">
                  <TrendingUpIcon className="w-5 h-5 text-pink-500 mt-0.5 shrink-0" />
                  <span>Campaign analytics and insights</span>
                </li>
              </ul>
            </div>
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-900 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-white">68%</div>
                    <div className="text-xs text-slate-400">Open rate</div>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-white">12%</div>
                    <div className="text-xs text-slate-400">Reply rate</div>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-white">8</div>
                    <div className="text-xs text-slate-400">Meetings</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-green-500/10 rounded-lg border border-green-500/20">
                    <span className="text-sm text-green-400">Interested</span>
                    <span className="text-sm font-medium text-green-400">5 replies</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                    <span className="text-sm text-yellow-400">Follow up needed</span>
                    <span className="text-sm font-medium text-yellow-400">3 replies</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 4 - Compliance & CRM */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                  <ShieldCheckIcon className="w-8 h-8 text-pink-500 mb-3" />
                  <h4 className="font-semibold text-white mb-1">Compliance built-in</h4>
                  <p className="text-sm text-slate-400">One-click unsubscribe, suppression lists, CAN-SPAM ready</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                  <ZapIcon className="w-8 h-8 text-pink-500 mb-3" />
                  <h4 className="font-semibold text-white mb-1">CRM sync</h4>
                  <p className="text-sm text-slate-400">HubSpot, Salesforce, Pipedrive. Two-way sync.</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                  <MailIcon className="w-8 h-8 text-pink-500 mb-3" />
                  <h4 className="font-semibold text-white mb-1">Email sequences</h4>
                  <p className="text-sm text-slate-400">Automated follow-ups that stop when they reply</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                  <SparklesIcon className="w-8 h-8 text-pink-500 mb-3" />
                  <h4 className="font-semibold text-white mb-1">Templates</h4>
                  <p className="text-sm text-slate-400">Save and reuse your best-performing emails</p>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 text-pink-400 text-sm font-medium mb-4">
                <ZapIcon className="w-4 h-4" />
                Everything you need
              </div>
              <h3 className="text-3xl font-bold mb-4">
                Built for real sales teams
              </h3>
              <p className="text-slate-400 text-lg mb-6">
                Not just another email tool. Marketaa handles compliance, syncs with your CRM,
                and automates follow-ups—so you can focus on closing deals.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Power Features - Project Context, Plans, Sequences */}
      <section className="py-20 border-t border-white/5 bg-slate-950">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge className="bg-pink-500/10 text-pink-400 border-pink-500/20 mb-6">
              <DatabaseIcon className="w-3 h-3 mr-1" />
              Built for scale
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Not just emails. An outreach system.
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Marketaa gives you the structure to run sophisticated outreach campaigns—without the complexity.
            </p>
          </div>

          {/* Project Context */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-24">
            <div>
              <div className="inline-flex items-center gap-2 text-pink-400 text-sm font-medium mb-4">
                <FolderIcon className="w-4 h-4" />
                Project Knowledge Base
              </div>
              <h3 className="text-3xl font-bold mb-4">
                Teach AI your business once
              </h3>
              <p className="text-slate-400 text-lg mb-6">
                Define your industry, target audience, value props, and messaging tone at the project level.
                AI uses this context for every email—no need to repeat yourself.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-slate-300">
                  <CheckIcon className="w-5 h-5 text-pink-500 mt-0.5 shrink-0" />
                  <span>Set your industry, ICP, and pain points</span>
                </li>
                <li className="flex items-start gap-3 text-slate-300">
                  <CheckIcon className="w-5 h-5 text-pink-500 mt-0.5 shrink-0" />
                  <span>Define your messaging tone and brand voice</span>
                </li>
                <li className="flex items-start gap-3 text-slate-300">
                  <CheckIcon className="w-5 h-5 text-pink-500 mt-0.5 shrink-0" />
                  <span>AI references context automatically in every email</span>
                </li>
              </ul>
            </div>
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-slate-400">Project Context</span>
                  <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">Active</Badge>
                </div>
                <div className="space-y-3">
                  <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                    <div className="flex items-center gap-2 mb-1">
                      <TargetIcon className="w-4 h-4 text-pink-400" />
                      <span className="text-sm font-medium text-white">Target Audience</span>
                    </div>
                    <p className="text-sm text-slate-400">Series A+ SaaS companies, VP Sales & RevOps leaders</p>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                    <div className="flex items-center gap-2 mb-1">
                      <SparklesIcon className="w-4 h-4 text-pink-400" />
                      <span className="text-sm font-medium text-white">Value Proposition</span>
                    </div>
                    <p className="text-sm text-slate-400">Cut rep onboarding time by 60% with AI-powered sales coaching</p>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                    <div className="flex items-center gap-2 mb-1">
                      <FileTextIcon className="w-4 h-4 text-pink-400" />
                      <span className="text-sm font-medium text-white">Messaging Tone</span>
                    </div>
                    <p className="text-sm text-slate-400">Professional but conversational, data-driven, no buzzwords</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Outreach Plans */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-24">
            <div className="order-2 lg:order-1 bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg border border-pink-500/30">
                  <div className="w-10 h-10 bg-pink-500/20 rounded-lg flex items-center justify-center">
                    <MailIcon className="w-5 h-5 text-pink-400" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-white">Cold Outreach</div>
                    <div className="text-xs text-slate-400">Goal: Book demo · Professional tone</div>
                  </div>
                  <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">45 sent</Badge>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg border border-slate-700">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <ClockIcon className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-white">Follow-up</div>
                    <div className="text-xs text-slate-400">Goal: Get response · Friendly reminder</div>
                  </div>
                  <Badge className="bg-slate-700 text-slate-300 border-slate-600 text-xs">12 sent</Badge>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg border border-slate-700">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <TrendingUpIcon className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-white">Re-engagement</div>
                    <div className="text-xs text-slate-400">Goal: Revive cold leads · Value-first</div>
                  </div>
                  <Badge className="bg-slate-700 text-slate-300 border-slate-600 text-xs">Draft</Badge>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 text-pink-400 text-sm font-medium mb-4">
                <TargetIcon className="w-4 h-4" />
                Outreach Plans
              </div>
              <h3 className="text-3xl font-bold mb-4">
                Different goals, different approaches
              </h3>
              <p className="text-slate-400 text-lg mb-6">
                Create multiple outreach strategies for different objectives—cold outreach, follow-ups,
                re-engagement. Each plan has its own tone, goal, and templates.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-slate-300">
                  <CheckIcon className="w-5 h-5 text-pink-500 mt-0.5 shrink-0" />
                  <span>Set clear goals: book demo, get feedback, schedule call</span>
                </li>
                <li className="flex items-start gap-3 text-slate-300">
                  <CheckIcon className="w-5 h-5 text-pink-500 mt-0.5 shrink-0" />
                  <span>Configure tone per plan (professional, casual, formal)</span>
                </li>
                <li className="flex items-start gap-3 text-slate-300">
                  <CheckIcon className="w-5 h-5 text-pink-500 mt-0.5 shrink-0" />
                  <span>Track performance by strategy</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Sequences */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-24">
            <div>
              <div className="inline-flex items-center gap-2 text-pink-400 text-sm font-medium mb-4">
                <GitBranchIcon className="w-4 h-4" />
                Email Sequences
              </div>
              <h3 className="text-3xl font-bold mb-4">
                Automated follow-ups that stop when they reply
              </h3>
              <p className="text-slate-400 text-lg mb-6">
                Build multi-step sequences that automatically send follow-ups. When a lead replies,
                the sequence pauses. No more awkward "just following up" after they already responded.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-slate-300">
                  <CheckIcon className="w-5 h-5 text-pink-500 mt-0.5 shrink-0" />
                  <span>Multi-step sequences with custom delays</span>
                </li>
                <li className="flex items-start gap-3 text-slate-300">
                  <CheckIcon className="w-5 h-5 text-pink-500 mt-0.5 shrink-0" />
                  <span>Auto-pause on reply (no embarrassing double-sends)</span>
                </li>
                <li className="flex items-start gap-3 text-slate-300">
                  <CheckIcon className="w-5 h-5 text-pink-500 mt-0.5 shrink-0" />
                  <span>Conditional logic: different paths based on engagement</span>
                </li>
              </ul>
            </div>
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">Cold Outreach Sequence</span>
                  <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">Active</Badge>
                </div>
                {/* Sequence visualization */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center text-white text-sm font-medium">1</div>
                    <div className="flex-1 bg-slate-900 rounded-lg p-3 border border-slate-700">
                      <div className="text-sm font-medium text-white">Initial Email</div>
                      <div className="text-xs text-slate-400">Personalized intro</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pl-4">
                    <div className="w-0.5 h-6 bg-slate-700" />
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <ClockIcon className="w-3 h-3" /> Wait 3 days
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-white text-sm font-medium">2</div>
                    <div className="flex-1 bg-slate-900 rounded-lg p-3 border border-slate-700">
                      <div className="text-sm font-medium text-white">Follow-up</div>
                      <div className="text-xs text-slate-400">Add value, reference opener</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pl-4">
                    <div className="w-0.5 h-6 bg-slate-700" />
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <ClockIcon className="w-3 h-3" /> Wait 5 days
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-white text-sm font-medium">3</div>
                    <div className="flex-1 bg-slate-900 rounded-lg p-3 border border-slate-700">
                      <div className="text-sm font-medium text-white">Breakup Email</div>
                      <div className="text-xs text-slate-400">Final touch, leave door open</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Templates & Team */}
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-8">
                <LayersIcon className="w-10 h-10 text-pink-500 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-3">Template Library</h3>
                <p className="text-slate-400 mb-4">
                  Save your best-performing emails as templates. Create variants for A/B testing.
                  See which subject lines and approaches get the most replies.
                </p>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-pink-500" />
                    Reusable templates with variables
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-pink-500" />
                    A/B test subject lines and CTAs
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-pink-500" />
                    Performance tracking per template
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-8">
                <UsersRoundIcon className="w-10 h-10 text-pink-500 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-3">Team Collaboration</h3>
                <p className="text-slate-400 mb-4">
                  Invite your team to projects. Share leads, templates, and sequences.
                  Everyone works from the same playbook.
                </p>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-pink-500" />
                    Invite team members to projects
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-pink-500" />
                    Role-based permissions (admin, member)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-pink-500" />
                    Shared templates and sequences
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 border-t border-white/5 bg-slate-900">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge className="bg-pink-500/10 text-pink-400 border-pink-500/20 mb-6">
              Simple workflow
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              How it works
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              From setup to booked meetings in four steps.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-14 h-14 bg-pink-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <span className="text-xl font-bold text-pink-500">1</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Set up your project</h3>
              <p className="text-slate-400 text-sm">
                Define your ICP, value props, and messaging tone. Create outreach plans for different goals.
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-pink-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <span className="text-xl font-bold text-pink-500">2</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Add & enrich leads</h3>
              <p className="text-slate-400 text-sm">
                Import from CSV or CRM. AI automatically researches each lead—LinkedIn, company, role context.
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-pink-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <span className="text-xl font-bold text-pink-500">3</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Generate & sequence</h3>
              <p className="text-slate-400 text-sm">
                AI drafts personalized emails in your voice. Enroll leads in automated sequences with smart follow-ups.
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-pink-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <span className="text-xl font-bold text-pink-500">4</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Track & optimize</h3>
              <p className="text-slate-400 text-sm">
                Track opens, clicks, replies. AI classifies responses. A/B test templates. Focus on hot leads.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 border-t border-white/5 bg-slate-900">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge className="bg-pink-500/10 text-pink-400 border-pink-500/20 mb-6">
              Simple pricing
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Start free, scale as you grow
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              No hidden fees. No credit card required to start.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {Object.entries(plans).map(([key, plan]) => {
              const isPopular = key === "pro";
              const isEnterprise = key === "enterprise";

              return (
                <Card
                  key={key}
                  className={isPopular
                    ? "bg-gradient-to-b from-pink-500/10 to-slate-800/50 border-pink-500/30 relative"
                    : "bg-slate-800/50 border-slate-700"
                  }
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-pink-500 text-white border-0">Most popular</Badge>
                    </div>
                  )}
                  <CardContent className={`p-6 ${isPopular ? "pt-8" : ""}`}>
                    <h3 className="text-lg font-semibold text-white mb-2">{plan.name}</h3>
                    <div className="mb-5">
                      <span className="text-3xl font-bold text-white">{formatPrice(plan.amount, plan.currency)}</span>
                      <span className="text-slate-400 text-sm">/{plan.interval === "annually" ? "year" : "month"}</span>
                    </div>
                    <ul className="space-y-2.5 mb-6">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-slate-300 text-sm">
                          <CheckIcon className="w-4 h-4 text-pink-500 shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className={`w-full ${isPopular
                        ? "bg-pink-500 hover:bg-pink-600 text-white"
                        : "bg-slate-700 hover:bg-slate-600 text-white"
                      }`}
                      asChild
                    >
                      <Link href={isEnterprise ? "/contact" : "/register"}>
                        {isEnterprise ? "Contact sales" : "Get started"}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 border-t border-white/5 bg-slate-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-pink-500/5 to-transparent" />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">
            Stop blasting. Start connecting.
          </h2>
          <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
            Your prospects are drowning in generic emails. Stand out with outreach that&apos;s personalized,
            strategic, and sounds like you wrote every one.
          </p>
          <Button size="lg" className="bg-pink-500 hover:bg-pink-600 text-white text-lg px-10 h-14" asChild>
            <Link href="/register">
              Start for free
              <ArrowRightIcon className="w-5 h-5 ml-2" />
            </Link>
          </Button>
          <p className="text-sm text-slate-500 mt-4">
            Free plan forever · No credit card required · Set up in 5 minutes
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-slate-950">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <Logo size="md" className="text-white mb-4" />
              <p className="text-sm text-slate-400">
                AI-powered outreach that sounds like you.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How it works</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              © 2025 Marketaa. All rights reserved.
            </p>
            <p className="text-sm text-slate-500">
              Built for sales teams who hate generic outreach.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
