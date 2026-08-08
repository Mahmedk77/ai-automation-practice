import { groqModel, supabase, tavilyClient } from "@/lib/models";
import { tool } from "@langchain/core/tools";
import { createAgent } from "langchain";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export async function GET( request: Request ){

    const kbSearchTool = tool(
        async ({ query }) => {
            const { data, error } = await supabase
            .from("knowledge_base")
            .select("topic, content")
            .or(`topic.ilike.%${query}%,content.ilike.${query}%`)
            .limit(3);

            if (error) return `Error: ${error.message}`;
            if (!data || data.length === 0) return "No matching entries found in knowledge base.";
        
            return JSON.stringify(data);
        },
        {
            name:"knowledge_base_search",
            description: "Search the internal knowledge base for facts about LangChain, Supabase, n8n, CRMs, and related tools. Example: {\"query\": \"pgvector\"}",
            schema: z.object({ query: z.string() })
        } 
    );

    const talviySearchTool = tool(
        async ({ query }) => {
            try {
                const res = await tavilyClient.search(query, {
                    maxResults: 3
                });

                return JSON.stringify(
                    res.results.map((r)=>({
                        title: r.title,
                        url: r.url,
                        snippet: r.content
                    }))
                )
                
            } catch (error) {
                return `Search Failed: ${(error as Error).message}`;
            }
        },
        {
            name: "talviy_search",
            description: "Search the web for current information. Use for real-time facts, recent events, or anything you don't already know. Example: {\"query\": \"latest LangChain version\"}",
            schema: z.object({ query: z.string() })
        }
    );

    const tools = [kbSearchTool, talviySearchTool];

    const agent = createAgent({
        model: groqModel,
        tools,
        systemPrompt: "You are a research assistant with two tools: knowledge_base_search (an internal knowledge base covering LangChain, Supabase, n8n, and CRM topics — always check this FIRST for anything that sounds like it could be in scope) and web_search (for current events, real-time facts, or anything not in the knowledge base). Answer concisely based on what the tools return."    
    });

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") ?? "";

    const res = await agent.invoke(
        {messages: [{role: "user", content: query}] },
        {recursionLimit: 10}
    )

    return NextResponse.json({ messages: res.messages})
}