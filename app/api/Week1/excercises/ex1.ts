import { groqModel } from "@/lib/models";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { NextResponse } from "next/server";


export async function POST (request: Request) {

    try{
        const { paragraph } = await request.json();

        const prompt = ChatPromptTemplate.fromMessages([
            ["system", "You are a paragraph analyzer and you select random 3 keywords which are nouns/verbs, constraints: 1. These words are such that anyone can create sentences out of these 2. Output format: keyword1, keyword2, keyword3"],
            ["user", "{paragraph}"]
        ]);

        const chain = prompt.pipe(groqModel).pipe(new StringOutputParser());
        const keywords = await chain.invoke({ paragraph });
        console.log("chai1: ", keywords);

        const prompt2 = ChatPromptTemplate.fromMessages([
            ["system", "You are a creative sentence builder, you create one sentence out of each word given to you in a clean manner, i.e if 3 keywords, you create 3 unique sentences"],
            ["user", "{keywords}"]
        ]);

        const chain2 = prompt2.pipe(groqModel).pipe( new StringOutputParser());
        const sentences = await chain2.invoke({ keywords });

        console.log("sentences: ", sentences);

        const prompt3 = ChatPromptTemplate.fromMessages([
            ["system", "You are a text formatter and you format complete sentences that are given to you in bullet points"],
            ["user", "{sentences}" ]
        ]);

        const chain3 = prompt3.pipe(groqModel).pipe(new StringOutputParser());
        const finalOutput = await chain3.invoke({sentences});

        console.log("final Output: ", finalOutput);

        return NextResponse.json({ keywords, sentences, finalOutput });


    } catch (error) {

        console.log(String(error));
        return NextResponse.json({ error: String(error) }, { status: 500 })
    }

}
    