import { groqModel } from "@/lib/models";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    
    try {

        const { input } = await request.json();

        const prompt = ChatPromptTemplate.fromTemplate(`${input} these are the number of colors in rainbow?`);
        const chain = prompt.pipe(groqModel).pipe(new StringOutputParser());

        const result = await chain.invoke({ input });
        
        return NextResponse.json({ result }, { status: 200 });

    }
    catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }

}

