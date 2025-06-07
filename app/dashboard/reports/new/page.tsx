import { redirect } from 'next/navigation';

export default function NewReportPage({ 
  searchParams 
}: { 
  searchParams: { selectedClient?: string } 
}) {
  const selectedClient = searchParams.selectedClient;
  
  if (selectedClient) {
    redirect(`/dashboard/reports?selectedClient=${selectedClient}`);
  } else {
    redirect('/dashboard/reports');
  }
} 