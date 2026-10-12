import TvView from '@/components/TvView';
import RoomThemeScript from '@/components/RoomThemeScript';

export const metadata = { title: 'Avalon · Table view' };

export default async function TvPage({ params }) {
  const { code } = await params;
  return (
    <>
      <RoomThemeScript code={code} />
      <TvView code={String(code).toUpperCase()} />
    </>
  );
}
