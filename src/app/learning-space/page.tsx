import { redirect } from "next/navigation";
import { getServerAuthenticatedUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LearningSpaceLegacyRedirectPage() {
  const { user, isEmailVerified } = await getServerAuthenticatedUser();
  if (!user) {
    redirect("/login?next=/dashboard");
  }
  if (!isEmailVerified) {
    const emailParam = user.email
      ? `?email=${encodeURIComponent(user.email)}`
      : "";
    redirect(`/verify-email${emailParam}`);
  }
  redirect("/dashboard");
}
