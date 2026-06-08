"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { divisions, searchAgents, getTotalAgentCount, getDivisionById, getAgentById } from "@/lib/agent-data";
import type { Division, Agent } from "@/lib/agent-data";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search, ArrowLeft, Send, Bot, User, Sparkles, 
  ChevronRight, Users, Zap, Shield, Globe,
  MessageSquare, ArrowRight, Loader2
} from "lucide-react";

// ============================================
// TYPES
// ============================================
type View = "home" | "division" | "agent" | "workspace";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ============================================
// DIVISION STYLE MAP (inline CSS for gradients)
// ============================================
const divisionStyles: Record<string, { bg: React.CSSProperties; border: React.CSSProperties; icon: React.CSSProperties }> = {
  engineering: { bg: { background: "linear-gradient(135deg, rgba(6,182,212,0.1), rgba(37,99,235,0.1))" }, border: { borderColor: "rgba(6,182,212,0.3)" }, icon: { background: "linear-gradient(135deg, #06b6d4, #2563eb)" } },
  design: { bg: { background: "linear-gradient(135deg, rgba(236,72,153,0.1), rgba(225,29,72,0.1))" }, border: { borderColor: "rgba(236,72,153,0.3)" }, icon: { background: "linear-gradient(135deg, #ec4899, #e11d48)" } },
  "paid-media": { bg: { background: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(234,88,12,0.1))" }, border: { borderColor: "rgba(245,158,11,0.3)" }, icon: { background: "linear-gradient(135deg, #f59e0b, #ea580c)" } },
  sales: { bg: { background: "linear-gradient(135deg, rgba(16,185,129,0.1), rgba(22,163,74,0.1))" }, border: { borderColor: "rgba(16,185,129,0.3)" }, icon: { background: "linear-gradient(135deg, #10b981, #16a34a)" } },
  marketing: { bg: { background: "linear-gradient(135deg, rgba(139,92,246,0.1), rgba(147,51,234,0.1))" }, border: { borderColor: "rgba(139,92,246,0.3)" }, icon: { background: "linear-gradient(135deg, #8b5cf6, #9333ea)" } },
  product: { bg: { background: "linear-gradient(135deg, rgba(20,184,166,0.1), rgba(6,182,212,0.1))" }, border: { borderColor: "rgba(20,184,166,0.3)" }, icon: { background: "linear-gradient(135deg, #14b8a6, #06b6d4)" } },
  "project-management": { bg: { background: "linear-gradient(135deg, rgba(14,165,233,0.1), rgba(79,70,229,0.1))" }, border: { borderColor: "rgba(14,165,233,0.3)" }, icon: { background: "linear-gradient(135deg, #0ea5e9, #4f46e5)" } },
  testing: { bg: { background: "linear-gradient(135deg, rgba(239,68,68,0.1), rgba(225,29,72,0.1))" }, border: { borderColor: "rgba(239,68,68,0.3)" }, icon: { background: "linear-gradient(135deg, #ef4444, #e11d48)" } },
  security: { bg: { background: "linear-gradient(135deg, rgba(220,38,38,0.1), rgba(153,27,27,0.1))" }, border: { borderColor: "rgba(220,38,38,0.3)" }, icon: { background: "linear-gradient(135deg, #dc2626, #991b1b)" } },
  support: { bg: { background: "linear-gradient(135deg, rgba(234,179,8,0.1), rgba(217,119,6,0.1))" }, border: { borderColor: "rgba(234,179,8,0.3)" }, icon: { background: "linear-gradient(135deg, #eab308, #d97706)" } },
  "spatial-computing": { bg: { background: "linear-gradient(135deg, rgba(217,70,239,0.1), rgba(236,72,153,0.1))" }, border: { borderColor: "rgba(217,70,239,0.3)" }, icon: { background: "linear-gradient(135deg, #d946ef, #ec4899)" } },
  "game-development": { bg: { background: "linear-gradient(135deg, rgba(132,204,22,0.1), rgba(22,163,74,0.1))" }, border: { borderColor: "rgba(132,204,22,0.3)" }, icon: { background: "linear-gradient(135deg, #84cc16, #16a34a)" } },
  academic: { bg: { background: "linear-gradient(135deg, rgba(120,113,108,0.1), rgba(68,64,60,0.1))" }, border: { borderColor: "rgba(120,113,108,0.3)" }, icon: { background: "linear-gradient(135deg, #78716c, #44403c)" } },
  gis: { bg: { background: "linear-gradient(135deg, rgba(22,163,74,0.1), rgba(4,120,87,0.1))" }, border: { borderColor: "rgba(22,163,74,0.3)" }, icon: { background: "linear-gradient(135deg, #16a34a, #047857)" } },
  finance: { bg: { background: "linear-gradient(135deg, rgba(5,150,105,0.1), rgba(13,148,136,0.1))" }, border: { borderColor: "rgba(5,150,105,0.3)" }, icon: { background: "linear-gradient(135deg, #059669, #0d9488)" } },
  specialized: { bg: { background: "linear-gradient(135deg, rgba(249,115,22,0.1), rgba(220,38,38,0.1))" }, border: { borderColor: "rgba(249,115,22,0.3)" }, icon: { background: "linear-gradient(135deg, #f97316, #dc2626)" } },
  strategy: { bg: { background: "linear-gradient(135deg, rgba(100,116,139,0.1), rgba(51,65,85,0.1))" }, border: { borderColor: "rgba(100,116,139,0.3)" }, icon: { background: "linear-gradient(135deg, #64748b, #334155)" } },
  integrations: { bg: { background: "linear-gradient(135deg, rgba(59,130,246,0.1), rgba(79,70,229,0.1))" }, border: { borderColor: "rgba(59,130,246,0.3)" }, icon: { background: "linear-gradient(135deg, #3b82f6, #4f46e5)" } },
};

function getDivisionStyle(divisionId: string) {
  return divisionStyles[divisionId] || divisionStyles.engineering;
}

// ============================================
// ANIMATED BACKGROUND
// ============================================
function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      <div className="absolute top-0 -left-4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-3xl animate-pulse" style={{ animationDelay: "4s", background: "rgba(var(--primary), 0.03)" }} />
    </div>
  );
}

// ============================================
// HEADER
// ============================================
function Header({ view, onBack, title, subtitle }: { 
  view: View; 
  onBack: () => void; 
  title: string; 
  subtitle: string;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
        {view !== "home" && (
          <button onClick={onBack} className="shrink-0 p-2 rounded-lg hover:bg-muted/50 transition-colors" aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.6))" }}>
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            {view === "home" && (
              <h1 className="text-lg font-bold tracking-tight truncate">The Agency</h1>
            )}
          </div>
          {view !== "home" && (
            <div className="min-w-0">
              <h1 className="text-sm font-semibold truncate">{title}</h1>
              <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
            </div>
          )}
        </div>
        {view === "home" && (
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="secondary" className="hidden sm:flex gap-1">
              <Users className="h-3 w-3" />
              {getTotalAgentCount()} Agents
            </Badge>
            <Badge variant="secondary" className="hidden sm:flex gap-1">
              <Zap className="h-3 w-3" />
              {divisions.length} Divisions
            </Badge>
          </div>
        )}
      </div>
    </header>
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
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground mb-6">
          <Sparkles className="h-4 w-4 text-primary" />
          {getTotalAgentCount()} Specialized AI Agents across {divisions.length} Divisions
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
          <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            The Agency
          </span>
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          A complete AI agency at your fingertips. Each agent is a specialized expert with personality, processes, and proven deliverables.
        </p>

        {/* Search Bar */}
        <div className="relative max-w-xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search agents by name, specialty, or division..."
            className="pl-12 h-12 text-base rounded-xl border-border/50 bg-card shadow-sm"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearch(e.target.value.length >= 2);
            }}
            onFocus={() => searchQuery.length >= 2 && setShowSearch(true)}
            onBlur={() => setTimeout(() => setShowSearch(false), 200)}
          />
          {showSearch && searchResults.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto">
              {searchResults.slice(0, 10).map((agent) => (
                <button
                  key={`${agent.divisionId}-${agent.id}`}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
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
                  <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
        {[
          { label: "Total Agents", value: getTotalAgentCount().toString(), icon: Users },
          { label: "Divisions", value: divisions.length.toString(), icon: Zap },
          { label: "Lines of Code", value: "10,000+", icon: Sparkles },
          { label: "GitHub Stars", value: "108K+", icon: Shield },
        ].map((stat) => (
          <Card key={stat.label} className="border-border/30 bg-card/50">
            <CardContent className="p-4 text-center">
              <stat.icon className="h-5 w-5 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Division Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {divisions.map((division) => {
          const styles = getDivisionStyle(division.id);
          return (
            <div
              key={division.id}
              className="group cursor-pointer rounded-xl border bg-card/50 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              style={{ ...styles.bg, ...styles.border, borderWidth: "1px" }}
              onClick={() => onDivisionClick(division)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && onDivisionClick(division)}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg" style={styles.icon}>
                    <span className="text-2xl">{division.emoji}</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-x-1 transition-transform" />
                </div>
                <h3 className="font-semibold text-base mb-1">{division.name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{division.tagline}</p>
                <Badge variant="secondary" className="text-xs">
                  {division.agents.length} agents
                </Badge>
              </div>
            </div>
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
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg" style={styles.icon}>
            <span className="text-4xl">{division.emoji}</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold">{division.emoji} {division.name} Division</h2>
            <p className="text-muted-foreground">{division.tagline}</p>
          </div>
        </div>

        {/* Search/Filter */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Filter ${division.name} agents...`}
            className="pl-10 h-10 rounded-lg"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAgents.map((agent) => (
          <div
            key={agent.id}
            className="group cursor-pointer rounded-xl border border-border/30 bg-card/50 hover:bg-card hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300"
            onClick={() => onAgentClick(agent)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && onAgentClick(agent)}
          >
            <div className="p-5">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{agent.emoji}</span>
                  <div>
                    <h3 className="font-semibold text-sm">{agent.name}</h3>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{agent.specialty}</p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                <span className="font-medium text-foreground/70">When to use:</span>
                <span className="line-clamp-1">{agent.whenToUse}</span>
              </div>
              <div className="flex gap-1.5">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{agent.deliverables.length} deliverables</Badge>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{agent.successMetrics.length} metrics</Badge>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredAgents.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No agents match your filter. Try a different search term.
        </div>
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
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0" style={styles.icon}>
            <span className="text-5xl">{agent.emoji}</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-bold">{agent.name}</h2>
              <Badge variant="secondary" className="text-xs">
                {division.emoji} {division.name}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground italic">&ldquo;{agent.personality}&rdquo;</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">{agent.specialty}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Core Mission */}
      <Card className="mb-6 border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Core Mission
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{agent.coreMission}</p>
        </CardContent>
      </Card>

      {/* When to Use */}
      <Card className="mb-6 border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            When to Use
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{agent.whenToUse}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Deliverables */}
        <Card className="border-border/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Technical Deliverables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {agent.deliverables.map((d, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-0.5 shrink-0">•</span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Success Metrics */}
        <Card className="border-border/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Success Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {agent.successMetrics.map((m, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Workflow */}
      <Card className="mb-6 border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            Workflow Process
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
            {agent.workflow.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 text-xs">
                  <span className="font-bold text-primary">{i + 1}</span>
                  <span className="text-muted-foreground">{step.replace(/^\d+\.\s*/, "")}</span>
                </div>
                {i < agent.workflow.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground hidden sm:block shrink-0" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Enter Workspace CTA */}
      <button
        onClick={onEnterWorkspace}
        className="w-full h-14 text-base rounded-xl shadow-lg flex items-center justify-center gap-2 text-white font-medium transition-all duration-200 hover:opacity-90 hover:shadow-xl"
        style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.7))" }}
      >
        <MessageSquare className="h-5 w-5" />
        Enter Workspace — Chat with {agent.name}
        <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );
}

// ============================================
// AGENT WORKSPACE (Chat)
// ============================================
function AgentWorkspace({ division, agent }: { 
  division: Division; 
  agent: Agent;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `Hello! I'm **${agent.name}** ${agent.emoji} from the ${division.name} Division.\n\n${agent.personality}\n\nI specialize in: ${agent.specialty}\n\nHow can I help you today?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const styles = getDivisionStyle(division.id);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: userMessage }].map((m) => ({
            role: m.role,
            content: m.content,
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
  }, [input, isLoading, messages, agent]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Agent Info Bar */}
      <div className="border-b border-border/30 bg-card/50 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md shrink-0" style={styles.icon}>
            <span className="text-xl">{agent.emoji}</span>
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm">{agent.name}</div>
            <div className="text-xs text-muted-foreground truncate">{agent.specialty}</div>
          </div>
          <Badge variant="secondary" className="ml-auto text-xs shrink-0">
            {division.emoji} {division.name}
          </Badge>
        </div>
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 px-4">
        <div className="max-w-4xl mx-auto py-6 space-y-6" ref={scrollRef}>
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : ""
                }`}
                style={msg.role === "assistant" ? { background: "linear-gradient(135deg, rgba(var(--primary),0.2), rgba(var(--primary),0.1))", border: "1px solid rgba(var(--primary),0.2)" } : {}}
              >
                {msg.role === "user" ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4 text-primary" />
                )}
              </div>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-muted/50 border border-border/30 rounded-tl-sm"
                }`}
              >
                <div className="whitespace-pre-wrap break-words leading-relaxed">
                  {msg.content.split('\n').map((line, j) => (
                    <React.Fragment key={j}>
                      {line.startsWith('**') && line.endsWith('**') ? (
                        <strong>{line.replace(/\*\*/g, '')}</strong>
                      ) : line.startsWith('- ') ? (
                        <span className="block pl-2">• {line.slice(2)}</span>
                      ) : (
                        <span>{line}</span>
                      )}
                      {j < msg.content.split('\n').length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, rgba(var(--primary),0.2), rgba(var(--primary),0.1))", border: "1px solid rgba(var(--primary),0.2))" }}>
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-muted/50 border border-border/30 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-border/30 bg-card/50 px-4 py-4">
        <div className="max-w-4xl mx-auto flex gap-3">
          <Input
            ref={inputRef}
            placeholder={`Ask ${agent.name} anything...`}
            className="flex-1 h-12 rounded-xl border-border/30"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="h-12 w-12 rounded-xl shrink-0"
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

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
      <Header view={view} onBack={handleBack} title={getTitle()} subtitle={getSubtitle()} />
      
      <main className="flex-1">
        {view === "home" && (
          <HomePage onDivisionClick={handleDivisionClick} onSearchSelect={handleSearchSelect} />
        )}
        {view === "division" && currentDivision && (
          <DivisionPage division={currentDivision} onAgentClick={handleAgentClick} />
        )}
        {view === "agent" && currentDivision && currentAgent && (
          <AgentDetailPage
            division={currentDivision}
            agent={currentAgent}
            onEnterWorkspace={handleEnterWorkspace}
          />
        )}
        {view === "workspace" && currentDivision && currentAgent && (
          <AgentWorkspace
            division={currentDivision}
            agent={currentAgent}
          />
        )}
      </main>

      {/* Footer */}
      {view !== "workspace" && (
        <footer className="border-t border-border/30 bg-card/30 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-sm text-muted-foreground">
            <p>The Agency — {getTotalAgentCount()} Specialized AI Agents across {divisions.length} Divisions</p>
            <p className="mt-1 text-xs">Open Source • MIT License • Battle-Tested in Production</p>
          </div>
        </footer>
      )}
    </div>
  );
}
