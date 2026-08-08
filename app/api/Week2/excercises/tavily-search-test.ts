import { groqModel, tavilyClient } from "@/lib/models";
import { tool } from "@langchain/core/tools";
import { createAgent } from "langchain";
import { NextResponse } from "next/server";
import { z } from "zod"

export async function GET( request: Request ){

    const tavilySearchTool = tool(
        async ({ query }) => {
            try {
                const res = await tavilyClient.search(query, {
                    maxResults: 3
                });

                return JSON.stringify(res.results.map((r) => ({
                    title: r.title,
                    url: r.url,
                    snippet: r.content
                }))
            );
                
            } catch (error) {
                return `Error: search failed - ${(error as Error).message}`;
            }
        },
        {
            name: "web_search",
            description: "Search the web for current information. Use for real-time facts, recent events, or anything you don't already know. Example: {\"query\": \"latest LangChain version\"}",
            schema: z.object({ query: z.string() })
        }) 

    const tools = [tavilySearchTool];

    const agent = createAgent({
        model: groqModel,
        tools,
        systemPrompt: "You are a thorough research assistant. Keep researching until you are completely certain and have full details before answering."
    });

    const { searchParams } = new URL( request.url );
    const query = searchParams.get("query") ?? "";
    
    const res = await agent.invoke(
        {messages: [{ role: "user", content: query }]},
        { recursionLimit: 10 }
    );

    return NextResponse.json({ messages: res.messages });

}