import { isValidCountry } from "@/data/countries";
import {
  ALL_SECONDARY_CLASSES,
  LEARNING_GOALS,
  POLYTECHNIC_QUALIFICATION_TYPES,
  SECONDARY_CLASSES_BY_CATEGORY,
  UNIVERSITY_ACADEMIC_LEVELS,
} from "@/data/onboardingOptions";
import type {
  AcademicCategory,
  ExplanationPreference,
  OnboardingFormState,
  OnboardingSaveMode,
  OnboardingStep,
  PolytechnicQualificationType,
  SecondaryCategory,
  StudentAcademicProfile,
} from "@/types/onboarding";

const VALID_CATEGORIES: readonly AcademicCategory[] = [
  "secondary",
  "university",
  "polytechnic",
];

const VALID_SECONDARY_CATEGORIES: readonly SecondaryCategory[] = [
  "junior",
  "senior",
];

const VALID_EXPLANATIONS: readonly ExplanationPreference[] = [
  "simple",
  "standard",
  "advanced",
];

function cleanText(val: unknown, maxLen = 200): string {
  if (typeof val !== "string") return "";
  return val.trim().replace(/\s+/g, " ").slice(0, maxLen);
}

function cleanStringArray(val: unknown, maxItems: number, maxLen = 100): string[] {
  if (!Array.isArray(val)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of val) {
    if (typeof item !== "string") continue;
    const cleaned = cleanText(item, maxLen);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(cleaned);
      if (out.length >= maxItems) break;
    }
  }
  return out;
}

export function createInitialOnboardingFormState(
  defaultCountry = ""
): OnboardingFormState {
  return {
    academicCategory: null,
    country: defaultCountry && defaultCountry !== "Unspecified" ? defaultCountry : "",
    stateRegion: "",
    institutionName: "",
    institutionType: "",
    secondaryCategory: null,
    faculty: "",
    department: "",
    courseOrProgram: "",
    qualificationType: null,
    academicLevel: "",
    curriculum: "",
    selectedSubjects: [],
    learningGoals: [],
    explanationPreference: null,
    currentStep: 1,
    onboardingCompleted: false,
  };
}

export function profileToFormState(
  record: StudentAcademicProfile | null,
  fallbackCountry = ""
): OnboardingFormState {
  if (!record) {
    return createInitialOnboardingFormState(fallbackCountry);
  }

  return {
    academicCategory: record.academic_category,
    country:
      record.country ||
      (fallbackCountry && fallbackCountry !== "Unspecified"
        ? fallbackCountry
        : ""),
    stateRegion: record.state_region ?? "",
    institutionName: record.institution_name ?? "",
    institutionType: record.institution_type ?? "",
    secondaryCategory: record.secondary_category,
    faculty: record.faculty ?? "",
    department: record.department ?? "",
    courseOrProgram: record.course_or_program ?? "",
    qualificationType: record.qualification_type,
    academicLevel: record.academic_level ?? "",
    curriculum: record.curriculum ?? "",
    selectedSubjects: Array.isArray(record.selected_subjects)
      ? record.selected_subjects
      : [],
    learningGoals: Array.isArray(record.learning_goals)
      ? record.learning_goals
      : [],
    explanationPreference: record.explanation_preference,
    currentStep: (record.current_step >= 1 && record.current_step <= 4
      ? record.current_step
      : 1) as OnboardingStep,
    onboardingCompleted: Boolean(record.onboarding_completed),
  };
}

export function sanitizeOnboardingFormState(
  raw: Partial<OnboardingFormState> | null | undefined
): OnboardingFormState {
  const category = VALID_CATEGORIES.includes(
    raw?.academicCategory as AcademicCategory
  )
    ? (raw!.academicCategory as AcademicCategory)
    : null;

  const secondaryCategory = VALID_SECONDARY_CATEGORIES.includes(
    raw?.secondaryCategory as SecondaryCategory
  )
    ? (raw!.secondaryCategory as SecondaryCategory)
    : null;

  const qualificationType = (
    POLYTECHNIC_QUALIFICATION_TYPES as readonly string[]
  ).includes(raw?.qualificationType ?? "")
    ? (raw!.qualificationType as PolytechnicQualificationType)
    : null;

  const explanationPreference = VALID_EXPLANATIONS.includes(
    raw?.explanationPreference as ExplanationPreference
  )
    ? (raw!.explanationPreference as ExplanationPreference)
    : null;

  const rawStep = Number(raw?.currentStep ?? 1);
  const currentStep: OnboardingStep =
    rawStep === 2 || rawStep === 3 || rawStep === 4 ? rawStep : 1;

  const rawGoals = cleanStringArray(raw?.learningGoals, 10, 100);
  const validLearningGoals = rawGoals.filter((g) =>
    (LEARNING_GOALS as readonly string[]).includes(g)
  );

  return {
    academicCategory: category,
    country: cleanText(raw?.country, 100),
    stateRegion: cleanText(raw?.stateRegion, 120),
    institutionName: cleanText(raw?.institutionName, 200),
    institutionType: cleanText(raw?.institutionType, 120),
    secondaryCategory,
    faculty: cleanText(raw?.faculty, 160),
    department: cleanText(raw?.department, 160),
    courseOrProgram: cleanText(raw?.courseOrProgram, 200),
    qualificationType,
    academicLevel: cleanText(raw?.academicLevel, 80),
    curriculum: cleanText(raw?.curriculum, 160),
    selectedSubjects: cleanStringArray(raw?.selectedSubjects, 30, 100),
    learningGoals: validLearningGoals,
    explanationPreference,
    currentStep,
    onboardingCompleted: Boolean(raw?.onboardingCompleted),
  };
}

export function validateStep1Category(
  state: OnboardingFormState
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!state.academicCategory) {
    errors.academicCategory =
      "Please select an academic category to continue.";
  }
  return errors;
}

export function validateStep2Details(
  state: OnboardingFormState
): Record<string, string> {
  const errors = validateStep1Category(state);
  if (errors.academicCategory) return errors;

  if (!state.country) {
    errors.country = "Please select your country.";
  } else if (!isValidCountry(state.country)) {
    errors.country = "Please select a valid country from the list.";
  }

  if (!state.stateRegion || state.stateRegion.length < 2) {
    errors.stateRegion = "Please enter or select your state or region.";
  }

  if (state.academicCategory === "secondary") {
    if (
      state.institutionName &&
      state.institutionName.length > 0 &&
      state.institutionName.length < 2
    ) {
      errors.institutionName =
        "School name must be at least 2 characters if provided.";
    }

    if (!state.secondaryCategory) {
      errors.secondaryCategory =
        "Please select Junior Secondary (JSS) or Senior Secondary (SS).";
    }

    if (!state.academicLevel) {
      errors.academicLevel = "Please select your current class.";
    } else if (
      state.secondaryCategory &&
      !(
        SECONDARY_CLASSES_BY_CATEGORY[
          state.secondaryCategory
        ] as readonly string[]
      ).includes(state.academicLevel)
    ) {
      errors.academicLevel =
        state.secondaryCategory === "junior"
          ? "Junior Secondary class must be JSS 1, JSS 2, or JSS 3."
          : "Senior Secondary class must be SS 1, SS 2, or SS 3.";
    } else if (
      !(ALL_SECONDARY_CLASSES as readonly string[]).includes(
        state.academicLevel
      )
    ) {
      errors.academicLevel =
        "Class must be one of JSS 1, JSS 2, JSS 3, SS 1, SS 2, or SS 3.";
    }

    if (!state.curriculum || state.curriculum.length < 2) {
      errors.curriculum = "Please select or enter your curriculum.";
    }
  } else if (state.academicCategory === "university") {
    if (!state.institutionName || state.institutionName.length < 2) {
      errors.institutionName =
        "Please enter your university or institution name.";
    }
    if (!state.faculty || state.faculty.length < 2) {
      errors.faculty = "Please enter or select your faculty.";
    }
    if (!state.department || state.department.length < 2) {
      errors.department = "Please enter your department.";
    }
    if (!state.courseOrProgram || state.courseOrProgram.length < 2) {
      errors.courseOrProgram = "Please enter your course of study.";
    }
    if (!state.academicLevel) {
      errors.academicLevel = "Please select your academic level.";
    } else if (
      !(UNIVERSITY_ACADEMIC_LEVELS as readonly string[]).includes(
        state.academicLevel
      )
    ) {
      errors.academicLevel =
        "Academic level must be 100, 200, 300, 400, 500, 600, or Other.";
    }
  } else if (state.academicCategory === "polytechnic") {
    if (!state.institutionName || state.institutionName.length < 2) {
      errors.institutionName = "Please enter your institution name.";
    }
    if (!state.institutionType || state.institutionType.length < 2) {
      errors.institutionType = "Please select your institution type.";
    }
    if (!state.department || state.department.length < 2) {
      errors.department = "Please enter your department.";
    }
    if (!state.courseOrProgram || state.courseOrProgram.length < 2) {
      errors.courseOrProgram =
        "Please enter your course or technical program.";
    }
    if (!state.qualificationType) {
      errors.qualificationType = "Please select your qualification type.";
    }
    if (!state.academicLevel) {
      errors.academicLevel = "Please select or enter your current level.";
    } else if (
      state.qualificationType === "ND" &&
      !["ND 1", "ND 2"].includes(state.academicLevel)
    ) {
      errors.academicLevel = "ND level must be ND 1 or ND 2.";
    } else if (
      state.qualificationType === "HND" &&
      !["HND 1", "HND 2"].includes(state.academicLevel)
    ) {
      errors.academicLevel = "HND level must be HND 1 or HND 2.";
    }
  }

  return errors;
}

export function validateStep3Preferences(
  state: OnboardingFormState
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (
    state.academicCategory === "secondary" &&
    state.selectedSubjects.length === 0
  ) {
    errors.selectedSubjects =
      "Please select at least one subject for your Secondary School pathway.";
  }

  if (state.learningGoals.length === 0) {
    errors.learningGoals =
      "Please select at least one learning goal.";
  }

  if (!state.explanationPreference) {
    errors.explanationPreference =
      "Please choose an explanation preference (Simple, Standard, or Advanced).";
  }

  return errors;
}

export function validateOnboardingByMode(
  state: OnboardingFormState,
  mode: OnboardingSaveMode
): Record<string, string> {
  if (mode === "draft") {
    const errors: Record<string, string> = {};
    if (state.country && !isValidCountry(state.country)) {
      errors.country = "Please select a valid country from the list.";
    }
    return errors;
  }

  if (mode === "step-1") {
    return validateStep1Category(state);
  }

  if (mode === "step-2") {
    return validateStep2Details(state);
  }

  if (mode === "step-3" || mode === "complete") {
    return {
      ...validateStep1Category(state),
      ...validateStep2Details(state),
      ...validateStep3Preferences(state),
    };
  }

  return {};
}

export function buildDatabaseUpsertPayload(
  userId: string,
  state: OnboardingFormState,
  mode: OnboardingSaveMode
): Omit<StudentAcademicProfile, "created_at" | "updated_at" | "completed_at"> {
  const category = state.academicCategory;
  const markCompleted =
    mode === "complete" || (mode === "draft" && state.onboardingCompleted);

  const nextStep: OnboardingStep =
    mode === "step-1"
      ? 2
      : mode === "step-2"
        ? 3
        : mode === "step-3" || mode === "complete"
          ? 4
          : state.currentStep;

  // Nullify cross-pathway fields so stored academic record stays clean & relational
  const isSecondary = category === "secondary";
  const isUniversity = category === "university";
  const isPolytechnic = category === "polytechnic";

  return {
    user_id: userId,
    academic_category: category,
    country: state.country || null,
    state_region: state.stateRegion || null,
    institution_name: state.institutionName || null,
    institution_type: isPolytechnic ? state.institutionType || null : null,
    secondary_category: isSecondary ? state.secondaryCategory : null,
    faculty: isUniversity ? state.faculty || null : null,
    department:
      isUniversity || isPolytechnic ? state.department || null : null,
    course_or_program:
      isUniversity || isPolytechnic ? state.courseOrProgram || null : null,
    qualification_type: isPolytechnic ? state.qualificationType : null,
    academic_level: state.academicLevel || null,
    curriculum: isSecondary ? state.curriculum || null : null,
    selected_subjects: state.selectedSubjects,
    learning_goals: state.learningGoals,
    explanation_preference: state.explanationPreference,
    current_step: markCompleted ? 4 : nextStep,
    onboarding_completed: markCompleted,
  };
}
