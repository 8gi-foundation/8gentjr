import { SignIn } from '@clerk/nextjs';

export const metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <SignIn path="/sign-in" signUpUrl="/sign-up" />
    </main>
  );
}
