import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { completeOnboarding } from "@/lib/driver-actions";
import { ActionForm } from "@/components/forms/action-form";
import { ProfileFields } from "@/components/forms/profile-fields";
import { MethodsPicker, PricingFields } from "@/components/forms/pricing-fields";
import { ScheduleEditor } from "@/components/forms/schedule-editor";
import { siteUrl } from "@/lib/site";

export const metadata = { title: "Configura tu cuenta" };

const DEFAULT_SCHEDULE = [1, 2, 3, 4, 5].map((weekday) => ({ weekday, start_time: "08:00", end_time: "18:00" }));

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-3 font-display text-lg font-bold">
        <span className="grid size-7 place-items-center rounded-full bg-accent text-sm text-accent-ink">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function OnboardingPage() {
  const { supabase, user } = await requireUser();
  const { data: d } = await supabase.from("drivers").select("onboarded").eq("id", user.id).maybeSingle();
  if (d?.onboarded) redirect("/dashboard");

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">Configura tu página de reservas</h1>
      <p className="mt-2 text-muted">Todo esto lo puedes cambiar después en Ajustes.</p>
      <ActionForm action={completeOnboarding} submit="Publicar mi página" className="mt-8 space-y-10">
        <Step n={1} title="Tu perfil">
          <ProfileFields siteHost={new URL(siteUrl()).host} />
        </Step>
        <Step n={2} title="Tus tarifas">
          <PricingFields currency="MXN" pricing={{ base: 35, per_km: 9, per_min: 2, minimum: 80 }} />
          <MethodsPicker selected={["cash"]} />
        </Step>
        <Step n={3} title="Tus días y horarios">
          <ScheduleEditor initial={DEFAULT_SCHEDULE} />
        </Step>
      </ActionForm>
    </main>
  );
}
