import { getAllRecords } from "@/lib/db";
import HomeClient from "@/components/home-client";

export const dynamic = "force-dynamic";

export default async function Home() {
  const records = await getAllRecords();

  return <HomeClient records={records} />;
}
