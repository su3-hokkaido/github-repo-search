import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderIntl } from "../test-utils";
import { RepoList } from "@/components/repo-list";
import type { RepoListItem } from "@/lib/github";

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
    description: "The library for web and native UIs.",
    language: "JavaScript",
    stars: 230000,
    htmlUrl: "https://github.com/facebook/react",
  },
];

describe("RepoList", () => {
  it("renders name, language, formatted stars, avatar, and a detail link", () => {
    renderIntl(<RepoList items={items} />);

    expect(screen.getByText("facebook/react")).toBeInTheDocument();
    expect(screen.getByText("JavaScript")).toBeInTheDocument();
    expect(screen.getByText(/230,000/)).toBeInTheDocument();
    expect(screen.getByAltText("facebook avatar")).toBeInTheDocument();

    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/repos/facebook/react",
    );
  });
});
