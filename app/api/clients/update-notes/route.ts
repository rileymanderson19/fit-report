import { createClient } from '@/libs/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const { clientId, notes } = await req.json();

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      );
    }

    // Verify the client belongs to the user
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, trainer_id')
      .eq('id', clientId)
      .eq('trainer_id', user.id)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { error: 'Client not found or access denied' },
        { status: 404 }
      );
    }

    // Update the notes
    const { error: updateError } = await supabase
      .from('clients')
      .update({ notes: notes || null })
      .eq('id', clientId)
      .eq('trainer_id', user.id);

    if (updateError) {
      console.error('Error updating client notes:', updateError);
      return NextResponse.json(
        { error: 'Failed to update notes', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Notes updated successfully'
    });
  } catch (error) {
    console.error('Error in update-notes route:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

