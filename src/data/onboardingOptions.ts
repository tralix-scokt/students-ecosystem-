import type {
  AcademicCategory,
  ExplanationPreference,
  OnboardingStep,
  PolytechnicQualificationType,
  SecondaryCategory,
  SecondaryClassLevel,
  UniversityAcademicLevel,
} from "@/types/onboarding";

export interface OnboardingStepDefinition {
  step: OnboardingStep;
  label: string;
  shortLabel: string;
}

export const ONBOARDING_STEPS: OnboardingStepDefinition[] = [
  { step: 1, label: "Academic Level", shortLabel: "Level" },
  { step: 2, label: "Academic Details", shortLabel: "Details" },
  { step: 3, label: "Subjects and Goals", shortLabel: "Goals" },
  { step: 4, label: "Complete", shortLabel: "Complete" },
];

export interface AcademicCategoryCardConfig {
  id: AcademicCategory;
  badge: string;
  title: string;
  subtitle: string;
  highlights: string[];
  accent: "cyan" | "violet" | "mixed";
}

export const ACADEMIC_CATEGORY_CARDS: AcademicCategoryCardConfig[] = [
  {
    id: "secondary",
    badge: "Pathway 01",
    title: "SECONDARY SCHOOL",
    subtitle: "Structured curriculum mastery across Junior and Senior classes.",
    highlights: [
      "Junior Secondary School (JSS)",
      "Senior Secondary School (SS)",
    ],
    accent: "cyan",
  },
  {
    id: "university",
    badge: "Pathway 02",
    title: "UNIVERSITY",
    subtitle: "Faculty, departmental, and degree-aligned higher education.",
    highlights: ["Undergraduate university education."],
    accent: "violet",
  },
  {
    id: "polytechnic",
    badge: "Pathway 03",
    title: "POLYTECHNIC / TECHNICAL COLLEGE",
    subtitle: "Applied technology, diploma, technical, and vocational mastery.",
    highlights: [
      "Polytechnic education.",
      "Technical education.",
      "Vocational programs.",
    ],
    accent: "mixed",
  },
];

export const NIGERIAN_STATES_AND_FCT: readonly string[] = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "Federal Capital Territory (Abuja)",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
];

export const SECONDARY_CLASSES_BY_CATEGORY: Record<
  SecondaryCategory,
  readonly SecondaryClassLevel[]
> = {
  junior: ["JSS 1", "JSS 2", "JSS 3"],
  senior: ["SS 1", "SS 2", "SS 3"],
};

export const ALL_SECONDARY_CLASSES: readonly SecondaryClassLevel[] = [
  "JSS 1",
  "JSS 2",
  "JSS 3",
  "SS 1",
  "SS 2",
  "SS 3",
];

const NIGERIAN_JUNIOR_CURRICULA: readonly string[] = [
  "NERDC Junior Secondary Curriculum / BECE (Nigeria)",
  "NECO BECE Curriculum (Nigeria)",
  "State Ministry Basic Education Curriculum (Nigeria)",
  "Nigerian–British Blended Curriculum",
];

const NIGERIAN_SENIOR_CURRICULA: readonly string[] = [
  "WAEC (WASSCE) / NERDC Senior Secondary Curriculum (Nigeria)",
  "NECO (SSCE) Senior Secondary Curriculum (Nigeria)",
  "WAEC + NECO + JAMB (UTME) Combined Track (Nigeria)",
  "NABTEB Technical & Business Curriculum (Nigeria)",
  "Nigerian–British Blended Curriculum",
];

const INTERNATIONAL_SECONDARY_CURRICULA: readonly string[] = [
  "Cambridge Lower Secondary / IGCSE / International A-Level",
  "WAEC (West African Senior School Certificate)",
  "National Secondary Education Curriculum",
  "International Baccalaureate (IB)",
  "American High School Curriculum",
  "Other Curriculum",
];

export function getSecondaryCurricula(
  country: string,
  secondaryCategory: SecondaryCategory | null
): string[] {
  const isNigeria = country.trim().toLowerCase() === "nigeria";
  const nigerianSet =
    secondaryCategory === "junior"
      ? NIGERIAN_JUNIOR_CURRICULA
      : secondaryCategory === "senior"
        ? NIGERIAN_SENIOR_CURRICULA
        : [...NIGERIAN_SENIOR_CURRICULA, ...NIGERIAN_JUNIOR_CURRICULA];

  if (isNigeria) {
    return Array.from(
      new Set([...nigerianSet, ...INTERNATIONAL_SECONDARY_CURRICULA])
    );
  }

  return Array.from(
    new Set([...INTERNATIONAL_SECONDARY_CURRICULA, ...nigerianSet])
  );
}

export const JUNIOR_SECONDARY_SUBJECTS: readonly string[] = [
  "Mathematics",
  "English Language",
  "Basic Science",
  "Basic Technology",
  "Civic Education",
  "Social Studies",
  "Business Studies",
  "Computer Studies / ICT",
  "Agricultural Science",
  "Cultural & Creative Arts",
  "Physical & Health Education",
  "Home Economics",
  "French",
  "History",
  "Christian Religious Studies",
  "Islamic Studies",
  "Nigerian Languages (Yoruba / Igbo / Hausa)",
];

export const SENIOR_SECONDARY_SUBJECTS: readonly string[] = [
  "Mathematics",
  "English Language",
  "Civic Education",
  "Biology",
  "Physics",
  "Chemistry",
  "Further Mathematics",
  "Economics",
  "Government",
  "Literature-in-English",
  "Computer Studies / Data Processing",
  "Agricultural Science",
  "Geography",
  "Financial Accounting",
  "Commerce",
  "Technical Drawing",
  "History",
  "Christian Religious Studies",
  "Islamic Studies",
  "Marketing",
  "French",
  "Visual Arts",
];

export const HIGHER_EDUCATION_FOCUS_SUBJECTS: readonly string[] = [
  "Engineering Mathematics / Calculus",
  "Programming & Data Structures",
  "General Physics & Mechanics",
  "General & Organic Chemistry",
  "Statistics & Quantitative Methods",
  "Research Methods & Academic Writing",
  "Microeconomics & Macroeconomics",
  "Financial & Managerial Accounting",
  "Human Anatomy & Physiology",
  "Constitutional & Legal Studies",
  "Electrical Circuits & Electronics",
  "Entrepreneurship & Project Management",
];

export function getSuggestedSubjects(
  academicCategory: AcademicCategory | null,
  secondaryCategory: SecondaryCategory | null
): readonly string[] {
  if (academicCategory === "secondary") {
    if (secondaryCategory === "junior") return JUNIOR_SECONDARY_SUBJECTS;
    return SENIOR_SECONDARY_SUBJECTS;
  }
  return HIGHER_EDUCATION_FOCUS_SUBJECTS;
}

export const UNIVERSITY_ACADEMIC_LEVELS: readonly UniversityAcademicLevel[] = [
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "Other",
];

export const UNIVERSITY_FACULTY_SUGGESTIONS: readonly string[] = [
  "Faculty of Engineering",
  "Faculty of Science",
  "Faculty of Computing / Information Technology",
  "College of Medicine / Health Sciences",
  "Faculty of Arts / Humanities",
  "Faculty of Social Sciences",
  "Faculty of Management / Administration",
  "Faculty of Law",
  "Faculty of Education",
  "Faculty of Agriculture",
  "Faculty of Environmental Sciences",
  "Faculty of Pharmacy",
];

// Strictly real, verified NUC-accredited Nigerian universities offered only as optional quick-fills.
// Students can always type any Nigerian or global institution name manually.
export const VERIFIED_UNIVERSITY_EXAMPLES_NG: readonly string[] = [
  "University of Lagos",
  "University of Ibadan",
  "Obafemi Awolowo University, Ile-Ife",
  "Ahmadu Bello University, Zaria",
  "University of Nigeria, Nsukka",
  "University of Benin",
  "Delta State University, Abraka",
  "Federal University of Petroleum Resources, Effurun",
  "University of Port Harcourt",
  "University of Ilorin",
  "Federal University of Technology, Akure",
  "Federal University of Technology, Minna",
  "Federal University of Technology, Owerri",
  "Covenant University, Ota",
  "Lagos State University",
  "Nnamdi Azikiwe University, Awka",
  "Bayero University, Kano",
];

export const POLYTECHNIC_INSTITUTION_TYPES: readonly string[] = [
  "Polytechnic",
  "Technical College",
  "Monotechnic / Specialized Technical Institute",
  "Vocational / Innovation Enterprise Institution",
];

export const POLYTECHNIC_QUALIFICATION_TYPES: readonly PolytechnicQualificationType[] =
  [
    "ND",
    "HND",
    "Technical College Certificate",
    "Vocational / Technical Program",
    "Other",
  ];

export const FLEXIBLE_TECHNICAL_LEVELS: readonly string[] = [
  "Year 1",
  "Year 2",
  "Year 3",
  "NTC 1",
  "NTC 2",
  "NTC 3",
  "Foundation / Stage 1",
  "Intermediate / Stage 2",
  "Advanced / Final Stage",
];

// Strictly real, verified NBTE-recognized Nigerian polytechnics & technical institutes as optional quick-fills.
export const VERIFIED_POLYTECHNIC_EXAMPLES_NG: readonly string[] = [
  "Yaba College of Technology",
  "Petroleum Training Institute, Effurun",
  "Auchi Polytechnic",
  "Kaduna Polytechnic",
  "The Polytechnic, Ibadan",
  "Federal Polytechnic, Nekede",
  "Federal Polytechnic, Ilaro",
  "Institute of Management and Technology, Enugu",
  "Delta State Polytechnic, Otefe-Oghara",
  "Delta State Polytechnic, Ogwashi-Uku",
];

export function getPolytechnicLevelOptions(
  qualificationType: PolytechnicQualificationType | null
): {
  strictOptions: readonly string[] | null;
  flexibleSuggestions: readonly string[];
} {
  if (qualificationType === "ND") {
    return { strictOptions: ["ND 1", "ND 2"], flexibleSuggestions: [] };
  }
  if (qualificationType === "HND") {
    return { strictOptions: ["HND 1", "HND 2"], flexibleSuggestions: [] };
  }
  return {
    strictOptions: null,
    flexibleSuggestions: FLEXIBLE_TECHNICAL_LEVELS,
  };
}

export const LEARNING_GOALS: readonly string[] = [
  "Improve my grades",
  "Understand difficult subjects",
  "Prepare for examinations",
  "Improve academic performance",
  "Develop better study habits",
];

export interface ExplanationPreferenceOption {
  value: ExplanationPreference;
  label: string;
  tagline: string;
  description: string;
}

export const EXPLANATION_PREFERENCES: readonly ExplanationPreferenceOption[] = [
  {
    value: "simple",
    label: "Simple",
    tagline: "Clear & Foundational",
    description:
      "Everyday language, intuitive analogies, and gentle step-by-step breakdowns.",
  },
  {
    value: "standard",
    label: "Standard",
    tagline: "Curriculum Balanced",
    description:
      "Structured classroom-grade explanations aligned directly with syllabus expectations.",
  },
  {
    value: "advanced",
    label: "Advanced",
    tagline: "Deep & Rigorous",
    description:
      "Comprehensive theoretical depth, formal terminology, and analytical problem-solving.",
  },
];

export function formatCategoryLabel(
  category: AcademicCategory | null
): string {
  if (category === "secondary") return "Secondary School";
  if (category === "university") return "University";
  if (category === "polytechnic") return "Polytechnic / Technical College";
  return "Not selected";
}

export function formatExplanationLabel(
  pref: ExplanationPreference | null
): string {
  if (pref === "simple") return "Simple";
  if (pref === "standard") return "Standard";
  if (pref === "advanced") return "Advanced";
  return "Not selected";
}
