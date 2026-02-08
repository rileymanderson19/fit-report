import { createClient } from "@/libs/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("report_configurations")
    .select(
      "logo_url, business_name, primary_color, accent_color, footer_text, show_fitreport_badge"
    )
    .eq("trainer_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json(
      { error: "Failed to load brand settings" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    brand: data || {
      logo_url: null,
      business_name: null,
      primary_color: "#8B5CF6",
      accent_color: "#7C3AED",
      footer_text: null,
      show_fitreport_badge: true,
    },
  });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { business_name, primary_color, accent_color, footer_text, show_fitreport_badge } = body;

  // Validate hex colors
  const hexRegex = /^#[0-9A-Fa-f]{6}$/;
  if (primary_color && !hexRegex.test(primary_color)) {
    return NextResponse.json({ error: "Invalid primary color format" }, { status: 400 });
  }
  if (accent_color && !hexRegex.test(accent_color)) {
    return NextResponse.json({ error: "Invalid accent color format" }, { status: 400 });
  }

  const brandData = {
    business_name: business_name || null,
    primary_color: primary_color || "#8B5CF6",
    accent_color: accent_color || "#7C3AED",
    footer_text: footer_text || null,
    show_fitreport_badge: show_fitreport_badge ?? true,
    updated_at: new Date().toISOString(),
  };

  // Check if config exists
  const { data: existing } = await supabase
    .from("report_configurations")
    .select("id")
    .eq("trainer_id", user.id)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("report_configurations")
      .update(brandData)
      .eq("trainer_id", user.id);

    if (error) {
      console.error("Brand settings update error:", error);
      return NextResponse.json({ error: "Failed to save brand settings" }, { status: 500 });
    }
  } else {
    const { error } = await supabase
      .from("report_configurations")
      .insert([{ trainer_id: user.id, ...brandData }]);

    if (error) {
      console.error("Brand settings insert error:", error);
      return NextResponse.json({ error: "Failed to save brand settings" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
