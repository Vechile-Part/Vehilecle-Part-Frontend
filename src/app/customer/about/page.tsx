"use client";

import Link from "next/link";

export default function CustomerAboutPage() {
  return (
    <main className="layout-main customer-portal-page customer-profile-page">
      <header className="customer-profile-header">
        <h1 className="customer-profile-title">Vehicle Service Center</h1>
        <p className="customer-profile-subtitle">
          PartTrack connects our workshop, parts counter, and your customer account in one place.
        </p>
      </header>

      <div className="customer-profile-sections">
        <section className="customer-profile-panel">
          <div className="customer-profile-panel-head">
            <h2>What we offer</h2>
            <p>Services available through your customer portal.</p>
          </div>
          <ul className="customer-about-list">
            <li>Book service appointments online — staff confirm your time slot.</li>
            <li>Order vehicle parts and track purchase history with invoices.</li>
            <li>Request parts that are not currently in stock.</li>
            <li>Leave reviews after completed service visits.</li>
            <li>Manage your profile, vehicles, and contact details.</li>
          </ul>
        </section>

        <section className="customer-profile-panel">
          <div className="customer-profile-panel-head">
            <h2>Visit & contact</h2>
            <p>Reach the workshop during business hours for urgent needs.</p>
          </div>
          <p className="customer-about-text">
            For billing questions, appointment changes, or part availability, sign in and use the menu, or speak
            with staff at the counter. Loyalty discounts apply on qualifying sales over NPR 5,000.
          </p>
          <div className="customer-profile-actions">
            <Link href="/customer/appointments" className="form-button">
              Book an appointment
            </Link>
            <Link href="/customer/dashboard" className="form-button secondary">
              Back to dashboard
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
