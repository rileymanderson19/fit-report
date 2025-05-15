import ClientReportsClient from './ClientReportsClient';

export default function ClientReportsPage({ params }: { params: { id: string } }) {
  return <ClientReportsClient clientId={params.id} />;
} 