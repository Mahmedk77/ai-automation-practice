import { groqModel } from "@/lib/models";
import { createAgent, tool } from "langchain";
import { z } from "zod";

export async function GET(request: Request) {
    const calculatorTool = tool(
        async ({ expression }) => {
            if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
                return "Error: invalid expression";
            }
            try {
                return String(Function(`"use strict"; return (${expression});`)());
            } catch {
                return "Error: invalid expression";
            }
        },
        {
            name: "calculator",
            description: "Evaluates a math expression. Example: {\"expression\": \"34 * 0.15\"}",
            schema: z.object({ expression: z.string() }),
        }
    );

    const vagueSearchTool = tool(
        async ({ query }) => {
            return `Found some partial information about "${query}", but it seems incomplete. There may be more details available.`;
        },
        {
            name: "vague_search",
            description: "Searches for information. Use this to research any topic. Example: {\"query\": \"topic here\"}",
            schema: z.object({ query: z.string() })
        }
    );

    const tools = [calculatorTool, vagueSearchTool];

    const agent = createAgent({
        model: groqModel,
        tools,
        systemPrompt: "You are a thorough research assistant. Keep researching until you are completely certain and have full details before answering.",
    });

    const { searchParams } = new URL(request.url);
    const input = searchParams.get("input") ?? "";

    const result = await agent.invoke({
        messages: [{ role: "user", content: input }]
    },
    {
        recursionLimit: 6
    }
);

    return Response.json({ messages: result.messages });
}