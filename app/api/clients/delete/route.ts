import { createClient } from '@/libs/supabase/server';
import { NextResponse } from 'next/server';

export async function DELETE(request: Request) {
  try {
    const supabase = createClient();

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get client ID from the URL
    const url = new URL(request.url);
    const clientId = url.searchParams.get('id');

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
    }

    // Verify the user owns this client
    const { data: client, error: fetchError } = await supabase
      .from('clients')
      .select('trainer_id')
      .eq('id', clientId)
      .single();

    if (fetchError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    if (client.trainer_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete the client (reports will be deleted automatically due to ON DELETE CASCADE)
    const { error: deleteError } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId)
      .eq('trainer_id', user.id); // Extra safety check

    if (deleteError) {
      console.error('Error deleting client:', deleteError);
      return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Client deleted successfully'
    });
  } catch (error) {
    console.error('Error in delete client route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 