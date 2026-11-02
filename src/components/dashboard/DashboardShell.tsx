"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  CalendarClock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Command,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  PenSquare,
  Search,
  Settings,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { CommandPaletteModal } from "@/components/dashboard/CommandPaletteModal";
import { QuickFocusPomodoro } from "@/components/dashboard/QuickFocusPomodoro";
import { DASHBOARD_NAV_ITEMS } from "@/data/dashboardNavigation";
import { formatCategoryLabel } from "@/data/onboardingOptions";
import { signOutLearner } from "@/lib/auth/authService";
import { searchAvailableDashboardContent } from "@/lib/dashboard/examPathways";
import type { UserProfile } from "@/types/auth";
import type {
  DashboardNavId,
  OngoingCourseItem,
  PublishedLearningCourse,
} from "@/types/dashboard";
import type { StudentAcademicProfile } from "@/types/onboarding";

const NAV_ICONS: Record<DashboardNavId, React.ElementType> = {
  dashboard: LayoutDashboard,
  learn: BookOpen,
  "ai-tutor": Bot,
  exams: GraduationCap,
  planner: CalendarClock,
  notes: FileText,
  progress: BarChart3,
  notifications: Bell,
  profile: User,
  settings: Settings,
};

interface DashboardShellProps {
  userProfile: UserProfile | null;
  academicProfile: StudentAcademicProfile | null;
  fallbackEmail: string;
  unreadNotificationCount: number;
  publishedCourses: PublishedLearningCourse[];
  ongoingCourses: OngoingCourseItem[];
  children: React.ReactNode;
}

export function DashboardShell({
  userProfile,
  academicProfile,
  fallbackEmail,
  unreadNotificationCount,
  publishedCourses,
  ongoingCourses,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  const studentName = userProfile?.full_name || "Student";
  const studentEmail = userProfile?.email || fallbackEmail || "";
  const categoryLabel = formatCategoryLabel(
    academicProfile?.academic_category ?? null
  );
  const institutionLabel =
    academicProfile?.institution_name || "Not specified";
  const levelLabel = academicProfile?.academic_level
    ? academicProfile.academic_category === "university" &&
      academicProfile.academic_level !== "Other"
      ? `${academicProfile.academic_level} Level`
      : academicProfile.academic_level
    : "Not specified";

  const initials = studentName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "ST";

  const searchResults = searchAvailableDashboardContent(searchQuery, {
    publishedCourses,
    ongoingCourses,
    academicProfile,
  });

  // Close menus on Escape or outside click + Global ⌘K / Ctrl+K Command Palette
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }
      if (e.key === "Escape") {
        setProfileMenuOpen(false);
        setMobileDrawerOpen(false);
        setSearchFocused(false);
        setCommandPaletteOpen(false);
      }
    }

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(target)
      ) {
        setProfileMenuOpen(false);
      }
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(target)
      ) {
        setSearchFocused(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOutLearner();
    router.replace("/login");
    router.refresh();
  };

  const isNavItemActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="relative flex min-h-screen w-full bg-obsidian-950 text-white">
      {/* Single Viewport-Clipped Ambient Background Layer (iOS Safari Safe) */}
      <div
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute inset-0 ecosystem-grid-bg opacity-65" />
        <div className="ambient-glow-cyan absolute left-1/3 top-0 h-[440px] w-[680px] -translate-x-1/2 rounded-full opacity-70" />
        <div className="ambient-glow-violet absolute bottom-0 right-10 h-[380px] w-[500px] rounded-full opacity-70" />
      </div>

      {/* =====================================================================
          DESKTOP COLLAPSIBLE LEFT SIDEBAR
         ===================================================================== */}
      <aside
        aria-label="Primary dashboard sidebar"
        className={`relative z-30 hidden shrink-0 flex-col border-r border-white/[0.07] bg-obsidian-900/90 backdrop-blur-xl transition-all duration-300 motion-reduce:transition-none lg:flex ${
          sidebarCollapsed ? "w-[84px]" : "w-[264px]"
        }`}
      >
        {/* Sidebar Top Brand & Collapse Button */}
        <div className="flex h-16 items-center justify-between border-b border-white/[0.06] px-4">
          {!sidebarCollapsed ? (
            <Link
              href="/dashboard"
              className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400"
            >
              <BrandLogo size="sm" />
            </Link>
          ) : (
            <Link
              href="/dashboard"
              aria-label="Dashboard home"
              className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl border border-electric-400/40 bg-obsidian-950 text-xs font-bold text-electric-300 shadow-cyan-glow"
            >
              EE
            </Link>
          )}

          {!sidebarCollapsed && (
            <button
              type="button"
              onClick={() => setSidebarCollapsed(true)}
              aria-label="Collapse sidebar"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-obsidian-950/75 text-slate-400 transition-colors hover:border-electric-400/45 hover:text-electric-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {sidebarCollapsed && (
          <div className="flex justify-center border-b border-white/[0.05] py-2">
            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              aria-label="Expand sidebar"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-obsidian-950/75 text-slate-400 transition-colors hover:border-electric-400/45 hover:text-electric-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* 10 Navigation Items */}
        <nav
          aria-label="Dashboard navigation"
          className="flex-1 space-y-1 overflow-y-auto px-3 py-4"
        >
          {DASHBOARD_NAV_ITEMS.map((item) => {
            const Icon = NAV_ICONS[item.id];
            const active = isNavItemActive(item.href);
            const showUnread =
              item.id === "notifications" && unreadNotificationCount > 0;

            return (
              <Link
                key={item.id}
                href={item.href}
                title={sidebarCollapsed ? item.label : undefined}
                aria-current={active ? "page" : undefined}
                className={`group relative flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400 ${
                  active
                    ? "border border-electric-400/45 bg-electric-400/12 text-white shadow-cyan-glow"
                    : "border border-transparent text-slate-300 hover:border-white/[0.07] hover:bg-obsidian-850/80 hover:text-white"
                } ${sidebarCollapsed ? "justify-center" : "justify-between"}`}
              >
                <span className="flex items-center gap-3 truncate">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      active
                        ? "text-electric-400"
                        : "text-slate-400 group-hover:text-electric-300"
                    }`}
                    aria-hidden="true"
                  />
                  {!sidebarCollapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </span>

                {!sidebarCollapsed && showUnread && (
                  <span className="inline-flex min-w-[22px] items-center justify-center rounded-full bg-electric-400 px-1.5 py-0.5 text-[11px] font-bold text-obsidian-950">
                    {unreadNotificationCount}
                  </span>
                )}

                {sidebarCollapsed && showUnread && (
                  <span
                    className="absolute right-2 top-2 h-2 w-2 rounded-full bg-electric-400"
                    aria-label={`${unreadNotificationCount} unread notifications`}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Bottom Admin Link (Admins Only) + Sign Out */}
        <div className="space-y-2 border-t border-white/[0.06] p-3">
          {userProfile?.role === "admin" && (
            <Link
              href="/admin"
              title={sidebarCollapsed ? "Admin Portal" : undefined}
              className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl border border-electric-400/45 bg-electric-500/15 px-3 py-2.5 text-xs font-bold text-electric-300 shadow-cyan-glow transition-colors hover:bg-electric-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400 ${
                sidebarCollapsed ? "justify-center" : ""
              }`}
            >
              <ShieldCheck
                className="h-4 w-4 shrink-0 text-electric-400"
                aria-hidden="true"
              />
              {!sidebarCollapsed && <span>Admin Portal</span>}
            </Link>
          )}

          <button
            type="button"
            disabled={isSigningOut}
            onClick={handleSignOut}
            title={sidebarCollapsed ? "Sign out" : undefined}
            className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl border border-slate-800/90 bg-obsidian-950/75 px-3 py-2.5 text-xs font-semibold text-slate-300 transition-colors hover:border-rose-400/40 hover:text-rose-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400 disabled:opacity-60 ${
              sidebarCollapsed ? "justify-center" : ""
            }`}
          >
            {isSigningOut ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <LogOut className="h-4 w-4 text-slate-400" aria-hidden="true" />
            )}
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* =====================================================================
          MOBILE SLIDE-OVER NAVIGATION DRAWER
         ===================================================================== */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-50 flex lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile dashboard navigation"
        >
          <div
            className="fixed inset-0 bg-obsidian-950/80 backdrop-blur-sm"
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />

          <div className="relative z-10 flex w-[285px] max-w-[85vw] flex-col border-r border-white/[0.09] bg-obsidian-900 p-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-3.5">
              <BrandLogo size="sm" />
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Close navigation drawer"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-obsidian-950 text-slate-300"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <nav
              aria-label="Mobile full navigation"
              className="mt-4 flex-1 space-y-1 overflow-y-auto"
            >
              {DASHBOARD_NAV_ITEMS.map((item) => {
                const Icon = NAV_ICONS[item.id];
                const active = isNavItemActive(item.href);
                const showUnread =
                  item.id === "notifications" && unreadNotificationCount > 0;

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setMobileDrawerOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-[46px] items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? "border border-electric-400/45 bg-electric-400/12 text-white"
                        : "text-slate-300 hover:bg-obsidian-850 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon
                        className={`h-4 w-4 ${
                          active ? "text-electric-400" : "text-slate-400"
                        }`}
                        aria-hidden="true"
                      />
                      <span>{item.label}</span>
                    </span>

                    {showUnread && (
                      <span className="rounded-full bg-electric-400 px-2 py-0.5 text-[11px] font-bold text-obsidian-950">
                        {unreadNotificationCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-4 space-y-2 border-t border-white/[0.07] pt-3">
              {userProfile?.role === "admin" && (
                <Link
                  href="/admin"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-electric-400/45 bg-electric-500/15 px-4 py-2.5 text-xs font-bold text-electric-300"
                >
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  <span>Admin Portal</span>
                </Link>
              )}
              <button
                type="button"
                disabled={isSigningOut}
                onClick={handleSignOut}
                className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-slate-800 bg-obsidian-950 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:border-rose-400/40 hover:text-rose-200"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MAIN COLUMN: TOP NAVIGATION + CONTENT + MOBILE BOTTOM BAR
         ===================================================================== */}
      <div className="relative z-20 flex min-w-0 flex-1 flex-col">
        {/* Sticky Top Header */}
        <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-obsidian-950/95 lg:bg-obsidian-950/85 lg:backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            {/* Mobile Menu Button & Compact Brand */}
            <div className="flex items-center gap-2.5 lg:hidden">
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                aria-label="Open dashboard navigation"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-obsidian-900/90 text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>
              <Link href="/dashboard" className="xs:block">
                <BrandLogo size="sm" />
              </Link>
            </div>

            {/* Desktop Search Bar */}
            <div
              ref={searchContainerRef}
              role="search"
              className="relative hidden max-w-md flex-1 lg:block"
            >
              <label htmlFor="dashboard-search-input" className="sr-only">
                Search courses, subjects, lessons, and topics
              </label>
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="dashboard-search-input"
                type="search"
                value={searchQuery}
                onFocus={() => setSearchFocused(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchFocused(true);
                }}
                placeholder="Search courses, subjects, lessons, or topics..."
                className="block min-h-[42px] w-full rounded-xl border border-slate-800/90 bg-obsidian-900/85 py-2 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 transition-colors focus:border-electric-400 focus:outline-none focus:ring-2 focus:ring-electric-400/25"
              />

              {/* Live Search Results Dropdown */}
              {searchFocused && searchQuery.trim().length > 0 && (
                <div
                  aria-label="Search results"
                  className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-2xl border border-slate-700/90 bg-obsidian-900 shadow-2xl"
                >
                  {searchResults.length > 0 ? (
                    <ul className="divide-y divide-white/[0.06] py-1">
                      {searchResults.map((res) => (
                        <li key={res.id}>
                          <Link
                            href={res.href}
                            onClick={() => setSearchFocused(false)}
                            className="flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-obsidian-850"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-white">
                                {res.title}
                              </p>
                              <p className="truncate text-xs text-slate-400">
                                {res.subtitle}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-md border border-electric-400/35 bg-electric-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-electric-300">
                              {res.kind}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No matching courses, subjects, lessons, or topics
                      available for &ldquo;{searchQuery.trim()}&rdquo;.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Controls: Command Palette, Focus Pomodoro, Mobile Search Toggle, Notifications, Profile Menu */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              {/* ⌘K Command Palette Trigger */}
              <button
                type="button"
                onClick={() => setCommandPaletteOpen(true)}
                aria-label="Open command palette"
                title="Quick Command Palette (⌘K / Ctrl+K)"
                className="hidden h-10 items-center gap-1.5 rounded-xl border border-slate-800 bg-obsidian-900/90 px-2.5 text-xs font-semibold text-slate-300 transition-colors hover:border-electric-400/45 hover:text-electric-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400 md:inline-flex"
              >
                <Command className="h-3.5 w-3.5 text-electric-400" aria-hidden="true" />
                <span className="font-mono text-[11px]">⌘K</span>
              </button>

              {/* Deep Focus Pomodoro Sprint Timer */}
              <QuickFocusPomodoro
                defaultSubject={
                  academicProfile?.selected_subjects?.[0] || "General"
                }
              />

              {/* Mobile Search Toggle */}
              <button
                type="button"
                onClick={() => setMobileSearchOpen((prev) => !prev)}
                aria-label="Toggle search bar"
                aria-expanded={mobileSearchOpen}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-obsidian-900/90 text-slate-300 hover:border-electric-400/40 hover:text-electric-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400 lg:hidden"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
              </button>

              {/* Notifications Bell */}
              <Link
                href="/dashboard/notifications"
                aria-label={
                  unreadNotificationCount > 0
                    ? `Notifications (${unreadNotificationCount} unread)`
                    : "Notifications"
                }
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-obsidian-900/90 text-slate-300 transition-colors hover:border-electric-400/45 hover:text-electric-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400"
              >
                <Bell className="h-4 w-4" aria-hidden="true" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-electric-400 px-1 text-[10px] font-bold leading-4 text-obsidian-950">
                    {unreadNotificationCount}
                  </span>
                )}
              </Link>

              {/* Student Profile Menu */}
              <div ref={profileMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((prev) => !prev)}
                  aria-expanded={profileMenuOpen}
                  aria-haspopup="menu"
                  aria-label="Open student profile menu"
                  className="inline-flex min-h-[40px] items-center gap-2.5 rounded-xl border border-slate-800 bg-obsidian-900/90 px-2.5 py-1.5 text-left transition-colors hover:border-electric-400/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-electric-400/40 bg-gradient-to-br from-electric-400/25 to-aura-500/25 font-display text-xs font-bold text-electric-300">
                    {initials}
                  </span>
                  <span className="hidden max-w-[140px] truncate text-xs font-semibold text-white sm:block">
                    {studentName}
                  </span>
                  <ChevronDown
                    className={`hidden h-3.5 w-3.5 text-slate-400 transition-transform sm:block ${
                      profileMenuOpen ? "rotate-180" : ""
                    }`}
                    aria-hidden="true"
                  />
                </button>

                {profileMenuOpen && (
                  <div
                    role="menu"
                    aria-label="Student profile details and actions"
                    className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-700/90 bg-obsidian-900 shadow-2xl"
                  >
                    {/* Identity Header */}
                    <div className="border-b border-white/[0.07] bg-obsidian-950/60 p-4">
                      <p className="truncate font-display text-sm font-bold text-white">
                        {studentName}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-400">
                        {studentEmail}
                      </p>

                      {/* Saved Academic Metadata */}
                      <dl className="mt-3 space-y-1.5 rounded-xl border border-slate-800/90 bg-obsidian-900/90 p-3 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <dt className="text-slate-400">Category</dt>
                          <dd className="truncate font-semibold text-electric-300">
                            {categoryLabel}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <dt className="text-slate-400">Institution</dt>
                          <dd className="max-w-[165px] truncate font-medium text-white">
                            {institutionLabel}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <dt className="text-slate-400">Class / Level</dt>
                          <dd className="truncate font-medium text-white">
                            {levelLabel}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    {/* Profile Actions */}
                    <div className="p-2">
                      {userProfile?.role === "admin" && (
                        <Link
                          role="menuitem"
                          href="/admin"
                          onClick={() => setProfileMenuOpen(false)}
                          className="mb-1 flex min-h-[42px] items-center gap-2.5 rounded-xl border border-electric-400/35 bg-electric-500/10 px-3 py-2 text-xs font-bold text-electric-300 transition-colors hover:bg-electric-500/20"
                        >
                          <ShieldCheck
                            className="h-4 w-4 text-electric-400"
                            aria-hidden="true"
                          />
                          <span>Open Admin Portal</span>
                        </Link>
                      )}

                      <Link
                        role="menuitem"
                        href="/onboarding?review=1"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex min-h-[42px] items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-obsidian-850 hover:text-electric-300"
                      >
                        <PenSquare
                          className="h-4 w-4 text-electric-400"
                          aria-hidden="true"
                        />
                        <span>Edit academic information</span>
                      </Link>

                      <Link
                        role="menuitem"
                        href="/dashboard/profile"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex min-h-[42px] items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-obsidian-850 hover:text-white"
                      >
                        <User
                          className="h-4 w-4 text-slate-400"
                          aria-hidden="true"
                        />
                        <span>My Profile</span>
                      </Link>

                      <Link
                        role="menuitem"
                        href="/dashboard/settings"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex min-h-[42px] items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-obsidian-850 hover:text-white"
                      >
                        <Settings
                          className="h-4 w-4 text-aura-400"
                          aria-hidden="true"
                        />
                        <span>Account settings</span>
                      </Link>

                      <div className="my-1 border-t border-white/[0.06]" />

                      <button
                        type="button"
                        role="menuitem"
                        disabled={isSigningOut}
                        onClick={handleSignOut}
                        className="flex min-h-[42px] w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-950/40 hover:text-rose-200 disabled:opacity-60"
                      >
                        <LogOut className="h-4 w-4" aria-hidden="true" />
                        <span>
                          {isSigningOut ? "Signing out..." : "Sign out"}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Expandable Mobile Search Bar */}
          {mobileSearchOpen && (
            <div className="border-t border-white/[0.06] px-4 py-3 lg:hidden">
              <div role="search" className="relative">
                <label htmlFor="mobile-dashboard-search" className="sr-only">
                  Search courses, subjects, lessons, and topics
                </label>
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="mobile-dashboard-search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search courses, subjects, lessons, topics..."
                  className="block min-h-[44px] w-full rounded-xl border border-slate-700/85 bg-obsidian-900 py-2 pl-10 pr-4 text-base text-white placeholder:text-slate-500 focus:border-electric-400 focus:outline-none"
                />
              </div>

              {searchQuery.trim().length > 0 && (
                <div className="mt-2 rounded-xl border border-slate-800 bg-obsidian-900 p-2">
                  {searchResults.length > 0 ? (
                    <ul className="divide-y divide-white/[0.05]">
                      {searchResults.map((res) => (
                        <li key={res.id}>
                          <Link
                            href={res.href}
                            onClick={() => setMobileSearchOpen(false)}
                            className="flex items-center justify-between gap-2 px-2.5 py-2.5 text-xs"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-white">
                                {res.title}
                              </p>
                              <p className="truncate text-[11px] text-slate-400">
                                {res.subtitle}
                              </p>
                            </div>
                            <span className="shrink-0 rounded bg-electric-400/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-electric-300">
                              {res.kind}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="p-2 text-center text-xs text-slate-400">
                      No matching content found for &ldquo;{searchQuery.trim()}
                      &rdquo;.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </header>

        {/* Main Scrollable Content Area */}
        <main
          id="main-content"
          className="mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8"
        >
          {children}
        </main>

        <CommandPaletteModal
          open={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
          publishedCourses={publishedCourses}
          ongoingCourses={ongoingCourses}
          academicProfile={academicProfile}
          isAdmin={userProfile?.role === "admin"}
        />

        {/* ===================================================================
            MOBILE FIXED BOTTOM NAVIGATION
           =================================================================== */}
        <nav
          aria-label="Mobile quick navigation"
          className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/[0.08] bg-obsidian-950/95 px-2 py-1.5 lg:hidden"
        >
          <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
            {DASHBOARD_NAV_ITEMS.filter((item) => item.isCoreMobileTab).map(
              (item) => {
                const Icon = NAV_ICONS[item.id];
                const active = isNavItemActive(item.href);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold transition-colors ${
                      active
                        ? "bg-electric-400/12 text-electric-300"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.shortLabel}</span>
                  </Link>
                );
              }
            )}
          </div>
        </nav>
      </div>
    </div>
  );
}
