import { groqModel } from "@/lib/models";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableParallel } from "@langchain/core/runnables";
import { NextResponse } from "next/server";
import z from "zod";

export async function POST( request: Request) {

    const jobParserSchema = z.object({
    role: z.string().describe("The job title or role being hired for"),
    company: z.string().describe("The name of the hiring company"),
    requiredSkills: z.array(z.string()).describe("Skills explicitly required for the role"),
    niceToHave: z.array(z.string()).describe("Skills mentioned as preferred but not mandatory"),
    salaryRange: z.string().describe("The salary range as stated in the job description, e.g. '$80,000 - $100,000', or 'Not specified' if absent"),
    remotePolicy: z.enum(["remote", "hybrid", "onsite", "not specified"]).describe("The work location policy for this role"),
    });

    const resumeParserSchema = z.object({
    skills: z.array(z.string()).describe("Skills listed or demonstrated in the resume"),
    experience: z.array(z.string()).describe("Work experience entries, e.g. job title and company or a brief description per role"),
    education: z.array(z.string()).describe("Education entries, e.g. degree and institution"),
    });

    const scoreSchema = z.object({
        score: z.number().min(1).max(10),
        reasoning: z.string().describe("Brief explanation of output score")
    });

    const jobParserModel = groqModel.withStructuredOutput(jobParserSchema);
    const resumeParserModel = groqModel.withStructuredOutput(resumeParserSchema);

    //For Score:
    const scoreModel = groqModel.withStructuredOutput(scoreSchema);

    try {

        const { jobDesp, resume } = await request.json();

        const jobParserPrompt = ChatPromptTemplate.fromMessages([
            ["system", "You are a job description parser"],
            ["human", "{jobDesp}"]
        ])

        const jobParserChain = jobParserPrompt.pipe(jobParserModel);
        const jobParserRes = await jobParserChain.invoke({jobDesp});

        const resumeParserPrompt = ChatPromptTemplate.fromMessages([
            ["system", "You are a candidates resume parser"],
            ["human", "{resume}"]
        ]);

        const resumeParserChain = resumeParserPrompt.pipe(resumeParserModel);
        const resumeParserRes = await resumeParserChain.invoke({ resume });
                                                                                        
        console.log("Job Parser: ", jobParserRes);
        console.log("Resume Parser: ", resumeParserRes);

        //CHAIN 3----------------------------->

        const skillGapPrompt = ChatPromptTemplate.fromMessages([
            ["system", "You are a skill gap analyzer, based on Job Description and Resume Structured data you are going to anyzle the skill gap btw the job desp and candiate resume skills."],
            ["human", "Job Details: {jobParserRes} and Resume Details: {resumeParserRes}"]
        ]);

        const cultureFitAssPrompt = ChatPromptTemplate.fromMessages([
            ["system", "Your task is to do culture fit assessment based on the job detials and resume details of a candidate."],
            ["human", "Job Details: {jobParserRes} and Resume Details: {resumeParserRes}"]
        ]);

        const skillGapChain = skillGapPrompt.pipe(scoreModel);
        const cultureFitAssChain = cultureFitAssPrompt.pipe(scoreModel);


        const parallelRunnable = RunnableParallel.from({
            skillGapScore: skillGapChain,
            cultureFitScore: cultureFitAssChain
        });

        const matchScore = await parallelRunnable.invoke({ 
            jobParserRes: JSON.stringify(jobParserRes),
            resumeParserRes: JSON.stringify(resumeParserRes)
        });
        console.log("Match Score" , matchScore);
        
        //Chain 4 ----------------------------------------------------->
        
        const coverLetterPrompt = ChatPromptTemplate.fromMessages([
            [
                "system",
                `You are a professional cover letter writer, writing in the voice and tone of the candidate whose resume you're given.

            You will receive three inputs: the parsed job description, the parsed candidate resume, and match scores (skill gap + culture fit) with reasoning.

            Rules:
            1. Only reference skills, experience, education, and achievements that are explicitly present in the resume data. Do NOT invent specific metrics, project names, percentages, or accomplishments that are not stated in the resume.
            2. Address any skill gaps honestly but constructively — frame missing skills as areas of genuine interest or adjacent experience, without claiming expertise the candidate doesn't have.
            3. Reference specific, real details from the job description (company name, role, salary range if mentioned, remote policy) to show the letter is genuinely tailored, not generic.
            4. Keep the tone professional, confident, and concise — 3 to 4 paragraphs.
            5. Do not fabricate a candidate name; end with a generic closing like "Sincerely," followed by a placeholder.`,
            ],
            [
                "human",
                "Job description: {jobParserRes}\n\nCandidate resume: {resumeParserRes}\n\nMatch scores and reasoning: {matchScore}\n\nWrite the cover letter now.",
            ],
            ]);

        const coverLetterChain = coverLetterPrompt.pipe(groqModel).pipe(new StringOutputParser());
        
        const { readable, writable } = new TransformStream();

        const writer = writable.getWriter();
        const encoder = new TextEncoder();

        ( async () => {

            try {
                const stream = await coverLetterChain.stream({
                    matchScore: JSON.stringify(matchScore),
                    jobParserRes: JSON.stringify(jobParserRes),
                    resumeParserRes: JSON.stringify(resumeParserRes),
                });

                for await ( const chunk of stream ) {
                    await writer.write(encoder.encode(chunk));
                }
            } catch (streamError) {
                console.error("Streaming error:", streamError);
            } finally {
                await writer.close();
            }

        })();

        return new Response( readable, {
            headers: { "Content-Type": "text/plain; charset=utf-8"}
        })


    } catch (error) {
        console.log("Error: ", String(error));
        return NextResponse.json({error: String(error)}, { status: 500 });
    }
}