/**
 * Mock seed data for Stage 2. Every amount and event here is fictional.
 * All dates are relative to MOCK_NOW so the data stays deterministic.
 */
import type {
  AuditEntry,
  Dispute,
  Job,
  JobEventType,
  JobStatus,
  Notification,
  PaymentStatus,
  PayoutAccount,
  ThreadItem,
  Transaction,
  User,
} from "@/lib/domain/types";

export const MOCK_NOW = Date.parse("2026-11-26T12:00:00+01:00");
export const CURRENT_USER_ID = "u_me";

/** ISO date `days` from MOCK_NOW (negative = past), plus optional hours. */
export function at(days: number, hours = 0): string {
  return new Date(MOCK_NOW + days * 86_400_000 + hours * 3_600_000).toISOString();
}

const naira = (n: number) => n * 100;

/* ---------- Users ---------- */

type FreelancerSeed = Omit<User, "roles" | "isAdmin" | "verified" | "status" | "email" | "phone"> & {
  alsoClient?: boolean;
};

function freelancer(u: FreelancerSeed): User {
  return {
    ...u,
    email: `${u.username}@example.com`,
    phone: "+234 800 000 0000",
    roles: { client: Boolean(u.alsoClient), freelancer: true },
    isAdmin: false,
    verified: { email: true, phone: true },
    status: "active",
  };
}

const UYO = { country: "Nigeria", state: "Akwa Ibom", city: "Uyo" };

export const seedUsers: User[] = [
  {
    id: CURRENT_USER_ID,
    username: "tobi.essien",
    firstName: "Tobi",
    lastName: "Essien",
    displayName: "Tobi Essien",
    email: "tobi.essien@example.com",
    phone: "+234 803 000 1122",
    bio: "Final-year Computer Science student at UNIUYO. I build fast, accessible websites and hire designers for side projects.",
    location: UYO,
    avatarHue: 220,
    roles: { client: true, freelancer: true },
    isAdmin: true,
    verified: { email: true, phone: true },
    status: "active",
    joinedAt: at(-120),
    freelancer: {
      title: "Frontend developer",
      skills: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Accessibility"],
      categories: ["development"],
      experience: "intermediate",
      description:
        "I build responsive marketing sites and web apps with React and Next.js. Clean code, clear communication, and I hand over everything you need to keep the site running.",
      portfolio: [
        { label: "GitHub", url: "https://github.com/" },
        { label: "Hostel finder app", url: "https://example.com/hostel-finder" },
      ],
      pricing: { type: "fixed", from: naira(40_000) },
      availability: "available",
    },
    client: {
      kind: "individual",
      hiringPreferences: "Design and photography for personal and student projects.",
    },
  },
  freelancer({
    id: "u_ada",
    username: "ada.okon",
    firstName: "Ada",
    lastName: "Okon",
    displayName: "Ada Okon",
    bio: "Brand and visual designer. Fine Arts, UNIUYO.",
    location: UYO,
    avatarHue: 340,
    joinedAt: at(-300),
    freelancer: {
      title: "Brand & visual designer",
      skills: ["Brand identity", "Logo design", "Figma", "Illustrator", "Packaging"],
      categories: ["design"],
      experience: "expert",
      description:
        "I help small businesses and student founders look professional from day one: logos, brand guides, menus, packaging and social templates.",
      portfolio: [
        { label: "Behance", url: "https://www.behance.net/" },
        { label: "Dribbble", url: "https://dribbble.com/" },
      ],
      pricing: { type: "fixed", from: naira(50_000) },
      availability: "available",
    },
  }),
  freelancer({
    id: "u_emeka",
    username: "emeka.udo",
    firstName: "Emeka",
    lastName: "Udo",
    displayName: "Emeka Udo",
    bio: "Full-stack developer. I like shipping things.",
    location: UYO,
    avatarHue: 160,
    joinedAt: at(-210),
    freelancer: {
      title: "Full-stack developer",
      skills: ["Node.js", "React", "PostgreSQL", "APIs", "Paystack"],
      categories: ["development"],
      experience: "expert",
      description:
        "Websites and web apps end to end: database, backend, frontend and deployment. I've built booking systems, dashboards and e-commerce stores.",
      portfolio: [{ label: "Portfolio", url: "https://example.com/emeka" }],
      pricing: { type: "fixed", from: naira(80_000) },
      availability: "limited",
    },
  }),
  freelancer({
    id: "u_zainab",
    username: "zainab.bello",
    firstName: "Zainab",
    lastName: "Bello",
    displayName: "Zainab Bello",
    bio: "Product and event photographer based in Uyo.",
    location: UYO,
    avatarHue: 30,
    joinedAt: at(-90),
    freelancer: {
      title: "Product & event photographer",
      skills: ["Product photography", "Lightroom", "Event coverage", "Retouching"],
      categories: ["photography"],
      experience: "intermediate",
      description:
        "Clean, bright product photos for online stores and social media, plus event coverage for departments and societies.",
      portfolio: [{ label: "Instagram", url: "https://www.instagram.com/" }],
      pricing: { type: "fixed", from: naira(25_000) },
      availability: "available",
    },
  }),
  freelancer({
    id: "u_ifeoma",
    username: "ifeoma.nwosu",
    firstName: "Ifeoma",
    lastName: "Nwosu",
    displayName: "Ifeoma Nwosu",
    bio: "Statistics postgraduate. Survey design and data analysis.",
    location: { country: "Nigeria", state: "Akwa Ibom", city: "Ikot Ekpene" },
    avatarHue: 270,
    joinedAt: at(-150),
    freelancer: {
      title: "Data analyst & researcher",
      skills: ["SPSS", "Excel", "Python", "Survey design", "Data visualisation"],
      categories: ["research"],
      experience: "expert",
      description:
        "From questionnaire to final chapter: I design surveys, clean data and run the analysis, with clear write-ups of what the numbers mean.",
      portfolio: [],
      pricing: { type: "fixed", from: naira(30_000) },
      availability: "available",
    },
  }),
  freelancer({
    id: "u_david",
    username: "david.akpan",
    firstName: "David",
    lastName: "Akpan",
    displayName: "David Akpan",
    bio: "Video editor and motion designer.",
    location: UYO,
    avatarHue: 10,
    joinedAt: at(-60),
    freelancer: {
      title: "Video editor & motion designer",
      skills: ["Premiere Pro", "After Effects", "Reels", "Colour grading"],
      categories: ["video"],
      experience: "intermediate",
      description:
        "Short-form edits for Reels and TikTok, event highlight videos and simple motion graphics.",
      portfolio: [{ label: "YouTube", url: "https://www.youtube.com/" }],
      pricing: { type: "fixed", from: naira(20_000) },
      availability: "available",
    },
  }),
  freelancer({
    id: "u_blessing",
    username: "blessing.etim",
    firstName: "Blessing",
    lastName: "Etim",
    displayName: "Blessing Etim",
    bio: "Copywriter and editor. English & Literary Studies.",
    location: UYO,
    avatarHue: 190,
    joinedAt: at(-45),
    freelancer: {
      title: "Copywriter & editor",
      skills: ["Copywriting", "Proofreading", "CV writing", "Blog posts"],
      categories: ["writing", "marketing"],
      experience: "intermediate",
      description:
        "Website copy, product descriptions, CVs and cover letters, and careful proofreading for projects and theses.",
      portfolio: [{ label: "Writing samples", url: "https://example.com/blessing" }],
      pricing: { type: "fixed", from: naira(10_000) },
      availability: "limited",
    },
  }),
  freelancer({
    id: "u_samuel",
    username: "samuel.obi",
    firstName: "Samuel",
    lastName: "Obi",
    displayName: "Samuel Obi",
    bio: "Maths and physics tutor.",
    location: UYO,
    avatarHue: 120,
    joinedAt: at(-30),
    freelancer: {
      title: "Maths & physics tutor",
      skills: ["Calculus", "Physics", "JAMB prep", "Post-UTME"],
      categories: ["tutoring"],
      experience: "expert",
      description: "One-to-one and small-group lessons for 100–200 level courses and entrance exams.",
      portfolio: [],
      pricing: { type: "hourly", from: naira(5_000) },
      availability: "unavailable",
    },
  }),
  freelancer({
    id: "u_amaka",
    username: "amaka.eze",
    firstName: "Amaka",
    lastName: "Eze",
    displayName: "Amaka Eze",
    bio: "Social media manager for small brands.",
    location: { country: "Nigeria", state: "Rivers", city: "Port Harcourt" },
    avatarHue: 300,
    joinedAt: at(-20),
    freelancer: {
      title: "Social media manager",
      skills: ["Content calendars", "Instagram", "Canva", "Meta Ads"],
      categories: ["marketing"],
      experience: "entry",
      description:
        "Monthly content planning and posting for small businesses, plus simple ad campaigns.",
      portfolio: [],
      pricing: { type: "fixed", from: naira(35_000) },
      availability: "available",
    },
  }),
  // Clients
  {
    id: "u_chidi",
    username: "chidi.okafor",
    firstName: "Chidi",
    lastName: "Okafor",
    displayName: "Chidi Okafor",
    email: "chidi.okafor@example.com",
    phone: "+234 800 000 0000",
    bio: "Founder, HostelHub Uyo.",
    location: UYO,
    avatarHue: 45,
    roles: { client: true, freelancer: false },
    isAdmin: false,
    verified: { email: true, phone: true },
    status: "active",
    joinedAt: at(-100),
    client: {
      kind: "organisation",
      organisationName: "HostelHub Uyo",
      industry: "Student housing",
      description: "Helping UNIUYO students find verified off-campus hostels.",
    },
  },
  {
    id: "u_grace",
    username: "grace.inyang",
    firstName: "Grace",
    lastName: "Inyang",
    displayName: "Grace Inyang",
    email: "grace.inyang@example.com",
    phone: "+234 800 000 0000",
    bio: "President, UNIUYO Tech Club.",
    location: UYO,
    avatarHue: 200,
    roles: { client: true, freelancer: false },
    isAdmin: false,
    verified: { email: true, phone: false },
    status: "active",
    joinedAt: at(-80),
    client: {
      kind: "organisation",
      organisationName: "UNIUYO Tech Club",
      industry: "Student organisation",
      description: "Workshops, hackathons and events for tech students.",
    },
  },
  {
    id: "u_bassey",
    username: "bassey.edet",
    firstName: "Bassey",
    lastName: "Edet",
    displayName: "Bassey Edet",
    email: "bassey.edet@example.com",
    phone: "+234 800 000 0000",
    bio: "Runs a small logistics business.",
    location: UYO,
    avatarHue: 80,
    roles: { client: true, freelancer: false },
    isAdmin: false,
    verified: { email: true, phone: true },
    status: "active",
    joinedAt: at(-70),
    client: { kind: "organisation", organisationName: "Edet Logistics", industry: "Logistics" },
  },
  {
    id: "u_kunle",
    username: "kunle.adeyemi",
    firstName: "Kunle",
    lastName: "Adeyemi",
    displayName: "Kunle Adeyemi",
    email: "kunle.adeyemi@example.com",
    phone: "+234 800 000 0000",
    bio: "Architecture student.",
    location: UYO,
    avatarHue: 25,
    roles: { client: true, freelancer: false },
    isAdmin: false,
    verified: { email: true, phone: true },
    status: "suspended",
    joinedAt: at(-200),
    client: { kind: "individual" },
  },
];

/* ---------- Jobs ---------- */

let seq = 0;
const uid = (p: string) => `${p}_${(++seq).toString(36)}`;

const ev = (event: JobEventType, day: number, hour = 0, actorId?: string, note?: string): ThreadItem => ({
  kind: "event",
  id: uid("ev"),
  event,
  actorId,
  note,
  createdAt: at(day, hour),
});

const msg = (authorId: string, body: string, day: number, hour = 0, files: string[] = []): ThreadItem => ({
  kind: "message",
  id: uid("msg"),
  authorId,
  body,
  attachments: files.map((name, i) => ({ id: uid("file"), name, sizeBytes: 240_000 + i * 180_000 })),
  createdAt: at(day, hour),
});

interface JobSeed {
  id: string;
  title: string;
  description: string;
  category: Job["category"];
  budget: number;
  deadlineIn: number;
  skills: string[];
  deliverables: string[];
  clientId: string;
  freelancerId: string;
  status: JobStatus;
  paymentStatus: PaymentStatus;
  revisionsUsed?: number;
  createdDay: number;
  thread: ThreadItem[];
  submissions?: Job["submissions"];
  disputeId?: string;
  statusBeforeDispute?: JobStatus;
  serviceId?: string;
  packageName?: string;
}

function job(s: JobSeed): Job {
  const last = s.thread.at(-1)?.createdAt ?? at(s.createdDay);
  return {
    id: s.id,
    title: s.title,
    description: s.description,
    category: s.category,
    budget: naira(s.budget),
    deadline: at(s.deadlineIn),
    skills: s.skills,
    deliverables: s.deliverables.map((title) => ({ id: uid("dl"), title })),
    attachments: [],
    clientId: s.clientId,
    freelancerId: s.freelancerId,
    status: s.status,
    paymentStatus: s.paymentStatus,
    revisionsAllowed: 2,
    revisionsUsed: s.revisionsUsed ?? 0,
    submissions: s.submissions ?? [],
    thread: s.thread,
    lastReadAt: { [s.clientId]: last, [s.freelancerId]: last },
    serviceId: s.serviceId,
    packageName: s.packageName,
    disputeId: s.disputeId,
    statusBeforeDispute: s.statusBeforeDispute,
    createdAt: at(s.createdDay),
    updatedAt: last,
  };
}

const ME = CURRENT_USER_ID;

export const seedJobs: Job[] = [
  /* ---- Tobi as client ---- */
  job({
    id: "job_brand",
    title: "Brand identity for Bean There café",
    description:
      "Bean There is a small café opening near the UNIUYO main gate. We need a simple, warm brand: logo, colours, type, and a one-page menu design we can print.",
    category: "design",
    budget: 85_000,
    deadlineIn: 4,
    skills: ["Brand identity", "Logo design"],
    deliverables: ["Logo and variations", "Colour and type guide", "Printable menu template"],
    clientId: ME,
    freelancerId: "u_ada",
    status: "submitted",
    paymentStatus: "available",
    serviceId: "svc_brand",
    packageName: "Premium",
    createdDay: -12,
    submissions: [
      {
        id: "sub_brand_1",
        note: "Final files attached: logo pack (SVG/PNG), brand guide PDF and the menu in A4. Route B with the darker green as discussed.",
        files: [
          { id: "f1", name: "bean-there-logo-pack.zip", sizeBytes: 4_200_000 },
          { id: "f2", name: "brand-guide.pdf", sizeBytes: 1_800_000 },
          { id: "f3", name: "menu-a4.pdf", sizeBytes: 900_000 },
        ],
        createdAt: at(0, -3),
      },
    ],
    thread: [
      ev("job_sent", -12, 0, ME),
      ev("job_accepted", -11, 2, "u_ada"),
      ev("payment_initiated", -11, 4, ME),
      ev("payment_confirmed", -11, 4.1),
      ev("work_started", -11, 6, "u_ada"),
      msg("u_ada", "Hi Tobi! Thanks for the brief. Could you share any cafés whose look you like?", -11, 6.2),
      msg(ME, "Something warm and minimal. Think kraft paper, deep green, a bit playful.", -11, 7),
      msg("u_ada", "First logo directions are up. Two routes: warm and minimal.", -7, 3, ["routes-v1.pdf"]),
      msg(ME, "Route B is great. Can we try a darker green?", -7, 5),
      msg("u_ada", "Done. Working on the guide and menu now.", -5, 2),
      ev("delivery_submitted", 0, -3, "u_ada"),
    ],
  }),
  job({
    id: "job_landing",
    title: "Landing page for a student startup",
    description:
      "One-page website for StudyPal, a peer-tutoring app. Hero, features, waitlist form connected to a Google Sheet, mobile friendly.",
    category: "development",
    budget: 120_000,
    deadlineIn: 9,
    skills: ["Next.js", "Tailwind CSS"],
    deliverables: ["Responsive landing page", "Waitlist form", "Deployed site + source code"],
    clientId: ME,
    freelancerId: "u_emeka",
    status: "in_progress",
    paymentStatus: "pending_settlement",
    createdDay: -4,
    thread: [
      ev("job_sent", -4, 0, ME),
      ev("job_accepted", -3, 1, "u_emeka"),
      ev("payment_initiated", -3, 3, ME),
      ev("payment_confirmed", -3, 3.1),
      ev("work_started", -2, 0, "u_emeka"),
      msg("u_emeka", "Started on the layout. I'll share a preview link by Friday.", -2, 0.5),
    ],
  }),
  job({
    id: "job_photos",
    title: "Product photos for a thrift store",
    description: "30 clean product photos on a white background for our Instagram and WhatsApp catalogue.",
    category: "photography",
    budget: 30_000,
    deadlineIn: 10,
    skills: ["Product photography"],
    deliverables: ["30 edited photos (JPG)", "Square crops for Instagram"],
    clientId: ME,
    freelancerId: "u_zainab",
    status: "pending_response",
    paymentStatus: "not_started",
    serviceId: "svc_photos",
    packageName: "30 photos",
    createdDay: -1,
    thread: [ev("job_sent", -1, 0, ME)],
  }),
  job({
    id: "job_survey",
    title: "Analyse survey data for final-year project",
    description:
      "About 200 responses from a Google Form. I need descriptive stats, two hypothesis tests and charts for Chapter 4.",
    category: "research",
    budget: 45_000,
    deadlineIn: 14,
    skills: ["SPSS", "Data visualisation"],
    deliverables: ["Cleaned dataset", "Analysis output", "Chapter 4 tables and charts"],
    clientId: ME,
    freelancerId: "u_ifeoma",
    status: "accepted",
    paymentStatus: "not_started",
    createdDay: -2,
    thread: [
      ev("job_sent", -2, 0, ME),
      ev("job_accepted", 0, -5, "u_ifeoma"),
      msg("u_ifeoma", "Happy to help. Please share the raw export once the job is funded.", 0, -5),
    ],
  }),
  job({
    id: "job_deck",
    title: "Pitch deck design",
    description: "Redesign a 12-slide pitch deck for a campus competition.",
    category: "design",
    budget: 40_000,
    deadlineIn: -20,
    skills: ["Presentation design"],
    deliverables: ["12-slide deck (Figma + PDF)"],
    clientId: ME,
    freelancerId: "u_ada",
    status: "completed",
    paymentStatus: "transfer_completed",
    createdDay: -35,
    thread: [
      ev("job_sent", -35, 0, ME),
      ev("job_accepted", -35, 3, "u_ada"),
      ev("payment_confirmed", -34, 0),
      ev("work_started", -34, 1, "u_ada"),
      ev("delivery_submitted", -25, 0, "u_ada"),
      ev("work_approved", -24, 0, ME),
      ev("release_requested", -24, 0.1),
      ev("transfer_completed", -23, 0),
      ev("job_completed", -23, 0.1),
    ],
  }),

  /* ---- Tobi as freelancer ---- */
  job({
    id: "job_booking",
    title: "Fix booking form bugs on HostelHub",
    description:
      "Our booking form fails on some Android phones and the date picker shows the wrong month. Need it fixed and tested.",
    category: "development",
    budget: 35_000,
    deadlineIn: 5,
    skills: ["React", "Debugging"],
    deliverables: ["Bug fixes merged", "Short write-up of what changed"],
    clientId: "u_chidi",
    freelancerId: ME,
    status: "pending_response",
    paymentStatus: "not_started",
    createdDay: 0,
    thread: [ev("job_sent", 0, -2, "u_chidi")],
  }),
  job({
    id: "job_event",
    title: "Event website for DevFest Uyo",
    description:
      "A simple event site with schedule, speakers and a registration link. Must be easy for the club to update.",
    category: "development",
    budget: 90_000,
    deadlineIn: 3,
    skills: ["Next.js", "Tailwind CSS"],
    deliverables: ["Event site", "Speakers and schedule pages", "Handover notes"],
    clientId: "u_grace",
    freelancerId: ME,
    status: "revision_requested",
    paymentStatus: "available",
    revisionsUsed: 1,
    createdDay: -15,
    submissions: [
      {
        id: "sub_event_1",
        note: "First version is live on the preview link. All pages done.",
        files: [{ id: "f4", name: "handover-notes.pdf", sizeBytes: 320_000 }],
        createdAt: at(-2),
      },
    ],
    thread: [
      ev("job_sent", -15, 0, "u_grace"),
      ev("job_accepted", -15, 1, ME),
      ev("payment_confirmed", -14, 0),
      ev("work_started", -14, 1, ME),
      ev("delivery_submitted", -2, 0, ME),
      ev("revision_requested", -1, 0, "u_grace", "Please add the sponsors section and make the schedule filterable by track."),
      msg("u_grace", "Looks great overall! Just the two changes in the revision note.", -1, 0.2),
    ],
  }),
  job({
    id: "job_shop",
    title: "Set up an online store",
    description: "Set up a small online store for club merch with 8 products and a payment link.",
    category: "development",
    budget: 60_000,
    deadlineIn: 12,
    skills: ["E-commerce"],
    deliverables: ["Store live with 8 products", "Admin walkthrough video"],
    clientId: "u_grace",
    freelancerId: ME,
    status: "payment_confirmed",
    paymentStatus: "pending_settlement",
    createdDay: -2,
    thread: [
      ev("job_sent", -2, 0, "u_grace"),
      ev("job_accepted", -2, 2, ME),
      ev("payment_initiated", -1, 0, "u_grace"),
      ev("payment_confirmed", -1, 0.1),
    ],
  }),
  job({
    id: "job_portfolio",
    title: "Personal portfolio website",
    description: "Portfolio site to showcase architecture projects.",
    category: "development",
    budget: 50_000,
    deadlineIn: -40,
    skills: ["Next.js"],
    deliverables: ["Portfolio website"],
    clientId: "u_kunle",
    freelancerId: ME,
    status: "completed",
    paymentStatus: "transfer_completed",
    createdDay: -60,
    thread: [
      ev("job_sent", -60, 0, "u_kunle"),
      ev("job_accepted", -60, 1, ME),
      ev("payment_confirmed", -59, 0),
      ev("delivery_submitted", -45, 0, ME),
      ev("work_approved", -44, 0, "u_kunle"),
      ev("transfer_completed", -43, 0),
      ev("job_completed", -43, 0.1),
    ],
  }),
  job({
    id: "job_dashboard",
    title: "Delivery tracking dashboard",
    description: "Internal dashboard showing deliveries per rider per day, pulled from a Google Sheet.",
    category: "development",
    budget: 75_000,
    deadlineIn: -3,
    skills: ["React", "Charts"],
    deliverables: ["Dashboard web app", "Google Sheets connection"],
    clientId: "u_bassey",
    freelancerId: ME,
    status: "disputed",
    paymentStatus: "available",
    createdDay: -20,
    disputeId: "dsp_1",
    statusBeforeDispute: "submitted",
    submissions: [
      {
        id: "sub_dash_1",
        note: "Dashboard deployed. Connected to the sheet you shared.",
        files: [{ id: "f5", name: "dashboard-guide.pdf", sizeBytes: 410_000 }],
        createdAt: at(-4),
      },
    ],
    thread: [
      ev("job_sent", -20, 0, "u_bassey"),
      ev("job_accepted", -20, 1, ME),
      ev("payment_confirmed", -19, 0),
      ev("work_started", -19, 1, ME),
      ev("delivery_submitted", -4, 0, ME),
      msg("u_bassey", "The rider filter doesn't work and some days are missing.", -3, 0),
      msg(ME, "The missing days are empty rows in the sheet. The filter works on the columns we agreed.", -3, 2),
      ev("dispute_opened", -2, 0, "u_bassey"),
    ],
  }),

  /* ---- Jobs between other users (visible to admin) ---- */
  job({
    id: "job_reels",
    title: "Edit 5 Instagram Reels",
    description: "Edit five short Reels from raw footage of our hostel tours.",
    category: "video",
    budget: 25_000,
    deadlineIn: 6,
    skills: ["Reels"],
    deliverables: ["5 edited Reels (9:16)"],
    clientId: "u_chidi",
    freelancerId: "u_david",
    status: "in_progress",
    paymentStatus: "available",
    createdDay: -5,
    thread: [ev("job_sent", -5), ev("job_accepted", -5, 2, "u_david"), ev("payment_confirmed", -4), ev("work_started", -4, 1, "u_david")],
  }),
  job({
    id: "job_cv",
    title: "Rewrite CV and cover letter",
    description: "Rewrite my CV for graduate trainee applications.",
    category: "writing",
    budget: 12_000,
    deadlineIn: -8,
    skills: ["CV writing"],
    deliverables: ["CV (DOCX + PDF)", "Cover letter template"],
    clientId: "u_kunle",
    freelancerId: "u_blessing",
    status: "cancelled",
    paymentStatus: "refunded",
    createdDay: -25,
    thread: [ev("job_sent", -25), ev("job_accepted", -25, 1, "u_blessing"), ev("payment_confirmed", -24), ev("job_cancelled", -15, 0, undefined, "Refunded after admin review.")],
  }),
];

/* ---------- Ledger ---------- */

function tx(
  id: string,
  jobId: string,
  type: Transaction["type"],
  amount: number,
  status: Transaction["status"],
  userId: string,
  counterpartyId: string,
  day: number,
): Transaction {
  return {
    id,
    jobId,
    type,
    amount: naira(amount),
    status,
    userId,
    counterpartyId,
    reference: `SIM-${id.toUpperCase()}`,
    simulated: true,
    createdAt: at(day),
    updatedAt: at(day),
  };
}

export const seedTransactions: Transaction[] = [
  tx("tx01", "job_brand", "payment", 85_000, "succeeded", ME, "u_ada", -11),
  tx("tx02", "job_landing", "payment", 120_000, "succeeded", ME, "u_emeka", -3),
  tx("tx03", "job_deck", "payment", 40_000, "succeeded", ME, "u_ada", -34),
  tx("tx04", "job_deck", "payout", 40_000, "succeeded", "u_ada", ME, -23),
  tx("tx05", "job_event", "payment", 90_000, "succeeded", "u_grace", ME, -14),
  tx("tx06", "job_shop", "payment", 60_000, "succeeded", "u_grace", ME, -1),
  tx("tx07", "job_portfolio", "payment", 50_000, "succeeded", "u_kunle", ME, -59),
  tx("tx08", "job_portfolio", "payout", 50_000, "succeeded", ME, "u_kunle", -43),
  tx("tx09", "job_dashboard", "payment", 75_000, "succeeded", "u_bassey", ME, -19),
  tx("tx10", "job_reels", "payment", 25_000, "succeeded", "u_chidi", "u_david", -4),
  tx("tx11", "job_cv", "payment", 12_000, "succeeded", "u_kunle", "u_blessing", -24),
  tx("tx12", "job_cv", "refund", 12_000, "succeeded", "u_kunle", "u_blessing", -14),
];

export const seedPayoutAccounts: PayoutAccount[] = [
  {
    userId: ME,
    bankName: "Guaranty Trust Bank",
    accountNumberLast4: "4821",
    accountName: "ESSIEN TOBI",
    status: "verified",
    createdAt: at(-100),
  },
];

/* ---------- Disputes ---------- */

export const seedDisputes: Dispute[] = [
  {
    id: "dsp_1",
    jobId: "job_dashboard",
    openedById: "u_bassey",
    reason: "not_as_agreed",
    details:
      "The rider filter does not work and several days of deliveries are missing from the charts. I don't want to approve until this is fixed.",
    evidence: [{ id: "ev1", name: "missing-days-screenshot.png", sizeBytes: 380_000 }],
    status: "under_review",
    updates: [
      {
        id: "du1",
        authorId: "admin",
        body: "We're reviewing the job history and delivery. Both parties may add evidence below. Payment will not be released while this is open.",
        createdAt: at(-1),
      },
    ],
    createdAt: at(-2),
    updatedAt: at(-1),
  },
];

/* ---------- Notifications ---------- */

const note = (
  id: string,
  type: Notification["type"],
  title: string,
  body: string,
  href: string,
  day: number,
  read = false,
): Notification => ({ id, userId: ME, type, title, body, href, read, createdAt: at(day) });

export const seedNotifications: Notification[] = [
  note("n1", "delivery_submitted", "Delivery submitted", "Ada Okon submitted work for “Brand identity for Bean There café”.", "/jobs/job_brand", -0.12),
  note("n2", "job_request", "New job request", "Chidi Okafor wants to hire you for “Fix booking form bugs on HostelHub”.", "/jobs/job_booking", -0.08),
  note("n3", "job_accepted", "Job accepted", "Ifeoma Nwosu accepted “Analyse survey data”. Fund the job to get started.", "/jobs/job_survey", -0.2),
  note("n4", "payment_confirmed", "Payment confirmed", "Grace Inyang funded “Set up an online store”. You can start work.", "/jobs/job_shop", -1),
  note("n5", "revision_requested", "Revision requested", "Grace Inyang asked for changes on “Event website for DevFest Uyo”.", "/jobs/job_event", -1, true),
  note("n6", "dispute_update", "Dispute under review", "An admin is reviewing the dispute on “Delivery tracking dashboard”.", "/disputes/dsp_1", -1, true),
  note("n7", "payout_initiated", "Payout sent", "₦50,000 for “Personal portfolio website” was sent to your bank (simulated).", "/wallet", -43, true),
];

export const seedAudit: AuditEntry[] = [
  { id: "a1", actorId: "admin", action: "Suspended user", target: "Kunle Adeyemi", createdAt: at(-6) },
  { id: "a2", actorId: "admin", action: "Resolved dispute (refund to client)", target: "Rewrite CV and cover letter", createdAt: at(-14) },
  { id: "a3", actorId: "system", action: "Payment confirmed (simulated)", target: "Set up an online store", createdAt: at(-1) },
  { id: "a4", actorId: "admin", action: "Moved dispute to review", target: "Delivery tracking dashboard", createdAt: at(-1) },
];
