import { createClient } from '@/libs/supabase/server';
import { NextResponse } from 'next/server';

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Delete all reports for the client
    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('client_id', clientId);

    if (error) {
      throw error;
    }

    return NextResponse.json(
      { message: 'All reports deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting reports:', error);
    return NextResponse.json(
      { error: 'Failed to delete reports' },
      { status: 500 }
    );
  }
} 