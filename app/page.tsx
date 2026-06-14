import { redirect } from "next/navigation";

// The app is search-first; send the root straight to the search page.
export default function HomePage() {
  redirect("/search");
}
