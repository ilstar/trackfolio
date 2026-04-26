// Sample data — a realistic month-ish of work
window.WorklogData = (() => {
  const PROJECTS = [
    { id: 'p1', name: 'Atlas Migration', color: 'oklch(0.62 0.14 250)' },
    { id: 'p2', name: 'Onboarding Redesign', color: 'oklch(0.65 0.14 30)' },
    { id: 'p3', name: 'Q2 Planning', color: 'oklch(0.62 0.14 145)' },
    { id: 'p4', name: 'Billing v3', color: 'oklch(0.6 0.14 310)' },
    { id: 'p5', name: 'Internal Tools', color: 'oklch(0.65 0.12 75)' },
  ];

  // Anchor: today is April 25, 2026 (Saturday)
  const TODAY = new Date(2026, 3, 25);
  const d = (offsetDays) => {
    const x = new Date(TODAY);
    x.setDate(x.getDate() + offsetDays);
    return x.toISOString().slice(0, 10);
  };

  const ENTRIES = [
    // This week
    { id: 'e1', date: d(-1), type: 'info', project: 'p1', text: 'Reviewed schema diff with infra team — landed on dual-write strategy.' },
    { id: 'e2', date: d(-1), type: 'milestone', project: 'p2', text: 'Onboarding v2 shipped to 100% of new signups.' },
    { id: 'e3', date: d(-2), type: 'issue', project: 'p4', text: 'Stripe webhook retries causing duplicate invoices in staging.' },
    { id: 'e4', date: d(-2), type: 'info', project: 'p1', text: 'Wrote ADR for cutover sequence.' },
    { id: 'e5', date: d(-3), type: 'info', project: null, text: 'Lunch w/ Priya — chatted about platform team scope.' },
    { id: 'e6', date: d(-3), type: 'info', project: 'p3', text: 'Drafted Q2 OKR doc, shared with leads.' },
    { id: 'e7', date: d(-4), type: 'issue', project: 'p1', text: 'Read replica lag spiked to 14s during nightly batch.' },
    { id: 'e8', date: d(-5), type: 'info', project: 'p2', text: 'Pair-debugged checklist animation w/ Sam.' },
    { id: 'e9', date: d(-6), type: 'info', project: 'p5', text: 'Set up new design tokens pipeline.' },
    { id: 'e10', date: d(-7), type: 'milestone', project: 'p1', text: 'Atlas dual-write enabled in prod for 5% traffic.' },

    // Last week
    { id: 'e11', date: d(-8), type: 'info', project: 'p3', text: 'Q2 planning offsite, day 2.' },
    { id: 'e12', date: d(-9), type: 'info', project: 'p3', text: 'Q2 planning offsite, day 1.' },
    { id: 'e13', date: d(-10), type: 'issue', project: 'p4', text: 'Tax service downstream returning 503 intermittently.' },
    { id: 'e14', date: d(-11), type: 'info', project: 'p2', text: 'A/B test results came in — variant B +12% completion.' },
    { id: 'e15', date: d(-12), type: 'info', project: null, text: 'Performance review self-eval submitted.' },
    { id: 'e16', date: d(-13), type: 'info', project: 'p1', text: 'Backfill script tested on staging snapshot.' },
    { id: 'e17', date: d(-14), type: 'milestone', project: 'p4', text: 'Billing v3 design approved by finance & legal.' },

    // Earlier this month
    { id: 'e18', date: d(-16), type: 'info', project: 'p5', text: 'Migrated CI runners to ARM — 2x speedup on lint.' },
    { id: 'e19', date: d(-17), type: 'info', project: 'p2', text: 'User testing session, 5 participants.' },
    { id: 'e20', date: d(-18), type: 'issue', project: 'p1', text: 'Discovered orphaned rows in legacy ledger table.' },
    { id: 'e21', date: d(-19), type: 'info', project: 'p1', text: 'Spec\'d ledger reconciliation job.' },
    { id: 'e22', date: d(-21), type: 'info', project: null, text: 'Took half-day off, walked the coast.' },
    { id: 'e23', date: d(-22), type: 'info', project: 'p3', text: 'Skip-level w/ Dana — focus areas for the half.' },
    { id: 'e24', date: d(-24), type: 'milestone', project: 'p5', text: 'Internal CLI hit 100 daily active engineers.' },
    { id: 'e25', date: d(-26), type: 'info', project: 'p2', text: 'Reviewed Figma flow w/ research team.' },
    { id: 'e26', date: d(-28), type: 'info', project: 'p4', text: 'Vendor call — Stripe Tax integration timeline.' },

    // Last month, sparser
    { id: 'e27', date: d(-32), type: 'milestone', project: 'p2', text: 'Onboarding redesign kickoff.' },
    { id: 'e28', date: d(-35), type: 'info', project: 'p1', text: 'Atlas project kickoff doc published.' },
    { id: 'e29', date: d(-40), type: 'issue', project: 'p4', text: 'Found regression in proration logic, blocked on data team.' },
    { id: 'e30', date: d(-45), type: 'info', project: 'p3', text: 'Started Q2 input gathering w/ team leads.' },
  ];

  return { PROJECTS, ENTRIES, TODAY };
})();
