import { AuthForm } from "../auth-form";

export const metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <>
      <h1 className="mb-6 font-display text-3xl font-bold">Bienvenido de vuelta</h1>
      <AuthForm mode="login" next={next} />
    </>
  );
}
