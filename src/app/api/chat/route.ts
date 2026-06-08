import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export async function POST(req: NextRequest) {
  try {
    const { messages, agentId, agentName, agentPersonality, agentSpecialty } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages are required" }, { status: 400 });
    }

    const zai = await ZAI.create();

    const systemPrompt = `You are ${agentName}, an AI specialist agent from The Agency.

Your Personality: ${agentPersonality}

Your Specialty: ${agentSpecialty}

You are an expert in your domain with deep knowledge, a unique voice, and proven deliverables. You communicate with confidence and warmth. You provide practical, actionable advice with specific examples and code when relevant. You stay in character throughout the conversation.

Key behaviors:
- Be knowledgeable and specific — not generic
- Provide code examples, frameworks, or concrete steps when relevant
- Ask clarifying questions when needed
- Use your unique personality and communication style
- Focus on delivering real, measurable outcomes
- Be concise but thorough`;

    const chatMessages = [
      { role: "system" as const, content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const completion = await zai.chat.completions.create({
      messages: chatMessages,
      temperature: 0.7,
      max_tokens: 2048,
    });

    const reply = completion.choices[0]?.message?.content || "I'm here to help! Could you rephrase your question?";

    return NextResponse.json({ reply });
  } catch (error: unknown) {
    console.error("Chat API error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
