import { createClient } from "@/libs/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export async function POST(req: NextRequest) {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("logo") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Allowed: PNG, JPEG, WebP" },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 2MB" },
      { status: 400 }
    );
  }

  // Delete old logo if exists
  const { data: existing } = await supabase
    .from("report_configurations")
    .select("logo_url")
    .eq("trainer_id", user.id)
    .single();

  if (existing?.logo_url) {
    const oldPath = existing.logo_url.split("/temp-images/").pop();
    if (oldPath) {
      await supabase.storage.from("temp-images").remove([oldPath]);
    }
  }

  // Upload new logo
  const ext = file.name.split(".").pop() || "png";
  const filename = `brand-logo-${user.id}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("temp-images")
    .upload(filename, buffer, {
      contentType: file.type,
      cacheControl: "31536000", // 1 year cache
      upsert: false,
    });

  if (uploadError) {
    console.error("Logo upload error:", uploadError);
    return NextResponse.json(
      { error: `Failed to upload logo: ${uploadError.message}` },
      { status: 500 }
    );
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("temp-images")
    .getPublicUrl(filename);

  const logoUrl = urlData.publicUrl;

  // Update report_configurations with new logo URL
  const { data: configExists } = await supabase
    .from("report_configurations")
    .select("id")
    .eq("trainer_id", user.id)
    .single();

  if (configExists) {
    await supabase
      .from("report_configurations")
      .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
      .eq("trainer_id", user.id);
  } else {
    await supabase
      .from("report_configurations")
      .insert([{ trainer_id: user.id, logo_url: logoUrl }]);
  }

  return NextResponse.json({ logo_url: logoUrl });
}

export async function DELETE() {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get current logo URL
  const { data: config } = await supabase
    .from("report_configurations")
    .select("logo_url")
    .eq("trainer_id", user.id)
    .single();

  if (config?.logo_url) {
    const path = config.logo_url.split("/temp-images/").pop();
    if (path) {
      await supabase.storage.from("temp-images").remove([path]);
    }
  }

  // Clear logo_url
  await supabase
    .from("report_configurations")
    .update({ logo_url: null, updated_at: new Date().toISOString() })
    .eq("trainer_id", user.id);

  return NextResponse.json({ success: true });
}
