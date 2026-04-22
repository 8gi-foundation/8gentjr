import { SignUp } from '@clerk/nextjs';

export const metadata = {
  title: 'Sign up',
  robots: { index: false, follow: false },
};

export default function SignUpPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <SignUp path="/sign-up" signInUrl="/sign-in" />
    </main>
  );
}
