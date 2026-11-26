import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "CampusHold — Hire freelancers with a clear, tracked workflow",
    template: "%s · CampusHold",
  },
  description:
    "CampusHold connects clients and freelancers in one place: agreed scope, funded jobs, a dedicated workspace for every project, and payment released when the work is approved.",
  applicationName: "CampusHold",
  openGraph: {
    title: "CampusHold",
    description:
      "Agree the scope, fund the job, deliver the work, release payment on approval — all in one workspace.",
    siteName: "CampusHold",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
