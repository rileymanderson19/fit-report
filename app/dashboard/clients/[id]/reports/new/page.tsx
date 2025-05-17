import { redirect } from 'next/navigation';

export default function NewReportPage({ params }: { params: { id: string } }) {
  redirect(`/dashboard/clients?selectedClient=${params.id}&tab=reports`);
} 