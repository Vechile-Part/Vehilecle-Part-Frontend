export type ShellRole = "admin" | "staff" | "customer";

export type HelpLink = {
  href: string;
  title: string;
  description: string;
};

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  roles?: ShellRole[];
};

export const ROLE_LABELS: Record<ShellRole, string> = {
  admin: "Administrator",
  staff: "Staff",
  customer: "Customer",
};

export const ROLE_INTROS: Record<ShellRole, string> = {
  admin:
    "Manage inventory, vendors, staff, purchases, and financial reporting. Use the shortcuts below or the sidebar for daily work.",
  staff:
    "Serve customers at the counter: search accounts, run POS sales, manage appointments, and view customer reports.",
  customer:
    "Book service appointments, track purchase history, request parts, and leave reviews after completed visits.",
};

export const QUICK_LINKS: Record<ShellRole, HelpLink[]> = {
  staff: [
    { href: "/staff/dashboard", title: "Dashboard", description: "Today’s customer summary at a glance." },
    { href: "/pos", title: "Sales & POS", description: "Ring up parts and attach a customer to the sale." },
    { href: "/staff/customers", title: "Customers", description: "Search by name, phone, or vehicle number." },
    { href: "/staff/register", title: "Register customer", description: "Add a new customer and their vehicle." },
    { href: "/staff/appointments", title: "Appointments", description: "Confirm, complete, or cancel bookings." },
    { href: "/staff/invoices", title: "Sales invoices", description: "View invoices and email receipts." },
    { href: "/staff/reports", title: "Customer reports", description: "Regular, high-spender, and credit lists." },
    { href: "/staff/profile", title: "My profile", description: "Update your contact details and password." },
  ],
  admin: [
    { href: "/admin/dashboard", title: "Dashboard", description: "Sales, stock, and alerts for today (Nepal time)." },
    { href: "/admin/parts", title: "Parts & inventory", description: "Add, edit, and monitor stock levels." },
    { href: "/admin/purchase-invoices", title: "Purchase invoices", description: "Record stock received from vendors." },
    { href: "/admin/vendors", title: "Vendors", description: "Supplier contacts and purchase history." },
    { href: "/admin/staff", title: "Staff management", description: "Create and manage staff accounts." },
    { href: "/admin/customer-accounts", title: "Customers", description: "Browse and manage customer records." },
    { href: "/reporting", title: "Financial reporting", description: "Revenue, costs, and profit trends." },
    { href: "/admin/alerts", title: "Stock & credit alerts", description: "Low stock and overdue credit invoices." },
    { href: "/settings", title: "System settings", description: "Account overview and sign out." },
  ],
  customer: [
    { href: "/customer/dashboard", title: "Dashboard", description: "Overview of your account activity." },
    { href: "/customer/about", title: "Service center", description: "Learn about workshop services and the portal." },
    { href: "/customer/appointments", title: "Appointments", description: "Request a service date and time slot." },
    { href: "/customer/history", title: "Service history", description: "Past invoices and visits." },
    { href: "/customer/part-requests", title: "Part requests", description: "Ask for parts not in stock." },
    { href: "/customer/reviews", title: "Reviews", description: "Rate visits after staff marks them completed." },
    { href: "/customer/profile", title: "My profile", description: "Contact info, password, and vehicles." },
  ],
};

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "loyalty",
    question: "How does the loyalty discount work?",
    answer:
      "At POS, when the cart subtotal is over NPR 5,000, the system suggests at least a 10% discount. Staff can apply it to the discount field before completing the sale.",
  },
  {
    id: "appointments-staff",
    question: "How do I handle customer appointments?",
    answer:
      "Open Appointments in the sidebar. New bookings start as Pending. Confirm when the slot is accepted, mark Completed after the visit (customers can then leave a review), or set Cancelled / No-show when needed.",
    roles: ["staff", "admin"],
  },
  {
    id: "appointments-customer",
    question: "When can I book or review a service?",
    answer:
      "Book from Appointments by choosing a service, date, and time. After staff marks your visit Completed, you can submit a review from the Reviews page.",
    roles: ["customer"],
  },
  {
    id: "high-spender",
    question: "Who counts as a high spender in reports?",
    answer:
      "A customer appears in high spenders when they have at least one single purchase over NPR 5,000. Regular customers are those with three or more invoices.",
    roles: ["staff", "admin"],
  },
  {
    id: "low-stock",
    question: "Where do low-stock warnings appear?",
    answer:
      "Administrators see low-stock parts on the dashboard and under Stock & credit alerts. Reorder or create a purchase invoice when quantity is low.",
    roles: ["admin"],
  },
  {
    id: "invoice-email",
    question: "How do I email a sales invoice?",
    answer:
      "After each POS sale, the system tries to email the invoice automatically. You can also resend from Sales invoices. The customer must have a valid email on file. If sending fails, check SMTP settings with your administrator.",
    roles: ["staff", "admin"],
  },
  {
    id: "register-customer",
    question: "What happens when I register a new customer?",
    answer:
      "Staff registration creates the customer and their vehicle. If email is configured, the customer receives a link to set their portal password.",
    roles: ["staff"],
  },
  {
    id: "part-request",
    question: "How do part requests work?",
    answer:
      "Customers submit a request from Part requests. Administrators review and update status under Admin → Part requests.",
  },
  {
    id: "password",
    question: "How do I change my password?",
    answer:
      "Staff: open your profile from the person icon in the sidebar. Customers: use My profile. Administrators: contact another admin if you are locked out.",
  },
  {
    id: "support",
    question: "Who do I contact for account or email issues?",
    answer:
      "For login problems, missing emails, or access changes, contact your system administrator. They manage staff accounts and server email settings.",
  },
];

export function faqForRole(role: ShellRole, query: string): FaqItem[] {
  const q = query.trim().toLowerCase();
  return FAQ_ITEMS.filter((item) => {
    if (item.roles && !item.roles.includes(role)) return false;
    if (!q) return true;
    return item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q);
  });
}
