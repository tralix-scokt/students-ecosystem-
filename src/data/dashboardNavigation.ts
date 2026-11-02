import type { DashboardNavId } from "@/types/dashboard";

export interface DashboardNavItem {
  id: DashboardNavId;
  label: string;
  shortLabel: string;
  href: string;
  isCoreMobileTab?: boolean;
  isUpcomingModule?: boolean;
}

export const DASHBOARD_NAV_ITEMS: readonly DashboardNavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    shortLabel: "Home",
    href: "/dashboard",
    isCoreMobileTab: true,
  },
  {
    id: "learn",
    label: "Learn",
    shortLabel: "Learn",
    href: "/dashboard/learn",
    isCoreMobileTab: true,
    isUpcomingModule: true,
  },
  {
    id: "ai-tutor",
    label: "AI Tutor",
    shortLabel: "AI Tutor",
    href: "/dashboard/ai-tutor",
    isCoreMobileTab: true,
    isUpcomingModule: true,
  },
  {
    id: "exams",
    label: "Exam Preparation",
    shortLabel: "Exams",
    href: "/dashboard/exams",
    isCoreMobileTab: true,
    isUpcomingModule: true,
  },
  {
    id: "planner",
    label: "My Planner",
    shortLabel: "Planner",
    href: "/dashboard/planner",
    isCoreMobileTab: true,
    isUpcomingModule: true,
  },
  {
    id: "notes",
    label: "My Notes",
    shortLabel: "Notes",
    href: "/dashboard/notes",
    isUpcomingModule: true,
  },
  {
    id: "progress",
    label: "My Progress",
    shortLabel: "Progress",
    href: "/dashboard/progress",
  },
  {
    id: "notifications",
    label: "Notifications",
    shortLabel: "Alerts",
    href: "/dashboard/notifications",
  },
  {
    id: "profile",
    label: "My Profile",
    shortLabel: "Profile",
    href: "/dashboard/profile",
  },
  {
    id: "settings",
    label: "Settings",
    shortLabel: "Settings",
    href: "/dashboard/settings",
  },
];
