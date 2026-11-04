import { invokeAiGateway, type AiGatewayResponse } from "@/lib/ai/client-gateway";
import type {
  TutorConversationRecord,
  TutorExplanationStyle,
  TutorLearningMode,
  TutorMessageRecord,
  TutorVisualAidPreference,
} from "@/lib/ai/types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export interface StudentTutorPreferences {
  preferredMode: TutorLearningMode;
  explanationStyle: TutorExplanationStyle;
  preferredSubject: string | null;
}

export async function fetchTutorWorkspaceBootstrap(): Promise<{
  conversations: TutorConversationRecord[];
  preferences: StudentTutorPreferences;
}> {
  const defaultPrefs: StudentTutorPreferences = {
    preferredMode: "explain_topic",
    explanationStyle: "step_by_step",
    preferredSubject: null,
  };

  const supabase = createBrowserSupabaseClient();
  if (!supabase) {
    return { conversations: [], preferences: defaultPrefs };
  }

  const [convRes, prefRes] = await Promise.all([
    supabase
      .from("ai_tutor_conversations")
      .select("*")
      .order("last_message_at", { ascending: false })
      .limit(30),
    supabase.from("student_tutor_preferences").select("*").maybeSingle(),
  ]);

  const conversations: TutorConversationRecord[] = (convRes.data || []).map(
    (row: Record<string, unknown>) => ({
      id: String(row.id),
      title: String(row.title || "Study Session"),
      learningMode: (row.learning_mode as TutorLearningMode) || "explain_topic",
      subject: row.subject ? String(row.subject) : null,
      courseSlug: row.course_slug ? String(row.course_slug) : null,
      lessonSlug: row.lesson_slug ? String(row.lesson_slug) : null,
      messageCount: Number(row.message_count || 0),
      lastMessageAt: String(row.last_message_at || row.created_at || ""),
      createdAt: String(row.created_at || ""),
    })
  );

  const prefRow = prefRes.data as Record<string, unknown> | null;
  const preferences: StudentTutorPreferences = prefRow
    ? {
        preferredMode:
          (prefRow.preferred_mode as TutorLearningMode) || "explain_topic",
        explanationStyle:
          (prefRow.explanation_style as TutorExplanationStyle) || "step_by_step",
        preferredSubject: prefRow.preferred_subject
          ? String(prefRow.preferred_subject)
          : null,
      }
    : defaultPrefs;

  return { conversations, preferences };
}

export async function fetchConversationMessages(
  conversationId: string
): Promise<TutorMessageRecord[]> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("ai_tutor_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(100);

  return (data || []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    conversationId: String(row.conversation_id),
    role: row.role === "assistant" ? "assistant" : "user",
    content: String(row.content || ""),
    learningMode: (row.learning_mode as TutorLearningMode) || "explain_topic",
    provider: row.provider ? String(row.provider) : null,
    model: row.model ? String(row.model) : null,
    isAiGenerated: Boolean(row.is_ai_generated),
    isVerifiedEducationalMaterial: Boolean(row.is_verified_educational_material),
    createdAt: String(row.created_at || ""),
  }));
}

export async function saveStudentTutorPreferences(
  prefs: StudentTutorPreferences
): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("student_tutor_preferences").upsert(
    {
      user_id: user.id,
      preferred_mode: prefs.preferredMode,
      explanation_style: prefs.explanationStyle,
      preferred_subject: prefs.preferredSubject,
    },
    { onConflict: "user_id" }
  );
}

export async function renameTutorConversation(
  conversationId: string,
  title: string
): Promise<boolean> {
  const cleaned = title.trim().slice(0, 180);
  if (!cleaned) return false;
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from("ai_tutor_conversations")
    .update({ title: cleaned })
    .eq("id", conversationId);

  return !error;
}

export async function deleteTutorConversation(
  conversationId: string
): Promise<boolean> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from("ai_tutor_conversations")
    .delete()
    .eq("id", conversationId);

  return !error;
}

export async function sendTutorPrompt(params: {
  message: string;
  imageDataUrl?: string | null;
  learningMode: TutorLearningMode;
  explanationStyle: TutorExplanationStyle;
  visualPreference?: TutorVisualAidPreference;
  subject: string | null;
  conversationId?: string | null;
  courseSlug?: string | null;
  lessonSlug?: string | null;
  signal?: AbortSignal;
}): Promise<AiGatewayResponse> {
  return invokeAiGateway(
    {
      action: "tutor_chat",
      message: params.message,
      imageDataUrl: params.imageDataUrl || undefined,
      learningMode: params.learningMode,
      explanationStyle: params.explanationStyle,
      visualPreference: params.visualPreference || "auto",
      subject: params.subject,
      conversationId: params.conversationId || undefined,
      courseSlug: params.courseSlug || undefined,
      lessonSlug: params.lessonSlug || undefined,
    },
    params.signal ? { signal: params.signal } : undefined
  );
}
