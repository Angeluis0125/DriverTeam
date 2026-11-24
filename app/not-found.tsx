import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-3xl font-bold">No encontramos esta página</h1>
      <p className="mt-2 text-muted">Revisa el link que te compartieron.</p>
      <LinkButton href="/" variant="secondary" className="mt-6">Ir al inicio</LinkButton>
    </main>
  );
}
