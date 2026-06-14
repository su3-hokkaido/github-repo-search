import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RepoDetailView } from "@/components/repo-detail-view";

type PageParams = { params: Promise<{ owner: string; repo: string }> };

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { owner, repo } = await params;
  const t = await getTranslations("Common");
  return { title: `${owner}/${repo} · ${t("appTitle")}` };
}

export default async function RepoPage({ params }: PageParams) {
  const { owner, repo } = await params;
  return <RepoDetailView owner={owner} repo={repo} />;
}
