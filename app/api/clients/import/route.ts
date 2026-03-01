import { createClient } from '@/libs/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the clients to import from the request body
    const { clients } = await request.json();
    if (!Array.isArray(clients) || clients.length === 0) {
      return NextResponse.json({ error: 'No clients provided' }, { status: 400 });
    }

    // Prepare the clients data for insertion
    const clientsToInsert = clients.map(client => ({
      trainer_id: user.id,
      trainerize_id: Number(client.id),
      first_name: client.firstName,
      last_name: client.lastName,
      email: client.email || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      active: true
    }));

    // Insert the clients into the database
    const { data, error } = await supabase
      .from('clients')
      .upsert(clientsToInsert, {
        onConflict: 'trainer_id,trainerize_id',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('Error importing clients:', error);
      return NextResponse.json(
        { error: 'Failed to import clients: ' + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Clients imported successfully',
      data
    });
  } catch (error) {
    console.error('Error in import clients route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 