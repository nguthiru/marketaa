import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { WelcomeWizard } from "@/components/onboarding/welcome-wizard";
import { ProductTour } from "@/components/onboarding/product-tour";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-sidebar">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-background rounded-tl-3xl">
        {children}
      </main>
      <WelcomeWizard />
      <ProductTour />
    </div>
  );
}
