import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ProjectDetailView } from "./_components/project-detail-view";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const { id } = await params;
  return <ProjectDetailView projectId={id} />;
}
