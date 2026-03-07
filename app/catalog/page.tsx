import { redirect } from "next/navigation";

export default function LegacyCatalogRoute() {
  redirect("/settings/catalog");
}
