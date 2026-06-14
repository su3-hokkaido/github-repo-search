import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderIntl } from "../test-utils";
import { Pagination } from "@/components/pagination";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("Pagination", () => {
  it("renders nothing for a single page", () => {
    renderIntl(<Pagination query="react" currentPage={1} pageCount={1} />);
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("shows the first window with a last-page jump on page 1", () => {
    renderIntl(<Pagination query="react" currentPage={1} pageCount={10} />);
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Page 10" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Previous page" })).toBeNull();
    expect(screen.getByText("1")).toHaveAttribute("aria-current", "page");
  });

  it("centers the window and shows both jumps mid-range", () => {
    renderIntl(<Pagination query="react" currentPage={6} pageCount={10} />);
    expect(screen.getByRole("link", { name: "Page 1" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Page 10" })).toBeInTheDocument();
    expect(screen.getByText("6")).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Page 7" })).toHaveAttribute(
      "href",
      "/search?q=react&page=7",
    );
  });

  it("hides the next link on the last page", () => {
    renderIntl(<Pagination query="react" currentPage={10} pageCount={10} />);
    expect(screen.queryByRole("link", { name: "Next page" })).toBeNull();
    expect(screen.getByRole("link", { name: "Previous page" })).toHaveAttribute(
      "href",
      "/search?q=react&page=9",
    );
  });
});
