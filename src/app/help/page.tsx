export default function HelpPage() {
  return (
    <main className="form-page">
      <section className="form-card">
        <h1 className="form-title">Help Center</h1>
        <p className="form-subtitle">
          Use the sidebar to reach your role-specific tools. Customers can book services and track history;
          staff can search customers, run POS sales, and view reports; administrators manage inventory,
          vendors, staff, and financial dashboards.
        </p>
        <ul className="form-message" style={{ textAlign: "left", lineHeight: 1.6 }}>
          <li>Low-stock alerts appear under Admin → Stock &amp; credit alerts.</li>
          <li>Loyalty: purchases over NPR 5,000 receive at least a 10% discount on sales invoices.</li>
          <li>Contact your system administrator for account or email delivery issues.</li>
        </ul>
      </section>
    </main>
  );
}
