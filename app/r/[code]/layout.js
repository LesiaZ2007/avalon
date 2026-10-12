import RoomThemeScript from '@/components/RoomThemeScript';

/** Every room page opens in the room's own look (see RoomThemeScript). */
export default async function RoomLayout({ children, params }) {
  const { code } = await params;
  return (
    <>
      <RoomThemeScript code={code} />
      {children}
    </>
  );
}
