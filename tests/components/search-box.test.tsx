import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderIntl } from "../test-utils";
import { SearchBox } from "@/components/search-box";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

beforeEach(() => push.mockClear());

describe("SearchBox", () => {
  it("navigates to /search with the query on submit", () => {
    renderIntl(<SearchBox />);
    fireEvent.change(screen.getByRole("textbox", { name: /search repositories/i }), {
      target: { value: "react" },
    });
    fireEvent.click(screen.getByRole("button", { name: /search/i }));
    expect(push).toHaveBeenCalledWith("/search?q=react&page=1");
  });

  it("does not navigate on an empty query", () => {
    renderIntl(<SearchBox />);
    fireEvent.click(screen.getByRole("button", { name: /search/i }));
    expect(push).not.toHaveBeenCalled();
  });

  it("pre-fills the input from initialQuery", () => {
    renderIntl(<SearchBox initialQuery="vue" />);
    expect(screen.getByRole("textbox")).toHaveValue("vue");
  });
});
