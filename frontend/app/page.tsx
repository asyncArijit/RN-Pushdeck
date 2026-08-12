import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Rocket, Globe2, ShieldCheck, Undo2, ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function Home() {
  const { userId } = await auth();

  return (
    <main className="flex flex-1 flex-col">
      <Nav signedIn={!!userId} />
      <Hero signedIn={!!userId} />
      <Features />
      <HowItWorks />
      <CliShowcase />
      <CallToAction signedIn={!!userId} />
      <Footer />
    </main>
  );
}

function Nav({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="text-base font-semibold tracking-tight">
          rn-pushdeck
        </Link>
        <div className="flex items-center gap-2 text-sm">
          {signedIn ? (
            <Link href="/dashboard" className={cn(buttonVariants({ size: "sm" }))}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className={cn(buttonVariants({ size: "sm", variant: "ghost" }))}
              >
                Sign in
              </Link>
              <Link href="/sign-up" className={cn(buttonVariants({ size: "sm" }))}>
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Hero({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="border-b border-border/60 px-6 py-24">
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Self-hosted CodePush alternative
        </span>
        <h1 className="text-balance text-5xl font-bold tracking-tight sm:text-6xl">
          Ship JavaScript updates to React Native apps in seconds.
        </h1>
        <p className="mt-5 max-w-2xl text-balance text-lg text-muted-foreground">
          No Play Store delays. No vendor lock-in. Run on Cloudflare&apos;s global edge with free
          bundle egress. Built after Microsoft retired CodePush.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {signedIn ? (
            <Link
              href="/dashboard"
              className={cn(buttonVariants({ size: "lg" }), "gap-1.5")}
            >
              Open dashboard
              <ArrowRight className="size-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/sign-up"
                className={cn(buttonVariants({ size: "lg" }), "gap-1.5")}
              >
                Start shipping
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/sign-in"
                className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
              >
                I have an account
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  {
    icon: Globe2,
    title: "Global edge",
    body: "API on Cloudflare Workers in 200+ cities. Bundles served from R2's CDN. <50ms manifest checks worldwide.",
  },
  {
    icon: Rocket,
    title: "Sub-second deploys",
    body: "Push from CLI to every user in seconds. No app store review, no rollout window.",
  },
  {
    icon: Undo2,
    title: "One-tap rollback",
    body: "Promote v1.0.5, regret it, click rollback. Every promotion is audited and reversible.",
  },
  {
    icon: ShieldCheck,
    title: "Built-in safety",
    body: "minNativeVersion gating, soft-deletes for accidental removal, signed presigned uploads.",
  },
];

function Features() {
  return (
    <section className="border-b border-border/60 px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">
            Built for shipping, not bureaucracy.
          </h2>
          <p className="mt-2 text-muted-foreground">
            Modern infrastructure, free tier across the stack.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="mb-3 inline-flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-4" />
              </div>
              <h3 className="text-base font-semibold tracking-tight">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const STEPS = [
    {
      step: "1",
      title: "Install the SDK",
      body: "Drop our npm package into your RN app + add 8 lines to MainApplication.kt.",
    },
    {
      step: "2",
      title: "Ship your APK once",
      body: "First release goes through the Play Store as normal. After that, you can skip it.",
    },
    {
      step: "3",
      title: "Push JS updates from the CLI",
      body: "Run pushdeck deploy. Bundle uploads to R2. Phones get the new code in seconds.",
    },
  ];
  return (
    <section className="border-b border-border/60 px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">How it works</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {STEPS.map(({ step, title, body }) => (
            <div key={step} className="space-y-2">
              <div className="inline-flex size-7 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                {step}
              </div>
              <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
              <p className="text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CliShowcase() {
  return (
    <section className="border-b border-border/60 px-6 py-20">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-center">
        <div className="space-y-3">
          <h2 className="text-3xl font-semibold tracking-tight">
            The CLI is the surface.
          </h2>
          <p className="text-muted-foreground">
            One command from your terminal pushes a new bundle to every user. Auth via
            personal access tokens — works in CI/CD, no browser required.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 font-mono text-xs">
          <div className="mb-3 flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-red-500/70" />
            <span className="size-2 rounded-full bg-amber-500/70" />
            <span className="size-2 rounded-full bg-emerald-500/70" />
          </div>
          <pre className="whitespace-pre-wrap text-foreground/80">
{`$ pushdeck deploy \\
    --project psh_2k3uxm26zdfqyr \\
    --version 1.0.5 \\
    --bundle ./index.android.bundle \\
    --promote production

• Deploying v1.0.5 (3.5 MB bundle)
  Resolving project... done
  Requesting upload URLs... done
  Uploading bundle... done
  Registering bundle... done
  Promoting to production... done

✓ Shipped v1.0.5 to production`}
          </pre>
        </div>
      </div>
    </section>
  );
}

function CallToAction({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card px-8 py-12 text-center">
        <h2 className="text-3xl font-semibold tracking-tight">
          Ready to skip the app store?
        </h2>
        <p className="mt-3 text-muted-foreground">
          Free to use, free to host. The whole stack runs on free tiers.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={signedIn ? "/dashboard" : "/sign-up"}
            className={cn(buttonVariants({ size: "lg" }), "gap-1.5")}
          >
            {signedIn ? "Open dashboard" : "Create your first project"}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60 px-6 py-8 text-sm text-muted-foreground">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <span>
          Built by{" "}
          <a
            href="https://github.com/asyncArijit"
            target="_blank"
            rel="noreferrer"
            className="text-foreground hover:underline"
          >
            asyncArijit
          </a>
          {" "}as a portfolio project.
        </span>
        <span className="text-xs">Inspired by Microsoft CodePush. Not affiliated.</span>
      </div>
    </footer>
  );
}
