import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Campus Ambassador Project Management System | NexusDev Solutions",
  description:
    "Enterprise-grade platform for Campus Ambassadors and Software Companies to collaborate, manage student capstone projects, handle formal quotations, track milestones, and manage secure payments.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
