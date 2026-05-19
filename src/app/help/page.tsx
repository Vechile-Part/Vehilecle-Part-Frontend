"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuth } from "@/Components/auth/AuthContext";
import {
  FAQ_ITEMS,
  QUICK_LINKS,
  ROLE_INTROS,
  ROLE_LABELS,
  faqForRole,
  type ShellRole,
} from "./helpContent";

const TIPS: Record<ShellRole, string[]> = {
  staff: [
    "Use the sidebar search to jump to parts inventory while on POS.",
    "Confirm appointments before the visit; mark Completed so customers can review.",
    "Attach a customer on POS before checkout for invoice history and email receipts.",
  ],
  admin: [
    "Dashboard totals use Nepal (Kathmandu) calendar for “today”.",
    "Review Stock & credit alerts regularly to avoid stock-outs and overdue credits.",
    "Purchase invoices increase part quantity when stock arrives from vendors.",
  ],
  customer: [
    "Keep your profile phone and email up to date for invoice emails and reminders.",
    "Reviews are only available after staff marks your appointment Completed.",
    "Submit part requests if you need an item that is not listed online.",
  ],
};

function resolveRole(role: string | undefined): ShellRole {
  if (role === "admin" || role === "staff" || role === "customer") return role;
  return "staff";
}

export default function HelpPage() {
  const { user, loading } = useAuth();
  const role = resolveRole(user?.role);
  const [search, setSearch] = useState("");
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  const links = QUICK_LINKS[role];
  const faqs = useMemo(() => faqForRole(role, search), [role, search]);
  const tips = TIPS[role];

  const toggleFaq = (id: string) => {
    setOpenFaqId((current) => (current === id ? null : id));
  };

  if (loading) {
    return (
      <main className="layout-main help-center-page">
        <p className="help-center-lead">Loading help…</p>
      </main>
    );
  }

  return (
    <main className="layout-main help-center-page">
      <header className="help-center-header">
        <p className="help-center-eyebrow">{ROLE_LABELS[role]} guide</p>
        <h1 className="help-center-title">Help Center</h1>
        <p className="help-center-lead">{ROLE_INTROS[role]}</p>
      </header>

      <div className="help-center-search-wrap">
        <label className="visually-hidden" htmlFor="help-search">
          Search help topics
        </label>
        <input
          id="help-search"
          type="search"
          className="help-center-search"
          placeholder="Search questions… e.g. loyalty, appointments, password"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoComplete="off"
        />
      </div>

      <section className="help-center-section" aria-labelledby="help-quick-heading">
        <div className="help-center-section-head">
          <h2 id="help-quick-heading">Quick links</h2>
          <p>Jump to the tools you use most.</p>
        </div>
        <div className="help-center-links">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="help-center-link-card">
              <strong>{link.title}</strong>
              <span>{link.description}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="help-center-section" aria-labelledby="help-tips-heading">
        <div className="help-center-section-head">
          <h2 id="help-tips-heading">Tips</h2>
          <p>Short reminders for your role.</p>
        </div>
        <div className="help-center-tips">
          {tips.map((tip, index) => (
            <div key={tip} className="help-center-tip">
              <span className="help-center-tip-mark" aria-hidden>
                {index + 1}
              </span>
              <p>{tip}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="help-center-section" aria-labelledby="help-faq-heading">
        <div className="help-center-section-head">
          <h2 id="help-faq-heading">Frequently asked questions</h2>
          <p>Tap a question to see the answer.</p>
        </div>
        {faqs.length === 0 ? (
          <p className="help-center-empty">No topics match your search. Try loyalty, invoice, or password.</p>
        ) : (
          <div className="help-center-faq-list">
            {faqs.map((item) => {
              const isOpen = openFaqId === item.id;
              return (
                <article key={item.id} className={`help-center-faq-item${isOpen ? " is-open" : ""}`}>
                  <button
                    type="button"
                    className="help-center-faq-trigger"
                    aria-expanded={isOpen}
                    onClick={() => toggleFaq(item.id)}
                  >
                    {item.question}
                    <span className="help-center-faq-chevron" aria-hidden>
                      +
                    </span>
                  </button>
                  {isOpen ? <p className="help-center-faq-answer">{item.answer}</p> : null}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <footer className="help-center-footer-card">
        <p>
          Still need help? Contact your system administrator for account access, email delivery, or training.{" "}
          <Link href="/logout">Sign out</Link> from here if you are on a shared device.
        </p>
      </footer>
    </main>
  );
}
