import { AuthForm } from "../auth-form";

export const metadata = { title: "Crear cuenta" };

export default function SignupPage() {
  return (
    <>
      <h1 className="mb-2 font-display text-3xl font-bold">Tu página de reservas en minutos</h1>
      <p className="mb-6 text-sm text-muted">Gratis para empezar. Tus clientes reservan directo contigo.</p>
      <AuthForm mode="signup" />
    </>
  );
}
