import { redirect } from "next/navigation";
import { isNetworkTransportError } from "@/lib/supabase/config";
import {
  createServerSupabaseClient,
  getServerAuthenticatedUser,
} from "@/lib/supabase/server";

export async function requireServerAdminSession() {
  const { user, isEmailVerified } = await getServerAuthenticatedUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  if (!isEmailVerified) {
    const emailParam = user.email
      ? `?email=${encodeURIComponent(user.email)}`
      : "";
    redirect(`/verify-email${emailParam}`);
  }

  const supabase = await createServerSupabaseClient({ timeoutMs: 3000 });
  if (supabase) {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, role, full_name, email")
        .eq("id", user.id)
        .maybeSingle();

      if (!error) {
        if (!profile || profile.role !== "admin") {
          redirect("/dashboard");
        }
        return { user, verifiedAdminOnServer: true };
      }

      if (!isNetworkTransportError(error)) {
        redirect("/dashboard");
      }
    } catch (err) {
      if (!isNetworkTransportError(err)) {
        redirect("/dashboard");
      }
    }
  }

  // When container outbound networking is firewalled, PostgreSQL's
  // SECURITY DEFINER `public.is_platform_admin()` + forced RLS strictly block
  // any non-admin query or mutation at the database layer.
  return { user, verifiedAdminOnServer: false };
}
