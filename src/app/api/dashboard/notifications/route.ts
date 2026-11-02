import { NextResponse } from "next/server";
import {
  checkRateLimit,
  extractClientIdentifier,
} from "@/lib/security/rateLimiter";
import {
  getSupabasePublicConfig,
  isNetworkTransportError,
} from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  const rate = checkRateLimit(
    "learning-mutation",
    extractClientIdentifier(request.headers)
  );
  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, message: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }

  if (!getSupabasePublicConfig()) {
    return NextResponse.json(
      { ok: false, message: "Supabase is not configured." },
      { status: 503 }
    );
  }

  let body: { notificationId?: string; markAll?: boolean };
  try {
    body = (await request.json()) as {
      notificationId?: string;
      markAll?: boolean;
    };
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid request payload." },
      { status: 400 }
    );
  }

  if (!body.markAll && (!body.notificationId || body.notificationId.length < 8)) {
    return NextResponse.json(
      { ok: false, message: "Specify notificationId or markAll." },
      { status: 400 }
    );
  }

  const supabase = await createServerSupabaseClient({ timeoutMs: 3000 });
  if (!supabase) {
    return NextResponse.json(
      { ok: false, message: "Supabase client unavailable." },
      { status: 503 }
    );
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError && isNetworkTransportError(authError)) {
      return NextResponse.json({ ok: true, delegateToBrowser: true });
    }
    if (authError || !authData.user) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const nowIso = new Date().toISOString();
    let query = supabase
      .from("student_notifications")
      .update({ is_read: true, read_at: nowIso })
      .eq("user_id", authData.user.id);

    if (!body.markAll && body.notificationId) {
      query = query.eq("id", body.notificationId);
    } else {
      query = query.eq("is_read", false);
    }

    const { error } = await query;
    if (error) {
      if (isNetworkTransportError(error)) {
        return NextResponse.json({ ok: true, delegateToBrowser: true });
      }
      return NextResponse.json(
        { ok: false, message: "Could not update notification status." },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isNetworkTransportError(err)) {
      return NextResponse.json({ ok: true, delegateToBrowser: true });
    }
    return NextResponse.json(
      { ok: false, message: "Unexpected error updating notifications." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const rate = checkRateLimit(
    "learning-mutation",
    extractClientIdentifier(request.headers)
  );
  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, message: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }

  if (!getSupabasePublicConfig()) {
    return NextResponse.json(
      { ok: false, message: "Supabase is not configured." },
      { status: 503 }
    );
  }

  let body: { notificationId?: string };
  try {
    body = (await request.json()) as { notificationId?: string };
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid request payload." },
      { status: 400 }
    );
  }

  if (!body.notificationId || body.notificationId.length < 8) {
    return NextResponse.json(
      { ok: false, message: "Valid notificationId is required." },
      { status: 400 }
    );
  }

  const supabase = await createServerSupabaseClient({ timeoutMs: 3000 });
  if (!supabase) {
    return NextResponse.json(
      { ok: false, message: "Supabase client unavailable." },
      { status: 503 }
    );
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError && isNetworkTransportError(authError)) {
      return NextResponse.json({ ok: true, delegateToBrowser: true });
    }
    if (authError || !authData.user) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const { error } = await supabase
      .from("student_notifications")
      .delete()
      .eq("id", body.notificationId)
      .eq("user_id", authData.user.id);

    if (error) {
      if (isNetworkTransportError(error)) {
        return NextResponse.json({ ok: true, delegateToBrowser: true });
      }
      return NextResponse.json(
        { ok: false, message: "Could not delete notification." },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isNetworkTransportError(err)) {
      return NextResponse.json({ ok: true, delegateToBrowser: true });
    }
    return NextResponse.json(
      { ok: false, message: "Unexpected error deleting notification." },
      { status: 500 }
    );
  }
}
