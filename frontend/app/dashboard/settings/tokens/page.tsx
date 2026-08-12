import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { TokensPage } from "./_components/tokens-page";

export default async function Page() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return <TokensPage />;
}
