import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectToDatabase from "./db";
import { User } from "../models/User";
import { StudentProfile } from "../models/StudentProfile";
import { Project, PROJECT_TYPES, ProjectStatus } from "../models/Project";
import { Quotation } from "../models/Quotation";
import { Milestone } from "../models/Milestone";
import { Payment } from "../models/Payment";
import { Notification } from "../models/Notification";
import { ActivityLog } from "../models/ActivityLog";
import { Setting } from "../models/Setting";

export async function runSeed() {
  console.log("Starting database seed process...");
  await connectToDatabase();

  // Clear existing collections
  await Promise.all([
    User.deleteMany({}),
    StudentProfile.deleteMany({}),
    Project.deleteMany({}),
    Quotation.deleteMany({}),
    Milestone.deleteMany({}),
    Payment.deleteMany({}),
    Notification.deleteMany({}),
    ActivityLog.deleteMany({}),
    Setting.deleteMany({}),
  ]);
  console.log("Cleared old collections.");

  // Initialize Settings
  await Setting.create({
    companyName: "NexusDev Solutions Pvt Ltd",
    companyLogo: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&h=100&fit=crop",
    companyAddress: "Innov8 Hub, Koramangala 5th Block, Bengaluru, Karnataka 560095",
    email: "contact@nexusdev.solutions",
    phone: "+91 80 4912 3456",
    taxPercentage: 18,
    defaultQuotationValidityDays: 15,
    defaultPaymentTerms: "50% Advance upon approval, 30% on milestone demo, 20% on final handover.",
    notificationEmailEnabled: true,
  });

  // 1. Create Admin
  const adminPasswordHash = await bcrypt.hash("Admin@12345", 10);
  const admin = await User.create({
    name: "Vikram Malhotra (Super Admin)",
    email: "admin@example.com",
    passwordHash: adminPasswordHash,
    role: "ADMIN",
    status: "ACTIVE",
    mustChangePassword: false,
    lastLogin: new Date(),
  });

  // 2. Create Campus Ambassadors (Students)
  const studentPasswordHash = await bcrypt.hash("Student@12345", 10);
  const ambassadorsData = [
    {
      name: "Aarav Sharma",
      email: "student@example.com",
      mustChangePassword: true, // As requested in requirement 45 & 6
      phone: "+91 98231 45670",
      collegeName: "IIT Delhi",
      university: "Indian Institute of Technology",
      course: "B.Tech",
      branch: "Computer Science and Engineering",
      semester: "6th Semester",
      collegeId: "2023CSB1042",
      ambassadorId: "CA-2026-0001",
      referralCode: "AARAV26",
    },
    {
      name: "Ananya Iyer",
      email: "ananya.iyer@example.com",
      mustChangePassword: false,
      phone: "+91 98112 34567",
      collegeName: "BITS Pilani",
      university: "Birla Institute of Technology and Science",
      course: "B.E. (Hons)",
      branch: "Information Technology",
      semester: "7th Semester",
      collegeId: "2022B4A70891P",
      ambassadorId: "CA-2026-0002",
      referralCode: "ANANYA26",
    },
    {
      name: "Rohan Varma",
      email: "rohan.varma@example.com",
      mustChangePassword: false,
      phone: "+91 97412 88990",
      collegeName: "NIT Trichy",
      university: "National Institute of Technology",
      course: "B.Tech",
      branch: "Electronics and Communication",
      semester: "6th Semester",
      collegeId: "NITT-2023-EC-44",
      ambassadorId: "CA-2026-0003",
      referralCode: "ROHAN26",
    },
    {
      name: "Pooja Hegde",
      email: "pooja.hegde@example.com",
      mustChangePassword: false,
      phone: "+91 99001 22334",
      collegeName: "RV College of Engineering",
      university: "VTU Belagavi",
      course: "B.E.",
      branch: "Data Science & AI",
      semester: "8th Semester",
      collegeId: "1RV22AI089",
      ambassadorId: "CA-2026-0004",
      referralCode: "POOJA26",
    },
    {
      name: "Karan Singhania",
      email: "karan.singhania@example.com",
      mustChangePassword: false,
      phone: "+91 98765 11223",
      collegeName: "Delhi Technological University (DTU)",
      university: "Delhi Technological University",
      course: "B.Tech",
      branch: "Software Engineering",
      semester: "5th Semester",
      collegeId: "2K23/SE/112",
      ambassadorId: "CA-2026-0005",
      referralCode: "KARAN26",
    },
    {
      name: "Sneha Reddy",
      email: "sneha.reddy@example.com",
      mustChangePassword: false,
      phone: "+91 94400 55667",
      collegeName: "VIT Vellore",
      university: "Vellore Institute of Technology",
      course: "B.Tech",
      branch: "Computer Science",
      semester: "6th Semester",
      collegeId: "22BCE1567",
      ambassadorId: "CA-2026-0006",
      referralCode: "SNEHA26",
    },
    {
      name: "Dev Patel",
      email: "dev.patel@example.com",
      mustChangePassword: false,
      phone: "+91 97234 88776",
      collegeName: "Nirma University",
      university: "Nirma University Ahmedabad",
      course: "B.Tech",
      branch: "Computer Engineering",
      semester: "7th Semester",
      collegeId: "NU22CE098",
      ambassadorId: "CA-2026-0007",
      referralCode: "DEV26",
    },
    {
      name: "Meera Nair",
      email: "meera.nair@example.com",
      mustChangePassword: false,
      phone: "+91 94950 12345",
      collegeName: "College of Engineering Guindy (Anna Univ)",
      university: "Anna University Chennai",
      course: "B.Tech",
      branch: "Information Technology",
      semester: "6th Semester",
      collegeId: "2023IT045",
      ambassadorId: "CA-2026-0008",
      referralCode: "MEERA26",
    },
    {
      name: "Aditya Joshi",
      email: "aditya.joshi@example.com",
      mustChangePassword: false,
      phone: "+91 98200 99887",
      collegeName: "VJTI Mumbai",
      university: "Mumbai University",
      course: "B.Tech",
      branch: "Computer Engineering",
      semester: "8th Semester",
      collegeId: "211080034",
      ambassadorId: "CA-2026-0009",
      referralCode: "ADITYA26",
    },
    {
      name: "Tanvi Saxena",
      email: "tanvi.saxena@example.com",
      mustChangePassword: false,
      phone: "+91 91234 56789",
      collegeName: "Manipal Institute of Technology",
      university: "MAHE Manipal",
      course: "B.Tech",
      branch: "Cyber Security",
      semester: "5th Semester",
      collegeId: "230911044",
      ambassadorId: "CA-2026-0010",
      referralCode: "TANVI26",
    },
  ];

  const createdStudents = [];

  for (const s of ambassadorsData) {
    const user = await User.create({
      name: s.name,
      email: s.email,
      passwordHash: studentPasswordHash,
      role: "STUDENT",
      status: "ACTIVE",
      mustChangePassword: s.mustChangePassword,
      lastLogin: new Date(Date.now() - Math.floor(Math.random() * 10 * 86400000)),
    });

    const profile = await StudentProfile.create({
      userId: user._id,
      ambassadorId: s.ambassadorId,
      phone: s.phone,
      collegeName: s.collegeName,
      university: s.university,
      course: s.course,
      branch: s.branch,
      semester: s.semester,
      collegeId: s.collegeId,
      joiningDate: new Date("2026-01-15"),
      referralCode: s.referralCode,
      status: "ACTIVE",
    });

    createdStudents.push({ user, profile });
  }
  console.log(`Created ${createdStudents.length} Campus Ambassadors.`);

  // 3. Create 20 Projects
  const projectTemplates = [
    {
      name: "AI Campus Attendance & Facial Recognition System",
      type: "AI/ML",
      budget: 65000,
      status: "WORKING" as ProjectStatus,
      client: "Dr. K. Swaminathan (HOD CSE)",
      desc: "Deep learning based multi-camera real-time attendance system for campus lecture halls with spoof detection.",
    },
    {
      name: "Smart Hostel Food Waste Tracker & ERP",
      type: "ERP",
      budget: 45000,
      status: "APPROVED" as ProjectStatus,
      client: "Hostel Committee Council",
      desc: "IoT scale weighing integration with meal coupon management, pantry inventory, and student mess billing.",
    },
    {
      name: "Blockchain Credential & Degree Verification Portal",
      type: "Web Application",
      budget: 85000,
      status: "TESTING" as ProjectStatus,
      client: "Controller of Examinations",
      desc: "Tamper-proof verifiable credential registry on Ethereum L2 with QR code instant verification for employers.",
    },
    {
      name: "Autonomous Campus Rover for Parcel Delivery",
      type: "AI/ML",
      budget: 120000,
      status: "WORKING" as ProjectStatus,
      client: "Robotics Club Lead",
      desc: "ROS2 navigation stack with LiDAR SLAM and obstacle avoidance for last-mile intra-campus parcel drops.",
    },
    {
      name: "Student Placement & Resume Screener ATS",
      type: "Web Application",
      budget: 55000,
      status: "COMPLETED" as ProjectStatus,
      client: "Training & Placement Cell",
      desc: "NLP parser extracting skills, matching JD benchmarks, and running automated recruiter interview scheduling.",
    },
    {
      name: "College Fest Ticketing & Live Event App",
      type: "Mobile Application",
      budget: 48000,
      status: "DELIVERED" as ProjectStatus,
      client: "Cultural Fest Convener",
      desc: "High-concurrency React Native ticketing with offline QR gates scanner, artist schedules, and push alerts.",
    },
    {
      name: "Smart Parking Guidance with Ultrasonic Sensors",
      type: "Desktop Application",
      budget: 38000,
      status: "QUOTATION_SENT" as ProjectStatus,
      client: "Campus Estate Office",
      desc: "Real-time spot vacancy mapping dashboard with automated gate boom barrier license plate recognition.",
    },
    {
      name: "Healthcare Clinic Patient Management & Tele-Consult",
      type: "CRM",
      budget: 70000,
      status: "UNDER_REVIEW" as ProjectStatus,
      client: "University Health Center",
      desc: "HIPAA compliant student wellness portal with WebRTC video calling and prescription e-signatures.",
    },
    {
      name: "Peer-to-Peer Academic Notes & Book Exchange",
      type: "E-commerce",
      budget: 32000,
      status: "SUBMITTED" as ProjectStatus,
      client: "Library Student Council",
      desc: "Marketplace for seniors selling notes, textbooks, lab equipment with escrow UPI payments.",
    },
    {
      name: "Air Quality & Ambient Noise Acoustic Monitor",
      type: "Data Science",
      budget: 52000,
      status: "ASSIGNED" as ProjectStatus,
      client: "Environmental Science Dept",
      desc: "Time series LSTM predictive modeling for particulate matter PM2.5 and sound pollution alerts.",
    },
    {
      name: "Alumni Donation & Mentorship Networking Engine",
      type: "Web Application",
      budget: 75000,
      status: "AWAITING_APPROVAL" as ProjectStatus,
      client: "Alumni Relations Dean",
      desc: "Crowdfunding campaigns, tax-deductible receipts, 1-on-1 alumni mentorship appointment booking.",
    },
    {
      name: "Electric Vehicle Battery Swapping Station IoT Gateway",
      type: "Web Application",
      budget: 95000,
      status: "CLIENT_REVIEW" as ProjectStatus,
      client: "EV Club & Mechanical Dept",
      desc: "CAN bus telemetry logger with MQTT broker, battery state of charge (SoC) estimation, and billing.",
    },
    {
      name: "Lab Inventory Management & Chemicals Expiry Tracker",
      type: "ERP",
      budget: 42000,
      status: "CHANGES_REQUESTED" as ProjectStatus,
      client: "Chemistry Department Head",
      desc: "Barcode scanner check-in/out, MSDS hazard warnings, and minimum stock automated procurement requisition.",
    },
    {
      name: "Student Mental Health Counseling Chatbot",
      type: "AI/ML",
      budget: 60000,
      status: "READY_FOR_DELIVERY" as ProjectStatus,
      client: "Student Wellness Cell",
      desc: "Empathetic conversational agent trained on CBT frameworks with crisis escalation protocols.",
    },
    {
      name: "Inter-College Sports Tournament Scoring & Fixtures",
      type: "Mobile Application",
      budget: 35000,
      status: "PAYMENT_PENDING" as ProjectStatus,
      client: "Physical Education Director",
      desc: "Live ball-by-ball cricket, football, basketball scoreboards with referee whistle logs and leaderboards.",
    },
    {
      name: "Augmented Reality Virtual Campus Tour for Freshers",
      type: "Mobile Application",
      budget: 80000,
      status: "WORKING" as ProjectStatus,
      client: "Admissions Office",
      desc: "ARKit/ARCore geo-anchored interactive 3D markers for campus landmarks, labs, and auditoriums.",
    },
    {
      name: "Solar Microgrid Energy Optimization & Load Forecasting",
      type: "Data Science",
      budget: 90000,
      status: "SUBMITTED" as ProjectStatus,
      client: "Renewable Energy Research Group",
      desc: "XGBoost solar generation prediction vs campus peak loads to trigger battery dispatch protocols.",
    },
    {
      name: "Digital Noticeboard & Department Kiosk Display",
      type: "Desktop Application",
      budget: 28000,
      status: "COMPLETED" as ProjectStatus,
      client: "Dean of Academics",
      desc: "Electron-based multi-screen synchronized digital signage with emergency alert broadcast override.",
    },
    {
      name: "Student Grievance & Anonymous Whistleblower Portal",
      type: "Web Application",
      budget: 40000,
      status: "APPROVED" as ProjectStatus,
      client: "Ombudsman Committee",
      desc: "Zero-knowledge anonymous encrypted complaint submission with SLA ticket routing and resolution tracking.",
    },
    {
      name: "Autonomous Drone for Campus Security Surveillance",
      type: "AI/ML",
      budget: 135000,
      status: "UNDER_REVIEW" as ProjectStatus,
      client: "Chief Security Officer",
      desc: "Night-vision thermal object detection with automated perimeter geofencing patrol path planner.",
    },
  ];

  const createdProjects = [];

  for (let i = 0; i < projectTemplates.length; i++) {
    const tmpl = projectTemplates[i];
    const ambassador = createdStudents[i % createdStudents.length];
    const projectNum = String(i + 1).padStart(5, "0");
    const projectId = `PRJ-2026-${projectNum}`;

    const project = await Project.create({
      projectId,
      studentId: ambassador.user._id,
      projectName: tmpl.name,
      clientName: tmpl.client,
      clientEmail: `client.${i + 1}@${ambassador.profile.collegeName.toLowerCase().replace(/[^a-z]/g, "")}.edu`,
      clientPhone: `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`,
      collegeName: ambassador.profile.collegeName,
      department: ambassador.profile.branch,
      projectType: tmpl.type as any,
      description: tmpl.desc,
      requirements: {
        functionalRequirements: `1. User authentication and RBAC.\n2. Real-time data sync.\n3. Comprehensive reporting and analytics.\n4. Audit trails and automated alerts.`,
        technicalRequirements: `Built with Next.js, TypeScript, Tailwind CSS, secure REST/WebSocket APIs, and MongoDB.`,
        expectedFeatures: `Mobile responsive dashboard, automated PDF export, email notifications, role permissions.`,
        referenceLinks: `https://github.com/example/${tmpl.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      },
      expectedBudget: tmpl.budget,
      approvedBudget: ["APPROVED", "WORKING", "TESTING", "CLIENT_REVIEW", "READY_FOR_DELIVERY", "DELIVERED", "PAYMENT_PENDING", "COMPLETED"].includes(tmpl.status)
        ? tmpl.budget
        : undefined,
      status: tmpl.status,
      startDate: ["WORKING", "TESTING", "CLIENT_REVIEW", "READY_FOR_DELIVERY", "DELIVERED", "PAYMENT_PENDING", "COMPLETED"].includes(tmpl.status)
        ? new Date(Date.now() - 30 * 86400000)
        : undefined,
      expectedDeliveryDate: new Date(Date.now() + 30 * 86400000),
      actualDeliveryDate: ["DELIVERED", "COMPLETED"].includes(tmpl.status)
        ? new Date(Date.now() - 5 * 86400000)
        : undefined,
      assignedTeam: ["Anand K. (Lead Architect)", "Priya S. (Full-Stack Engineer)", "Rohan M. (QA Tester)"],
      notes: "Project initiated through Campus Ambassador program with high campus visibility.",
    });

    createdProjects.push({ project, ambassador });

    // Activity Log for project creation
    await ActivityLog.create({
      userId: ambassador.user._id,
      role: "STUDENT",
      action: "PROJECT_SUBMITTED",
      projectId: project._id,
      entityId: project.projectId,
      entityType: "PROJECT",
      description: `${ambassador.user.name} submitted project ${project.projectId}: "${project.projectName}".`,
      metadata: { budget: project.expectedBudget, type: project.projectType },
      createdAt: new Date(Date.now() - 35 * 86400000),
    });
  }
  console.log(`Created ${createdProjects.length} Projects.`);

  // 4. Create Quotations for projects that reached quotation/approved stages (12+ quotations)
  const quotationProjects = createdProjects.filter(({ project }) =>
    [
      "QUOTATION_SENT",
      "AWAITING_APPROVAL",
      "APPROVED",
      "WORKING",
      "TESTING",
      "CLIENT_REVIEW",
      "CHANGES_REQUESTED",
      "READY_FOR_DELIVERY",
      "DELIVERED",
      "PAYMENT_PENDING",
      "COMPLETED",
    ].includes(project.status)
  );

  let qCount = 1;
  for (const { project, ambassador } of quotationProjects) {
    const qNum = String(qCount).padStart(4, "0");
    const quotationId = `QT-2026-${qNum}`;
    const baseBudget = project.expectedBudget;

    const items = [
      {
        description: `Architecture Design & Prototype for ${project.projectName}`,
        quantity: 1,
        unitPrice: Math.round(baseBudget * 0.25),
        amount: Math.round(baseBudget * 0.25),
      },
      {
        description: "Full-Stack Core Feature Implementation & Database Architecture",
        quantity: 1,
        unitPrice: Math.round(baseBudget * 0.5),
        amount: Math.round(baseBudget * 0.5),
      },
      {
        description: "Quality Assurance, Security Hardening & Deployment Setup",
        quantity: 1,
        unitPrice: Math.round(baseBudget * 0.25),
        amount: Math.round(baseBudget * 0.25),
      },
    ];

    const subtotal = items.reduce((acc, it) => acc + it.amount, 0);
    const discount = Math.round(subtotal * 0.05); // 5% discount
    const taxable = subtotal - discount;
    const tax = Math.round(taxable * 0.18); // 18% GST
    const total = taxable + tax;

    let qStatus: any = "ACCEPTED";
    if (project.status === "QUOTATION_SENT") qStatus = "SENT";
    else if (project.status === "AWAITING_APPROVAL") qStatus = "SENT";
    else if (project.status === "CHANGES_REQUESTED") qStatus = "CHANGES_REQUESTED";

    const quotation = await Quotation.create({
      quotationId,
      projectId: project._id,
      version: project.status === "CHANGES_REQUESTED" ? 2 : 1,
      items,
      subtotal,
      discount,
      tax,
      total,
      validUntil: new Date(Date.now() + 15 * 86400000),
      paymentTerms: "50% Advance on signing, 30% Milestone Demo, 20% on final handover.",
      deliveryTimeline: "45 Business Days from advance receipt",
      terms: "1. All deliverables include 60 days of bug-fix warranty.\n2. Source code and deployment documentation fully transferred.\n3. Scope alterations subject to formal change order.",
      notes: "Prepared specially under Campus Ambassador educational partnership program.",
      status: qStatus,
      createdBy: admin._id,
      sentAt: new Date(Date.now() - 25 * 86400000),
      acceptedAt: qStatus === "ACCEPTED" ? new Date(Date.now() - 20 * 86400000) : undefined,
      requestedChanges: qStatus === "CHANGES_REQUESTED" ? "Please include AWS S3 hosting setup and separate mobile responsiveness check." : undefined,
      previousAmount: qStatus === "CHANGES_REQUESTED" ? total + 5000 : undefined,
    });

    // Activity log for quotation
    await ActivityLog.create({
      userId: admin._id,
      role: "ADMIN",
      action: "QUOTATION_CREATED",
      projectId: project._id,
      entityId: quotation.quotationId,
      entityType: "QUOTATION",
      description: `Admin created quotation ${quotation.quotationId} for ${project.projectId} with total ₹${total.toLocaleString()}.`,
      createdAt: new Date(Date.now() - 25 * 86400000),
    });

    if (qStatus === "ACCEPTED") {
      await ActivityLog.create({
        userId: ambassador.user._id,
        role: "STUDENT",
        action: "QUOTATION_ACCEPTED",
        projectId: project._id,
        entityId: quotation.quotationId,
        entityType: "QUOTATION",
        description: `${ambassador.user.name} accepted quotation ${quotation.quotationId}. Project marked as APPROVED.`,
        createdAt: new Date(Date.now() - 20 * 86400000),
      });
    }

    qCount++;
  }
  console.log(`Created ${qCount - 1} Quotations.`);

  // 5. Create Milestones for Active/Completed Projects
  const milestoneProjects = createdProjects.filter(({ project }) =>
    ["WORKING", "TESTING", "CLIENT_REVIEW", "READY_FOR_DELIVERY", "DELIVERED", "COMPLETED"].includes(project.status)
  );

  for (const { project } of milestoneProjects) {
    const isCompleted = ["DELIVERED", "COMPLETED"].includes(project.status);
    await Milestone.create([
      {
        projectId: project._id,
        name: "Requirement Finalization & UX Wireframing",
        description: "SRS signoff, Figma wireframes, database schema definition.",
        startDate: new Date(Date.now() - 28 * 86400000),
        dueDate: new Date(Date.now() - 22 * 86400000),
        completedAt: new Date(Date.now() - 23 * 86400000),
        status: "COMPLETED",
        progress: 100,
        assignedTo: "Lead Designer",
      },
      {
        projectId: project._id,
        name: "Core Backend APIs & MongoDB Models",
        description: "REST endpoints, auth middleware, indexing, transactional queries.",
        startDate: new Date(Date.now() - 21 * 86400000),
        dueDate: new Date(Date.now() - 10 * 86400000),
        completedAt: new Date(Date.now() - 11 * 86400000),
        status: "COMPLETED",
        progress: 100,
        assignedTo: "Backend Engineer",
      },
      {
        projectId: project._id,
        name: "Frontend Integration & Dashboard Components",
        description: "Next.js UI screens, charts, tables, responsive views.",
        startDate: new Date(Date.now() - 9 * 86400000),
        dueDate: new Date(Date.now() + 5 * 86400000),
        completedAt: isCompleted ? new Date(Date.now() - 6 * 86400000) : undefined,
        status: isCompleted ? "COMPLETED" : "IN_PROGRESS",
        progress: isCompleted ? 100 : 75,
        assignedTo: "Frontend Engineer",
      },
      {
        projectId: project._id,
        name: "Testing, QA & Staging Deployment",
        description: "End-to-end user acceptance testing and bug resolution.",
        startDate: new Date(Date.now() + 6 * 86400000),
        dueDate: new Date(Date.now() + 15 * 86400000),
        completedAt: isCompleted ? new Date(Date.now() - 3 * 86400000) : undefined,
        status: isCompleted ? "COMPLETED" : "PENDING",
        progress: isCompleted ? 100 : 0,
        assignedTo: "QA Specialist",
      },
    ]);
  }
  console.log("Created project milestones.");

  // 6. Create Payments
  for (const { project, ambassador } of milestoneProjects) {
    const isCompleted = ["DELIVERED", "COMPLETED"].includes(project.status);
    const amount1 = Math.round(project.expectedBudget * 0.5);

    // Initial Advance Payment
    await Payment.create({
      projectId: project._id,
      amount: amount1,
      paymentDate: new Date(Date.now() - 18 * 86400000),
      paymentMethod: "UPI",
      transactionReference: `UPI-TXN-${Math.floor(100000000 + Math.random() * 900000000)}`,
      receiptUrl: "https://example.com/receipts/rec-001.pdf",
      notes: "Advance 50% payment received upon project kickoff.",
      createdBy: admin._id,
    });

    await ActivityLog.create({
      userId: admin._id,
      role: "ADMIN",
      action: "PAYMENT_RECORDED",
      projectId: project._id,
      entityId: `PAY-${project.projectId}`,
      entityType: "PAYMENT",
      description: `Payment of ₹${amount1.toLocaleString()} recorded for ${project.projectId}.`,
      createdAt: new Date(Date.now() - 18 * 86400000),
    });

    if (isCompleted) {
      const amount2 = project.expectedBudget - amount1;
      await Payment.create({
        projectId: project._id,
        amount: amount2,
        paymentDate: new Date(Date.now() - 4 * 86400000),
        paymentMethod: "Bank Transfer",
        transactionReference: `NEFT-HDFC-${Math.floor(100000000 + Math.random() * 900000000)}`,
        receiptUrl: "https://example.com/receipts/rec-002.pdf",
        notes: "Final settlement received on project handover.",
        createdBy: admin._id,
      });

      await ActivityLog.create({
        userId: admin._id,
        role: "ADMIN",
        action: "PAYMENT_RECORDED",
        projectId: project._id,
        entityId: `PAY-${project.projectId}-FINAL`,
        entityType: "PAYMENT",
        description: `Final payment of ₹${amount2.toLocaleString()} recorded for ${project.projectId}.`,
        createdAt: new Date(Date.now() - 4 * 86400000),
      });
    }
  }
  console.log("Created payments and activity logs.");

  // 7. Create In-App Notifications
  const primaryStudent = createdStudents[0];
  await Notification.create([
    {
      userId: primaryStudent.user._id,
      title: "Welcome to Campus Ambassador Program!",
      message: "Your ambassador profile CA-2026-0001 is active. Please explore the dashboard and start submitting student projects.",
      type: "SUCCESS",
      relatedEntityId: "CA-2026-0001",
      relatedEntityType: "STUDENT",
      isRead: false,
    },
    {
      userId: primaryStudent.user._id,
      title: "Quotation Generated for Review",
      message: "An official quotation has been sent for your project. Please review price breakdown and payment terms.",
      type: "QUOTATION",
      relatedEntityId: "PRJ-2026-00001",
      relatedEntityType: "PROJECT",
      isRead: false,
    },
    {
      userId: admin._id,
      title: "New Project Submitted: PRJ-2026-00001",
      message: `${primaryStudent.user.name} from IIT Delhi submitted a new AI/ML project.`,
      type: "PROJECT",
      relatedEntityId: "PRJ-2026-00001",
      relatedEntityType: "PROJECT",
      isRead: false,
    },
    {
      userId: admin._id,
      title: "Payment Recorded",
      message: "Advance payment of ₹32,500 successfully marked for PRJ-2026-00001.",
      type: "PAYMENT",
      relatedEntityId: "PRJ-2026-00001",
      relatedEntityType: "PROJECT",
      isRead: true,
    },
  ]);

  console.log("Database seed completed successfully!");
}

// Allow direct CLI execution: `npx tsx src/lib/seed.ts`
if (require.main === module) {
  runSeed()
    .then(() => {
      console.log("Seed script execution finished.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seed script failed:", err);
      process.exit(1);
    });
}
