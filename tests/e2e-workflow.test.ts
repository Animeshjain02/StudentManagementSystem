import assert from "assert";

const BASE_URL = "http://localhost:3000";

async function runE2ETests() {
  console.log("=================================================");
  console.log("CAMPUS AMBASSADOR PROJECT MANAGEMENT SYSTEM");
  console.log("COMPREHENSIVE END-TO-END QA WORKFLOW TEST SUITE");
  console.log("=================================================\n");

  let adminCookie = "";
  let studentCookie = "";

  // 1. TEST ADMIN LOGIN
  console.log("🔹 STEP 1: Admin Login (admin@example.com / Admin@12345)");
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@example.com", password: "Admin@12345", portal: "ADMIN" }),
  });
  assert.strictEqual(adminLoginRes.status, 200, "Admin login should return 200 OK");
  const adminLoginJson = await adminLoginRes.json();
  assert.strictEqual(adminLoginJson.user.role, "ADMIN", "Role must be ADMIN");
  adminCookie = adminLoginRes.headers.get("set-cookie") || "";
  console.log("   ✅ Admin logged in successfully! Role verified: ADMIN\n");

  // 2. TEST ADMIN ANALYTICS & DASHBOARD METRICS
  console.log("🔹 STEP 2: Fetch Admin Analytics & Recharts Metrics");
  const analyticsRes = await fetch(`${BASE_URL}/api/admin/analytics`, {
    headers: { Cookie: adminCookie },
  });
  assert.strictEqual(analyticsRes.status, 200, "Analytics should return 200 OK");
  const analyticsJson = await analyticsRes.json();
  assert(analyticsJson.cards.totalProjects >= 20, "Should have at least 20 projects");
  assert(analyticsJson.cards.totalAmbassadors >= 10, "Should have at least 10 ambassadors");
  console.log(`   ✅ Analytics verified: ${analyticsJson.cards.totalProjects} Projects, ${analyticsJson.cards.totalAmbassadors} Ambassadors, Total Value: ₹${analyticsJson.cards.totalProjectValue.toLocaleString()}\n`);

  // 3. TEST ADMIN CREATE STUDENT WITH AUTO AMBASSADOR ID
  console.log("🔹 STEP 3: Admin Onboards New Ambassador (Auto CA-2026-XXXX ID)");
  const newStudentRes = await fetch(`${BASE_URL}/api/admin/students`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({
      name: "Tanya Sen",
      email: `tanya.sen.${Date.now()}@testcollege.edu`,
      phone: "+91 98888 77777",
      collegeName: "IIIT Hyderabad",
      university: "IIIT-H",
      course: "B.Tech",
      branch: "Computer Science",
      semester: "6th Semester",
      collegeId: "2023CS099",
      temporaryPassword: "Student@12345",
    }),
  });
  assert.strictEqual(newStudentRes.status, 200, "Student creation should return 200 OK");
  const newStudentJson = await newStudentRes.json();
  assert(newStudentJson.student.ambassadorId.startsWith("CA-2026-"), "Must have auto-generated Ambassador ID");
  console.log(`   ✅ Ambassador onboarded: ${newStudentJson.student.name} with ID: ${newStudentJson.student.ambassadorId}\n`);

  // 4. TEST STUDENT FIRST LOGIN & MUST_CHANGE_PASSWORD DETECTION
  console.log("🔹 STEP 4: Student First Login & Force Password Reset Policy");
  const studentFirstLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: newStudentJson.student.email, password: "Student@12345", portal: "STUDENT" }),
  });
  assert.strictEqual(studentFirstLoginRes.status, 200, "Student login should return 200 OK");
  const studentFirstLoginJson = await studentFirstLoginRes.json();
  assert.strictEqual(studentFirstLoginJson.user.mustChangePassword, true, "First login must flag mustChangePassword = true");
  studentCookie = studentFirstLoginRes.headers.get("set-cookie") || "";
  console.log("   ✅ First login detected: mustChangePassword is TRUE as required by security policy!\n");

  // 5. TEST STUDENT PASSWORD CHANGE WITH COMPLEXITY VALIDATION
  console.log("🔹 STEP 5: Student Password Change (Enforce Min 8, Upper, Lower, Number, Special)");
  const changePassRes = await fetch(`${BASE_URL}/api/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: studentCookie },
    body: JSON.stringify({
      newPassword: "NewSecurePassword@2026",
      confirmPassword: "NewSecurePassword@2026",
    }),
  });
  assert.strictEqual(changePassRes.status, 200, "Password change should succeed");
  studentCookie = changePassRes.headers.get("set-cookie") || studentCookie;
  console.log("   ✅ Password changed successfully! Session refreshed.\n");

  // 6. TEST RBAC RESTRICTION: STUDENT CANNOT ACCESS ADMIN API (403 FORBIDDEN)
  console.log("🔹 STEP 6: RBAC Security Test - Student Cannot Access Admin Students API");
  const rbacTestRes = await fetch(`${BASE_URL}/api/admin/students`, {
    headers: { Cookie: studentCookie },
  });
  assert.strictEqual(rbacTestRes.status, 403, "Student must be rejected with 403 Forbidden");
  console.log("   ✅ Security verified: Student accessing Admin route blocked with 403 Forbidden!\n");

  // 7. TEST STUDENT PROJECT SUBMISSION
  console.log("🔹 STEP 7: Student Submits New Capstone Project");
  const newProjRes = await fetch(`${BASE_URL}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: studentCookie },
    body: JSON.stringify({
      projectName: "Neural Drone Swarm Ground Station",
      clientName: "Dr. Arvind Rao",
      clientEmail: "arvind.rao@iitd.ac.in",
      clientPhone: "+91 98111 22233",
      collegeName: "IIT Delhi",
      department: "Computer Science",
      projectType: "AI/ML",
      description: "Distributed swarm telemetry visualizer with edge inferencing and obstacle routing.",
      functionalRequirements: "Real-time WebRTC stream, 3D waypoint editor, battery fail-safe trigger.",
      technicalRequirements: "Next.js, Python FastAPI, ROS2, WebGL, MongoDB.",
      expectedFeatures: "Latency under 80ms, automated failover, audit logs.",
      expectedBudget: 75000,
    }),
  });
  assert.strictEqual(newProjRes.status, 200, "Project submission should return 200 OK");
  const newProjJson = await newProjRes.json();
  const createdProject = newProjJson.project;
  assert(createdProject.projectId.startsWith("PRJ-2026-"), "Must have auto-generated Project ID");
  assert.strictEqual(createdProject.status, "SUBMITTED", "Initial status must be SUBMITTED");
  console.log(`   ✅ Project created: ${createdProject.projectId} ("${createdProject.projectName}") with status: ${createdProject.status}\n`);

  // 8. TEST ADMIN CREATES QUOTATION WITH AUTOMATIC CALCULATIONS
  console.log("🔹 STEP 8: Admin Formulates Line-Item Quotation");
  const newQuotRes = await fetch(`${BASE_URL}/api/quotations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({
      projectId: createdProject._id,
      items: [
        { description: "Ground Station WebGL Architecture", quantity: 1, unitPrice: 30000 },
        { description: "Edge Telemetry & ROS2 Gateway Implementation", quantity: 1, unitPrice: 40000 },
      ],
      discount: 5000,
      taxPercentage: 18,
      validUntil: new Date(Date.now() + 15 * 86400000).toISOString(),
      paymentTerms: "50% Advance on signing, 30% Milestone Demo, 20% on final delivery.",
      deliveryTimeline: "35 Business Days",
      terms: "Includes 60 days bug warranty and complete source repository transfer.",
      sendImmediately: true, // Send to student immediately
    }),
  });
  assert.strictEqual(newQuotRes.status, 200, "Quotation creation should return 200 OK");
  const newQuotJson = await newQuotRes.json();
  const createdQuotation = newQuotJson.quotation;
  // Subtotal = 70,000, Discount = 5,000, Taxable = 65,000, Tax (18%) = 11,700, Total = 76,700
  assert.strictEqual(createdQuotation.subtotal, 70000, "Subtotal must be 70,000");
  assert.strictEqual(createdQuotation.total, 76700, "Total must be 76,700");
  assert.strictEqual(createdQuotation.status, "SENT", "Status must be SENT");
  console.log(`   ✅ Quotation created: ${createdQuotation.quotationId} totaling ₹${createdQuotation.total.toLocaleString()} and SENT to student!\n`);

  // 9. TEST STUDENT VIEWS & ACCEPTS QUOTATION -> PROJECT AUTO-APPROVED
  console.log("🔹 STEP 9: Student Accepts Quotation -> Automatic Project Approval");
  const acceptRes = await fetch(`${BASE_URL}/api/quotations/${createdQuotation._id}/accept`, {
    method: "POST",
    headers: { Cookie: studentCookie },
  });
  assert.strictEqual(acceptRes.status, 200, "Quotation acceptance should succeed");

  // Verify Project status is now APPROVED and approvedBudget is set
  const projCheckRes = await fetch(`${BASE_URL}/api/projects/${createdProject._id}`, {
    headers: { Cookie: studentCookie },
  });
  const projCheckJson = await projCheckRes.json();
  assert.strictEqual(projCheckJson.project.status, "APPROVED", "Project status must advance to APPROVED");
  assert.strictEqual(projCheckJson.project.approvedBudget, 76700, "Project approvedBudget must equal quotation total");
  console.log(`   ✅ Quotation ACCEPTED! Project ${createdProject.projectId} is now officially APPROVED with budget ₹${projCheckJson.project.approvedBudget.toLocaleString()}!\n`);

  // 10. TEST ADMIN ADDS MILESTONE
  console.log("🔹 STEP 10: Admin Schedules Sprint Milestones");
  const milestoneRes = await fetch(`${BASE_URL}/api/projects/${createdProject._id}/milestones`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({
      name: "ROS2 Telemetry Stack & Mock Stream",
      description: "Validate drone telemetry socket connection with WebGL renderer.",
      startDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
      assignedTo: "AI/Robotics Squad",
      progress: 30,
      status: "IN_PROGRESS",
    }),
  });
  assert.strictEqual(milestoneRes.status, 200, "Milestone creation should succeed");
  console.log("   ✅ Milestone scheduled and marked IN_PROGRESS!\n");

  // 11. TEST ADMIN RECORDS PAYMENT WITH BALANCE VALIDATION
  console.log("🔹 STEP 11: Admin Records Advance Payment (With Balance Checks)");
  const advanceAmount = 38350; // 50% advance
  const paymentRes = await fetch(`${BASE_URL}/api/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({
      projectId: createdProject._id,
      amount: advanceAmount,
      paymentDate: new Date().toISOString(),
      paymentMethod: "Bank Transfer",
      transactionReference: "NEFT-HDFC-889912001",
      notes: "Advance 50% payment verified upon quotation acceptance.",
    }),
  });
  assert.strictEqual(paymentRes.status, 200, "Payment recording should succeed");
  const paymentJson = await paymentRes.json();
  assert.strictEqual(paymentJson.financials.totalPaid, advanceAmount, "Total paid must match advance");
  assert.strictEqual(paymentJson.financials.pendingPayment, 76700 - advanceAmount, "Pending must be remaining balance");
  console.log(`   ✅ Payment of ₹${advanceAmount.toLocaleString()} recorded! Remaining balance: ₹${paymentJson.financials.pendingPayment.toLocaleString()}\n`);

  // 12. TEST CSV EXPORT ENDPOINTS
  console.log("🔹 STEP 12: Admin CSV Data Export Verification");
  const exportRes = await fetch(`${BASE_URL}/api/admin/export?type=projects`, {
    headers: { Cookie: adminCookie },
  });
  assert.strictEqual(exportRes.status, 200, "Projects CSV export should return 200");
  const csvText = await exportRes.text();
  assert(csvText.includes("Project ID,Project Name"), "CSV must include proper header row");
  console.log("   ✅ CSV export generated and validated successfully!\n");

  console.log("=================================================");
  console.log("🎉 ALL 12 END-TO-END QA PHASES PASSED WITH 100% SUCCESS!");
  console.log("=================================================");
}

runE2ETests().catch((err) => {
  console.error("❌ E2E QA Test failed:", err);
  process.exit(1);
});
