import React, { useState, useEffect, useRef } from "react";
import { 
  Send, 
  StopCircle, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Search, 
  Mail, 
  Globe,
  Info,
  ChevronRight,
  User,
  Terminal
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";

interface Stats {
  total: number;
  sent: number;
  failed: number;
  isRunning: boolean;
  hasCV?: boolean;
  logs: string[];
}

interface Suggestion {
  company_name: string;
  region: string;
  description: string;
}

export default function App() {
  const [stats, setStats] = useState<Stats>({
    total: 0,
    sent: 0,
    failed: 0,
    isRunning: false,
    logs: []
  });
  const [file, setFile] = useState<File | null>(null);
  const [cvLoading, setCvLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [industry, setIndustry] = useState("Agriculture");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/status");
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            setStats(data);
          } else {
            const text = await res.text();
            console.warn("Received non-JSON response from /api/status:", text.substring(0, 100));
          }
        } else {
          console.warn(`Status check returned ${res.status}: ${res.statusText}`);
        }
      } catch (err) {
        console.error("Status check connection error:", err);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Upload failed");
      }
    } catch (err) {
      alert("Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  const startSending = async () => {
    try {
      const res = await fetch("/api/start", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Start failed");
      }
    } catch (err) {
      alert("Error starting engine");
    }
  };

  const stopSending = async () => {
    await fetch("/api/stop", { method: "POST" });
  };

  const handleCvUpload = async (file: File) => {
    setCvLoading(true);
    const formData = new FormData();
    formData.append("cv", file);
    try {
      await fetch("/api/upload-cv", { method: "POST", body: formData });
    } catch (err) {
      alert("CV upload failed");
    } finally {
      setCvLoading(false);
    }
  };

  const discoverCompanies = async () => {
    setDiscoveryLoading(true);
    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry }),
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data);
      }
    } catch (err) {
      console.error("Discovery failed");
    } finally {
      setDiscoveryLoading(false);
    }
  };

  const downloadSample = () => {
    const csv = "email,company_name\ncontact@farm-italy.com,Azienda Agricola Rossi\ninfo@factory-milano.it,Milano Manufacturing Co.";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_jobs.csv";
    a.click();
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-brand-bg text-gray-300 font-sans">
      {/* Header Navigation */}
      <nav className="h-16 border-b border-border-subtle flex items-center justify-between px-8 bg-card-bg shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center shadow-lg shadow-indigo-900/40">
            <Globe className="text-white w-5 h-5" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-white italic">
            Italy Job Bridge <span className="text-indigo-400 text-sm font-normal not-italic tracking-wider ml-2">v1.0</span>
          </h1>
        </div>
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className={cn("w-2 h-2 rounded-full animate-pulse", stats.isRunning ? "bg-green-500" : "bg-gray-500")}></div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400">
              {stats.isRunning ? "Engine Active" : "System Ready"}
            </span>
          </div>
          <div className="h-4 w-px bg-gray-700 hidden md:block"></div>
          <div className="text-[10px] font-mono text-gray-500 uppercase hidden md:block tracking-tighter italic">
            Tunisia ➔ Italy Visa Outreach
          </div>
        </div>
      </nav>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Sidebar Controls */}
        <aside className="w-80 border-r border-border-subtle p-6 flex flex-col space-y-8 bg-sidebar-bg overflow-y-auto custom-scrollbar">
          {/* Profile Card */}
          <div className="space-y-4">
            <h2 className="text-[10px] uppercase font-bold text-gray-500 tracking-widest flex items-center gap-2">
              <User className="w-3 h-3" /> User Profile
            </h2>
            <div className="bg-card-bg border border-border-subtle rounded-lg p-4 shadow-sm">
              <p className="text-sm text-white font-medium">Wajdi (36)</p>
              <p className="text-xs text-gray-400">Tunisia ➔ Agriculture/Labor</p>
              <div className="mt-3 pt-3 border-t border-gray-800 flex justify-between text-[10px] uppercase font-bold">
                <span className="text-indigo-400">GMAIL: OK</span>
                <span className="text-indigo-400">GEMINI: OK</span>
              </div>
            </div>
          </div>

          {/* Campaign Config */}
          <div className="space-y-4">
            <h2 className="text-[10px] uppercase font-bold text-gray-500 tracking-widest flex items-center gap-2">
              <Upload className="w-3 h-3" /> Configuration
            </h2>
            <div className="space-y-4">
              {/* CV Section */}
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 font-bold uppercase block">1. Attach CV (PDF)</label>
                <label className={cn(
                  "relative flex items-center justify-center w-full py-3 border rounded-md text-xs transition-all cursor-pointer",
                  stats.hasCV ? "bg-indigo-900/20 border-indigo-500 text-indigo-300" : "bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-300"
                )}>
                  <input 
                    type="file" 
                    accept=".pdf"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleCvUpload(f);
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {cvLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                  <span>{stats.hasCV ? "CV Attached & Ready" : "Upload CV PDF"}</span>
                </label>
              </div>

              {/* Targets Section */}
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 font-bold uppercase block">2. Target List (CSV)</label>
                <form onSubmit={handleFileUpload} className="space-y-3">
                  <label className="relative flex items-center justify-center w-full py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-md text-xs transition-colors cursor-pointer text-gray-300">
                    <input 
                      type="file" 
                      accept=".csv"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Upload className="w-4 h-4 mr-2" />
                    <span>{file ? file.name : "Select targets.csv"}</span>
                  </label>
                  
                  <button
                    disabled={!file || stats.isRunning || loading}
                    className="w-full py-3 bg-indigo-600/20 border border-indigo-500/50 hover:bg-indigo-600/30 text-indigo-300 rounded-lg font-bold transition-all uppercase text-[10px] tracking-widest"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Upload Targets"}
                  </button>
                </form>
              </div>

              {/* Engine Controls */}
              <div className="space-y-3 pt-4 border-t border-gray-800">
                <button
                  onClick={startSending}
                  disabled={stats.isRunning || stats.total === 0}
                  className="w-full py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg font-bold shadow-lg shadow-green-900/20 flex items-center justify-center space-x-3 transition-all uppercase text-sm tracking-widest"
                >
                  <div className={cn("w-2 h-2 rounded-full bg-white", stats.isRunning && "animate-ping")} />
                  <span>START BOT ENGINE</span>
                </button>

                <button
                  type="button"
                  onClick={stopSending}
                  disabled={!stats.isRunning}
                  className="w-full py-4 bg-red-600/10 border border-red-900/50 hover:bg-red-900/20 text-red-400 disabled:opacity-0 rounded-lg font-bold transition-all text-sm tracking-widest"
                >
                  STOP SESSIONS
                </button>
              </div>
            </div>
          </div>

          {/* Discovery Integration */}
          <div className="space-y-4">
            <h2 className="text-[10px] uppercase font-bold text-gray-500 tracking-widest flex items-center gap-2">
              <Search className="w-3 h-3" /> Industry Leads
            </h2>
            <div className="flex gap-2">
              <select 
                value={industry} 
                onChange={(e) => setIndustry(e.target.value)}
                className="flex-1 bg-card-bg border border-border-subtle rounded-md px-3 py-2 text-xs text-gray-300 outline-none"
              >
                <option>Agriculture</option>
                <option>Factory</option>
                <option>Construction</option>
                <option>Logistic</option>
              </select>
              <button 
                onClick={discoverCompanies}
                disabled={discoveryLoading}
                className="bg-gray-800 p-2 rounded-md hover:bg-gray-700 text-indigo-400"
              >
                {discoveryLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </button>
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
              {suggestions.map((s, i) => (
                <div key={i} className="p-3 bg-card-bg border border-border-subtle rounded-md">
                  <div className="flex justify-between text-[10px] items-center">
                    <span className="font-bold text-gray-200">{s.company_name}</span>
                    <span className="text-indigo-400">{s.region}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1 line-clamp-2">{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Central Dashboard Area */}
        <main className="flex-1 p-8 flex flex-col space-y-8 bg-brand-bg min-w-0 overflow-y-auto custom-scrollbar">
          
          {/* Progress Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatBoardCard 
              label="Delivery Status" 
              value={`${stats.sent}`}
              subValue={`/ ${stats.total}`}
              progress={(stats.sent / stats.total) * 100}
            />
            <StatBoardCard 
              label="Failure Rate" 
              value={`${stats.failed}`}
              color="text-red-400"
            />
            <StatBoardCard 
              label="Next Queue In" 
              value={stats.isRunning ? "COOLDOWN" : "READY"}
              subValue={stats.isRunning ? "60-120s Delay" : "No active session"}
            />
          </div>

          {/* Live Log Terminal */}
          <div className="flex-1 flex flex-col min-h-0 min-h-[400px]">
            <div className="flex items-center justify-between px-4 py-2 bg-[#1c2128] border-t border-x border-border-subtle rounded-t-lg shrink-0">
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Terminal className="w-3 h-3" /> Engine Log: sent_log.txt
              </span>
              <span className="text-[10px] font-mono text-indigo-400 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                LIVE FEED
              </span>
            </div>
            <div className="flex-1 bg-terminal-bg p-4 font-mono text-xs overflow-y-auto custom-scrollbar border border-border-subtle rounded-b-lg shadow-inner">
              <div className="space-y-1">
                <AnimatePresence initial={false}>
                  {stats.logs.length === 0 ? (
                    <p className="text-gray-700 italic">_ System idle. Awaiting configuration...</p>
                  ) : (
                    stats.logs.map((log, i) => (
                      <motion.p 
                        key={i}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cn(
                          "leading-relaxed",
                          log.includes("Sent") ? "text-green-400" :
                          log.includes("Error") ? "text-red-400" :
                          "text-gray-500"
                        )}
                      >
                        {log}
                      </motion.p>
                    ))
                  )}
                </AnimatePresence>
                {stats.isRunning && (
                  <p className="text-indigo-500 animate-pulse mt-2 border-l-2 border-indigo-500 pl-2">
                    _ Executing next sequence...
                  </p>
                )}
              </div>
              <div ref={logEndRef} />
            </div>
          </div>
        </main>
      </div>

      {/* Footer Details */}
      <footer className="h-10 bg-sidebar-bg border-t border-border-subtle flex items-center justify-between px-8 text-[10px] text-gray-500 shrink-0">
        <div className="flex items-center gap-4">
          <span className="uppercase tracking-widest">Sponsorship Target: Italy</span>
          <span className="h-3 w-px bg-gray-800"></span>
          <button onClick={downloadSample} className="hover:text-indigo-400 transition-colors uppercase font-bold tracking-tighter">Download CSV Blueprint</button>
        </div>
        <div className="flex space-x-6 uppercase font-bold text-[9px] tracking-widest">
          <span className="text-green-900 items-center flex gap-1"><div className="w-1 h-1 rounded-full bg-current" /> GMAIL SECURE</span>
          <span className="text-green-900 items-center flex gap-1"><div className="w-1 h-1 rounded-full bg-current" /> APP PASSWORD</span>
          <span className="text-indigo-900 items-center flex gap-1"><div className="w-1 h-1 rounded-full bg-current" /> GEMINI FLASH</span>
        </div>
      </footer>
    </div>
  );
}

function StatBoardCard({ label, value, subValue, progress, color = "text-white" }: { label: string, value: string, subValue?: string, progress?: number, color?: string }) {
  return (
    <div className="bg-card-bg border border-border-subtle p-5 rounded-xl flex flex-col space-y-1 shadow-md group border cursor-default hover:border-gray-700 transition-colors">
      <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">{label}</span>
      <span className={cn("text-3xl font-light tracking-tight", color)}>
        {value} {subValue && <span className="text-sm text-gray-500">{subValue}</span>}
      </span>
      {typeof progress === 'number' && (
        <div className="w-full bg-gray-800 h-1 rounded-full mt-4 overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, Math.max(0, (progress || 0)))}%` }}
            className="bg-indigo-500 h-1 rounded-full"
          />
        </div>
      )}
      {!progress && <div className="mt-4 flex items-center space-x-2 text-[10px] text-indigo-900 font-bold uppercase tracking-widest">● System Status OK</div>}
    </div>
  );
}
