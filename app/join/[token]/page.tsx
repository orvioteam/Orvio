import { JoinPageClient } from "@/components/join-page";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <JoinPageClient token={token} />;
}
