"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BookOpen, BrainCircuit, ShieldCheck, Zap } from "lucide-react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-24 relative overflow-hidden">
      {/* Background Ornaments */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 rounded-full bg-violet-600/20 blur-3xl pointer-events-none" />

      <div className="z-10 max-w-5xl w-full flex flex-col items-center gap-12 text-center">
        <div className="inline-flex items-center rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-sm font-medium text-indigo-300 backdrop-blur-3xl transition-all hover:bg-indigo-500/20">
          <Zap className="mr-2 h-4 w-4 text-indigo-400" />
          <span>Next-Generation Document Intelligence</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-br from-white via-slate-200 to-indigo-400 bg-clip-text text-transparent drop-shadow-sm">
          Welcome to KnowledgeAI
        </h1>
        
        <p className="max-w-2xl text-lg md:text-xl text-slate-400 leading-relaxed">
          Unlock the latent potential of your PDF documents. Using an advanced{" "}
          <span className="text-indigo-300 font-medium">Retrieval-Augmented Generation (RAG)</span>{" "}
          architecture, query complex data and receive precise, instant answers securely within seconds.
        </p>

        {status === "loading" ? (
          <div className="w-32 h-12 rounded-full bg-slate-800 animate-pulse" />
        ) : (
          <button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-full bg-indigo-600 px-8 py-4 font-semibold text-white transition-all duration-300 hover:bg-indigo-500 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-900 shadow-xl shadow-indigo-500/20"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 transition-opacity group-hover:opacity-100 mix-blend-overlay" />
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>
        )}

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl text-left border-t border-slate-800 pt-16">
          <FeatureCard 
            icon={<BrainCircuit className="h-6 w-6 text-indigo-400" />}
            title="Semantic Understanding"
            description="Our implementation leverages ChromaDB and OpenAI models to genuinely 'understand' document context."
          />
          <FeatureCard 
            icon={<BookOpen className="h-6 w-6 text-indigo-400" />}
            title="Fast Information Retrieval"
            description="Say goodbye to Ctrl+F. Get accurate summaries and direct answers spanning across massive PDFs."
          />
          <FeatureCard 
            icon={<ShieldCheck className="h-6 w-6 text-indigo-400" />}
            title="Secure & Private"
            description="Your documents are isolated per-user through rigid authentication and session checks."
          />
        </div>
      </div>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="flex flex-col gap-4 p-6 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-md transition hover:border-indigo-500/30 hover:bg-slate-800/50 group">
      <div className="p-3 bg-slate-950 w-fit rounded-lg shadow-inner shadow-indigo-500/10 group-hover:bg-indigo-950 transition-colors">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-slate-200">{title}</h3>
      <p className="text-slate-400 leading-relaxed text-sm">{description}</p>
    </div>
  );
}
