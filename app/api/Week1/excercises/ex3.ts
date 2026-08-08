import { z } from "zod";
import { groqModel } from "@/lib/models";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { NextResponse } from "next/server";

// Schema: 6 fields, one genuinely nested object (complexity → 2 sub-fields)
const movieSchema = z.object({
  title: z.string().describe("The title of the movie"),
  year: z.number().describe("The release year of the movie"),
  genre: z.enum(["action", "comedy", "drama", "horror", "sci-fi"]).describe("The genre of the movie"),
  rating: z.number().min(0).max(10).describe("The rating of the movie out of 10"),
  cast: z.object({
    lead: z.string().describe("The lead actor of the movie"),
    supporting: z.array(z.string()).describe("2-3 supporting actors"),
  }),
});

const structuredModel = groqModel.withStructuredOutput(movieSchema);

const prompt = ChatPromptTemplate.fromMessages([
  ["system", "Generate a fictional movie based on the given theme."],
  ["user", "{theme}"],
]);

const chain = prompt.pipe(structuredModel);

export async function POST(request: Request) {
  try {
    const { theme } = await request.json();
    const result = await chain.invoke({ theme });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in POST /exercise-structured:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}