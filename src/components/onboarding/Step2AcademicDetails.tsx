"use client";

import React from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Globe,
  Loader2,
  MapPin,
} from "lucide-react";
import { COUNTRIES } from "@/data/countries";
import {
  ALL_SECONDARY_CLASSES,
  formatCategoryLabel,
  getPolytechnicLevelOptions,
  getSecondaryCurricula,
  NIGERIAN_STATES_AND_FCT,
  POLYTECHNIC_INSTITUTION_TYPES,
  POLYTECHNIC_QUALIFICATION_TYPES,
  SECONDARY_CLASSES_BY_CATEGORY,
  UNIVERSITY_ACADEMIC_LEVELS,
  UNIVERSITY_FACULTY_SUGGESTIONS,
  VERIFIED_POLYTECHNIC_EXAMPLES_NG,
  VERIFIED_UNIVERSITY_EXAMPLES_NG,
} from "@/data/onboardingOptions";
import type {
  OnboardingFormState,
  PolytechnicQualificationType,
  SecondaryCategory,
} from "@/types/onboarding";

interface Step2AcademicDetailsProps {
  formState: OnboardingFormState;
  fieldErrors: Record<string, string>;
  isSubmitting: boolean;
  onUpdateField: <K extends keyof OnboardingFormState>(
    field: K,
    value: OnboardingFormState[K]
  ) => void;
  onBack: () => void;
  onContinue: () => void;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className="mt-1.5 flex items-center gap-1.5 text-xs text-rose-300"
    >
      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

export function Step2AcademicDetails({
  formState,
  fieldErrors,
  isSubmitting,
  onUpdateField,
  onBack,
  onContinue,
}: Step2AcademicDetailsProps) {
  const category = formState.academicCategory;
  const isNigeria = formState.country.trim().toLowerCase() === "nigeria";

  const secondaryCurricula = getSecondaryCurricula(
    formState.country,
    formState.secondaryCategory
  );

  const secondaryClassOptions = formState.secondaryCategory
    ? SECONDARY_CLASSES_BY_CATEGORY[formState.secondaryCategory]
    : ALL_SECONDARY_CLASSES;

  const polyLevelConfig = getPolytechnicLevelOptions(
    formState.qualificationType
  );

  const handleSecondaryCategorySelect = (nextCat: SecondaryCategory) => {
    onUpdateField("secondaryCategory", nextCat);
    const validClasses = SECONDARY_CLASSES_BY_CATEGORY[nextCat] as readonly string[];
    if (formState.academicLevel && !validClasses.includes(formState.academicLevel)) {
      onUpdateField("academicLevel", "");
    }
  };

  const handlePolyQualificationSelect = (
    nextQual: PolytechnicQualificationType
  ) => {
    onUpdateField("qualificationType", nextQual);
    if (nextQual === "ND" && !["ND 1", "ND 2"].includes(formState.academicLevel)) {
      onUpdateField("academicLevel", "");
    } else if (
      nextQual === "HND" &&
      !["HND 1", "HND 2"].includes(formState.academicLevel)
    ) {
      onUpdateField("academicLevel", "");
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onContinue();
  };

  return (
    <section aria-labelledby="step2-heading" className="space-y-8">
      {/* Header */}
      <div className="max-w-2xl">
        <span className="inline-flex items-center rounded-full border border-electric-400/35 bg-electric-400/10 px-3 py-1 font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-electric-300">
          {formatCategoryLabel(category)}
        </span>
        <h1
          id="step2-heading"
          className="mt-4 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl"
        >
          Your Academic Details.
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-300 sm:text-base">
          {category === "secondary" &&
            "Provide your Secondary School location, JSS or SS class, and curriculum. Nigerian curricula are prioritized automatically for Nigerian students."}
          {category === "university" &&
            "Enter your university, faculty, department, course of study, and current academic level. You can enter any institution or course directly."}
          {category === "polytechnic" &&
            "Enter your polytechnic, technical college, or vocational program details, qualification type, and current level."}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="rounded-2xl border border-white/[0.09] hardcover-surface p-5 sm:p-8"
      >
        <div className="space-y-6">
          {/* Shared Location Row: Country + State/Region */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="onboarding-country"
                className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-300"
              >
                Country
              </label>
              <div className="relative mt-1.5">
                <Globe
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <select
                  id="onboarding-country"
                  value={formState.country}
                  onChange={(e) => {
                    onUpdateField("country", e.target.value);
                    if (
                      e.target.value.toLowerCase() !== "nigeria" &&
                      NIGERIAN_STATES_AND_FCT.includes(formState.stateRegion)
                    ) {
                      onUpdateField("stateRegion", "");
                    }
                  }}
                  aria-invalid={Boolean(fieldErrors.country)}
                  aria-describedby={
                    fieldErrors.country ? "error-country" : undefined
                  }
                  className="block min-h-[46px] w-full rounded-xl border border-slate-700/80 bg-obsidian-950/85 py-2.5 pl-10 pr-3 text-base text-white focus:border-electric-400 focus:outline-none focus:ring-2 focus:ring-electric-400/30 sm:text-sm"
                >
                  <option value="">Select country</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c} className="bg-obsidian-950 text-white">
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <FieldError id="error-country" message={fieldErrors.country} />
            </div>

            <div>
              <label
                htmlFor="onboarding-state"
                className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-300"
              >
                State or region
              </label>
              <div className="relative mt-1.5">
                <MapPin
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                {isNigeria ? (
                  <select
                    id="onboarding-state"
                    value={formState.stateRegion}
                    onChange={(e) => onUpdateField("stateRegion", e.target.value)}
                    aria-invalid={Boolean(fieldErrors.stateRegion)}
                    aria-describedby={
                      fieldErrors.stateRegion ? "error-state" : undefined
                    }
                    className="block min-h-[46px] w-full rounded-xl border border-slate-700/80 bg-obsidian-950/85 py-2.5 pl-10 pr-3 text-base text-white focus:border-electric-400 focus:outline-none focus:ring-2 focus:ring-electric-400/30 sm:text-sm"
                  >
                    <option value="">Select state or FCT</option>
                    {NIGERIAN_STATES_AND_FCT.map((st) => (
                      <option key={st} value={st} className="bg-obsidian-950 text-white">
                        {st}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="onboarding-state"
                    type="text"
                    value={formState.stateRegion}
                    onChange={(e) => onUpdateField("stateRegion", e.target.value)}
                    placeholder="Enter state, province, or region"
                    aria-invalid={Boolean(fieldErrors.stateRegion)}
                    aria-describedby={
                      fieldErrors.stateRegion ? "error-state" : undefined
                    }
                    className="block min-h-[46px] w-full rounded-xl border border-slate-700/80 bg-obsidian-950/85 py-2.5 pl-10 pr-4 text-base text-white placeholder:text-slate-500 focus:border-electric-400 focus:outline-none focus:ring-2 focus:ring-electric-400/30 sm:text-sm"
                  />
                )}
              </div>
              <FieldError id="error-state" message={fieldErrors.stateRegion} />
            </div>
          </div>

          {/* ================================================================
              PATHWAY 1: SECONDARY SCHOOL DETAILS
             ================================================================ */}
          {category === "secondary" && (
            <>
              {/* School Name (Optional) */}
              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="secondary-school-name"
                    className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-300"
                  >
                    School name
                  </label>
                  <span className="rounded-md border border-slate-700/80 bg-obsidian-950/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">
                    Optional
                  </span>
                </div>
                <div className="relative mt-1.5">
                  <Building2
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    id="secondary-school-name"
                    type="text"
                    value={formState.institutionName}
                    onChange={(e) =>
                      onUpdateField("institutionName", e.target.value)
                    }
                    placeholder="e.g., Federal Government College, King's College (optional)"
                    className="block min-h-[46px] w-full rounded-xl border border-slate-700/80 bg-obsidian-950/85 py-2.5 pl-10 pr-4 text-base text-white placeholder:text-slate-500 focus:border-electric-400 focus:outline-none focus:ring-2 focus:ring-electric-400/30 sm:text-sm"
                  />
                </div>
                <FieldError
                  id="error-sec-school"
                  message={fieldErrors.institutionName}
                />
              </div>

              {/* Secondary Category: Junior or Senior */}
              <div>
                <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
                  Secondary category
                </span>
                <div
                  role="radiogroup"
                  aria-label="Secondary category"
                  className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2"
                >
                  {(
                    [
                      {
                        id: "junior",
                        title: "Junior Secondary (JSS)",
                        sub: "Classes JSS 1, JSS 2, and JSS 3",
                      },
                      {
                        id: "senior",
                        title: "Senior Secondary (SS)",
                        sub: "Classes SS 1, SS 2, and SS 3",
                      },
                    ] as const
                  ).map((opt) => {
                    const active = formState.secondaryCategory === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => handleSecondaryCategorySelect(opt.id)}
                        className={`flex min-h-[64px] flex-col justify-center rounded-xl border px-4 py-3 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400 ${
                          active
                            ? "border-electric-400 bg-electric-400/12 text-white shadow-cyan-glow"
                            : "border-slate-700/80 bg-obsidian-950/75 text-slate-300 hover:border-slate-500"
                        }`}
                      >
                        <span className="font-display text-sm font-bold">
                          {opt.title}
                        </span>
                        <span className="mt-0.5 text-xs text-slate-400">
                          {opt.sub}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <FieldError
                  id="error-sec-category"
                  message={fieldErrors.secondaryCategory}
                />
              </div>

              {/* Class Selection: JSS 1–3 or SS 1–3 */}
              <div>
                <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
                  Class
                </span>
                <div
                  role="radiogroup"
                  aria-label="Secondary class"
                  className="mt-2 grid grid-cols-3 gap-2.5 sm:grid-cols-6"
                >
                  {secondaryClassOptions.map((cls) => {
                    const active = formState.academicLevel === cls;
                    return (
                      <button
                        key={cls}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => {
                          onUpdateField("academicLevel", cls);
                          if (cls.startsWith("JSS")) {
                            onUpdateField("secondaryCategory", "junior");
                          } else if (cls.startsWith("SS")) {
                            onUpdateField("secondaryCategory", "senior");
                          }
                        }}
                        className={`min-h-[46px] rounded-xl border px-3 py-2.5 font-display text-sm font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400 ${
                          active
                            ? "border-electric-400 bg-electric-400 text-obsidian-950 shadow-cyan-glow"
                            : "border-slate-700/80 bg-obsidian-950/80 text-slate-200 hover:border-electric-400/50"
                        }`}
                      >
                        {cls}
                      </button>
                    );
                  })}
                </div>
                <FieldError
                  id="error-sec-class"
                  message={fieldErrors.academicLevel}
                />
              </div>

              {/* Curriculum (Prioritizing Nigerian Curricula for Nigerian Students) */}
              <div>
                <label
                  htmlFor="secondary-curriculum"
                  className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-300"
                >
                  Curriculum
                </label>
                <select
                  id="secondary-curriculum"
                  value={
                    secondaryCurricula.includes(formState.curriculum)
                      ? formState.curriculum
                      : formState.curriculum
                        ? "Other Curriculum"
                        : ""
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "Other Curriculum") {
                      onUpdateField("curriculum", "Other Curriculum");
                    } else {
                      onUpdateField("curriculum", val);
                    }
                  }}
                  aria-invalid={Boolean(fieldErrors.curriculum)}
                  className="mt-1.5 block min-h-[46px] w-full rounded-xl border border-slate-700/80 bg-obsidian-950/85 px-3.5 py-2.5 text-base text-white focus:border-electric-400 focus:outline-none focus:ring-2 focus:ring-electric-400/30 sm:text-sm"
                >
                  <option value="">Select curriculum</option>
                  {secondaryCurricula.map((curr) => (
                    <option
                      key={curr}
                      value={curr}
                      className="bg-obsidian-950 text-white"
                    >
                      {curr}
                    </option>
                  ))}
                </select>

                {(formState.curriculum === "Other Curriculum" ||
                  (formState.curriculum &&
                    !secondaryCurricula.includes(formState.curriculum))) && (
                  <input
                    type="text"
                    aria-label="Specify curriculum name"
                    value={
                      formState.curriculum === "Other Curriculum"
                        ? ""
                        : formState.curriculum
                    }
                    onChange={(e) =>
                      onUpdateField(
                        "curriculum",
                        e.target.value || "Other Curriculum"
                      )
                    }
                    placeholder="Enter your curriculum name"
                    className="mt-2.5 block min-h-[44px] w-full rounded-xl border border-slate-700/80 bg-obsidian-950/85 px-4 py-2 text-base text-white placeholder:text-slate-500 focus:border-electric-400 focus:outline-none focus:ring-2 focus:ring-electric-400/30 sm:text-sm"
                  />
                )}
                <FieldError
                  id="error-sec-curriculum"
                  message={fieldErrors.curriculum}
                />
              </div>
            </>
          )}

          {/* ================================================================
              PATHWAY 2: UNIVERSITY DETAILS
             ================================================================ */}
          {category === "university" && (
            <>
              {/* University / Institution Name (Manual Entry + Optional Verified Suggestions) */}
              <div>
                <label
                  htmlFor="university-name"
                  className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-300"
                >
                  University / institution name
                </label>
                <input
                  id="university-name"
                  type="text"
                  list="verified-universities-list"
                  value={formState.institutionName}
                  onChange={(e) =>
                    onUpdateField("institutionName", e.target.value)
                  }
                  placeholder="Type your university name directly (manual entry supported)"
                  aria-invalid={Boolean(fieldErrors.institutionName)}
                  className="mt-1.5 block min-h-[46px] w-full rounded-xl border border-slate-700/80 bg-obsidian-950/85 px-4 py-2.5 text-base text-white placeholder:text-slate-500 focus:border-electric-400 focus:outline-none focus:ring-2 focus:ring-electric-400/30 sm:text-sm"
                />
                {isNigeria && (
                  <datalist id="verified-universities-list">
                    {VERIFIED_UNIVERSITY_EXAMPLES_NG.map((uni) => (
                      <option key={uni} value={uni} />
                    ))}
                  </datalist>
                )}
                <p className="mt-1.5 text-[11px] text-slate-400">
                  Enter your exact university name directly, or pick a verified
                  suggestion if applicable.
                </p>
                <FieldError
                  id="error-uni-name"
                  message={fieldErrors.institutionName}
                />
              </div>

              {/* Faculty & Department */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="university-faculty"
                    className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-300"
                  >
                    Faculty
                  </label>
                  <input
                    id="university-faculty"
                    type="text"
                    list="university-faculty-suggestions"
                    value={formState.faculty}
                    onChange={(e) => onUpdateField("faculty", e.target.value)}
                    placeholder="e.g., Faculty of Engineering"
                    aria-invalid={Boolean(fieldErrors.faculty)}
                    className="mt-1.5 block min-h-[46px] w-full rounded-xl border border-slate-700/80 bg-obsidian-950/85 px-4 py-2.5 text-base text-white placeholder:text-slate-500 focus:border-electric-400 focus:outline-none focus:ring-2 focus:ring-electric-400/30 sm:text-sm"
                  />
                  <datalist id="university-faculty-suggestions">
                    {UNIVERSITY_FACULTY_SUGGESTIONS.map((fac) => (
                      <option key={fac} value={fac} />
                    ))}
                  </datalist>
                  <FieldError
                    id="error-uni-faculty"
                    message={fieldErrors.faculty}
                  />
                </div>

                <div>
                  <label
                    htmlFor="university-department"
                    className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-300"
                  >
                    Department
                  </label>
                  <input
                    id="university-department"
                    type="text"
                    value={formState.department}
                    onChange={(e) =>
                      onUpdateField("department", e.target.value)
                    }
                    placeholder="e.g., Computer Science"
                    aria-invalid={Boolean(fieldErrors.department)}
                    className="mt-1.5 block min-h-[46px] w-full rounded-xl border border-slate-700/80 bg-obsidian-950/85 px-4 py-2.5 text-base text-white placeholder:text-slate-500 focus:border-electric-400 focus:outline-none focus:ring-2 focus:ring-electric-400/30 sm:text-sm"
                  />
                  <FieldError
                    id="error-uni-department"
                    message={fieldErrors.department}
                  />
                </div>
              </div>

              {/* Course of Study (Manual Entry) */}
              <div>
                <label
                  htmlFor="university-course"
                  className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-300"
                >
                  Course of study
                </label>
                <input
                  id="university-course"
                  type="text"
                  value={formState.courseOrProgram}
                  onChange={(e) =>
                    onUpdateField("courseOrProgram", e.target.value)
                  }
                  placeholder="Enter your degree or course of study (e.g., B.Sc. Computer Science)"
                  aria-invalid={Boolean(fieldErrors.courseOrProgram)}
                  className="mt-1.5 block min-h-[46px] w-full rounded-xl border border-slate-700/80 bg-obsidian-950/85 px-4 py-2.5 text-base text-white placeholder:text-slate-500 focus:border-electric-400 focus:outline-none focus:ring-2 focus:ring-electric-400/30 sm:text-sm"
                />
                <FieldError
                  id="error-uni-course"
                  message={fieldErrors.courseOrProgram}
                />
              </div>

              {/* Academic Level: 100, 200, 300, 400, 500, 600, Other */}
              <div>
                <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
                  Academic level
                </span>
                <div
                  role="radiogroup"
                  aria-label="University academic level"
                  className="mt-2 grid grid-cols-4 gap-2.5 sm:grid-cols-7"
                >
                  {UNIVERSITY_ACADEMIC_LEVELS.map((lvl) => {
                    const active = formState.academicLevel === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => onUpdateField("academicLevel", lvl)}
                        className={`min-h-[46px] rounded-xl border px-3 py-2 font-display text-sm font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400 ${
                          active
                            ? "border-aura-400 bg-aura-500 text-white shadow-violet-glow"
                            : "border-slate-700/80 bg-obsidian-950/80 text-slate-200 hover:border-aura-400/55"
                        }`}
                      >
                        {lvl === "Other" ? "Other" : `${lvl}L`}
                      </button>
                    );
                  })}
                </div>
                <FieldError
                  id="error-uni-level"
                  message={fieldErrors.academicLevel}
                />
              </div>
            </>
          )}

          {/* ================================================================
              PATHWAY 3: POLYTECHNIC / TECHNICAL COLLEGE DETAILS
             ================================================================ */}
          {category === "polytechnic" && (
            <>
              {/* Institution Name & Institution Type */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="poly-institution-name"
                    className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-300"
                  >
                    Institution name
                  </label>
                  <input
                    id="poly-institution-name"
                    type="text"
                    list="verified-polytechnics-list"
                    value={formState.institutionName}
                    onChange={(e) =>
                      onUpdateField("institutionName", e.target.value)
                    }
                    placeholder="Enter polytechnic or technical college name"
                    aria-invalid={Boolean(fieldErrors.institutionName)}
                    className="mt-1.5 block min-h-[46px] w-full rounded-xl border border-slate-700/80 bg-obsidian-950/85 px-4 py-2.5 text-base text-white placeholder:text-slate-500 focus:border-electric-400 focus:outline-none focus:ring-2 focus:ring-electric-400/30 sm:text-sm"
                  />
                  {isNigeria && (
                    <datalist id="verified-polytechnics-list">
                      {VERIFIED_POLYTECHNIC_EXAMPLES_NG.map((inst) => (
                        <option key={inst} value={inst} />
                      ))}
                    </datalist>
                  )}
                  <FieldError
                    id="error-poly-name"
                    message={fieldErrors.institutionName}
                  />
                </div>

                <div>
                  <label
                    htmlFor="poly-institution-type"
                    className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-300"
                  >
                    Institution type
                  </label>
                  <select
                    id="poly-institution-type"
                    value={formState.institutionType}
                    onChange={(e) =>
                      onUpdateField("institutionType", e.target.value)
                    }
                    aria-invalid={Boolean(fieldErrors.institutionType)}
                    className="mt-1.5 block min-h-[46px] w-full rounded-xl border border-slate-700/80 bg-obsidian-950/85 px-3.5 py-2.5 text-base text-white focus:border-electric-400 focus:outline-none focus:ring-2 focus:ring-electric-400/30 sm:text-sm"
                  >
                    <option value="">Select institution type</option>
                    {POLYTECHNIC_INSTITUTION_TYPES.map((t) => (
                      <option key={t} value={t} className="bg-obsidian-950 text-white">
                        {t}
                      </option>
                    ))}
                  </select>
                  <FieldError
                    id="error-poly-type"
                    message={fieldErrors.institutionType}
                  />
                </div>
              </div>

              {/* Department & Course or Technical Program */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="poly-department"
                    className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-300"
                  >
                    Department
                  </label>
                  <input
                    id="poly-department"
                    type="text"
                    value={formState.department}
                    onChange={(e) =>
                      onUpdateField("department", e.target.value)
                    }
                    placeholder="e.g., Electrical / Electronic Engineering"
                    aria-invalid={Boolean(fieldErrors.department)}
                    className="mt-1.5 block min-h-[46px] w-full rounded-xl border border-slate-700/80 bg-obsidian-950/85 px-4 py-2.5 text-base text-white placeholder:text-slate-500 focus:border-electric-400 focus:outline-none focus:ring-2 focus:ring-electric-400/30 sm:text-sm"
                  />
                  <FieldError
                    id="error-poly-department"
                    message={fieldErrors.department}
                  />
                </div>

                <div>
                  <label
                    htmlFor="poly-program"
                    className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-300"
                  >
                    Course or technical program
                  </label>
                  <input
                    id="poly-program"
                    type="text"
                    value={formState.courseOrProgram}
                    onChange={(e) =>
                      onUpdateField("courseOrProgram", e.target.value)
                    }
                    placeholder="e.g., Mechatronics Technology, Software Development"
                    aria-invalid={Boolean(fieldErrors.courseOrProgram)}
                    className="mt-1.5 block min-h-[46px] w-full rounded-xl border border-slate-700/80 bg-obsidian-950/85 px-4 py-2.5 text-base text-white placeholder:text-slate-500 focus:border-electric-400 focus:outline-none focus:ring-2 focus:ring-electric-400/30 sm:text-sm"
                  />
                  <FieldError
                    id="error-poly-program"
                    message={fieldErrors.courseOrProgram}
                  />
                </div>
              </div>

              {/* Qualification Type */}
              <div>
                <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
                  Qualification type
                </span>
                <div
                  role="radiogroup"
                  aria-label="Qualification type"
                  className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-3 lg:grid-cols-5"
                >
                  {POLYTECHNIC_QUALIFICATION_TYPES.map((qual) => {
                    const active = formState.qualificationType === qual;
                    return (
                      <button
                        key={qual}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => handlePolyQualificationSelect(qual)}
                        className={`min-h-[48px] rounded-xl border px-3.5 py-2.5 text-left font-display text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400 sm:text-center ${
                          active
                            ? "border-electric-400 bg-electric-400/15 text-electric-300 shadow-cyan-glow"
                            : "border-slate-700/80 bg-obsidian-950/80 text-slate-200 hover:border-electric-400/45"
                        }`}
                      >
                        {qual}
                      </button>
                    );
                  })}
                </div>
                <FieldError
                  id="error-poly-qual"
                  message={fieldErrors.qualificationType}
                />
              </div>

              {/* Current Level (ND 1/ND 2, HND 1/HND 2, or Flexible Year/Level) */}
              <div>
                <label
                  htmlFor="poly-current-level"
                  className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-300"
                >
                  Current level
                </label>

                {polyLevelConfig.strictOptions ? (
                  <div
                    role="radiogroup"
                    aria-label="Current diploma level"
                    className="mt-2 grid grid-cols-2 gap-3 sm:max-w-sm"
                  >
                    {polyLevelConfig.strictOptions.map((lvl) => {
                      const active = formState.academicLevel === lvl;
                      return (
                        <button
                          key={lvl}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => onUpdateField("academicLevel", lvl)}
                          className={`min-h-[46px] rounded-xl border px-4 py-2.5 font-display text-sm font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400 ${
                            active
                              ? "border-electric-400 bg-electric-400 text-obsidian-950 shadow-cyan-glow"
                              : "border-slate-700/80 bg-obsidian-950/80 text-slate-200 hover:border-electric-400/50"
                          }`}
                        >
                          {lvl}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-2 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {polyLevelConfig.flexibleSuggestions.map((sug) => {
                        const active = formState.academicLevel === sug;
                        return (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => onUpdateField("academicLevel", sug)}
                            className={`min-h-[38px] rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400 ${
                              active
                                ? "border-electric-400 bg-electric-400 text-obsidian-950"
                                : "border-slate-700/80 bg-obsidian-950/75 text-slate-300 hover:border-electric-400/50"
                            }`}
                          >
                            {sug}
                          </button>
                        );
                      })}
                    </div>
                    <input
                      id="poly-current-level"
                      type="text"
                      value={formState.academicLevel}
                      onChange={(e) =>
                        onUpdateField("academicLevel", e.target.value)
                      }
                      placeholder="Select a level above or enter custom year / stage (e.g., Year 2, Trade Test II)"
                      className="block min-h-[46px] w-full rounded-xl border border-slate-700/80 bg-obsidian-950/85 px-4 py-2.5 text-base text-white placeholder:text-slate-500 focus:border-electric-400 focus:outline-none focus:ring-2 focus:ring-electric-400/30 sm:text-sm"
                    />
                  </div>
                )}

                <FieldError
                  id="error-poly-level"
                  message={fieldErrors.academicLevel}
                />
              </div>
            </>
          )}
        </div>

        {/* Navigation Footer: Back & Continue */}
        <div className="mt-8 flex flex-col-reverse items-stretch justify-between gap-3 border-t border-white/[0.08] pt-6 sm:flex-row sm:items-center">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onBack}
            className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-slate-700/80 bg-obsidian-950/80 px-5 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-electric-400/50 hover:text-electric-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-400 disabled:opacity-65"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back</span>
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-xl border border-electric-400/70 bg-gradient-to-r from-electric-400 via-electric-500 to-aura-500 px-7 py-3 text-sm font-bold tracking-wide text-obsidian-950 shadow-cyan-glow transition-all duration-300 hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-300 disabled:opacity-70"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Saving Details...</span>
              </>
            ) : (
              <>
                <span>Continue</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
