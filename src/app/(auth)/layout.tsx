/**
 * Layout untuk grup route (auth) — tidak perlu sidebar/navbar
 * Halaman login berdiri sendiri dengan background teal gradient
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F4F7F8] flex items-center justify-center">
      {children}
    </div>
  );
}
