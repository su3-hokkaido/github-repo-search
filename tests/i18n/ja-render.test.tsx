import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { Pagination } from "@/components/pagination";
import { RepoList } from "@/components/repo-list";
import type { RepoListItem } from "@/lib/github";
import { renderIntl } from "../test-utils";
import ja from "@/messages/ja.json";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const items: RepoListItem[] = [
  {
    id: 1,
    name: "react",
    fullName: "facebook/react",
    owner: { login: "facebook", avatarUrl: "https://avatars.example/fb.png" },
    description: "UI",
    language: "JavaScript",
    stars: 230000,
    htmlUrl: "https://github.com/facebook/react",
  },
];

describe("Japanese locale", () => {
  it("renders pagination labels in Japanese", () => {
    renderIntl(<Pagination query="react" currentPage={1} pageCount={10} />, {
      locale: "ja",
      messages: ja,
    });
    expect(screen.getByRole("navigation", { name: "ページ送り" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "10 ページ目" })).toBeInTheDocument();
  });

  it("renders the localized, number-formatted stars label", () => {
    renderIntl(<RepoList items={items} />, { locale: "ja", messages: ja });
    expect(screen.getByLabelText("スター 230,000 件")).toBeInTheDocument();
  });
});
