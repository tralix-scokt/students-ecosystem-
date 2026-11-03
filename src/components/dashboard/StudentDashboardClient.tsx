"use client";

import React from "react";
import { useStudentDashboardData } from "@/lib/dashboard/useStudentDashboardData";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { WelcomeHeroBanner } from "@/components/dashboard/WelcomeHeroBanner";
import { FuturisticQuickLaunchStrip } from "@/components/dashboard/FuturisticQuickLaunchStrip";
import { ContinueLearningSection } from "@/components/dashboard/ContinueLearningSection";
import { AiTutorShortcutCard } from "@/components/dashboard/AiTutorShortcutCard";
import { ExamPreparationCard } from "@/components/dashboard/ExamPreparationCard";
import { TodaysStudyPlanCard } from "@/components/dashboard/TodaysStudyPlanCard";
import { UpcomingAssignmentsCard } from "@/components/dashboard/UpcomingAssignmentsCard";
import { AcademicProgressSection } from "@/components/dashboard/AcademicProgressSection";
import { RecommendedLearningSection } from "@/components/dashboard/RecommendedLearningSection";

export function StudentDashboardClient() {
  const { status, isRetrying, data, errorMessage, retry } =
    useStudentDashboardData();

  if (status === "loading") {
    return <DashboardSkeleton />;
  }

  if (status === "error" || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-obsidian-950 p-4">
        <DashboardErrorState
          message={
            errorMessage ||
            "Unable to connect to your academic command center right now."
          }
          isRetrying={isRetrying}
          onRetry={retry}
        />
      </div>
    );
  }

  const todayFocusMinutes = data.todayStudySessions.reduce(
    (sum, session) => sum + (session.duration_minutes ?? 0),
    0
  );

  return (
    <DashboardShell
      userProfile={data.userProfile}
      academicProfile={data.academicProfile}
      fallbackEmail={data.email}
      unreadNotificationCount={data.unreadNotificationCount}
      publishedCourses={data.publishedCourses}
      ongoingCourses={data.ongoingCourses}
    >
      <div className="space-y-7 pb-4 sm:space-y-9">
        {/* 1. Futuristic Neural Command Deck (Compact Identity + Live Telemetry + Single-Row Subject Rail) */}
        <WelcomeHeroBanner
          userProfile={data.userProfile}
          academicProfile={data.academicProfile}
          lessonsCompleted={data.progressMetrics.lessonsCompleted}
          todayFocusMinutes={todayFocusMinutes}
          averageAssessmentScore={data.progressMetrics.averageAssessmentScore}
        />

        {/* 2. Spatial 4-Tile Workspace Launchpad */}
        <FuturisticQuickLaunchStrip />

        {/* 3. AI Co-Pilot + Pathway Exam Readiness Bento */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <AiTutorShortcutCard />
          <ExamPreparationCard academicProfile={data.academicProfile} />
        </div>

        {/* 4. Active Learning Stream */}
        <ContinueLearningSection
          ongoingCourses={data.ongoingCourses}
          recentLessons={data.recentLessons}
        />

        {/* 5. Daily Focus Schedule & Assignment Queue */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TodaysStudyPlanCard
            todaySessions={data.todayStudySessions}
            upcomingSessions={data.upcomingStudySessions}
          />
          <UpcomingAssignmentsCard assignments={data.upcomingAssignments} />
        </div>

        {/* 6. Live Performance Telemetry */}
        <AcademicProgressSection
          metrics={data.progressMetrics}
          subjectLearningProgress={data.subjectLearningProgress}
        />

        {/* 7. Curated Pathway Catalog */}
        <RecommendedLearningSection
          academicProfile={data.academicProfile}
          publishedCourses={data.publishedCourses}
          catalogSubjects={data.catalogSubjects}
        />
      </div>
    </DashboardShell>
  );
}
