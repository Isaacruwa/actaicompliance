---
title: US state AI laws in 2026: a practical guide
slug: us-state-ai-laws
region: United States
date: 2026-10-18
updated: 2026-10-18
description: Which US state AI laws apply in 2026, from Colorado and Texas to California and New York, with dates, who is covered, and what to do first.
---
There is still no single US federal AI law, so the rules that bite are mostly state laws. They differ on who is covered, what counts as AI, and when they start. This guide groups the main ones by what they regulate and shows the dates that matter. It is general information, not legal advice.

## The federal backdrop
Congress has not passed a comprehensive AI statute. Executive Order 14365 (11 December 2025) set up a Justice Department AI Litigation Task Force aimed at state AI laws, but an executive order cannot by itself cancel a state law, and we have not seen a state law struck down this way.

A bipartisan House discussion draft called the Great American AI Act (released 4 June 2026) would block state laws on how AI models are developed for three years. As of the latest reporting we checked, it is still a draft, not law, and it faces opposition from many state lawmakers. Plan for state laws to apply, and watch this one.

## Laws about decisions that affect people
- **Colorado (SB 26-189):** signed 14 May 2026 and effective 1 January 2027, replacing the original 2024 Colorado AI Act. It covers automated decision-making technology that materially influences consequential decisions in employment, education, housing, lending, insurance, health care and essential government services. Deployers must give notice before use, send an adverse-outcome notice within 30 days, and offer correction and human review. Only the attorney general enforces it, with a 60-day cure period until 1 January 2030.
- **Illinois (HB 3773):** effective 1 January 2026. Using AI in employment decisions in a discriminatory way is a civil rights violation, and employers must give notice when AI is used.
- **New York City (Local Law 144):** in effect since 5 July 2023. Employers using automated employment decision tools need an annual bias audit and must notify candidates. A December 2025 state comptroller audit criticised how it has been enforced, so check the city's current practice.
- **California (CCPA automated decision-making rules):** risk-assessment rules apply from 2026, and the significant-decision rules apply from 1 January 2027. California also signed SB 947 on 30 September 2026, which limits relying only on automated systems to discipline or fire workers. Check its start date in the bill text.
- **Connecticut (CART Act, Public Act 26-15):** includes automated employment decision tool duties that apply to deployments from 1 October 2027. Confirm the details in the act, because later amendments changed parts of it.

## Laws about frontier AI developers
- **California (SB 53):** in effect since 1 January 2026. It applies to developers of very large models (more than 10^26 operations), with the heaviest duties for those with over $500 million in annual revenue: a published safety framework, transparency reports and critical-incident reporting.
- **New York (RAISE Act):** effective 1 January 2027, with similar duties for large frontier developers, 72-hour incident reporting and penalties of up to $1 million for a first violation.

Most companies are not covered by these, because they only reach developers of the largest models.

## Laws about AI-generated content and chatbots
- **California AI Transparency Act (SB 942):** requires covered providers of public generative AI systems to offer disclosure and provenance tools. SB 1000, enacted on 30 September 2026, amended it right away, removing the user-count threshold and replacing the free detection tool with a disclosure verification tool. Re-check scope if you provide image, audio or video generators.
- **Chatbots and minors:** California signed child-safety laws for companion chatbots in September 2026 (including SB 1119), Washington's HB 2225 is reported to start on 1 January 2027, and Connecticut has companion-chatbot duties from 1 January 2027. If you offer a chatbot to the public, check each state where you have users.

## Texas
The Texas Responsible AI Governance Act (HB 149) took effect on 1 January 2026. It bans specific harmful uses, such as intentionally discriminatory systems and manipulation that causes harm, and is enforced only by the attorney general, with a 60-day cure period. Reported penalties go up to $200,000 per violation. For most private companies the duties are narrower than in Colorado.

## Which of these applies to you?
1. **You use AI to screen, score or rank people** (hiring, lending, housing, insurance, health, education): look first at Colorado, Illinois, California and New York City.
2. **You build your own large AI model:** check California SB 53 and the New York RAISE Act.
3. **You offer a public chatbot or a content generator:** check California's transparency and chatbot laws, and the chatbot laws in Washington and Connecticut.
4. **You only use AI for internal productivity:** you are mostly outside these laws, but privacy and consumer-protection rules still apply.

## What to do first
1. List every AI system you use and where the people it affects live.
2. Mark anything that helps make a decision about a person.
3. Prepare plain notices: that AI is used, how to ask for human review, and how to correct data.
4. Keep records of how each system was built, tested and monitored. Colorado, for example, expects three years of records.
5. Recheck state laws every quarter, because they are changing fast.

If you also sell in Europe, see [the EU AI Act explained](/guides/eu-ai-act-explained/). For a broader US overview, see [US AI regulation](/guides/us-ai-regulation/).

Official sources: state legislature and attorney general websites, the Colorado Attorney General, the California Privacy Protection Agency, the NYC Department of Consumer and Worker Protection, and the Federal Trade Commission.
