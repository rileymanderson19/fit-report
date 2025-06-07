import { redirect } from 'next/navigation';

export default function NewReportPage({ params }: { params: { id: string } }) {
  redirect(`/dashboard/reports?selectedClient=${params.id}`);
} 