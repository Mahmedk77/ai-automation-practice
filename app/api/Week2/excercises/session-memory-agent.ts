import { groqModel, supabase, tavilyClient } from "@/lib/models";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { tool } from "@langchain/core/tools";
import { createAgent } from "langchain";
import { NextResponse } from "next/server";
import { z } from "zod";


interface Props {
aiMsg: string
userMsg: string
priorSummary: string
}

//the load memory function---->
const load_memory = async (sessionId: string): Promise<string> => {
        const { data } = await supabase
        .from("agent_memory")
        .select("summary")
        .eq("session_id", sessionId)
        .single()

        return data?.summary ?? "";
};

//the save memory function---->
const save_memory  = async ( sessionId: string, summary: string ) => {
    await supabase
    .from("agent_memory")
    .upsert({ session_id: sessionId, summary, updated_at: new Date().toISOString() });
}

//summarize the results---->

const exchangeSummary = async (aiMsg: string, userMsg: string, priorSummary: string) => {

    const prompt = ChatPromptTemplate.fromMessages([
        ["system", "You summarize conversations concisely, updating a running summary with new exchanges."],
        ["user", `Existing summary: {priorSummary}

        New exchange:
        User: {userMsg}
        Assistant: {aiMsg}

        Write an updated summary incorporating the new exchange.
            
            `]
    ])

    const chain = prompt.pipe(groqModel).pipe(new StringOutputParser());
    return await chain.invoke({aiMsg, userMsg, priorSummary});
}


export async function GET( request: Request ) {
    
    const kb_searchTool = tool(
    async ({ query }) => {
        
            const { data, error} = await supabase
            .from("knowledge_base")
            .select("topic, content")
            .or(`topic.ilike.%${query}%,content.ilike.%${query}%;`)
            .limit(3);

            if(error) return `Error Finding: ${error.message}`;
            if(!data || data.length === 0) return "Cannot find the query results in the database";

            return JSON.stringify(data)


    },
    {
        name:"knowledge_base_search",
        description: "Search the internal knowledge base for facts about LangChain, Supabase, n8n, CRMs, and related tools. Example: {\"query\": \"pgvector\"}",
        schema: z.object({ query: z.string() })
    } 
);

    const tavilySearchTool = tool(
        async ({ query }) => {
            try {
                const searchRes = await tavilyClient.search(query, {
                    maxResults: 3
                })

                return JSON.stringify(searchRes.results.map((r) => ({
                    title: r.title,
                    url: r.url,
                    snippet: r.content
                })))
                
            } catch (error) {
                return `Error fetching results from web: ${(error as Error).message}`
            }
        }, 
        {
            name: "talviy_search",
            description: "Search the web for current information. Use for real-time facts, recent events, or anything you don't already know. Example: {\"query\": \"latest LangChain version\"}",
            schema: z.object({ query: z.string() })
        }
    )

    const tools = [ kb_searchTool, tavilySearchTool ];

    const { searchParams } = new URL( request.url );
    const query  = searchParams.get("query") ?? ""; 
    const sessionId = searchParams.get("sessionId") ?? "";

    
    const priorSummary = await load_memory(sessionId);
    
    const agent = createAgent({
        model: groqModel,
        tools,
        systemPrompt: `You are a research assistant with two tools: knowledge_base_search 
        (an internal knowledge base covering LangChain, Supabase, n8n, and CRM topics — always check this FIRST 
        for anything that sounds like it could be in scope) and web_search (for current events, real-time facts, or anything not in the knowledge base). 
        Answer concisely based on what the tools return.`  
    });

    const res = await agent.invoke(
        { messages: [
            ...(priorSummary ? [{ role: "system" as const, content: `Earlier conversation summary: ${priorSummary}`}]: []),
            { role: "user" as const, content: query}
        ] 
    }, //whats n8n?
        { recursionLimit: 10 }
    );

    const userMsg = query; 
    const aiMsg = res.messages[res.messages.length - 1].content as string;


    const updatedSummary = await exchangeSummary(aiMsg, userMsg, priorSummary);

    await save_memory(sessionId, updatedSummary); //should be awaited or not?


    return NextResponse.json({ messages: res.messages})

}




