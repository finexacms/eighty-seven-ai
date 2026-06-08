"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { divisions, searchAgents, getTotalAgentCount, getDivisionById, getAgentById } from "@/lib/agent-data";
import type { Division, Agent } from "@/lib/agent-data";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search, ArrowLeft, Send, Bot, User, Sparkles, 
  ChevronRight, Users, Zap, Shield, Globe,
  MessageSquare, ArrowRight, Loader2, Activity,
  Terminal, Cpu, Layers, Rocket, Eye, Code2,
  Palette, Target, TrendingUp, Star, Hexagon,
  Paperclip, X, FileText, Image as ImageIcon, FileCode2, File
} from "lucide-react";

// ============================================
// TYPES
// ============================================
type View = "home" | "division" | "agent" | "workspace";

interface FileAttachment {
  id: string;
  name: string;
  type: "image" | "document" | "code";
  data: string; // base64 for images, text for docs/code
  mimeType: string;
  preview?: string; // for image thumbnails
  size: number;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  files?: FileAttachment[];
}

// Supported file types
const SUPPORTED_FILE_TYPES: Record<string, { category: "image" | "document" | "code"; mimeType: string }> = {
  // Images
  "image/png": { category: "image", mimeType: "image/png" },
  "image/jpeg": { category: "image", mimeType: "image/jpeg" },
  "image/jpg": { category: "image", mimeType: "image/jpeg" },
  "image/gif": { category: "image", mimeType: "image/gif" },
  "image/webp": { category: "image", mimeType: "image/webp" },
  "image/svg+xml": { category: "image", mimeType: "image/svg+xml" },
  // Documents
  "text/plain": { category: "document", mimeType: "text/plain" },
  "text/csv": { category: "document", mimeType: "text/csv" },
  "text/markdown": { category: "document", mimeType: "text/markdown" },
  "application/json": { category: "document", mimeType: "application/json" },
  "application/pdf": { category: "document", mimeType: "application/pdf" },
  // Code
  "text/javascript": { category: "code", mimeType: "text/javascript" },
  "text/typescript": { category: "code", mimeType: "text/typescript" },
  "text/html": { category: "code", mimeType: "text/html" },
  "text/css": { category: "code", mimeType: "text/css" },
  "text/xml": { category: "code", mimeType: "text/xml" },
  "text/yaml": { category: "code", mimeType: "text/yaml" },
  "application/javascript": { category: "code", mimeType: "application/javascript" },
  "application/xml": { category: "code", mimeType: "application/xml" },
};

const CODE_EXTENSIONS: Record<string, string> = {
  js: "text/javascript", jsx: "text/javascript", ts: "text/typescript", tsx: "text/typescript",
  py: "text/plain", rb: "text/plain", java: "text/plain", go: "text/plain",
  rs: "text/plain", cpp: "text/plain", c: "text/plain", h: "text/plain",
  html: "text/html", css: "text/css", scss: "text/css", less: "text/css",
  json: "application/json", xml: "text/xml", yaml: "text/yaml", yml: "text/yaml",
  md: "text/markdown", txt: "text/plain", csv: "text/csv", sql: "text/plain",
  sh: "text/plain", bash: "text/plain", env: "text/plain",
  php: "text/plain", swift: "text/plain", kt: "text/plain", dart: "text/plain",
  vue: "text/html", svelte: "text/html",
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function getFileCategory(fileName: string, mimeType: string): { category: "image" | "document" | "code"; mimeType: string } | null {
  // Check by mime type first
  if (SUPPORTED_FILE_TYPES[mimeType]) return SUPPORTED_FILE_TYPES[mimeType];
  // Check by extension
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext && CODE_EXTENSIONS[ext]) {
    return { category: "code", mimeType: CODE_EXTENSIONS[ext] };
  }
  // Check image mime type pattern
  if (mimeType.startsWith("image/")) return { category: "image", mimeType };
  // Check text mime pattern
  if (mimeType.startsWith("text/")) return { category: "document", mimeType };
  return null;
}

// ============================================
// DIVISION STYLE MAP
// ============================================
const divisionStyles: Record<string, { 
  bg: React.CSSProperties; 
  border: React.CSSProperties; 
  icon: React.CSSProperties;
  glow: string;
  colors: [string, string];
}> = {
  engineering: { bg: { background: "linear-gradient(135deg, rgba(6,182,212,0.08), rgba(37,99,235,0.08))" }, border: { borderColor: "rgba(6,182,212,0.2)" }, icon: { background: "linear-gradient(135deg, #06b6d4, #2563eb)" }, glow: "rgba(6,182,212,0.4)", colors: ["#06b6d4", "#2563eb"] },
  design: { bg: { background: "linear-gradient(135deg, rgba(236,72,153,0.08), rgba(225,29,72,0.08))" }, border: { borderColor: "rgba(236,72,153,0.2)" }, icon: { background: "linear-gradient(135deg, #ec4899, #e11d48)" }, glow: "rgba(236,72,153,0.4)", colors: ["#ec4899", "#e11d48"] },
  "paid-media": { bg: { background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(234,88,12,0.08))" }, border: { borderColor: "rgba(245,158,11,0.2)" }, icon: { background: "linear-gradient(135deg, #f59e0b, #ea580c)" }, glow: "rgba(245,158,11,0.4)", colors: ["#f59e0b", "#ea580c"] },
  sales: { bg: { background: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(22,163,74,0.08))" }, border: { borderColor: "rgba(16,185,129,0.2)" }, icon: { background: "linear-gradient(135deg, #10b981, #16a34a)" }, glow: "rgba(16,185,129,0.4)", colors: ["#10b981", "#16a34a"] },
  marketing: { bg: { background: "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(147,51,234,0.08))" }, border: { borderColor: "rgba(139,92,246,0.2)" }, icon: { background: "linear-gradient(135deg, #8b5cf6, #9333ea)" }, glow: "rgba(139,92,246,0.4)", colors: ["#8b5cf6", "#9333ea"] },
  product: { bg: { background: "linear-gradient(135deg, rgba(20,184,166,0.08), rgba(6,182,212,0.08))" }, border: { borderColor: "rgba(20,184,166,0.2)" }, icon: { background: "linear-gradient(135deg, #14b8a6, #06b6d4)" }, glow: "rgba(20,184,166,0.4)", colors: ["#14b8a6", "#06b6d4"] },
  "project-management": { bg: { background: "linear-gradient(135deg, rgba(14,165,233,0.08), rgba(79,70,229,0.08))" }, border: { borderColor: "rgba(14,165,233,0.2)" }, icon: { background: "linear-gradient(135deg, #0ea5e9, #4f46e5)" }, glow: "rgba(14,165,233,0.4)", colors: ["#0ea5e9", "#4f46e5"] },
  testing: { bg: { background: "linear-gradient(135deg, rgba(239,68,68,0.08), rgba(225,29,72,0.08))" }, border: { borderColor: "rgba(239,68,68,0.2)" }, icon: { background: "linear-gradient(135deg, #ef4444, #e11d48)" }, glow: "rgba(239,68,68,0.4)", colors: ["#ef4444", "#e11d48"] },
  security: { bg: { background: "linear-gradient(135deg, rgba(220,38,38,0.08), rgba(153,27,27,0.08))" }, border: { borderColor: "rgba(220,38,38,0.2)" }, icon: { background: "linear-gradient(135deg, #dc2626, #991b1b)" }, glow: "rgba(220,38,38,0.4)", colors: ["#dc2626", "#991b1b"] },
  support: { bg: { background: "linear-gradient(135deg, rgba(234,179,8,0.08), rgba(217,119,6,0.08))" }, border: { borderColor: "rgba(234,179,8,0.2)" }, icon: { background: "linear-gradient(135deg, #eab308, #d97706)" }, glow: "rgba(234,179,8,0.4)", colors: ["#eab308", "#d97706"] },
  "spatial-computing": { bg: { background: "linear-gradient(135deg, rgba(217,70,239,0.08), rgba(236,72,153,0.08))" }, border: { borderColor: "rgba(217,70,239,0.2)" }, icon: { background: "linear-gradient(135deg, #d946ef, #ec4899)" }, glow: "rgba(217,70,239,0.4)", colors: ["#d946ef", "#ec4899"] },
  "game-development": { bg: { background: "linear-gradient(135deg, rgba(132,204,22,0.08), rgba(22,163,74,0.08))" }, border: { borderColor: "rgba(132,204,22,0.2)" }, icon: { background: "linear-gradient(135deg, #84cc16, #16a34a)" }, glow: "rgba(132,204,22,0.4)", colors: ["#84cc16", "#16a34a"] },
  academic: { bg: { background: "linear-gradient(135deg, rgba(120,113,108,0.08), rgba(68,64,60,0.08))" }, border: { borderColor: "rgba(120,113,108,0.2)" }, icon: { background: "linear-gradient(135deg, #78716c, #44403c)" }, glow: "rgba(120,113,108,0.4)", colors: ["#78716c", "#44403c"] },
  gis: { bg: { background: "linear-gradient(135deg, rgba(22,163,74,0.08), rgba(4,120,87,0.08))" }, border: { borderColor: "rgba(22,163,74,0.2)" }, icon: { background: "linear-gradient(135deg, #16a34a, #047857)" }, glow: "rgba(22,163,74,0.4)", colors: ["#16a34a", "#047857"] },
  finance: { bg: { background: "linear-gradient(135deg, rgba(5,150,105,0.08), rgba(13,148,136,0.08))" }, border: { borderColor: "rgba(5,150,105,0.2)" }, icon: { background: "linear-gradient(135deg, #059669, #0d9488)" }, glow: "rgba(5,150,105,0.4)", colors: ["#059669", "#0d9488"] },
  specialized: { bg: { background: "linear-gradient(135deg, rgba(249,115,22,0.08), rgba(220,38,38,0.08))" }, border: { borderColor: "rgba(249,115,22,0.2)" }, icon: { background: "linear-gradient(135deg, #f97316, #dc2626)" }, glow: "rgba(249,115,22,0.4)", colors: ["#f97316", "#dc2626"] },
  strategy: { bg: { background: "linear-gradient(135deg, rgba(100,116,139,0.08), rgba(51,65,85,0.08))" }, border: { borderColor: "rgba(100,116,139,0.2)" }, icon: { background: "linear-gradient(135deg, #64748b, #334155)" }, glow: "rgba(100,116,139,0.4)", colors: ["#64748b", "#334155"] },
  integrations: { bg: { background: "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(79,70,229,0.08))" }, border: { borderColor: "rgba(59,130,246,0.2)" }, icon: { background: "linear-gradient(135deg, #3b82f6, #4f46e5)" }, glow: "rgba(59,130,246,0.4)", colors: ["#3b82f6", "#4f46e5"] },
};

function getDivisionStyle(divisionId: string) {
  return divisionStyles[divisionId] || divisionStyles.engineering;
}

// ============================================
// ANIMATED MESH GRADIENT BACKGROUND
// ============================================
function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[#0a0a0f]" />
      
      {/* Morphing gradient blobs */}
      <div 
        className="absolute -top-32 -left-32 w-[600px] h-[600px] animate-morph-blob opacity-20"
        style={{ background: "radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)" }}
      />
      <div 
        className="absolute -bottom-32 -right-32 w-[500px] h-[500px] animate-morph-blob opacity-15"
        style={{ background: "radial-gradient(circle, rgba(6,182,212,0.4) 0%, transparent 70%)", animationDelay: "-3s" }}
      />
      <div 
        className="absolute top-1/3 left-1/2 w-[700px] h-[700px] animate-morph-blob opacity-10"
        style={{ background: "radial-gradient(circle, rgba(236,72,153,0.3) 0%, transparent 70%)", animationDelay: "-5s" }}
      />
      
      {/* Subtle grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{ 
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "60px 60px" 
        }}
      />
      
      {/* Floating particles */}
      <FloatingParticles />
    </div>
  );
}

// ============================================
// FLOATING PARTICLES
// ============================================
function FloatingParticles() {
  const [particles, setParticles] = useState<Array<{
    id: number; left: string; size: number; duration: number; delay: number; opacity: number;
  }>>([]);

  useEffect(() => {
    // Generate particles only on client to avoid hydration mismatch
    setParticles(
      Array.from({ length: 30 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        size: Math.random() * 3 + 1,
        duration: Math.random() * 15 + 10,
        delay: Math.random() * 10,
        opacity: Math.random() * 0.3 + 0.1,
      }))
    );
  }, []);

  if (particles.length === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: p.left,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: `rgba(139, 92, 246, ${p.opacity})`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

// ============================================
// ANIMATED COUNTER
// ============================================
function AnimatedCounter({ target, duration = 2000 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);

  return <span className="counter-value">{count}</span>;
}

// ============================================
// HEADER
// ============================================
function Header({ view, onBack, title, subtitle, divisionId }: { 
  view: View; 
  onBack: () => void; 
  title: string; 
  subtitle: string;
  divisionId?: string;
}) {
  const styles = divisionId ? getDivisionStyle(divisionId) : null;

  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="sticky top-0 z-50 border-b border-white/[0.06] glass"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
        <AnimatePresence mode="wait">
          {view !== "home" && (
            <motion.button 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onClick={onBack} 
              className="shrink-0 p-2.5 rounded-xl glass-card hover:bg-white/10 transition-all duration-300 group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            </motion.button>
          )}
        </AnimatePresence>
        
        <div className="flex items-center gap-3 min-w-0">
          <motion.div 
            className="flex items-center gap-2.5"
            whileHover={{ scale: 1.02 }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center animate-gradient-flow shadow-lg" 
              style={{ background: styles ? `linear-gradient(135deg, ${styles.colors[0]}, ${styles.colors[1]})` : "linear-gradient(135deg, #8b5cf6, #06b6d4)" }}>
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            {view === "home" && (
              <motion.h1 
                className="text-lg font-bold tracking-tight"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <span className="neon-text">The Agency</span>
              </motion.h1>
            )}
          </motion.div>
          
          {view !== "home" && (
            <motion.div 
              className="min-w-0"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h1 className="text-sm font-semibold truncate">{title}</h1>
              <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
            </motion.div>
          )}
        </div>
        
        {view === "home" && (
          <motion.div 
            className="ml-auto flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Badge variant="secondary" className="hidden sm:flex gap-1.5 glass-card border-white/10 px-3 py-1">
              <Users className="h-3 w-3 text-violet-400" />
              <span className="text-violet-300">{getTotalAgentCount()}</span> Agents
            </Badge>
            <Badge variant="secondary" className="hidden sm:flex gap-1.5 glass-card border-white/10 px-3 py-1">
              <Layers className="h-3 w-3 text-cyan-400" />
              <span className="text-cyan-300">{divisions.length}</span> Divisions
            </Badge>
          </motion.div>
        )}
      </div>
    </motion.header>
  );
}

// ============================================
// TYPING TEXT EFFECT
// ============================================
function TypingText({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        if (i < text.length) {
          setDisplayed(text.slice(0, i + 1));
          i++;
        } else {
          clearInterval(interval);
          setTimeout(() => setShowCursor(false), 2000);
        }
      }, 40);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [text, delay]);

  return (
    <span>
      {displayed}
      {showCursor && <span className="animate-cursor-blink text-violet-400 ml-0.5">|</span>}
    </span>
  );
}

// ============================================
// HOME PAGE
// ============================================
function HomePage({ onDivisionClick, onSearchSelect }: { 
  onDivisionClick: (division: Division) => void;
  onSearchSelect: (divisionId: string, agentId: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const searchResults = searchQuery.length >= 2 ? searchAgents(searchQuery) : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <motion.div 
        className="text-center mb-16"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Floating badge */}
        <motion.div 
          className="inline-flex items-center gap-2 rounded-full glass-card px-5 py-2 text-sm text-muted-foreground mb-8"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
          whileHover={{ scale: 1.05 }}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
          </span>
          <AnimatedCounter target={getTotalAgentCount()} /> Specialized AI Agents across {divisions.length} Divisions
        </motion.div>

        {/* Title with gradient and typing */}
        <motion.h1 
          className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <span className="bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent animate-gradient-flow bg-[length:200%_200%]">
            The Agency
          </span>
        </motion.h1>
        
        <motion.p 
          className="text-lg sm:text-xl text-muted-foreground/80 max-w-2xl mx-auto mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <TypingText text="A complete AI agency at your fingertips. Each agent is a specialized expert with personality, processes, and proven deliverables." delay={600} />
        </motion.p>

        {/* Search Bar */}
        <motion.div 
          className="relative max-w-xl mx-auto"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <div className="search-glow rounded-2xl glass-strong transition-all duration-300">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-violet-400" />
            <Input
              placeholder="Search agents by name, specialty, or division..."
              className="pl-13 h-14 text-base rounded-2xl border-0 bg-transparent focus:ring-0 focus:outline-none placeholder:text-muted-foreground/50"
              style={{ paddingLeft: "3rem" }}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearch(e.target.value.length >= 2);
              }}
              onFocus={() => searchQuery.length >= 2 && setShowSearch(true)}
              onBlur={() => setTimeout(() => setShowSearch(false), 200)}
            />
          </div>
          
          <AnimatePresence>
            {showSearch && searchResults.length > 0 && (
              <motion.div 
                className="absolute top-full mt-3 w-full glass-strong rounded-2xl shadow-2xl shadow-black/40 z-50 max-h-80 overflow-y-auto"
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                {searchResults.slice(0, 10).map((agent, i) => (
                  <motion.button
                    key={`${agent.divisionId}-${agent.id}`}
                    className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => {
                      onSearchSelect(agent.divisionId, agent.id);
                      setSearchQuery("");
                      setShowSearch(false);
                    }}
                  >
                    <span className="text-2xl">{agent.emoji}</span>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{agent.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {agent.divisionEmoji} {agent.divisionName} — {agent.specialty}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-violet-400 ml-auto shrink-0" />
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* Stats Row */}
      <motion.div 
        className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-16"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.5 }}
      >
        {[
          { label: "Total Agents", value: getTotalAgentCount(), icon: Users, color: "text-violet-400", glow: "rgba(139,92,246,0.2)" },
          { label: "Divisions", value: divisions.length, icon: Layers, color: "text-cyan-400", glow: "rgba(6,182,212,0.2)" },
          { label: "Workflows", value: 87, icon: Activity, color: "text-pink-400", glow: "rgba(236,72,153,0.2)" },
          { label: "Deliverables", value: 500, icon: Rocket, color: "text-amber-400", glow: "rgba(245,158,11,0.2)" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            className="glass-card rounded-2xl p-5 text-center group cursor-default"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 + i * 0.1, duration: 0.4 }}
            whileHover={{ 
              scale: 1.03,
              boxShadow: `0 0 30px ${stat.glow}`
            }}
          >
            <stat.icon className={`h-6 w-6 mx-auto mb-3 ${stat.color} group-hover:scale-110 transition-transform`} />
            <div className="text-3xl font-black mb-1">
              <AnimatedCounter target={stat.value} duration={1500} />
              {stat.value >= 500 ? "+" : ""}
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Division Grid */}
      <div className="mb-8">
        <motion.div 
          className="flex items-center gap-3 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
        >
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Explore Divisions</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {divisions.map((division, i) => {
          const styles = getDivisionStyle(division.id);
          return (
            <motion.div
              key={division.id}
              className="group cursor-pointer"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4 + i * 0.06, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              whileHover={{ 
                y: -8,
                transition: { duration: 0.3 }
              }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onDivisionClick(division)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && onDivisionClick(division)}
            >
              <div 
                className="glass-card rounded-2xl overflow-hidden h-full"
                style={{ 
                  ...styles.bg, 
                  borderWidth: "1px", 
                  ...styles.border,
                }}
              >
                {/* Animated top gradient bar */}
                <div 
                  className="h-1 w-full animate-gradient-flow"
                  style={{ background: `linear-gradient(90deg, ${styles.colors[0]}, ${styles.colors[1]}, ${styles.colors[0]})`, backgroundSize: "200% 100%" }}
                />
                
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <motion.div 
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg relative overflow-hidden"
                      style={styles.icon}
                      whileHover={{ rotate: 5, scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <span className="text-3xl relative z-10">{division.emoji}</span>
                      {/* Shimmer overlay */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                        <div className="absolute inset-0 animate-shimmer" style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)", backgroundSize: "200% 100%" }} />
                      </div>
                    </motion.div>
                    
                    <motion.div
                      className="opacity-0 group-hover:opacity-100 transition-all duration-300"
                      initial={false}
                    >
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" style={{ color: styles.colors[0] }} />
                    </motion.div>
                  </div>
                  
                  <h3 className="font-bold text-base mb-2 group-hover:text-white transition-colors">{division.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">{division.tagline}</p>
                  
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-[11px] glass-card border-white/10 px-2.5 py-0.5">
                      {division.agents.length} agents
                    </Badge>
                    <div className="flex -space-x-1">
                      {division.agents.slice(0, 3).map((a, j) => (
                        <motion.span 
                          key={j} 
                          className="text-sm"
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 1.8 + i * 0.06 + j * 0.05 }}
                        >
                          {a.emoji}
                        </motion.span>
                      ))}
                      {division.agents.length > 3 && (
                        <span className="text-[10px] text-muted-foreground ml-1">+{division.agents.length - 3}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// DIVISION PAGE
// ============================================
function DivisionPage({ division, onAgentClick }: { 
  division: Division; 
  onAgentClick: (agent: Agent) => void;
}) {
  const [filter, setFilter] = useState("");
  const styles = getDivisionStyle(division.id);

  const filteredAgents = division.agents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(filter.toLowerCase()) ||
      agent.specialty.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Division Header */}
      <motion.div 
        className="mb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-5 mb-6">
          <motion.div 
            className="w-20 h-20 rounded-3xl flex items-center justify-center text-white shadow-2xl relative"
            style={{ ...styles.icon, boxShadow: `0 0 40px ${styles.glow}` }}
            animate={{ 
              boxShadow: [`0 0 40px ${styles.glow}`, `0 0 60px ${styles.glow}`, `0 0 40px ${styles.glow}`],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <span className="text-5xl">{division.emoji}</span>
          </motion.div>
          <div>
            <motion.h2 
              className="text-3xl font-black mb-1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              {division.name} Division
            </motion.h2>
            <motion.p 
              className="text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {division.tagline}
            </motion.p>
            <motion.div 
              className="flex items-center gap-3 mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Badge variant="secondary" className="glass-card border-white/10 gap-1.5">
                <Users className="h-3 w-3" style={{ color: styles.colors[0] }} />
                {division.agents.length} Agents
              </Badge>
              <Badge variant="secondary" className="glass-card border-white/10 gap-1.5">
                <Activity className="h-3 w-3" style={{ color: styles.colors[0] }} />
                {division.agents.reduce((sum, a) => sum + a.deliverables.length, 0)} Deliverables
              </Badge>
            </motion.div>
          </div>
        </div>

        {/* Search/Filter */}
        <motion.div 
          className="relative max-w-md"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="search-glow rounded-xl glass-strong transition-all duration-300">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: styles.colors[0] }} />
            <Input
              placeholder={`Filter ${division.name} agents...`}
              className="pl-10 h-11 rounded-xl border-0 bg-transparent focus:ring-0 focus:outline-none placeholder:text-muted-foreground/50"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </motion.div>
      </motion.div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <AnimatePresence mode="popLayout">
          {filteredAgents.map((agent, i) => (
            <motion.div
              key={agent.id}
              layout
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: i * 0.06, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              className="group cursor-pointer"
              whileHover={{ y: -6, transition: { duration: 0.25 } }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onAgentClick(agent)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && onAgentClick(agent)}
            >
              <div 
                className="glass-card rounded-2xl p-6 h-full relative overflow-hidden"
                style={{ borderWidth: "1px", borderColor: `${styles.colors[0]}15` }}
              >
                {/* Hover glow effect */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
                  style={{ background: `radial-gradient(circle at 50% 0%, ${styles.glow}10, transparent 70%)` }}
                />
                
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <motion.span 
                        className="text-3xl"
                        whileHover={{ scale: 1.2, rotate: 10 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        {agent.emoji}
                      </motion.span>
                      <div>
                        <h3 className="font-bold text-sm group-hover:text-white transition-colors">{agent.name}</h3>
                        <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: `${styles.colors[0]}15`, color: styles.colors[0] }}>
                          {agent.specialty.split(",")[0]}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform opacity-0 group-hover:opacity-100" style={{ color: styles.colors[0] }} />
                  </div>
                  
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">{agent.whenToUse}</p>
                  
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-[10px] px-2 py-0 border-white/10">
                      {agent.deliverables.length} deliverables
                    </Badge>
                    <Badge variant="outline" className="text-[10px] px-2 py-0 border-white/10">
                      {agent.successMetrics.length} metrics
                    </Badge>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredAgents.length === 0 && (
        <motion.div 
          className="text-center py-16 text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg">No agents match your filter</p>
          <p className="text-sm mt-1">Try a different search term</p>
        </motion.div>
      )}
    </div>
  );
}

// ============================================
// AGENT DETAIL PAGE
// ============================================
function AgentDetailPage({ division, agent, onEnterWorkspace }: { 
  division: Division; 
  agent: Agent; 
  onEnterWorkspace: () => void;
}) {
  const styles = getDivisionStyle(division.id);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Agent Profile Header */}
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <motion.div 
            className="w-24 h-24 rounded-3xl flex items-center justify-center text-white shadow-2xl shrink-0 relative"
            style={{ ...styles.icon, boxShadow: `0 0 50px ${styles.glow}` }}
            animate={{ 
              boxShadow: [`0 0 50px ${styles.glow}`, `0 0 70px ${styles.glow}`, `0 0 50px ${styles.glow}`],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            whileHover={{ scale: 1.05, rotate: 5 }}
          >
            <span className="text-6xl">{agent.emoji}</span>
          </motion.div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <motion.h2 
                className="text-3xl font-black"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                {agent.name}
              </motion.h2>
              <Badge variant="secondary" className="glass-card border-white/10 text-xs gap-1.5">
                {division.emoji} {division.name}
              </Badge>
            </div>
            <motion.p 
              className="text-sm text-muted-foreground italic leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              &ldquo;{agent.personality}&rdquo;
            </motion.p>
            <motion.div 
              className="flex flex-wrap gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {agent.specialty.split(", ").map((s, i) => (
                <Badge key={i} variant="outline" className="text-[11px] border-white/10" style={{ borderColor: `${styles.colors[0]}30`, color: styles.colors[0] }}>
                  {s}
                </Badge>
              ))}
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Core Mission */}
      <motion.div 
        className="glass-card rounded-2xl p-6 mb-5 relative overflow-hidden"
        style={{ borderWidth: "1px", borderColor: `${styles.colors[0]}15` }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        whileHover={{ borderColor: `${styles.colors[0]}30` }}
      >
        <div className="absolute top-0 left-0 right-0 h-px animate-gradient-flow" style={{ background: `linear-gradient(90deg, transparent, ${styles.colors[0]}, transparent)`, backgroundSize: "200% 100%" }} />
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4" style={{ color: styles.colors[0] }} />
          <h3 className="text-sm font-bold uppercase tracking-wider">Core Mission</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{agent.coreMission}</p>
      </motion.div>

      {/* When to Use */}
      <motion.div 
        className="glass-card rounded-2xl p-6 mb-5 relative overflow-hidden"
        style={{ borderWidth: "1px", borderColor: `${styles.colors[0]}15` }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        whileHover={{ borderColor: `${styles.colors[0]}30` }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-4 w-4" style={{ color: styles.colors[0] }} />
          <h3 className="text-sm font-bold uppercase tracking-wider">When to Use</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{agent.whenToUse}</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        {/* Deliverables */}
        <motion.div 
          className="glass-card rounded-2xl p-6 relative overflow-hidden"
          style={{ borderWidth: "1px", borderColor: `${styles.colors[0]}15` }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ borderColor: `${styles.colors[0]}30` }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4" style={{ color: styles.colors[0] }} />
            <h3 className="text-sm font-bold uppercase tracking-wider">Technical Deliverables</h3>
          </div>
          <ul className="space-y-3">
            {agent.deliverables.map((d, i) => (
              <motion.li 
                key={i} 
                className="text-xs text-muted-foreground flex items-start gap-2.5"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.05 }}
              >
                <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: styles.colors[0] }} />
                <span className="leading-relaxed">{d}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>

        {/* Success Metrics */}
        <motion.div 
          className="glass-card rounded-2xl p-6 relative overflow-hidden"
          style={{ borderWidth: "1px", borderColor: `${styles.colors[0]}15` }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ borderColor: `${styles.colors[0]}30` }}
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4" style={{ color: styles.colors[0] }} />
            <h3 className="text-sm font-bold uppercase tracking-wider">Success Metrics</h3>
          </div>
          <ul className="space-y-3">
            {agent.successMetrics.map((m, i) => (
              <motion.li 
                key={i} 
                className="text-xs text-muted-foreground flex items-start gap-2.5"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.05 }}
              >
                <span className="mt-0.5 shrink-0 text-emerald-400">✓</span>
                <span className="leading-relaxed">{m}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </div>

      {/* Workflow */}
      <motion.div 
        className="glass-card rounded-2xl p-6 mb-8 relative overflow-hidden"
        style={{ borderWidth: "1px", borderColor: `${styles.colors[0]}15` }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        whileHover={{ borderColor: `${styles.colors[0]}30` }}
      >
        <div className="flex items-center gap-2 mb-5">
          <Globe className="h-4 w-4" style={{ color: styles.colors[0] }} />
          <h3 className="text-sm font-bold uppercase tracking-wider">Workflow Process</h3>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
          {agent.workflow.map((step, i) => (
            <motion.div 
              key={i} 
              className="flex items-center gap-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + i * 0.1 }}
            >
              <div className="flex items-center gap-3 glass-card rounded-xl px-4 py-2.5 text-xs">
                <span className="font-black text-base" style={{ color: styles.colors[0] }}>{i + 1}</span>
                <span className="text-muted-foreground leading-relaxed">{step.replace(/^\d+\.\s*/, "")}</span>
              </div>
              {i < agent.workflow.length - 1 && (
                <ChevronRight className="h-4 w-4 hidden sm:block shrink-0 opacity-30" />
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Enter Workspace CTA */}
      <motion.button
        onClick={onEnterWorkspace}
        className="w-full h-16 text-base rounded-2xl shadow-2xl flex items-center justify-center gap-3 text-white font-bold transition-all duration-300 relative overflow-hidden group"
        style={{ background: `linear-gradient(135deg, ${styles.colors[0]}, ${styles.colors[1]})` }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        whileHover={{ 
          scale: 1.02,
          boxShadow: `0 0 40px ${styles.glow}`
        }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Animated shine effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute inset-0 animate-shimmer" style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)", backgroundSize: "200% 100%" }} />
        </div>
        
        <MessageSquare className="h-5 w-5 relative z-10" />
        <span className="relative z-10">Enter Workspace — Chat with {agent.name}</span>
        <ArrowRight className="h-5 w-5 relative z-10 group-hover:translate-x-1 transition-transform" />
        
        {/* Animated border glow */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" style={{ boxShadow: `inset 0 0 20px rgba(255,255,255,0.2)` }} />
      </motion.button>
    </div>
  );
}

// ============================================
// FILE ATTACHMENT PREVIEW
// ============================================
function FileAttachmentPreview({ file, onRemove, styles }: { 
  file: FileAttachment; 
  onRemove?: () => void;
  styles: { colors: [string, string]; glow: string };
}) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getIcon = () => {
    switch (file.type) {
      case "image": return <ImageIcon className="h-4 w-4" />;
      case "code": return <FileCode2 className="h-4 w-4" />;
      case "document": return <FileText className="h-4 w-4" />;
      default: return <File className="h-4 w-4" />;
    }
  };

  return (
    <motion.div 
      className="relative group glass-card rounded-xl p-2.5 pr-9 flex items-center gap-2.5 max-w-[200px]"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      style={{ borderColor: `${styles.colors[0]}30` }}
    >
      {/* Image thumbnail or file icon */}
      {file.type === "image" && file.preview ? (
        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
          <img src={file.preview} alt={file.name} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${styles.colors[0]}15`, color: styles.colors[0] }}>
          {getIcon()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium truncate">{file.name}</p>
        <p className="text-[10px] text-muted-foreground">{formatSize(file.size)}</p>
      </div>
      {onRemove && (
        <button 
          onClick={onRemove}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
        >
          <X className="h-3 w-3 text-white" />
        </button>
      )}
    </motion.div>
  );
}

// ============================================
// AGENT WORKSPACE (Chat) — WITH FILE SHARING
// ============================================
function AgentWorkspace({ division, agent }: { 
  division: Division; 
  agent: Agent;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `Hello! I'm **${agent.name}** ${agent.emoji} from the ${division.name} Division.\n\n${agent.personality}\n\nI specialize in: ${agent.specialty}\n\nYou can share files with me — images, code, documents — and I'll analyze them for you!\n\nHow can I help you today?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const styles = getDivisionStyle(division.id);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const processFile = useCallback((file: globalThis.File): Promise<FileAttachment | null> => {
    return new Promise((resolve) => {
      if (file.size > MAX_FILE_SIZE) {
        setFileError(`File "${file.name}" is too large. Max 10MB.`);
        resolve(null);
        return;
      }

      const fileInfo = getFileCategory(file.name, file.type);
      if (!fileInfo) {
        setFileError(`File type "${file.name}" is not supported.`);
        resolve(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const attachment: FileAttachment = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          type: fileInfo.category,
          data: fileInfo.category === "image" ? result : result.split(",")[1] || result,
          mimeType: fileInfo.mimeType,
          preview: fileInfo.category === "image" ? result : undefined,
          size: file.size,
        };
        resolve(attachment);
      };
      reader.onerror = () => {
        setFileError(`Failed to read file "${file.name}".`);
        resolve(null);
      };

      if (fileInfo.category === "image") {
        reader.readAsDataURL(file);
      } else {
        // For text-based files, read as text
        reader.readAsDataURL(file);
      }
    });
  }, []);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files) return;
    setFileError(null);
    
    const newAttachments: FileAttachment[] = [];
    for (let i = 0; i < Math.min(files.length, 5); i++) {
      const att = await processFile(files[i]);
      if (att) newAttachments.push(att);
    }
    
    if (newAttachments.length > 0) {
      setAttachments((prev) => [...prev, ...newAttachments].slice(0, 10)); // Max 10 attachments
    }
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const sendMessage = useCallback(async () => {
    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    const userMessage = input.trim();
    const userFiles = [...attachments];
    setInput("");
    setAttachments([]);
    setFileError(null);

    setMessages((prev) => [
      ...prev, 
      { 
        role: "user", 
        content: userMessage || (userFiles.length > 0 ? `Shared ${userFiles.length} file(s)` : ""),
        files: userFiles.length > 0 ? userFiles : undefined,
      },
    ]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { 
            role: "user", 
            content: userMessage || (userFiles.length > 0 ? `The user shared ${userFiles.length} file(s). Please analyze them.` : ""),
            files: userFiles.map(f => ({
              name: f.name,
              type: f.type,
              data: f.data,
              mimeType: f.mimeType,
            })),
          }].map((m) => ({
            role: m.role,
            content: m.content,
            files: m.files ? m.files.map(f => ({
              name: f.name,
              type: f.type,
              data: f.data,
              mimeType: f.mimeType,
            })) : undefined,
          })),
          agentId: agent.id,
          agentName: agent.name,
          agentPersonality: agent.personality,
          agentSpecialty: agent.specialty,
        }),
      });

      if (!res.ok) throw new Error("Failed to get response");

      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I'm sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [input, isLoading, messages, agent, attachments]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const renderMessageContent = (content: string) => {
    return content.split('\n').map((line, j) => (
      <React.Fragment key={j}>
        {line.startsWith('**') && line.endsWith('**') ? (
          <strong className="font-semibold">{line.replace(/\*\*/g, '')}</strong>
        ) : line.startsWith('- ') ? (
          <span className="block pl-2">• {line.slice(2)}</span>
        ) : line.startsWith('```') ? (
          <code className="block bg-black/20 rounded px-2 py-1 text-xs font-mono my-1 overflow-x-auto">{line.replace(/```/g, '')}</code>
        ) : (
          <span>{line}</span>
        )}
        {j < content.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  const renderFileInMessage = (file: FileAttachment) => {
    if (file.type === "image" && file.preview) {
      return (
        <motion.div 
          key={file.id}
          className="mb-2 rounded-xl overflow-hidden cursor-pointer group/img"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.02 }}
        >
          <img 
            src={file.preview} 
            alt={file.name}
            className="max-w-full max-h-64 object-contain rounded-xl"
          />
          <div className="flex items-center gap-1.5 mt-1.5 opacity-70">
            <ImageIcon className="h-3 w-3" />
            <span className="text-[10px] truncate">{file.name}</span>
          </div>
        </motion.div>
      );
    }

    // Code or document file
    const icon = file.type === "code" ? <FileCode2 className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />;
    return (
      <motion.div 
        key={file.id}
        className="mb-2 flex items-center gap-2 rounded-lg px-3 py-2"
        style={{ background: "rgba(0,0,0,0.15)" }}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
      >
        {icon}
        <span className="text-xs truncate">{file.name}</span>
      </motion.div>
    );
  };

  const canSend = input.trim() || attachments.length > 0;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Agent Info Bar */}
      <motion.div 
        className="border-b border-white/[0.06] glass px-4 py-3"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <motion.div 
            className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0 relative"
            style={{ ...styles.icon, boxShadow: `0 0 25px ${styles.glow}` }}
            animate={{ boxShadow: [`0 0 25px ${styles.glow}`, `0 0 35px ${styles.glow}`, `0 0 25px ${styles.glow}`] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <span className="text-xl">{agent.emoji}</span>
          </motion.div>
          <div className="min-w-0">
            <div className="font-bold text-sm">{agent.name}</div>
            <div className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              Online — {agent.specialty.split(",")[0]}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <Badge variant="secondary" className="text-[10px] glass-card border-white/10 gap-1 hidden sm:flex">
              <Paperclip className="h-3 w-3" style={{ color: styles.colors[0] }} />
              File sharing enabled
            </Badge>
            <Badge variant="secondary" className="text-xs glass-card border-white/10 gap-1.5">
              {division.emoji} {division.name}
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 px-4">
        <div className="max-w-4xl mx-auto py-6 space-y-5" ref={scrollRef}>
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    msg.role === "user" ? "shadow-lg" : ""
                  }`}
                  style={msg.role === "user" 
                    ? { background: `linear-gradient(135deg, ${styles.colors[0]}, ${styles.colors[1]})` } 
                    : { background: `linear-gradient(135deg, ${styles.colors[0]}20, ${styles.colors[1]}20)`, border: `1px solid ${styles.colors[0]}20` }
                  }
                >
                  {msg.role === "user" ? (
                    <User className="h-4 w-4 text-white" />
                  ) : (
                    <Bot className="h-4 w-4" style={{ color: styles.colors[0] }} />
                  )}
                </div>
                <div
                  className={`max-w-[80%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "text-white rounded-tr-sm"
                      : "glass-card rounded-tl-sm"
                  }`}
                  style={msg.role === "user"
                    ? { background: `linear-gradient(135deg, ${styles.colors[0]}, ${styles.colors[1]})` }
                    : {}
                  }
                >
                  {/* Render files if present */}
                  {msg.files && msg.files.length > 0 && (
                    <div className="mb-2 space-y-1.5">
                      {msg.files.map((file) => renderFileInMessage(file))}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap break-words">
                    {renderMessageContent(msg.content)}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isLoading && (
            <motion.div 
              className="flex gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${styles.colors[0]}20, ${styles.colors[1]}20)`, border: `1px solid ${styles.colors[0]}20` }}>
                <Bot className="h-4 w-4" style={{ color: styles.colors[0] }} />
              </div>
              <div className="glass-card rounded-2xl rounded-tl-sm px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="typing-dot" style={{ background: styles.colors[0] }} />
                  <span className="typing-dot" style={{ background: styles.colors[0] }} />
                  <span className="typing-dot" style={{ background: styles.colors[0] }} />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <motion.div 
        className="border-t border-white/[0.06] glass px-4 py-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="max-w-4xl mx-auto">
          {/* File Attachments Preview */}
          <AnimatePresence>
            {attachments.length > 0 && (
              <motion.div 
                className="flex flex-wrap gap-2 mb-3"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                {attachments.map((file) => (
                  <FileAttachmentPreview 
                    key={file.id} 
                    file={file} 
                    onRemove={() => removeAttachment(file.id)}
                    styles={styles}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* File Error */}
          <AnimatePresence>
            {fileError && (
              <motion.div 
                className="mb-2 text-xs text-red-400 flex items-center gap-1.5"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <X className="h-3 w-3" />
                {fileError}
                <button onClick={() => setFileError(null)} className="ml-1 underline hover:text-red-300">Dismiss</button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Drag & Drop overlay */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`relative rounded-xl transition-all duration-300 ${isDragOver ? "ring-2 scale-[1.01]" : ""}`}
            style={isDragOver ? { ringColor: styles.colors[0], boxShadow: `0 0 30px ${styles.glow}`, background: `${styles.colors[0]}08` } : {}}
          >
            {isDragOver && (
              <motion.div 
                className="absolute inset-0 z-10 flex items-center justify-center rounded-xl glass-strong"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="text-center">
                  <Paperclip className="h-8 w-8 mx-auto mb-2" style={{ color: styles.colors[0] }} />
                  <p className="text-sm font-medium">Drop files here</p>
                  <p className="text-xs text-muted-foreground">Images, code, documents</p>
                </div>
              </motion.div>
            )}
            
            <div className="flex gap-2.5">
              {/* Attach File Button */}
              <motion.button
                onClick={() => fileInputRef.current?.click()}
                className="h-12 w-12 rounded-xl shrink-0 flex items-center justify-center glass-card transition-all duration-300 hover:border-white/20"
                style={{ borderColor: `${styles.colors[0]}20` }}
                whileHover={{ scale: 1.05, borderColor: styles.colors[0] }}
                whileTap={{ scale: 0.95 }}
                title="Attach file"
              >
                <Paperclip className="h-5 w-5" style={{ color: styles.colors[0] }} />
              </motion.button>
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.js,.jsx,.ts,.tsx,.py,.java,.go,.rs,.cpp,.c,.html,.css,.scss,.json,.xml,.yaml,.yml,.md,.txt,.csv,.sql,.sh,.php,.swift,.kt,.dart,.vue,.svelte,.env"
                className="hidden"
                onChange={(e) => {
                  handleFileSelect(e.target.files);
                  // Reset input so same file can be selected again
                  e.target.value = "";
                }}
              />
              
              <div className="flex-1 search-glow rounded-xl glass-strong transition-all duration-300">
                <Input
                  ref={inputRef}
                  placeholder={attachments.length > 0 ? `Add a message with your file(s)...` : `Ask ${agent.name} anything or drop files...`}
                  className="h-12 rounded-xl border-0 bg-transparent focus:ring-0 focus:outline-none placeholder:text-muted-foreground/50"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                />
              </div>
              <motion.button
                onClick={sendMessage}
                disabled={!canSend || isLoading}
                className="h-12 w-12 rounded-xl shrink-0 flex items-center justify-center text-white shadow-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300"
                style={{ background: `linear-gradient(135deg, ${styles.colors[0]}, ${styles.colors[1]})` }}
                whileHover={{ 
                  scale: 1.05, 
                  boxShadow: `0 0 25px ${styles.glow}`,
                }}
                whileTap={{ scale: 0.95 }}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </motion.button>
            </div>
          </div>

          {/* File support hint */}
          <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground/40">
            <span className="flex items-center gap-1"><ImageIcon className="h-2.5 w-2.5" /> Images</span>
            <span className="flex items-center gap-1"><FileCode2 className="h-2.5 w-2.5" /> Code</span>
            <span className="flex items-center gap-1"><FileText className="h-2.5 w-2.5" /> Documents</span>
            <span>Max 10MB per file</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================
// PAGE TRANSITION VARIANTS
// ============================================
const pageVariants = {
  initial: { opacity: 0, x: 20, scale: 0.98 },
  animate: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: -20, scale: 0.98 },
};

const pageTransition = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
};

// ============================================
// MAIN PAGE
// ============================================
export default function AgencyPage() {
  const [view, setView] = useState<View>("home");
  const [currentDivision, setCurrentDivision] = useState<Division | null>(null);
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);

  const handleDivisionClick = (division: Division) => {
    setCurrentDivision(division);
    setView("division");
    window.scrollTo(0, 0);
  };

  const handleAgentClick = (agent: Agent) => {
    setCurrentAgent(agent);
    setView("agent");
    window.scrollTo(0, 0);
  };

  const handleSearchSelect = (divisionId: string, agentId: string) => {
    const division = getDivisionById(divisionId);
    const agent = getAgentById(divisionId, agentId);
    if (division && agent) {
      setCurrentDivision(division);
      setCurrentAgent(agent);
      setView("agent");
      window.scrollTo(0, 0);
    }
  };

  const handleEnterWorkspace = () => {
    setView("workspace");
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    if (view === "workspace") {
      setView("agent");
    } else if (view === "agent") {
      setView("division");
    } else if (view === "division") {
      setView("home");
      setCurrentDivision(null);
    }
    window.scrollTo(0, 0);
  };

  const getTitle = () => {
    switch (view) {
      case "home": return "The Agency";
      case "division": return currentDivision ? `${currentDivision.emoji} ${currentDivision.name} Division` : "";
      case "agent": return currentAgent ? `${currentAgent.emoji} ${currentAgent.name}` : "";
      case "workspace": return currentAgent ? `Workspace: ${currentAgent.name}` : "";
      default: return "The Agency";
    }
  };

  const getSubtitle = () => {
    switch (view) {
      case "home": return "AI Specialists Hub";
      case "division": return currentDivision?.tagline || "";
      case "agent": return currentAgent?.specialty || "";
      case "workspace": return "Chat with your AI specialist";
      default: return "";
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AnimatedBackground />
      <Header 
        view={view} 
        onBack={handleBack} 
        title={getTitle()} 
        subtitle={getSubtitle()} 
        divisionId={currentDivision?.id}
      />
      
      <main className="flex-1">
        <AnimatePresence mode="wait">
          {view === "home" && (
            <motion.div
              key="home"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              <HomePage onDivisionClick={handleDivisionClick} onSearchSelect={handleSearchSelect} />
            </motion.div>
          )}
          {view === "division" && currentDivision && (
            <motion.div
              key="division"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              <DivisionPage division={currentDivision} onAgentClick={handleAgentClick} />
            </motion.div>
          )}
          {view === "agent" && currentDivision && currentAgent && (
            <motion.div
              key="agent"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              <AgentDetailPage
                division={currentDivision}
                agent={currentAgent}
                onEnterWorkspace={handleEnterWorkspace}
              />
            </motion.div>
          )}
          {view === "workspace" && currentDivision && currentAgent && (
            <motion.div
              key="workspace"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
              className="flex-1"
            >
              <AgentWorkspace
                division={currentDivision}
                agent={currentAgent}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      {view !== "workspace" && (
        <motion.footer 
          className="border-t border-white/[0.04] glass mt-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-sm text-muted-foreground">
            <p className="flex items-center justify-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              <span>The Agency — <AnimatedCounter target={getTotalAgentCount()} duration={1000} /> Specialized AI Agents across {divisions.length} Divisions</span>
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground/50">Open Source • MIT License • Battle-Tested in Production</p>
          </div>
        </motion.footer>
      )}
    </div>
  );
}
