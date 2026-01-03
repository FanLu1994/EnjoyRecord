import { getAllRecords } from "@/lib/db";
import HomeClient from "@/components/home-client";

export const dynamic = "force-dynamic";

export default function Home() {
  const records = getAllRecords();

  return <HomeClient records={records} />;
}
