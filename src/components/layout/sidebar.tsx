"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { UsageCard } from "@/components/usage/usage-card";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FolderIcon,
  FileTextIcon,
  RefreshCwIcon,
  BarChart3Icon,
  FlameIcon,
  SettingsIcon,
  ShieldIcon,
  LogOutIcon,
  ChevronDownIcon,
  UserIcon,
  PlusIcon,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
}

const navigation: NavItem[] = [
  {
    name: "Projects",
    href: "/projects",
    icon: <FolderIcon className="w-5 h-5" />,
  },
  {
    name: "Templates",
    href: "/templates",
    icon: <FileTextIcon className="w-5 h-5" />,
  },
  {
    name: "Sequences",
    href: "/sequences",
    icon: <RefreshCwIcon className="w-5 h-5" />,
  },
  {
    name: "Analytics",
    href: "/analytics",
    icon: <BarChart3Icon className="w-5 h-5" />,
  },
  {
    name: "Email Warmup",
    href: "/warmup",
    icon: <FlameIcon className="w-5 h-5" />,
  },
];

const secondaryNavigation: NavItem[] = [
  {
    name: "Settings",
    href: "/settings",
    icon: <SettingsIcon className="w-5 h-5" />,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/user/me")
      .then((res) => res.json())
      .then((data) => setIsAdmin(data.role === "admin"))
      .catch(() => {});
  }, []);

  const isActive = (href: string) => {
    if (href === "/projects") {
      return pathname === "/projects" || pathname.startsWith("/projects/");
    }
    if (href === "/sequences") {
      return pathname === "/sequences" || pathname.startsWith("/sequences/");
    }
    if (href === "/templates") {
      return pathname === "/templates" || pathname.startsWith("/templates/");
    }
    if (href === "/settings") {
      return pathname === "/settings" || pathname.startsWith("/settings/");
    }
    if (href === "/admin") {
      return pathname === "/admin" || pathname.startsWith("/admin/");
    }
    return pathname.startsWith(href);
  };

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return "U";
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col w-64 bg-sidebar text-sidebar-foreground h-screen sticky top-0">
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-sidebar-border">
          <Link href="/projects" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <span className="text-sidebar-primary-foreground font-bold text-sm">M</span>
            </div>
            <span className="font-semibold text-sidebar-foreground text-lg">Marketaa</span>
          </Link>
          <NotificationBell />
        </div>

        {/* Quick Create Button */}
        <div className="px-4 pt-4">
          <Button
            className="w-full bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground"
            asChild
          >
            <Link href="/projects">
              <PlusIcon className="w-4 h-4 mr-2" />
              Quick Create
            </Link>
          </Button>
        </div>

        {/* Main Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <div className="space-y-1">
            {navigation.map((item) => (
              <Tooltip key={item.name}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    }`}
                  >
                    <span className={isActive(item.href) ? "text-sidebar-primary" : ""}>
                      {item.icon}
                    </span>
                    {item.name}
                    {item.badge && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="hidden">
                  {item.name}
                </TooltipContent>
              </Tooltip>
            ))}

            <Separator className="my-4 bg-sidebar-border" />

            <p className="mb-2 px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
              Account
            </p>
            {secondaryNavigation.map((item) => (
              <Tooltip key={item.name}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    }`}
                  >
                    <span className={isActive(item.href) ? "text-sidebar-primary" : ""}>
                      {item.icon}
                    </span>
                    {item.name}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="hidden">
                  {item.name}
                </TooltipContent>
              </Tooltip>
            ))}

            {isAdmin && (
              <>
                <Separator className="my-4 bg-sidebar-border" />
                <p className="mb-2 px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                  Admin
                </p>
                <Link
                  href="/admin"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive("/admin")
                      ? "bg-destructive/20 text-destructive"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  }`}
                >
                  <span className={isActive("/admin") ? "text-destructive" : ""}>
                    <ShieldIcon className="w-5 h-5" />
                  </span>
                  Admin Dashboard
                </Link>
              </>
            )}

            {/* Usage Card */}
            <div className="mt-6 px-1">
              <UsageCard />
            </div>
          </div>
        </ScrollArea>

        {/* User Section */}
        <div className="p-3 border-t border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 px-3 py-2.5 h-auto hover:bg-sidebar-accent/50 text-sidebar-foreground"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={session?.user?.image || undefined} />
                  <AvatarFallback className="bg-sidebar-primary/20 text-sidebar-primary text-xs">
                    {getInitials(session?.user?.name, session?.user?.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {session?.user?.name || "User"}
                  </p>
                  <p className="text-xs text-sidebar-foreground/60 truncate">
                    {session?.user?.email}
                  </p>
                </div>
                <ChevronDownIcon className="w-4 h-4 text-sidebar-foreground/60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings/account" className="cursor-pointer">
                  <UserIcon className="w-4 h-4 mr-2" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <SettingsIcon className="w-4 h-4 mr-2" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <LogOutIcon className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </TooltipProvider>
  );
}
