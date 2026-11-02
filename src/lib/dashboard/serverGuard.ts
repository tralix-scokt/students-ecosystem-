import { redirect } from "next/navigation";
import { getServerAuthenticatedUser } from "@/lib/supabase/server";

export async function requireServerDashboardSession(nextPath: string) {
  const { user, isEmailVerified } = await getServerAuthenticatedUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  if (!isEmailVerified) {
    const emailParam = user.email
      ? `?email=${encodeURIComponent(user.email)}`
      : "";
    redirect(`/verify-email${emailParam}`);
  }

  return user;
}
