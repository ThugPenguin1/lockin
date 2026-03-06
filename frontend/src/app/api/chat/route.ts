import { HfInference } from "@huggingface/inference";
import { NextRequest, NextResponse } from "next/server";

const hf = new HfInference(process.env.HF_TOKEN);
const MODEL = "mistralai/Mistral-7B-Instruct-v0.3";

const FALLBACK_CHALLENGES = [
  "Can you explain this concept as if teaching it to a 5-year-old? What would you simplify and what's essential to keep?",
  "What if the opposite of your main claim were true? How would you argue against yourself?",
  "What evidence would it take to completely disprove your understanding? Is your explanation falsifiable?",
  "Are you confusing correlation with causation in your notes? What's the actual mechanism at work?",
  "How would someone from a completely different field critique your reasoning here?",
];

const DEFAULT_SCORES = {
  accuracy: 50,
  completeness: 50,
  evidence: 50,
  overall: 50,
  strength: "Good attempt at defending your position.",
  gap: "Try to be more specific with concrete evidence.",
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, notes, challenge, defense } = body;

    if (action === "challenge") {
      try {
        const response = await hf.chatCompletion({
          model: MODEL,
          messages: [
            {
              role: "system",
              content:
                "You are the Devil's Advocate, a Socratic tutor. Given student notes, generate ONE specific counter-argument that challenges their core claim. The counter-argument should be plausible but defeatable with proper understanding. Be intellectually rigorous but encouraging. Respond with ONLY the counter-argument in 2-4 sentences addressed directly to the student.",
            },
            { role: "user", content: notes || "No notes provided" },
          ],
          max_tokens: 300,
        });

        const text = response.choices?.[0]?.message?.content?.trim();
        if (!text) throw new Error("Empty response");

        return NextResponse.json({ challenge: text });
      } catch {
        const fallback = FALLBACK_CHALLENGES[Math.floor(Math.random() * FALLBACK_CHALLENGES.length)];
        return NextResponse.json({ challenge: fallback });
      }
    }

    if (action === "score") {
      try {
        const response = await hf.chatCompletion({
          model: MODEL,
          messages: [
            {
              role: "system",
              content:
                'You are scoring a student\'s defense. You receive their notes, a challenge, and their defense. Respond with ONLY valid JSON (no markdown, no code fences): {"accuracy": number 0-100, "completeness": number 0-100, "evidence": number 0-100, "overall": number 0-100, "strength": "one sentence", "gap": "one sentence"}',
            },
            {
              role: "user",
              content: `NOTES: ${notes}\n\nCHALLENGE: ${challenge}\n\nDEFENSE: ${defense}`,
            },
          ],
          max_tokens: 300,
          temperature: 0.3,
        });

        const text = response.choices?.[0]?.message?.content?.trim();
        if (!text) throw new Error("Empty response");

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found");

        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json({
          accuracy: parsed.accuracy ?? 50,
          completeness: parsed.completeness ?? 50,
          evidence: parsed.evidence ?? 50,
          overall: parsed.overall ?? 50,
          strength: parsed.strength ?? "Good attempt",
          gap: parsed.gap ?? "Try to be more specific",
        });
      } catch {
        return NextResponse.json(DEFAULT_SCORES);
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
