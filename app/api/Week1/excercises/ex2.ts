import { groqModel } from "@/lib/models";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableParallel } from "@langchain/core/runnables";
import { NextResponse } from "next/server";


export async function POST (request: Request) {

    try{
        const { paragraph } = await request.json();

        const prompt1 = ChatPromptTemplate.fromMessages([
            ["system", "You are a paragraph analyzer and you read & analyze a paragraph and then summarize it"],
            ["user", "{paragraph}"]
        ]);

        const chain1 = prompt1.pipe(groqModel).pipe(new StringOutputParser());
        

        const prompt2 = ChatPromptTemplate.fromMessages([
            ["system", "You are a creative sentiment analyzer, you are provided with a paragraph text and you decode its sentiment"],
            ["user", "{paragraph}"]
        ]);

        const chain2 = prompt2.pipe(groqModel).pipe( new StringOutputParser());

        const parallelChain = RunnableParallel.from({
            resA: chain1,
            resB: chain2
        });

        // const res = await parallelChain.invoke({ paragraph });
        // const start = Date.now();

        // const resA = await chain1.invoke({ paragraph });
        // const resB = await chain2.invoke({ paragraph });

        // console.log("sequential time:", Date.now() - start);
        // console.log(resA, resB);
        const start = Date.now();
        const res = await parallelChain.invoke({ paragraph });
        console.log("parallel time:", Date.now() - start);

        // return NextResponse.json({resA, resB});
        return NextResponse.json({res});



    } catch (error) {

        console.log(String(error));
        return NextResponse.json({ error: String(error) }, { status: 500 })
    }

}
    