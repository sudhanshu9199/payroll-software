// app/page.js
import { redirect } from "next/navigation";

export default function Home() {
  // The middleware handles authenticated and unauthenticated redirects,
  // but as a fallback, we redirect the user to the login page.
  redirect("/login");
}
