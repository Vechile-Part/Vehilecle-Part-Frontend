import { redirect } from "next/navigation";

export default function AdminMembersRedirectPage() {
  redirect("/admin/customer-accounts");
}
