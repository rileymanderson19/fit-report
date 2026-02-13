import { NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";

export async function POST() {
  try {
    const supabase = createClient();

    // Calculate cutoff date (7 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);

    // List all files in temp-images bucket
    const { data: files, error: listError } = await supabase.storage
      .from('temp-images')
      .list('', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'asc' }
      });

    if (listError) {
      console.error('Error listing files:', listError);
      return NextResponse.json({ error: 'Failed to list files' }, { status: 500 });
    }

    // Filter files older than cutoff date
    const filesToDelete = files?.filter(file => {
      const fileDate = new Date(file.created_at);
      return fileDate < cutoffDate;
    }) || [];

    console.log(`Found ${filesToDelete.length} files to delete (older than ${cutoffDate.toISOString()})`);

    if (filesToDelete.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No files to clean up',
        deletedCount: 0
      });
    }

    // Delete old files
    const filenames = filesToDelete.map(file => file.name);
    const { error: deleteError } = await supabase.storage
      .from('temp-images')
      .remove(filenames);

    if (deleteError) {
      console.error('Error deleting files:', deleteError);
      return NextResponse.json({ error: 'Failed to delete files' }, { status: 500 });
    }

    console.log(`Successfully deleted ${filenames.length} old files`);

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${filenames.length} old files`,
      deletedCount: filenames.length,
      deletedFiles: filenames
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 