import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export async function POST(req: NextRequest) {
  try {
    const { prompt, currentCode, agentPersonality } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const zai = await ZAI.create();

    const systemPrompt = `You are a Full Stack Developer AI agent. Your job is to generate complete, working web application code.

CRITICAL RULES:
1. You MUST output a SINGLE complete HTML file that includes ALL CSS and JavaScript inline
2. The HTML file must be completely self-contained and runnable in a browser
3. Use modern CSS (flexbox, grid, custom properties, animations)
4. Use vanilla JavaScript for interactivity (no frameworks needed for preview)
5. Include responsive design that works on mobile and desktop
6. Make the UI beautiful with gradients, shadows, smooth transitions, and modern design
7. Include mock data/functionality so the website feels real and interactive
8. Add proper hover effects, transitions, and micro-interactions
9. Use a professional color scheme with good contrast
10. If the user asks for changes, modify the existing code while keeping what works

WHAT TO BUILD:
- For e-commerce: Product cards, cart, search, categories, checkout UI
- For dashboards: Charts (use CSS/SVG), stats, tables, sidebar navigation
- For portfolios: Hero section, projects grid, about section, contact form
- For social media: Feed, profiles, posts, likes/comments UI
- For blogs: Article layout, sidebar, categories, newsletter signup
- For landing pages: Hero, features, pricing, testimonials, CTA
- For SaaS: Login/signup forms, dashboard, settings, billing UI

CODE STRUCTURE:
- <!DOCTYPE html> with proper meta tags
- <style> tag with ALL CSS (use CSS custom properties for theming)
- <body> with semantic HTML5 elements
- <script> tag with ALL JavaScript at the end
- Add smooth animations and transitions
- Make all interactive elements functional (click handlers, toggles, etc.)

${agentPersonality ? `Your personality: ${agentPersonality}` : "You build fast, beautiful, and functional."}

OUTPUT FORMAT:
Return ONLY the raw HTML code. No markdown, no code fences, no explanation — just the HTML starting with <!DOCTYPE html>`;

    const userMessage = currentCode 
      ? `Here is the current code:\n\n${currentCode}\n\nNow make these changes: ${prompt}\n\nReturn the COMPLETE updated HTML file.`
      : `Build this website: ${prompt}\n\nReturn a complete, working, beautiful HTML file.`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 65536,
    });

    let code = completion.choices[0]?.message?.content || "";

    // Clean up: remove markdown code fences if the model added them
    code = code.replace(/^```html?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
    code = code.trim();

    if (!code.startsWith("<!DOCTYPE") && !code.startsWith("<html")) {
      // If the model didn't output proper HTML, wrap it
      code = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generated Website</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  </style>
</head>
<body>
${code}
</body>
</html>`;
    }

    return NextResponse.json({ code });
  } catch (error: unknown) {
    console.error("Generate code error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
