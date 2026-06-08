import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

interface ChatMessageInput {
  role: string;
  content: string;
  files?: Array<{
    name: string;
    type: string; // "image" | "document" | "code"
    data: string; // base64 for images, text content for docs/code
    mimeType?: string;
  }>;
}

export async function POST(req: NextRequest) {
  try {
    const { messages, agentId, agentName, agentPersonality, agentSpecialty, webSearch } = await req.json();

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
- Be concise but thorough
- When files or images are shared, analyze them carefully and provide detailed, helpful feedback
- For images: describe what you see, analyze UI/UX if applicable, identify issues or improvements
- For code files: review the code, suggest improvements, identify bugs, recommend best practices
- For documents: summarize, analyze, and provide insights based on the content
${webSearch ? `- Web search is ENABLED. When you have search results, incorporate them naturally into your response. Always cite your sources by including the URL. Format links as [Source Name](URL). Be transparent about what information comes from search results versus your training data.` : ""}`;

    // Build messages with file content support
    const chatMessages = [
      { role: "system" as const, content: systemPrompt },
      ...messages.map((m: ChatMessageInput) => {
        // If message has image files, use multimodal content format
        if (m.files && m.files.length > 0) {
          const imageFiles = m.files.filter(f => f.type === "image");
          const textFiles = m.files.filter(f => f.type !== "image");

          // Build text content with file references
          let textContent = m.content || "";
          
          // Add text/code file contents as context
          for (const file of textFiles) {
            textContent += `\n\n--- File: ${file.name} ---\n${file.data}\n--- End of ${file.name} ---`;
          }

          // If there are images, use multimodal format
          if (imageFiles.length > 0) {
            const contentParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
            
            if (textContent.trim()) {
              contentParts.push({ type: "text", text: textContent });
            }

            for (const img of imageFiles) {
              contentParts.push({
                type: "image_url",
                image_url: { url: img.data.startsWith("data:") ? img.data : `data:${img.mimeType || "image/png"};base64,${img.data}` },
              });
            }

            return {
              role: m.role as "user" | "assistant",
              content: contentParts,
            };
          }

          return {
            role: m.role as "user" | "assistant",
            content: textContent,
          };
        }

        return {
          role: m.role as "user" | "assistant",
          content: m.content,
        };
      }),
    ];

    // Web search: if enabled, perform search and inject results
    let searchContext = "";
    if (webSearch) {
      // Get the last user message for search query
      const lastUserMsg = [...messages].reverse().find((m: ChatMessageInput) => m.role === "user");
      if (lastUserMsg && lastUserMsg.content.trim()) {
        try {
          const searchResults = await zai.functions.invoke("web_search", {
            query: lastUserMsg.content.trim(),
            num: 10,
          });

          if (Array.isArray(searchResults) && searchResults.length > 0) {
            searchContext = "\n\n--- Web Search Results ---\n" + 
              searchResults.map((r: { name?: string; url?: string; snippet?: string; host_name?: string }, i: number) => 
                `[${i + 1}] ${r.name || "Untitled"}\nURL: ${r.url || ""}\nSnippet: ${r.snippet || ""}\nSource: ${r.host_name || ""}`
              ).join("\n\n") + 
              "\n--- End of Search Results ---\n\nUse the above search results to answer the user's question. Cite sources as [Source Name](URL) when referencing information from the search results.";
            
            // Inject search results into the last user message
            const lastMsg = chatMessages[chatMessages.length - 1];
            if (typeof lastMsg.content === "string") {
              lastMsg.content += searchContext;
            } else if (Array.isArray(lastMsg.content)) {
              const textPart = lastMsg.content.find((p: { type: string }) => p.type === "text");
              if (textPart && textPart.text) {
                textPart.text += searchContext;
              }
            }
          }
        } catch (searchError) {
          console.error("Web search error:", searchError);
          // Continue without search results — don't block the chat
        }
      }
    }

    // UNLIMITED for now — will add limits when going paid
    // Keep last 50 messages for long conversations
    const MAX_HISTORY = 50;
    const trimmedMessages = chatMessages.length > MAX_HISTORY + 1
      ? [chatMessages[0], ...chatMessages.slice(-(MAX_HISTORY))]
      : chatMessages;

    const completion = await zai.chat.completions.create({
      messages: trimmedMessages as Array<{ role: "system" | "user" | "assistant"; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }>,
      temperature: 0.7,
      max_tokens: 32768,
    });

    let reply = completion.choices[0]?.message?.content || "I'm here to help! Could you rephrase your question?";
    
    // Add search indicator if web search was used and results were found
    if (webSearch && searchContext) {
      reply = reply + "\n\n---\n*🔍 Results enhanced with web search*";
    }

    return NextResponse.json({ reply });
  } catch (error: unknown) {
    console.error("Chat API error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
