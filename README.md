# AI Automation Learning — Progress

10-week roadmap: LangChain, then LangGraph/RAG, then self-hosted n8n, then CRM integrations.
Weekly CEO updates every Sunday.

## Status: Week 2 of 10 (Phase 1, LangChain Foundations)

### Week 1, done — LCEL Pipelines
**Project:** [Job Application Intelligence Pipeline](https://week-1-project-job-application-inte.vercel.app/)
4-chain pipeline (job parser, resume parser, parallel matcher, cover letter generator), structured output with Zod, streaming, full UI, deployed to Vercel.

### Week 2, in progress — Agents, Tools & Memory
Building a research agent with:
- Web search (Tavily), internal knowledge base search (Supabase), and a calculator, all built as tool() + Zod
- Session memory (Supabase backed, auto summarizing across turns)
- Tested what happens if the agent loop has no limit (it kept going without stopping), then added a safe cap based on that result

## Repo structure
Each week's shipped project lives in its own repo (ai-automation-week1, ai-automation-week2, and so on).
This repo (ai-automation-practice) holds exercises, scratch work, and test routes. Not deployed, reference only.

## Roadmap
| Phase | Weeks | Focus |
|---|---|---|
| 1 | 1 to 2 | LangChain, chains, tools, agents |
| 2 | 3 to 4 | RAG, LangGraph, multi-agent |
| 3 | 5 to 6 | Self-hosted n8n, CI/CD |
| 4 | 7 to 8 | HubSpot and Zoho CRM automation |
| 5 | 9 to 10 | Observability, capstone |
