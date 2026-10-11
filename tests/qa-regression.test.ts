/**
 * QA regression suite for the Campus Ambassador Project Management System.
 *
 * Runs against a live server with authentication ENABLED (DISABLE_AUTH=false), e.g.:
 *
 *   NEXT_DIST_DIR=.next-qa DISABLE_AUTH=false NEXT_PUBLIC_DISABLE_AUTH=false npx next dev -p 3100
 *   curl -X POST localhost:3100/api/seed
 *   BASE_URL=http://localhost:3100 npx tsx tests/qa-regression.test.ts
 *
 * Every check records pass/fail and the suite keeps going, so one run reports every defect.
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3100";

let passed = 0;
const failures: string[] = [];
let currentGroup = "";

function group(name: string) {
  currentGroup = name;
  console.log(`\n▶ ${name}`);
}

function check(name: string, condition: boolean, detail?: unknown) {
  if (condition) {
    passed++;
    console.log(`   ✅ ${name}`);
  } else {
    const msg = `[${currentGroup}] ${name}${detail !== undefined ? ` — got: ${JSON.stringify(detail)}` : ""}`;
    failures.push(msg);
    console.log(`   ❌ ${name}${detail !== undefined ? ` — got: ${JSON.stringify(detail)}` : ""}`);
  }
}

type Res = { status: number; json: any; text: string; setCookie: string };

async function api(cookie: string, method: string, path: string, body?: unknown): Promise<Res> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-JSON (csv etc.) */
  }
  return { status: res.status, json, text, setCookie: res.headers.get("set-cookie") || "" };
}

const cookieOf = (r: Res) => r.setCookie.split(";")[0];

async function login(email: string, password: string, portal: "ADMIN" | "STUDENT") {
  const r = await api("", "POST", "/api/auth/login", { email, password, portal });
  return { r, cookie: cookieOf(r) };
}

const day = (n: number) => new Date(Date.now() + n * 86400000).toISOString().split("T")[0];
const uniq = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

async function createStudent(adminCookie: string, tag: string) {
  const email = `qa.${tag}.${uniq()}@testcollege.edu`;
  const r = await api(adminCookie, "POST", "/api/admin/students", {
    name: `QA ${tag}`,
    email,
    phone: "+91 90000 00000",
    collegeName: "QA Institute",
    course: "B.Tech",
    branch: "CSE",
    semester: "6th",
    temporaryPassword: "Temp@12345",
  });
  return { email, id: r.json?.student?.id as string, res: r };
}

const projectBody = (over: Record<string, unknown> = {}) => ({
  projectName: "QA Capstone Project",
  clientName: "QA Client",
  clientEmail: "client@qa.edu",
  clientPhone: "+91 99999 00000",
  collegeName: "QA Institute",
  department: "CSE",
  projectType: "Web Application",
  description: "End to end QA project description.",
  expectedBudget: 50000,
  ...over,
});

async function main() {
  console.log(`QA regression suite → ${BASE_URL}`);

  // ───────────────────────────── Fixtures ─────────────────────────────
  const adminLogin = await login("admin@example.com", "Admin@12345", "ADMIN");
  const admin = adminLogin.cookie;
  if (adminLogin.r.status !== 200) throw new Error("Cannot log in as seeded admin; is the DB seeded?");

  const s1 = await createStudent(admin, "alpha");
  const s2 = await createStudent(admin, "beta");
  const s1First = await login(s1.email, "Temp@12345", "STUDENT");
  const s2First = await login(s2.email, "Temp@12345", "STUDENT");
  // forced first-login password change
  const s1Change = await api(s1First.cookie, "POST", "/api/auth/change-password", {
    newPassword: "Alpha@2026pass",
    confirmPassword: "Alpha@2026pass",
  });
  const s2Change = await api(s2First.cookie, "POST", "/api/auth/change-password", {
    newPassword: "Beta@2026pass",
    confirmPassword: "Beta@2026pass",
  });
  const stu1 = cookieOf(s1Change);
  const stu2 = cookieOf(s2Change);

  // ───────────────────────────── Authentication ─────────────────────────────
  group("Authentication & sessions");
  {
    const bad = await login("admin@example.com", "wrong-password", "ADMIN");
    check("wrong password → 401", bad.r.status === 401, bad.r.status);
    const unknown = await login("nobody@nowhere.edu", "Whatever@1", "STUDENT");
    check("unknown user → 401 (same as wrong password)", unknown.r.status === 401, unknown.r.status);
    check("no user-enumeration difference", bad.r.json?.error === unknown.r.json?.error);
    const wrongPortal = await login("admin@example.com", "Admin@12345", "STUDENT");
    check("admin on student portal → 403", wrongPortal.r.status === 403, wrongPortal.r.status);
    const missing = await api("", "POST", "/api/auth/login", { email: "x@y.z" });
    check("missing password → 400", missing.status === 400, missing.status);
    const upper = await login(s1.email.toUpperCase(), "Alpha@2026pass", "STUDENT");
    check("email is case-insensitive at login", upper.r.status === 200, upper.r.status);

    check("first-login flag was true", s1First.r.json?.user?.mustChangePassword === true);
    check("password change succeeded", s1Change.status === 200 && !!stu1, s1Change.status);

    const noAuth = await api("", "GET", "/api/projects");
    check("unauthenticated GET /api/projects → 401", noAuth.status === 401, noAuth.status);
    const noAuthSettings = await api("", "GET", "/api/admin/settings");
    check("unauthenticated GET /api/admin/settings → 401", noAuthSettings.status === 401, noAuthSettings.status);
    const me = await api(stu1, "GET", "/api/auth/me");
    check("GET /api/auth/me returns student", me.status === 200 && me.json?.user?.role === "STUDENT", me.status);
    check("me never leaks passwordHash", !JSON.stringify(me.json).includes("passwordHash"));

    // Change password hardening
    const weak = await api(stu1, "POST", "/api/auth/change-password", {
      currentPassword: "Alpha@2026pass",
      newPassword: "weak",
      confirmPassword: "weak",
    });
    check("weak password rejected (400)", weak.status === 400, weak.status);
    const mismatch = await api(stu1, "POST", "/api/auth/change-password", {
      currentPassword: "Alpha@2026pass",
      newPassword: "Another@2026pw",
      confirmPassword: "Different@2026pw",
    });
    check("mismatched confirmation rejected (400)", mismatch.status === 400, mismatch.status);
    const noCurrent = await api(stu1, "POST", "/api/auth/change-password", {
      newPassword: "Another@2026pw",
      confirmPassword: "Another@2026pw",
    });
    check("voluntary change without current password rejected (400)", noCurrent.status === 400, noCurrent.status);
    const wrongCurrent = await api(stu1, "POST", "/api/auth/change-password", {
      currentPassword: "NotMyPassword@1",
      newPassword: "Another@2026pw",
      confirmPassword: "Another@2026pw",
    });
    check("voluntary change with wrong current password rejected (400)", wrongCurrent.status === 400, wrongCurrent.status);
    const goodChange = await api(stu1, "POST", "/api/auth/change-password", {
      currentPassword: "Alpha@2026pass",
      newPassword: "Alpha@2026pass2",
      confirmPassword: "Alpha@2026pass2",
    });
    check("voluntary change with correct current password → 200", goodChange.status === 200, goodChange.status);
    const relog = await login(s1.email, "Alpha@2026pass2", "STUDENT");
    check("can log in with the new password", relog.r.status === 200, relog.r.status);
  }
  // refresh S1 cookie (password changed again)
  const stu1b = (await login(s1.email, "Alpha@2026pass2", "STUDENT")).cookie;

  // ───────────────────────────── Forgot / reset password ─────────────────────────────
  group("Forgot / reset password");
  {
    const known = await api("", "POST", "/api/auth/forgot-password", { email: s1.email });
    const unknown = await api("", "POST", "/api/auth/forgot-password", { email: "ghost@nowhere.edu" });
    check("forgot-password responds 200 for known email", known.status === 200, known.status);
    check("forgot-password responds identically for unknown email", unknown.status === 200 && known.json?.message === unknown.json?.message);
    check("response never contains a reset token", !/token/i.test(JSON.stringify(known.json).replace(/token expired/i, "")), known.json);
    const bogus = await api("", "POST", "/api/auth/reset-password", {
      token: "not-a-real-token",
      newPassword: "Reset@2026pass",
      confirmPassword: "Reset@2026pass",
    });
    check("reset-password with invalid token → 400", bogus.status === 400, bogus.status);
    const noEmail = await api("", "POST", "/api/auth/forgot-password", {});
    check("forgot-password without email → 400", noEmail.status === 400, noEmail.status);
  }

  // ───────────────────────────── RBAC ─────────────────────────────
  group("Role-based access control");
  {
    for (const [m, p] of [
      ["GET", "/api/admin/students"],
      ["GET", "/api/admin/analytics"],
      ["GET", "/api/admin/export?type=projects"],
      ["GET", "/api/activity-logs"],
      ["PATCH", "/api/admin/settings"],
    ] as const) {
      const r = await api(stu1b, m, p, m === "PATCH" ? { companyName: "Hacked" } : undefined);
      check(`student blocked from ${m} ${p} (403)`, r.status === 403, r.status);
    }
    const adminOnStudentQuotationAction = await api(admin, "POST", "/api/quotations/000000000000000000000000/accept");
    check("admin cannot accept quotations (403)", adminOnStudentQuotationAction.status === 403, adminOnStudentQuotationAction.status);
    const stuPay = await api(stu1b, "POST", "/api/payments", { projectId: "x", amount: 1 });
    check("student cannot record payments (403)", stuPay.status === 403, stuPay.status);
    const stuQuot = await api(stu1b, "POST", "/api/quotations", { projectId: "x", items: [{ description: "a", quantity: 1, unitPrice: 1 }] });
    check("student cannot create quotations (403)", stuQuot.status === 403, stuQuot.status);
  }

  // ───────────────────────────── Project submission & validation ─────────────────────────────
  group("Project submission & validation");
  let p1: any;
  {
    const ok = await api(stu1b, "POST", "/api/projects", projectBody());
    p1 = ok.json?.project;
    check("valid project submitted → 200, SUBMITTED", ok.status === 200 && p1?.status === "SUBMITTED", ok.status);
    check("project id format PRJ-YYYY-NNNNN", /^PRJ-\d{4}-\d{5}$/.test(p1?.projectId || ""), p1?.projectId);
    check("project is owned by submitting student", p1?.studentId === s1.id, p1?.studentId);

    const spoof = await api(stu1b, "POST", "/api/projects", projectBody({ studentId: s2.id, projectName: "Spoof attempt" }));
    check("student cannot submit on behalf of another student", spoof.json?.project?.studentId === s1.id, spoof.json?.project?.studentId);

    const badType = await api(stu1b, "POST", "/api/projects", projectBody({ projectType: "Time Machine" }));
    check("invalid project type → 400", badType.status === 400, badType.status);
    const negBudget = await api(stu1b, "POST", "/api/projects", projectBody({ expectedBudget: -500 }));
    check("negative budget → 400", negBudget.status === 400, negBudget.status);
    const nanBudget = await api(stu1b, "POST", "/api/projects", projectBody({ expectedBudget: "lots" }));
    check("non-numeric budget → 400", nanBudget.status === 400, nanBudget.status);
    const badEmail = await api(stu1b, "POST", "/api/projects", projectBody({ clientEmail: "not-an-email" }));
    check("invalid client email → 400", badEmail.status === 400, badEmail.status);
    const blank = await api(stu1b, "POST", "/api/projects", projectBody({ projectName: "   " }));
    check("whitespace-only project name → 400", blank.status === 400, blank.status);
    const missing = await api(stu1b, "POST", "/api/projects", { projectName: "x" });
    check("missing mandatory fields → 400", missing.status === 400, missing.status);

    const bad = await api(admin, "POST", "/api/projects", projectBody({ studentId: "not-an-objectid" }));
    check("admin: malformed studentId → 4xx (not 500)", bad.status >= 400 && bad.status < 500, bad.status);

    // ── Field validation (shared rules) ──
    const submitBad = async (over: Record<string, unknown>) => api(stu1b, "POST", "/api/projects", projectBody(over));
    check("invalid client phone → 400", (await submitBad({ clientPhone: "abc123" })).status === 400);
    check("too-short client phone → 400", (await submitBad({ clientPhone: "12345" })).status === 400);
    check("client name with digits/symbols → 400", (await submitBad({ clientName: "R2D2 <script>" })).status === 400);
    check("project title shorter than 3 chars → 400", (await submitBad({ projectName: "ab" })).status === 400);
    check("description shorter than 20 chars → 400", (await submitBad({ description: "too short" })).status === 400);
    check("non-http reference link → 400", (await submitBad({ referenceLinks: "javascript:alert(1)" })).status === 400);
    check("more than 5 reference links → 400", (await submitBad({ referenceLinks: "https://a.io https://b.io https://c.io https://d.io https://e.io https://f.io" })).status === 400);
    check("overlong requirements text → 400", (await submitBad({ functionalRequirements: "x".repeat(3001) })).status === 400);
    const noBudget: Record<string, unknown> = projectBody();
    delete noBudget.expectedBudget;
    const nb = await api(stu1b, "POST", "/api/projects", noBudget);
    check("budget is no longer required (submits without it)", nb.status === 200 && nb.json?.project?.expectedBudget === 0, [nb.status, nb.json?.error]);
    const goodPhone = await submitBad({ clientPhone: "+91 (98765) 43210", referenceLinks: "https://github.com/a/b, https://drive.google.com/x" });
    check("formatted phone and valid links accepted", goodPhone.status === 200, [goodPhone.status, goodPhone.json?.error]);

    // ── PDF upload (multipart) ──
    const send = (fields: Record<string, string>, file?: { name: string; type: string; bytes: Uint8Array }, cookie = stu1b) => {
      const fd = new FormData();
      Object.entries({ ...projectBody(), ...fields }).forEach(([k, v]) => fd.append(k, String(v)));
      if (file) fd.append("document", new Blob([file.bytes as any], { type: file.type }), file.name);
      return fetch(`${BASE_URL}/api/projects`, { method: "POST", headers: { Cookie: cookie }, body: fd }).then(async (r) => ({
        status: r.status,
        json: await r.json().catch(() => null),
      }));
    };
    const pdfBytes = new TextEncoder().encode("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF");
    const withPdf = await send({ projectName: "Project with PDF" }, { name: "synopsis.pdf", type: "application/pdf", bytes: pdfBytes });
    check("project + PDF uploads (200)", withPdf.status === 200, [withPdf.status, withPdf.json?.error]);
    const pid = withPdf.json?.project?._id;
    const detail = await api(stu1b, "GET", `/api/projects/${pid}`);
    const doc = detail.json?.documents?.[0];
    check("document is listed on the project (no raw bytes leaked)", doc?.fileName === "synopsis.pdf" && doc?.fileType === "application/pdf" && !doc?.data, doc);
    const dl = await fetch(`${BASE_URL}${doc?.fileUrl}`, { headers: { Cookie: stu1b } });
    const dlBytes = new Uint8Array(await dl.arrayBuffer());
    check("owner can download the PDF intact", dl.status === 200 && dl.headers.get("content-type") === "application/pdf" && dlBytes.length === pdfBytes.length, [dl.status, dlBytes.length]);
    const adm = await fetch(`${BASE_URL}${doc?.fileUrl}`, { headers: { Cookie: admin } });
    check("admin can open the PDF", adm.status === 200, adm.status);
    const oth = await fetch(`${BASE_URL}${doc?.fileUrl}`, { headers: { Cookie: stu2 } });
    check("another student cannot open the PDF (403)", oth.status === 403, oth.status);
    const anon = await fetch(`${BASE_URL}${doc?.fileUrl}`);
    check("anonymous cannot open the PDF (401)", anon.status === 401, anon.status);
    const badId = await api(admin, "GET", "/api/documents/zzz");
    check("malformed document id → 404", badId.status === 404, badId.status);

    const notPdf = await send({ projectName: "Wrong type" }, { name: "notes.txt", type: "text/plain", bytes: new TextEncoder().encode("hello") });
    check("non-PDF file rejected (400)", notPdf.status === 400, notPdf.status);
    const fake = await send({ projectName: "Fake pdf" }, { name: "evil.pdf", type: "application/pdf", bytes: new TextEncoder().encode("<html>not a pdf</html>") });
    check("file named .pdf but not a real PDF rejected (400)", fake.status === 400, fake.status);
    const big = new Uint8Array(5 * 1024 * 1024 + 10);
    big.set(new TextEncoder().encode("%PDF-1.4"));
    const huge = await send({ projectName: "Huge pdf" }, { name: "big.pdf", type: "application/pdf", bytes: big });
    check("PDF over 5 MB rejected (400)", huge.status === 400, huge.status);
    const invalidWithFile = await send({ clientEmail: "nope" }, { name: "a.pdf", type: "application/pdf", bytes: pdfBytes });
    check("field errors still reported when a file is attached", invalidWithFile.status === 400 && !!invalidWithFile.json?.fieldErrors?.clientEmail, invalidWithFile.json);
    const afterList = await api(stu1b, "GET", "/api/projects?search=Wrong%20type");
    check("rejected submissions create no project", afterList.json?.projects?.length === 0, afterList.json?.projects?.length);
  }

  // ───────────────────────────── Listing / pagination / search ─────────────────────────────
  group("Listing, pagination & search robustness");
  {
    for (const q of ["limit=-5", "limit=0", "page=abc", "page=-3", "limit=abc", "limit=999999"]) {
      const r = await api(admin, "GET", `/api/projects?${q}`);
      check(`GET /api/projects?${q} → 200 with sane pagination`, r.status === 200 && r.json?.pagination?.limit >= 1 && r.json?.pagination?.limit <= 200 && r.json?.pagination?.page >= 1, [r.status, r.json?.pagination]);
    }
    const regex = await api(admin, "GET", "/api/projects?search=" + encodeURIComponent("(unclosed["));
    check("regex metacharacters in search don't cause 500", regex.status === 200, regex.status);
    const own = await api(stu1b, "GET", "/api/projects?limit=200");
    check("student only sees own projects", own.json?.projects?.every((p: any) => (p.studentId?._id || p.studentId) === s1.id), own.status);
    const multi = await api(admin, "GET", "/api/projects?status=SUBMITTED,UNDER_REVIEW");
    check("status filter accepts comma-separated list", multi.status === 200 && multi.json?.projects?.every((p: any) => ["SUBMITTED", "UNDER_REVIEW"].includes(p.status)), multi.status);
    const logs = await api(admin, "GET", "/api/activity-logs?limit=abc");
    check("activity-logs?limit=abc → 200", logs.status === 200, logs.status);
    const students = await api(admin, "GET", "/api/admin/students?limit=-1&page=0");
    check("admin students list tolerates bad pagination", students.status === 200 && students.json?.pagination?.page >= 1, students.status);
  }

  // ───────────────────────────── Ownership / isolation ─────────────────────────────
  group("Data isolation between students");
  {
    const other = await api(stu2, "GET", `/api/projects/${p1._id}`);
    check("student 2 cannot read student 1's project (403)", other.status === 403, other.status);
    const byCode = await api(stu2, "GET", `/api/projects/${p1.projectId}`);
    check("…nor via the PRJ- code (403)", byCode.status === 403, byCode.status);
    const list = await api(stu2, "GET", "/api/projects?limit=200");
    check("student 2 list excludes student 1's project", !list.json?.projects?.some((p: any) => p._id === p1._id));
    const patch = await api(stu1b, "PATCH", `/api/projects/${p1._id}`, { status: "COMPLETED" });
    check("student cannot change project status (403)", patch.status === 403, patch.status);
    const missing = await api(admin, "GET", "/api/projects/000000000000000000000000");
    check("unknown project id → 404", missing.status === 404, missing.status);
    const garbage = await api(admin, "GET", "/api/projects/%24%7Bgarbage%7D");
    check("garbage project id → 404 (not 500)", garbage.status === 404, garbage.status);
  }

  // ───────────────────────────── Admin project updates ─────────────────────────────
  group("Admin project updates");
  {
    const badStatus = await api(admin, "PATCH", `/api/projects/${p1._id}`, { status: "TELEPORTED" });
    check("invalid status → 400", badStatus.status === 400, badStatus.status);
    const negBudget = await api(admin, "PATCH", `/api/projects/${p1._id}`, { approvedBudget: -1 });
    check("negative approved budget → 400", negBudget.status === 400, negBudget.status);
    const nanBudget = await api(admin, "PATCH", `/api/projects/${p1._id}`, { approvedBudget: "abc" });
    check("non-numeric approved budget → 400", nanBudget.status === 400, nanBudget.status);
    const badDate = await api(admin, "PATCH", `/api/projects/${p1._id}`, { startDate: "not-a-date" });
    check("invalid date → 400", badDate.status === 400, badDate.status);
    const review = await api(admin, "PATCH", `/api/projects/${p1._id}`, { status: "UNDER_REVIEW" });
    check("valid status change → 200", review.status === 200 && review.json?.project?.status === "UNDER_REVIEW", review.status);
    check("status-only update does NOT invent an approved budget", !review.json?.project?.approvedBudget, review.json?.project?.approvedBudget);
    const notif = await api(stu1b, "GET", "/api/notifications");
    check("student notified of status change", notif.json?.notifications?.some((n: any) => /UNDER_REVIEW/.test(n.title + n.message)), notif.status);
  }

  // ───────────────────────────── Quotation lifecycle ─────────────────────────────
  group("Quotation creation & calculation");
  let draft: any;
  {
    const items = [
      { description: "Design", quantity: 2, unitPrice: 10000 },
      { description: "Build", quantity: 1, unitPrice: 30000 },
    ];
    const noItems = await api(admin, "POST", "/api/quotations", { projectId: p1._id, items: [] });
    check("no line items → 400", noItems.status === 400, noItems.status);
    const badProject = await api(admin, "POST", "/api/quotations", { projectId: "zzz", items });
    check("malformed projectId → 4xx (not 500)", badProject.status >= 400 && badProject.status < 500, badProject.status);
    const past = await api(admin, "POST", "/api/quotations", { projectId: p1._id, items, validUntil: day(-3) });
    check("validity date in the past → 400", past.status === 400, past.status);
    const blankItem = await api(admin, "POST", "/api/quotations", { projectId: p1._id, items: [{ description: "  ", quantity: 1, unitPrice: 5 }] });
    check("blank line-item description → 400", blankItem.status === 400, blankItem.status);
    const badTax = await api(admin, "POST", "/api/quotations", { projectId: p1._id, items, taxPercentage: 500, validUntil: day(10) });
    check("tax percentage > 100 → 400", badTax.status === 400, badTax.status);

    // subtotal 50,000, discount 5,000, tax 5% of 45,000 = 2,250, total 47,250
    const created = await api(admin, "POST", "/api/quotations", { projectId: p1._id, items, discount: 5000, taxPercentage: 5, validUntil: day(10) });
    draft = created.json?.quotation;
    check("draft created", created.status === 200 && draft?.status === "DRAFT", created.status);
    check("subtotal 50,000", draft?.subtotal === 50000, draft?.subtotal);
    check("tax = 5% of taxable (2,250)", draft?.tax === 2250, draft?.tax);
    check("total 47,250", draft?.total === 47250, draft?.total);
    check("tax percentage is stored on the quotation", draft?.taxPercentage === 5, draft?.taxPercentage);
    const proj = await api(admin, "GET", `/api/projects/${p1._id}`);
    check("project moved to QUOTATION_PREPARATION", proj.json?.project?.status === "QUOTATION_PREPARATION", proj.json?.project?.status);

    const bigDiscount = await api(admin, "POST", "/api/quotations", { projectId: p1._id, items, discount: 10_000_000, validUntil: day(10) });
    check("discount larger than subtotal is clamped (total never negative)", bigDiscount.json?.quotation?.total === 0 && bigDiscount.json?.quotation?.discount === 50000, bigDiscount.json?.quotation);
    // Clean that clamp-test quotation out of the way so it isn't confused with the lifecycle one
    if (bigDiscount.json?.quotation?._id) await api(admin, "PATCH", `/api/quotations/${bigDiscount.json.quotation._id}`, { status: "CANCELLED" });
  }

  group("Quotation visibility & state machine");
  {
    const stuList = await api(stu1b, "GET", "/api/quotations");
    check("student does NOT see DRAFT quotations in list", !stuList.json?.quotations?.some((q: any) => q._id === draft._id));
    const stuGet = await api(stu1b, "GET", `/api/quotations/${draft._id}`);
    check("student cannot open a DRAFT quotation (404)", stuGet.status === 404, stuGet.status);
    const stuProj = await api(stu1b, "GET", `/api/projects/${p1._id}`);
    check("project detail hides DRAFT quotations from student", !stuProj.json?.quotations?.some((q: any) => q._id === draft._id));
    const acceptDraft = await api(stu1b, "POST", `/api/quotations/${draft._id}/accept`);
    check("student cannot accept a DRAFT (≥400)", acceptDraft.status >= 400, acceptDraft.status);
    const rejectDraft = await api(stu1b, "POST", `/api/quotations/${draft._id}/reject`, { reason: "nope" });
    check("student cannot reject a DRAFT (≥400)", rejectDraft.status >= 400, rejectDraft.status);

    const stu2Open = await api(stu2, "POST", `/api/quotations/${draft._id}/accept`);
    check("another student cannot accept it either (≥400)", stu2Open.status >= 400, stu2Open.status);

    const send = await api(admin, "POST", `/api/quotations/${draft._id}/send`);
    check("admin sends draft → SENT", send.status === 200 && send.json?.quotation?.status === "SENT", send.status);
    const resend = await api(admin, "POST", `/api/quotations/${draft._id}/send`);
    check("re-sending an already SENT quotation is rejected (400)", resend.status === 400, resend.status);
    const proj = await api(admin, "GET", `/api/projects/${p1._id}`);
    check("project is QUOTATION_SENT", proj.json?.project?.status === "QUOTATION_SENT", proj.json?.project?.status);

    const stuView = await api(stu1b, "GET", `/api/quotations/${draft._id}`);
    check("student opens SENT quotation; flips to VIEWED", stuView.status === 200 && stuView.json?.quotation?.status === "VIEWED", stuView.json?.quotation?.status);

    const noReason = await api(stu1b, "POST", `/api/quotations/${draft._id}/request-changes`, { changes: "   " });
    check("request-changes without text → 400", noReason.status === 400, noReason.status);
    const rc = await api(stu1b, "POST", `/api/quotations/${draft._id}/request-changes`, { changes: "Please reduce the price." });
    check("student requests changes → CHANGES_REQUESTED", rc.status === 200 && rc.json?.quotation?.status === "CHANGES_REQUESTED", rc.status);
    const acceptWhileChanges = await api(stu1b, "POST", `/api/quotations/${draft._id}/accept`);
    check("cannot accept while changes are outstanding (400)", acceptWhileChanges.status === 400, acceptWhileChanges.status);
  }

  group("Quotation versioning");
  let v2: any;
  {
    // Revise with only a new discount: the original 5% tax rate must be preserved.
    const rev = await api(admin, "PATCH", `/api/quotations/${draft._id}`, { discount: 10000, changeReason: "Educational discount", sendImmediately: true });
    v2 = rev.json?.quotation;
    check("revision creates version 2", rev.status === 200 && v2?.version === 2, rev.status);
    check("revision keeps original quotationId", v2?.quotationId === draft.quotationId);
    check("revision preserves the 5% tax rate (not reset to 18%)", v2?.taxPercentage === 5 && v2?.tax === 2000 && v2?.total === 42000, { tax: v2?.tax, total: v2?.total, pct: v2?.taxPercentage });
    check("revision is SENT", v2?.status === "SENT", v2?.status);
    check("revision records previous amount", v2?.previousAmount === 47250, v2?.previousAmount);
    const v1 = await api(admin, "GET", `/api/quotations/${draft._id}`);
    check("v1 is marked superseded (CANCELLED)", v1.json?.quotation?.status === "CANCELLED", v1.json?.quotation?.status);
    check("version history lists 2 versions", v1.json?.versionHistory?.length === 2, v1.json?.versionHistory?.length);
    const acceptOld = await api(stu1b, "POST", `/api/quotations/${draft._id}/accept`);
    check("student cannot accept superseded v1 (400)", acceptOld.status === 400, acceptOld.status);
    const patchOld = await api(admin, "PATCH", `/api/quotations/${draft._id}`, { discount: 0, sendImmediately: true });
    check("admin cannot revise a superseded version (400)", patchOld.status === 400, patchOld.status);
    const badDisc = await api(admin, "PATCH", `/api/quotations/${v2._id}`, { discount: "abc" });
    check("non-numeric discount on revision → 400", badDisc.status === 400, badDisc.status);
  }

  group("Accepting a quotation");
  {
    const acc = await api(stu1b, "POST", `/api/quotations/${v2._id}/accept`);
    check("student accepts v2 → 200", acc.status === 200, acc.status);
    const proj = await api(stu1b, "GET", `/api/projects/${p1._id}`);
    check("project becomes APPROVED", proj.json?.project?.status === "APPROVED", proj.json?.project?.status);
    check("approvedBudget equals accepted total (42,000)", proj.json?.project?.approvedBudget === 42000, proj.json?.project?.approvedBudget);
    const again = await api(stu1b, "POST", `/api/quotations/${v2._id}/accept`);
    check("double accept → 400", again.status === 400, again.status);
    const rejectAfter = await api(stu1b, "POST", `/api/quotations/${v2._id}/reject`, { reason: "changed my mind" });
    check("cannot reject after acceptance (400)", rejectAfter.status === 400, rejectAfter.status);
    const changesAfter = await api(stu1b, "POST", `/api/quotations/${v2._id}/request-changes`, { changes: "more" });
    check("cannot request changes after acceptance (400)", changesAfter.status === 400, changesAfter.status);
    const adminEdit = await api(admin, "PATCH", `/api/quotations/${v2._id}`, { discount: 0 });
    check("admin cannot edit accepted quotation (400)", adminEdit.status === 400, adminEdit.status);
    const resend = await api(admin, "POST", `/api/quotations/${v2._id}/send`);
    check("admin cannot re-send an accepted quotation (400)", resend.status === 400, resend.status);
    const projAfter = await api(admin, "GET", `/api/projects/${p1._id}`);
    check("project is still APPROVED after those attempts", projAfter.json?.project?.status === "APPROVED", projAfter.json?.project?.status);
    const newQuote = await api(admin, "POST", "/api/quotations", { projectId: p1._id, items: [{ description: "Extra", quantity: 1, unitPrice: 1000 }], validUntil: day(5) });
    const projAfterNew = await api(admin, "GET", `/api/projects/${p1._id}`);
    check("drafting another quotation does not regress an APPROVED project", projAfterNew.json?.project?.status === "APPROVED", projAfterNew.json?.project?.status);
    void newQuote;
  }

  group("Rejecting a quotation");
  {
    const pr = await api(stu1b, "POST", "/api/projects", projectBody({ projectName: "Reject flow" }));
    const p = pr.json.project;
    const q = (await api(admin, "POST", "/api/quotations", { projectId: p._id, items: [{ description: "X", quantity: 1, unitPrice: 20000 }], validUntil: day(7), sendImmediately: true })).json.quotation;
    check("sendImmediately creates a SENT quotation", q?.status === "SENT", q?.status);
    const none = await api(stu1b, "POST", `/api/quotations/${q._id}/reject`, { reason: " " });
    check("reject without reason → 400", none.status === 400, none.status);
    const rej = await api(stu1b, "POST", `/api/quotations/${q._id}/reject`, { reason: "Over budget" });
    check("reject → 200 REJECTED", rej.status === 200 && rej.json?.quotation?.status === "REJECTED", rej.status);
    const accAfter = await api(stu1b, "POST", `/api/quotations/${q._id}/accept`);
    check("cannot accept after rejecting (400)", accAfter.status === 400, accAfter.status);
    const sNot = await api(admin, "GET", "/api/notifications");
    check("admins were notified of the rejection", sNot.json?.notifications?.some((n: any) => /Rejected/i.test(n.title)), sNot.status);
  }

  // ───────────────────────────── Payments ─────────────────────────────
  group("Payments & balance rules");
  {
    const pay = (amount: unknown, extra: Record<string, unknown> = {}) =>
      api(admin, "POST", "/api/payments", {
        projectId: p1._id,
        amount,
        paymentDate: day(0),
        paymentMethod: "UPI",
        transactionReference: `UTR-${uniq()}`,
        ...extra,
      });
    check("negative amount → 400", (await pay(-10)).status === 400);
    check("zero amount → 400", (await pay(0)).status === 400);
    check("non-numeric amount → 400", (await pay("abc")).status === 400);
    check("invalid payment method → 400", (await pay(100, { paymentMethod: "Bitcoin" })).status === 400);
    check("invalid payment date → 400", (await pay(100, { paymentDate: "garbage" })).status === 400);
    const badProj = await api(admin, "POST", "/api/payments", { projectId: "zzz", amount: 10, paymentDate: day(0), paymentMethod: "UPI", transactionReference: "r" });
    check("malformed projectId → 4xx (not 500)", badProj.status >= 400 && badProj.status < 500, badProj.status);

    const over = await pay(42001);
    check("amount above approved budget (42,000) → 400", over.status === 400, over.status);
    const first = await pay(20000);
    check("partial payment 20,000 → 200", first.status === 200 && first.json?.financials?.pendingPayment === 22000, first.json?.financials);
    const dupRef = await api(admin, "POST", "/api/payments", { projectId: p1._id, amount: 100, paymentDate: day(0), paymentMethod: "UPI", transactionReference: first.json?.payment?.transactionReference });
    check("duplicate transaction reference on the same project → 409", dupRef.status === 409, dupRef.status);
    const rest = await pay(22000);
    check("exact remaining balance accepted; pending = 0", rest.status === 200 && rest.json?.financials?.pendingPayment === 0, rest.json?.financials);
    const extra = await pay(500);
    check("any payment after the balance is cleared → 400", extra.status === 400, extra.status);

    const stuView = await api(stu1b, "GET", "/api/payments");
    check("student sees their own payments", stuView.status === 200 && stuView.json?.payments?.length === 2, stuView.json?.payments?.length);
    const stu2View = await api(stu2, "GET", "/api/payments");
    check("other student sees none of them", stu2View.json?.payments?.length === 0, stu2View.json?.payments?.length);
    const badFilter = await api(admin, "GET", "/api/payments?projectId=not-an-id");
    check("GET /api/payments?projectId=<malformed> → 4xx (not 500)", badFilter.status >= 400 && badFilter.status < 500, badFilter.status);
    const detail = await api(stu1b, "GET", `/api/projects/${p1._id}`);
    check("financials: budget 42,000 / paid 42,000 / pending 0 / PAID", detail.json?.financials?.totalBudget === 42000 && detail.json?.financials?.totalPaid === 42000 && detail.json?.financials?.paymentStatus === "PAID", detail.json?.financials);
  }

  // ───────────────────────────── Milestones ─────────────────────────────
  group("Milestones");
  {
    const mk = (over: Record<string, unknown> = {}) =>
      api(admin, "POST", `/api/projects/${p1._id}/milestones`, { name: "Sprint 1", startDate: day(0), dueDate: day(10), ...over });
    const ok = await mk();
    const m = ok.json?.milestone;
    check("milestone created", ok.status === 200 && m?.status === "PENDING", ok.status);
    check("due date before start date → 400", (await mk({ startDate: day(10), dueDate: day(1) })).status === 400);
    check("invalid date → 400", (await mk({ dueDate: "garbage" })).status === 400);
    check("invalid status → 400", (await mk({ status: "SLEEPING" })).status === 400);
    check("progress above 100 → 400", (await mk({ progress: 150 })).status === 400);
    check("missing name → 400", (await mk({ name: "" })).status === 400);
    const ghost = await api(admin, "POST", "/api/projects/zzz/milestones", { name: "x", startDate: day(0), dueDate: day(1) });
    check("malformed project id → 4xx (not 500)", ghost.status >= 400 && ghost.status < 500, ghost.status);
    const stuMk = await api(stu1b, "POST", `/api/projects/${p1._id}/milestones`, { name: "x", startDate: day(0), dueDate: day(1) });
    check("student cannot create milestones (403)", stuMk.status === 403, stuMk.status);

    const half = await api(admin, "PATCH", `/api/milestones/${m._id}`, { progress: 40 });
    check("progress update", half.status === 200 && half.json?.milestone?.progress === 40, half.status);
    const badStatus = await api(admin, "PATCH", `/api/milestones/${m._id}`, { status: "NAPPING" });
    check("invalid status on update → 400", badStatus.status === 400, badStatus.status);
    const badProg = await api(admin, "PATCH", `/api/milestones/${m._id}`, { progress: "abc" });
    check("non-numeric progress → 400", badProg.status === 400, badProg.status);
    const full = await api(admin, "PATCH", `/api/milestones/${m._id}`, { progress: 100 });
    check("100% auto-completes milestone", full.json?.milestone?.status === "COMPLETED" && !!full.json?.milestone?.completedAt, full.json?.milestone?.status);
    const nStu = await api(stu1b, "GET", "/api/notifications");
    check("student notified on completion (via progress=100 too)", nStu.json?.notifications?.some((n: any) => /Milestone Completed/i.test(n.title)), nStu.status);
    const back = await api(admin, "PATCH", `/api/milestones/${m._id}`, { status: "IN_PROGRESS" });
    check("reopening a completed milestone clears completedAt", back.status === 200 && !back.json?.milestone?.completedAt, back.json?.milestone);
    const ghostPatch = await api(admin, "PATCH", "/api/milestones/000000000000000000000000", { progress: 1 });
    check("unknown milestone → 404", ghostPatch.status === 404, ghostPatch.status);
    const badId = await api(admin, "PATCH", "/api/milestones/zzz", { progress: 1 });
    check("malformed milestone id → 4xx (not 500)", badId.status >= 400 && badId.status < 500, badId.status);
    const stuDel = await api(stu1b, "DELETE", `/api/milestones/${m._id}`);
    check("student cannot delete milestones (403)", stuDel.status === 403, stuDel.status);
    const del = await api(admin, "DELETE", `/api/milestones/${m._id}`);
    check("admin deletes milestone", del.status === 200, del.status);
    const del2 = await api(admin, "DELETE", `/api/milestones/${m._id}`);
    check("deleting it again → 404", del2.status === 404, del2.status);
  }

  // ───────────────────────────── Student administration ─────────────────────────────
  group("Admin: ambassador management");
  {
    const dup = await api(admin, "POST", "/api/admin/students", {
      name: "Dup", email: s1.email.toUpperCase(), phone: "+91 90000 00001", collegeName: "College", course: "BTech", branch: "CSE", semester: "6th",
    });
    check("duplicate email (any case) → 409", dup.status === 409, dup.status);
    const badEmail = await api(admin, "POST", "/api/admin/students", {
      name: "Bad", email: "nope", phone: "+91 90000 00002", collegeName: "College", course: "BTech", branch: "CSE", semester: "6th",
    });
    check("invalid email → 400", badEmail.status === 400, badEmail.status);
    const badPhone = await api(admin, "POST", "/api/admin/students", { name: "Phone Bad", email: `ph.${uniq()}@x.edu`, phone: "abc", collegeName: "College", course: "BTech", branch: "CSE", semester: "6th" });
    check("ambassador with invalid phone → 400", badPhone.status === 400, badPhone.status);
    const badName = await api(admin, "POST", "/api/admin/students", { name: "R2D2 <b>", email: `nm.${uniq()}@x.edu`, phone: "+91 90000 00004", collegeName: "College", course: "BTech", branch: "CSE", semester: "6th" });
    check("ambassador with invalid name → 400", badName.status === 400, badName.status);
    const badRef = await api(admin, "POST", "/api/admin/students", { name: "Ref Bad", email: `rf.${uniq()}@x.edu`, phone: "+91 90000 00005", collegeName: "College", course: "BTech", branch: "CSE", semester: "6th", referralCode: "bad code!" });
    check("ambassador with invalid referral code → 400", badRef.status === 400, badRef.status);
    const weakTmp = await api(admin, "POST", "/api/admin/students", {
      name: "Weak", email: `weak.${uniq()}@x.edu`, phone: "+91 90000 00003", collegeName: "College", course: "BTech", branch: "CSE", semester: "6th", temporaryPassword: "abc",
    });
    check("temporary password shorter than 8 chars → 400", weakTmp.status === 400, weakTmp.status);
    check("ambassador id format", /^CA-\d{4}-\d{4}$/.test(s1.res.json?.student?.ambassadorId || ""), s1.res.json?.student?.ambassadorId);
    check("ambassador ids are unique", s1.res.json?.student?.ambassadorId !== s2.res.json?.student?.ambassadorId);

    const list = await api(admin, "GET", `/api/admin/students?search=${encodeURIComponent(s1.email)}`);
    check("search by email finds the student", list.json?.students?.length === 1, list.json?.students?.length);
    const detail = await api(admin, "GET", `/api/admin/students/${s1.id}`);
    check("student detail returns performance block", detail.status === 200 && typeof detail.json?.performance?.totalProjects === "number", detail.status);
    const ghost = await api(admin, "GET", "/api/admin/students/zzz");
    check("malformed student id → 4xx (not 500)", ghost.status >= 400 && ghost.status < 500, ghost.status);
    const ghost2 = await api(admin, "GET", "/api/admin/students/000000000000000000000000");
    check("unknown student → 404", ghost2.status === 404, ghost2.status);
    const asAdmin = await api(admin, "PATCH", `/api/admin/students/${s2.id}`, { status: "SUSPENDED_FOREVER" });
    check("invalid status → 400", asAdmin.status === 400, asAdmin.status);

    // Disable / enable / session revocation
    const s3 = await createStudent(admin, "gamma");
    const s3Cookie = (await login(s3.email, "Temp@12345", "STUDENT")).cookie;
    const dis = await api(admin, "PATCH", `/api/admin/students/${s3.id}`, { status: "DISABLED" });
    check("disable student → 200", dis.status === 200, [dis.status, dis.json]);
    const afterDisable = await login(s3.email, "Temp@12345", "STUDENT");
    check("disabled student cannot log in (403)", afterDisable.r.status === 403, afterDisable.r.status);
    const stale = await api(s3Cookie, "GET", "/api/projects");
    check("disabled student's EXISTING session is revoked (401)", stale.status === 401, stale.status);
    const listDisabled = await api(admin, "GET", "/api/admin/students?status=DISABLED&limit=100");
    check("status filter lists disabled student", listDisabled.json?.students?.some((s: any) => s.id === s3.id), listDisabled.status);
    const en = await api(admin, "PATCH", `/api/admin/students/${s3.id}`, { status: "ACTIVE" });
    check("re-enable → 200", en.status === 200, en.status);
    const afterEnable = await login(s3.email, "Temp@12345", "STUDENT");
    check("re-enabled student can log in again", afterEnable.r.status === 200, afterEnable.r.status);

    // Reset password
    const rp = await api(admin, "POST", `/api/admin/students/${s3.id}/reset-password`);
    const tmp = rp.json?.temporaryPassword;
    check("reset password returns a temp password", rp.status === 200 && !!tmp, rp.status);
    const viaTmp = await login(s3.email, tmp, "STUDENT");
    check("temp password works and forces change", viaTmp.r.status === 200 && viaTmp.r.json?.user?.mustChangePassword === true, viaTmp.r.status);
    const oldPw = await login(s3.email, "Temp@12345", "STUDENT");
    check("old password no longer works", oldPw.r.status === 401, oldPw.r.status);
    const rpGhost = await api(admin, "POST", "/api/admin/students/000000000000000000000000/reset-password");
    check("reset for unknown student → 404", rpGhost.status === 404, rpGhost.status);
  }

  // ───────────────────────────── Student self-service ─────────────────────────────
  group("Student profile self-service");
  {
    const upd = await api(stu1b, "PATCH", "/api/auth/profile", { name: "Alpha Renamed", phone: "+91 11111 22222", collegeName: "New College" });
    check("profile update → 200", upd.status === 200, [upd.status, upd.json]);
    const me = await api(stu1b, "GET", "/api/auth/me");
    check("changes persisted (name/phone/college)", me.json?.user?.name === "Alpha Renamed" && me.json?.user?.profile?.phone === "+91 11111 22222" && me.json?.user?.profile?.collegeName === "New College", me.json?.user);
    const badProfilePhone = await api(stu1b, "PATCH", "/api/auth/profile", { phone: "not a phone" });
    check("profile: invalid phone → 400", badProfilePhone.status === 400, badProfilePhone.status);
    const blank = await api(stu1b, "PATCH", "/api/auth/profile", { name: "   " });
    check("blank name → 400", blank.status === 400, blank.status);
    const sneaky = await api(stu1b, "PATCH", "/api/auth/profile", { role: "ADMIN", status: "ACTIVE", ambassadorId: "CA-HACK-0001", email: "evil@x.com" });
    const me2 = await api(stu1b, "GET", "/api/auth/me");
    check("role / ambassadorId / email cannot be self-edited", me2.json?.user?.role === "STUDENT" && me2.json?.user?.profile?.ambassadorId === s1.res.json?.student?.ambassadorId && me2.json?.user?.email === s1.email.toLowerCase(), [sneaky.status, me2.json?.user]);
    const anon = await api("", "PATCH", "/api/auth/profile", { name: "x" });
    check("unauthenticated profile update → 401", anon.status === 401, anon.status);
  }

  // ───────────────────────────── Settings ─────────────────────────────
  group("Admin settings");
  {
    const before = (await api(admin, "GET", "/api/admin/settings")).json?.settings;
    const neg = await api(admin, "PATCH", "/api/admin/settings", { taxPercentage: -5 });
    check("negative tax → 400", neg.status === 400, neg.status);
    const huge = await api(admin, "PATCH", "/api/admin/settings", { taxPercentage: 400 });
    check("tax above 100 → 400", huge.status === 400, huge.status);
    const nan = await api(admin, "PATCH", "/api/admin/settings", { defaultQuotationValidityDays: "abc" });
    check("non-numeric validity days → 400", nan.status === 400, nan.status);
    const badMail = await api(admin, "PATCH", "/api/admin/settings", { email: "not-an-email" });
    check("invalid company email → 400", badMail.status === 400, badMail.status);
    const ok = await api(admin, "PATCH", "/api/admin/settings", { taxPercentage: 12, defaultQuotationValidityDays: 20 });
    check("valid settings update", ok.status === 200 && ok.json?.settings?.taxPercentage === 12, ok.status);
    const q = await api(admin, "POST", "/api/quotations", { projectId: p1._id, items: [{ description: "Settings default", quantity: 1, unitPrice: 1000 }] });
    check("new quotations use the configured default tax (12%)", q.json?.quotation?.taxPercentage === 12 && q.json?.quotation?.tax === 120, q.json?.quotation);
    const days = q.json?.quotation ? Math.round((new Date(q.json.quotation.validUntil).getTime() - Date.now()) / 86400000) : -1;
    check("…and the configured default validity (20 days)", days >= 19 && days <= 21, days);
    await api(admin, "PATCH", "/api/admin/settings", { taxPercentage: before?.taxPercentage ?? 18, defaultQuotationValidityDays: before?.defaultQuotationValidityDays ?? 15 });
  }

  // ───────────────────────────── Notifications ─────────────────────────────
  group("Notifications");
  {
    const list = await api(stu1b, "GET", "/api/notifications");
    check("student has unread notifications", list.json?.unreadCount > 0, list.json?.unreadCount);
    const first = list.json?.notifications?.[0];
    const mark = await api(stu1b, "PATCH", `/api/notifications/${first._id}`);
    check("mark one read", mark.status === 200 && mark.json?.notification?.isRead === true, mark.status);
    const other = await api(stu2, "PATCH", `/api/notifications/${first._id}`);
    check("cannot mark someone else's notification (404)", other.status === 404, other.status);
    const bad = await api(stu1b, "PATCH", "/api/notifications/zzz");
    check("malformed notification id → 404 (not 500)", bad.status === 404, bad.status);
    const all = await api(stu1b, "POST", "/api/notifications");
    const after = await api(stu1b, "GET", "/api/notifications");
    check("mark all read → unreadCount 0", all.status === 200 && after.json?.unreadCount === 0, after.json?.unreadCount);
  }

  // ───────────────────────────── Export / analytics ─────────────────────────────
  group("Exports & analytics");
  {
    await api(stu1b, "POST", "/api/projects", projectBody({ projectName: '=HYPERLINK("http://evil.example","click")', clientName: "+cmd|' /C calc'!A0" }));
    const csv = await api(admin, "GET", "/api/admin/export?type=projects");
    check("projects CSV exports", csv.status === 200 && csv.text.startsWith("Project ID,Project Name"), csv.status);
    check("CSV neutralises spreadsheet formula injection", !/(^|,)"[=+\-@]/m.test(csv.text.split("\n").slice(1).join("\n")), csv.text.split("\n").filter((l) => /HYPERLINK/.test(l)));
    const badType = await api(admin, "GET", "/api/admin/export?type=secrets");
    check("unknown export type → 400", badType.status === 400, badType.status);
    for (const t of ["payments", "students"]) {
      const r = await api(admin, "GET", `/api/admin/export?type=${t}`);
      check(`${t} CSV exports`, r.status === 200 && r.text.length > 20, r.status);
    }
    const an = await api(admin, "GET", "/api/admin/analytics");
    const payTotal = (await api(admin, "GET", "/api/payments")).json?.payments?.reduce((a: number, p: any) => a + p.amount, 0);
    check("analytics totalPaymentReceived equals the ledger", an.json?.cards?.totalPaymentReceived === payTotal, [an.json?.cards?.totalPaymentReceived, payTotal]);
    const sumByStatus = an.json?.charts?.projectsByStatus?.reduce((a: number, s: any) => a + s.count, 0);
    check("analytics status chart sums to total projects", sumByStatus === an.json?.cards?.totalProjects, [sumByStatus, an.json?.cards?.totalProjects]);
  }

  // ───────────────────────────── Many projects (dashboard totals) ─────────────────────────────
  group("Large result sets");
  {
    const s4 = await createStudent(admin, "delta");
    const c4 = (await login(s4.email, "Temp@12345", "STUDENT")).cookie;
    for (let i = 0; i < 12; i++) await api(c4, "POST", "/api/projects", projectBody({ projectName: `Bulk ${i}` }));
    const page1 = await api(c4, "GET", "/api/projects");
    check("default page size is 10", page1.json?.projects?.length === 10 && page1.json?.pagination?.total === 12, page1.json?.pagination);
    const all = await api(c4, "GET", "/api/projects?limit=200");
    check("limit=200 returns all 12", all.json?.projects?.length === 12, all.json?.projects?.length);
    const ids = new Set(all.json?.projects?.map((p: any) => p.projectId));
    check("12 distinct project ids (no collisions)", ids.size === 12, ids.size);
  }

  // ───────────────────────────── Summary ─────────────────────────────
  console.log("\n=================================================");
  console.log(`PASSED: ${passed}   FAILED: ${failures.length}`);
  if (failures.length) {
    console.log("\nFailures:");
    failures.forEach((f) => console.log(" - " + f));
    process.exit(1);
  }
  console.log("🎉 All QA regression checks passed.");
}

main().catch((e) => {
  console.error("Suite crashed:", e);
  process.exit(2);
});
