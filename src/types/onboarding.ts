export type AcademicCategory = "secondary" | "university" | "polytechnic";

export type SecondaryCategory = "junior" | "senior";

export type SecondaryClassLevel =
  | "JSS 1"
  | "JSS 2"
  | "JSS 3"
  | "SS 1"
  | "SS 2"
  | "SS 3";

export type UniversityAcademicLevel =
  | "100"
  | "200"
  | "300"
  | "400"
  | "500"
  | "600"
  | "Other";

export type PolytechnicQualificationType =
  | "ND"
  | "HND"
  | "Technical College Certificate"
  | "Vocational / Technical Program"
  | "Other";

export type ExplanationPreference = "simple" | "standard" | "advanced";

export type OnboardingStep = 1 | 2 | 3 | 4;

export type OnboardingSaveMode =
  | "draft"
  | "step-1"
  | "step-2"
  | "step-3"
  | "complete";

export interface StudentAcademicProfile {
  user_id: string;
  academic_category: AcademicCategory | null;
  country: string | null;
  state_region: string | null;
  institution_name: string | null;
  institution_type: string | null;
  secondary_category: SecondaryCategory | null;
  faculty: string | null;
  department: string | null;
  course_or_program: string | null;
  qualification_type: PolytechnicQualificationType | null;
  academic_level: string | null;
  curriculum: string | null;
  selected_subjects: string[];
  learning_goals: string[];
  explanation_preference: ExplanationPreference | null;
  current_step: OnboardingStep;
  onboarding_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OnboardingFormState {
  academicCategory: AcademicCategory | null;
  country: string;
  stateRegion: string;
  institutionName: string;
  institutionType: string;
  secondaryCategory: SecondaryCategory | null;
  faculty: string;
  department: string;
  courseOrProgram: string;
  qualificationType: PolytechnicQualificationType | null;
  academicLevel: string;
  curriculum: string;
  selectedSubjects: string[];
  learningGoals: string[];
  explanationPreference: ExplanationPreference | null;
  currentStep: OnboardingStep;
  onboardingCompleted: boolean;
}

export interface OnboardingSaveRequest {
  mode: OnboardingSaveMode;
  data: OnboardingFormState;
}

export interface OnboardingSaveResult {
  ok: boolean;
  status:
    | "saved"
    | "validation-error"
    | "rate-limited"
    | "unauthorized"
    | "error";
  message: string;
  profile?: StudentAcademicProfile;
  fieldErrors?: Record<string, string>;
  retryAfterSeconds?: number;
}
