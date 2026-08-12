import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ProjectsList } from "./_components/projects-list";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const user = await currentUser();
  const firstName = user?.firstName ?? user?.emailAddresses[0]?.emailAddress ?? "there";

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Your projects</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back, {firstName}. Manage projects and ship JavaScript updates instantly.
        </p>
      </div>
      <ProjectsList />
    </div>
  );
}
