"use client";

import React from "react";
import { useStudentDashboardData } from "@/lib/dashboard/useStudentDashboardData";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { WelcomeHeroBanner } from "@/components/dashboard/WelcomeHeroBanner";
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

  return (
    <DashboardShell
      userProfile={data.userProfile}
      academicProfile={data.academicProfile}
      fallbackEmail={data.email}
      unreadNotificationCount={data.unreadNotificationCount}
      publishedCourses={data.publishedCourses}
      ongoingCourses={data.ongoingCourses}
    >
      <div className="space-y-6 sm:space-y-8">
        {/* 2. Personalized Welcome Section */}
        <WelcomeHeroBanner
          userProfile={data.userProfile}
          academicProfile={data.academicProfile}
        />

        {/* 4A. Continue Learning & Recent Lessons */}
        <ContinueLearningSection
          ongoingCourses={data.ongoingCourses}
          recentLessons={data.recentLessons}
        />

        {/* 4B & 4C. AI Tutor Shortcut + Pathway-Aware Exam Preparation */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <AiTutorShortcutCard />
          <ExamPreparationCard academicProfile={data.academicProfile} />
        </div>

        {/* 4D & 4E. Today's Study Plan + Upcoming Assignments */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TodaysStudyPlanCard
            todaySessions={data.todayStudySessions}
            upcomingSessions={data.upcomingStudySessions}
          />
          <UpcomingAssignmentsCard assignments={data.upcomingAssignments} />
        </div>

        {/* 4F. Academic & Learning Progress */}
        <AcademicProgressSection
          metrics={data.progressMetrics}
          subjectLearningProgress={data.subjectLearningProgress}
        />

        {/* 4G. Recommended Learning & Subjects */}
        <RecommendedLearningSection
          academicProfile={data.academicProfile}
          publishedCourses={data.publishedCourses}
          catalogSubjects={data.catalogSubjects}
        />
      </div>
    </DashboardShell>
  );
}
