import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/libs/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();

    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in" },
        { status: 401 }
      );
    }

    const { clientId } = await req.json();

    // Fetch client data
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, first_name, last_name, email, trainerize_id, trainer_id')
      .eq('id', clientId)
      .eq('trainer_id', user.id)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { 
          error: "Client not found",
          details: clientError?.message
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      client: {
        id: client.id,
        name: `${client.first_name} ${client.last_name}`,
        email: client.email,
        trainerize_id: client.trainerize_id,
        trainerize_id_type: typeof client.trainerize_id,
        has_trainerize_id: !!client.trainerize_id,
        trainerize_id_value: client.trainerize_id
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to check client", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 