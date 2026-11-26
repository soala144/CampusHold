/**
 * Mock service listings for Stage 2. Prices and details are fictional.
 * Cover photos are free-licence Unsplash placeholders that represent each kind
 * of service — they are not the freelancers' own work and must be replaced by
 * real uploads before launch.
 */
import type { Service, ServicePackage } from "@/lib/domain/types";
import { at } from "./seed";

const naira = (n: number) => n * 100;

let n = 0;
const pkg = (
  name: string,
  price: number,
  deliveryDays: number,
  revisions: number,
  features: string[],
  description = "",
): ServicePackage => ({
  id: `pkg_${(++n).toString(36)}`,
  name,
  description,
  price: naira(price),
  deliveryDays,
  revisions,
  features,
});

type Seed = Omit<Service, "images" | "status" | "createdAt" | "updatedAt"> & {
  status?: Service["status"];
  day: number;
};

const svc = ({ day, status = "active", ...s }: Seed): Service => ({
  ...s,
  images: [],
  status,
  createdAt: at(day),
  updatedAt: at(day),
});

export const seedServices: Service[] = [
  svc({
    id: "svc_brand",
    cover: { url: "https://images.unsplash.com/photo-1611241893603-3c359704e0ee", alt: "A designer sketching on a tablet with a stylus", aspect: 1.502 },
    freelancerId: "u_ada",
    title: "Logo and brand identity for your small business",
    category: "design",
    summary: "A clean, memorable logo and the basics to use it well, ready for print and social.",
    description:
      "I'll design a logo that fits your business and give you everything you need to use it consistently: colours, fonts and simple rules.\n\nYou'll get a short questionnaire first so I understand your audience and style. Then I share two directions, you pick one, and we refine it together.\n\nGreat for cafés, shops, student startups and events.",
    tags: ["Logo", "Branding", "Small business"],
    packages: [
      pkg("Basic", 25_000, 4, 1, ["1 logo concept", "PNG and SVG files", "Colour palette"], "A single logo concept, refined once."),
      pkg("Standard", 50_000, 6, 2, ["2 logo concepts", "PNG, SVG and PDF files", "Colour palette and fonts", "1-page brand guide"], "Two directions to choose from, plus a simple guide."),
      pkg("Premium", 85_000, 10, 3, ["2 logo concepts", "All file formats", "Full brand guide", "Social media templates", "Printable menu or flyer"], "Everything you need to launch."),
    ],
    faq: [
      { q: "What do you need from me?", a: "Your business name, what you do, who your customers are, and any colours or styles you like or dislike." },
      { q: "Do I own the final logo?", a: "Yes. Once the job is complete and paid, the final files are yours to use however you like." },
    ],
    day: -200,
  }),
  svc({
    id: "svc_flyer",
    cover: { url: "https://images.unsplash.com/photo-1617355405361-29f0f0a3d737", alt: "An event poster on a city sidewalk", aspect: 0.667 },
    freelancerId: "u_ada",
    title: "Event flyer and social media graphics",
    category: "design",
    summary: "Eye-catching flyers for departmental events, parties and launches, sized for every platform.",
    description:
      "Send me your event details and I'll design a flyer that stands out on WhatsApp status, Instagram and print.\n\nIncludes a square post, story size and an A4 print version.",
    tags: ["Flyer", "Social media", "Events"],
    packages: [
      pkg("Single flyer", 8_000, 2, 2, ["1 flyer design", "Square and story sizes"]),
      pkg("Event pack", 18_000, 3, 2, ["1 flyer design", "Square, story and A4 print sizes", "2 countdown posts"]),
    ],
    faq: [],
    day: -120,
  }),
  svc({
    id: "svc_website",
    cover: { url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085", alt: "A laptop showing code on a desk", aspect: 1.502 },
    freelancerId: "u_emeka",
    title: "Business website, built and deployed",
    category: "development",
    summary: "A fast, mobile-friendly website with your own domain, contact form and simple admin.",
    description:
      "I'll build and deploy a professional website for your business or project. You'll get a responsive design, a contact or booking form, basic SEO, and a short video showing how to update it.\n\nI work in Next.js and can connect payments, booking and databases if you need them.",
    tags: ["Website", "Next.js", "Small business"],
    packages: [
      pkg("Landing page", 60_000, 7, 2, ["1-page responsive site", "Contact form", "Deployment and domain setup"]),
      pkg("Business site", 150_000, 14, 2, ["Up to 5 pages", "Contact and booking forms", "Basic SEO", "Deployment and domain setup", "Handover video"]),
      pkg("Web app", 350_000, 30, 3, ["Custom features scoped together", "Database and admin panel", "User accounts", "Deployment", "30 days of fixes"]),
    ],
    faq: [{ q: "Is hosting included?", a: "I set up hosting on a free or low-cost plan in your name. Any paid hosting or domain fees are separate." }],
    day: -180,
  }),
  svc({
    id: "svc_bugfix",
    cover: { url: "https://images.unsplash.com/photo-1624996752380-8ec242e0f85d", alt: "Code on a laptop screen in a dark workspace", aspect: 0.667 },
    freelancerId: "u_emeka",
    title: "Fix bugs on your website or web app",
    category: "development",
    summary: "Broken forms, layout issues on mobile, slow pages — diagnosed, fixed and explained.",
    description: "Tell me what's broken and share access to your code. I'll find the cause, fix it and write a short note explaining what changed.",
    tags: ["Bug fixing", "React", "Node.js"],
    packages: [
      pkg("Small fix", 15_000, 2, 1, ["Up to 2 bugs", "Written summary of changes"]),
      pkg("Bigger fix", 40_000, 5, 2, ["Up to 6 bugs", "Written summary of changes", "Basic testing"]),
    ],
    faq: [],
    day: -90,
  }),
  svc({
    id: "svc_photos",
    cover: { url: "https://images.unsplash.com/photo-1763970586854-62e14f07ae35", alt: "A product bottle photographed under studio lights", aspect: 0.667 },
    freelancerId: "u_zainab",
    title: "Product photos for your online store",
    category: "photography",
    summary: "Bright, clean product shots on a white background, edited and cropped for Instagram and WhatsApp.",
    description:
      "Drop off your products in Uyo (or I come to you) and I'll shoot clean, consistent photos ready for your online store and social media. All photos are edited and colour-corrected.",
    tags: ["Product photography", "E-commerce", "Uyo"],
    packages: [
      pkg("10 photos", 12_000, 3, 1, ["10 edited photos", "White background", "Square crops"]),
      pkg("30 photos", 30_000, 5, 1, ["30 edited photos", "White background", "Square and portrait crops"]),
    ],
    faq: [{ q: "Do you travel outside Uyo?", a: "Within Akwa Ibom, yes — transport is agreed separately before the job." }],
    day: -80,
  }),
  svc({
    id: "svc_event_photo",
    cover: { url: "https://images.unsplash.com/photo-1627556704243-5f0771d90783", alt: "Graduates in academic gowns", aspect: 1.499 },
    freelancerId: "u_zainab",
    title: "Event photography on campus",
    category: "photography",
    summary: "Departmental dinners, society events and graduations, covered and delivered within days.",
    description: "I cover your event and deliver an online gallery of edited photos. Ideal for departmental and society events at UNIUYO.",
    tags: ["Events", "Graduation", "Campus"],
    packages: [pkg("Up to 3 hours", 35_000, 5, 1, ["3 hours of coverage", "80+ edited photos", "Online gallery"])],
    faq: [],
    day: -60,
  }),
  svc({
    id: "svc_analysis",
    cover: { url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71", alt: "Analytics charts on a laptop screen", aspect: 1.499 },
    freelancerId: "u_ifeoma",
    title: "Data analysis for your project or thesis",
    category: "research",
    summary: "SPSS or Excel analysis with clear tables, charts and a plain-English write-up of the results.",
    description:
      "Share your data and research questions. I'll clean the data, run the right tests and give you tables and charts ready for your chapter, with an explanation you can defend.",
    tags: ["SPSS", "Final-year project", "Statistics"],
    packages: [
      pkg("Descriptive", 20_000, 4, 1, ["Data cleaning", "Descriptive statistics", "Tables and charts"]),
      pkg("Full analysis", 45_000, 7, 2, ["Data cleaning", "Descriptive statistics", "Up to 3 hypothesis tests", "Tables, charts and write-up"]),
    ],
    faq: [{ q: "Will you write my chapter?", a: "I explain and present the results. You remain responsible for your own work and your institution's rules." }],
    day: -140,
  }),
  svc({
    id: "svc_reels",
    cover: { url: "https://images.unsplash.com/photo-1780642213026-cf15a7676c6b", alt: "Video editing software with a timeline", aspect: 0.667 },
    freelancerId: "u_david",
    title: "Edit short videos for Reels and TikTok",
    category: "video",
    summary: "Punchy short-form edits with captions, music and transitions from your raw clips.",
    description: "Send me your raw footage and I'll turn it into scroll-stopping short videos with captions, music and clean cuts.",
    tags: ["Reels", "TikTok", "Captions"],
    packages: [
      pkg("1 video", 6_000, 2, 2, ["1 edited video up to 60s", "Captions and music"]),
      pkg("5 videos", 25_000, 5, 2, ["5 edited videos up to 60s", "Captions and music", "Thumbnail for each"]),
    ],
    faq: [],
    day: -50,
  }),
  svc({
    id: "svc_cv",
    cover: { url: "https://images.unsplash.com/photo-1586281380349-632531db7ed4", alt: "A printed CV beside a laptop", aspect: 1.499 },
    freelancerId: "u_blessing",
    title: "Professional CV and cover letter",
    category: "writing",
    summary: "A clear, modern CV tailored to graduate trainee and internship applications.",
    description: "I'll rewrite your CV so your experience and skills stand out, and write a cover letter template you can adapt for each application.",
    tags: ["CV", "Cover letter", "Graduate jobs"],
    packages: [
      pkg("CV only", 7_000, 3, 2, ["Rewritten CV", "DOCX and PDF"]),
      pkg("CV + cover letter", 12_000, 4, 2, ["Rewritten CV", "Cover letter template", "DOCX and PDF"]),
    ],
    faq: [],
    day: -40,
  }),
  svc({
    id: "svc_proofread",
    cover: { url: "https://images.unsplash.com/photo-1616740795271-abd6ce1a5a5a", alt: "Someone writing notes on paper", aspect: 0.716 },
    freelancerId: "u_blessing",
    title: "Proofreading and editing",
    category: "writing",
    summary: "Careful proofreading for projects, essays and website copy, with tracked changes.",
    description: "I fix grammar, spelling and clarity while keeping your voice, using tracked changes so you can see every edit.",
    tags: ["Proofreading", "Editing"],
    packages: [pkg("Up to 5,000 words", 10_000, 3, 1, ["Proofreading with tracked changes", "Short notes on recurring issues"])],
    faq: [],
    day: -30,
  }),
  svc({
    id: "svc_tutoring",
    cover: { url: "https://images.unsplash.com/photo-1509228468518-180dd4864904", alt: "Equations printed on paper", aspect: 1.499 },
    freelancerId: "u_samuel",
    title: "Maths and physics tutoring",
    category: "tutoring",
    summary: "One-to-one lessons for 100–200 level courses and entrance exams.",
    description: "Structured lessons with practice questions, focused on the topics you find hardest.",
    tags: ["Calculus", "Physics", "Exam prep"],
    packages: [pkg("4 lessons", 18_000, 14, 0, ["4 one-hour lessons", "Practice questions"])],
    faq: [],
    day: -25,
  }),
  svc({
    id: "svc_social",
    cover: { url: "https://images.unsplash.com/photo-1759215524472-1b0686fdbd87", alt: "Hands holding a phone showing a social feed", aspect: 0.667 },
    freelancerId: "u_amaka",
    title: "Monthly social media management",
    category: "marketing",
    summary: "A month of planned, designed and scheduled posts for your small business.",
    description: "I plan your content calendar, design posts in your brand style and schedule them, with a simple report at the end of the month.",
    tags: ["Instagram", "Content calendar"],
    packages: [
      pkg("12 posts", 35_000, 30, 1, ["Content calendar", "12 designed posts", "Scheduling"]),
      pkg("20 posts + ads", 60_000, 30, 1, ["Content calendar", "20 designed posts", "Scheduling", "1 ad campaign setup"]),
    ],
    faq: [],
    day: -15,
  }),
  svc({
    id: "svc_tobi",
    cover: { url: "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2", alt: "A laptop on a desk", aspect: 0.8 },
    freelancerId: "u_me",
    title: "Responsive website with Next.js",
    category: "development",
    summary: "Fast, accessible marketing sites and landing pages, built with React and Next.js.",
    description:
      "I build clean, responsive websites that load fast and work well on any phone. You get the source code and a short guide to update content.",
    tags: ["Next.js", "React", "Accessibility"],
    packages: [
      pkg("Landing page", 40_000, 5, 2, ["1-page responsive site", "Contact form", "Deployment"]),
      pkg("Multi-page", 90_000, 10, 2, ["Up to 5 pages", "Contact form", "Basic SEO", "Deployment and handover"]),
    ],
    faq: [],
    day: -100,
  }),
];
