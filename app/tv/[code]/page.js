import TvView from '@/components/TvView';

export const metadata = { title: 'Avalon · Table view' };

export default async function TvPage({ params }) {
  const { code } = await params;
  return <TvView code={String(code).toUpperCase()} />;
}
