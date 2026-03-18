"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { UploadCloud, MessageSquare, Send, FileText, Loader2, LogOut, FileCheck, BrainCircuit } from "lucide-react";
import axios from "axios";
import { API_URL } from "@/lib/config";

type Message = { role: "user" | "assistant"; content: string };

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! Upload a PDF to get started, and then ask me anything about it." }
  ]);
  const [input, setInput] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (status !== "authenticated") return null;

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setUploadSuccess(false);

    const formData = new FormData();
    formData.append("file", file);
    // Cast session user id since we injected it in route.ts
    formData.append("user_id", (session.user as any).id || session.user?.email || "anonymous");

    try {
      await axios.post(`${API_URL}/api/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setUploadSuccess(true);
      setMessages(prev => [...prev, { role: "assistant", content: "Document processed successfully! What would you like to know?" }]);
    } catch (error) {
      console.error(error);
      alert("Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !uploadSuccess) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setInput("");
    setIsAsking(true);

    try {
      const res = await axios.post(`${API_URL}/api/ask`, {
        user_id: (session.user as any).id || session.user?.email || "anonymous",
        question: userMsg
      });
      setMessages(prev => [...prev, { role: "assistant", content: res.data.answer }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, there was an error processing your query." }]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-50 font-sans overflow-hidden">
      {/* Sidebar / Upload Area */}
      <aside className="w-80 border-r border-slate-800 bg-slate-900/40 p-6 flex flex-col gap-8 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xl drop-shadow-sm">
            <MessageSquare className="h-6 w-6" />
            <span>Real-RAG</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Document</h2>

          <div className="relative group border-2 border-dashed border-slate-700 hover:border-indigo-500/50 rounded-2xl p-6 flex flex-col items-center gap-4 text-center transition-all bg-slate-900/50">
            <input
              type="file"
              accept=".pdf"
              className="absolute inset-0 opacity-0 cursor-pointer z-10"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  setFile(e.target.files[0]);
                  setUploadSuccess(false);
                }
              }}
            />
            {file ? (
              <FileCheck className="h-10 w-10 text-emerald-400" />
            ) : (
              <UploadCloud className="h-10 w-10 text-indigo-400 group-hover:scale-110 transition-transform" />
            )}

            <div className="text-sm flex flex-col items-center">
              <span className="font-medium text-slate-200">{file ? file.name : "Choose PDF file"}</span>
              <span className="text-slate-500 mt-1">{file ? "Click to change" : "Drag and drop or click"}</span>
            </div>
          </div>

          <button
            disabled={!file || isUploading || uploadSuccess}
            onClick={handleUpload}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed font-medium transition-all flex justify-center items-center shadow-lg shadow-indigo-600/20 disabled:shadow-none"
          >
            {isUploading ? (
              <><Loader2 className="animate-spin h-5 w-5 mr-2" /> Processing...</>
            ) : uploadSuccess ? (
              "Ready to Answer"
            ) : (
              "Upload and Process"
            )}
          </button>
        </div>

        <div className="flex items-center gap-3 pt-6 border-t border-slate-800">
          <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 overflow-hidden">
            {session?.user?.image ? (
              <img src={session.user.image} alt="User" className="w-full h-full object-cover" />
            ) : (
              <span className="text-indigo-300 font-bold">{session?.user?.name?.charAt(0) || "U"}</span>
            )}
          </div>
          <div className="flex-1 truncate">
            <div className="font-medium text-sm truncate">{session?.user?.name}</div>
            <div className="text-xs text-slate-500 truncate">{session?.user?.email}</div>
          </div>
          <button onClick={() => signOut()} className="text-slate-500 hover:text-rose-400 transition-colors">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative bg-[url('/grid.svg')] bg-center bg-slate-950">
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] z-0 pointer-events-none" />

        <div className="flex-1 overflow-y-auto p-6 md:p-12 z-10 space-y-8 scroll-smooth design-scrollbar">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex max-w-3xl ${m.role === "user" ? "ml-auto" : "mr-auto"} gap-4`}>
              {m.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-1">
                  <BrainCircuit className="h-4 w-4 text-indigo-400" />
                </div>
              )}

              <div
                className={`p-5 rounded-2xl md:text-lg leading-relaxed shadow-sm
                  ${m.role === "user"
                    ? "bg-indigo-600 text-white rounded-br-sm shadow-indigo-500/20"
                    : "bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-sm"}
                `}
              >
                {m.content}
              </div>

              {m.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0 mt-1 overflow-hidden border border-slate-700">
                  {session?.user?.image ? (
                    <img src={session.user.image} alt="User" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-slate-400 text-xs">{session?.user?.name?.charAt(0)}</span>
                  )}
                </div>
              )}
            </div>
          ))}
          {isAsking && (
            <div className="flex max-w-3xl mr-auto gap-4">
              <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-1">
                <BrainCircuit className="h-4 w-4 text-indigo-400" />
              </div>
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 rounded-bl-sm flex gap-2 items-center">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 z-10 w-full max-w-4xl mx-auto">
          <div className="relative group">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={!uploadSuccess || isAsking}
              placeholder={uploadSuccess ? "Ask a question about your PDF..." : "Please upload a document first..."}
              className="w-full bg-slate-900 border border-slate-800 rounded-full px-6 py-4 pr-16 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || !uploadSuccess || isAsking}
              className="absolute right-2 top-2 p-2 rounded-full bg-indigo-600 text-white disabled:bg-slate-800 disabled:text-slate-600 transition-colors hover:bg-indigo-500"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-3 text-center text-xs text-slate-500">
            Real-RAG models can make mistakes. Verify important information.
          </div>
        </div>
      </main>
    </div>
  );
}
