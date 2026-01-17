import { createClient } from '@/libs/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { ClientNotesSchema, validateRequest } from '@/libs/validations';
import { handleApiError, requireAuth } from '@/libs/errorHandler';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body and validate
    const body = await req.json();
    const validation = validateRequest(ClientNotesSchema, body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error },
        { status: 400 }
      );
    }

    const { clientId, notes } = validation.data;

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
    return handleApiError(error, 'update client notes');
  }
}

