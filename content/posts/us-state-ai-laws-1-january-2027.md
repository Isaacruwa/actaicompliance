---
title: Which US state AI laws start on 1 January 2027?
slug: us-state-ai-laws-1-january-2027
region: United States
date: 2026-11-13
updated: 2026-11-13
description: Colorado's rewritten AI law, California's automated decision-making rules and New York's RAISE Act all start on 1 January 2027. Here is who each one reaches and what to do before the new year.
linkphrases: RAISE Act | Colorado ADMT law | CCPA ADMT rules
---
Three sets of US state AI rules share the same start date: 1 January 2027. Colorado's rewritten AI law, California's automated decision-making rules under its privacy law, and New York's RAISE Act for frontier AI developers all begin then. They reach different businesses, so the first job is to work out which ones, if any, apply to you. This guide covers each one, what the federal government has and has not done about state AI laws, and a short plan for the weeks before the new year.

## The short version
- **Colorado:** the original Colorado AI Act (SB 24-205) was repealed and replaced by SB 26-189, signed on 14 May 2026. The new law is narrower and applies to consequential decisions made on or after 1 January 2027. A separate Chatbot Safety Act (HB 26-1263) starts the same day.
- **California:** the state privacy agency's rules on automated decision-making technology (ADMT) have a compliance date of 1 January 2027. Risk assessments follow on 31 December 2027.
- **New York:** the amended RAISE Act starts on 1 January 2027, but only for developers of very large frontier AI models.
- **The federal executive order has not switched any of this off.** It tells federal agencies to challenge state AI laws. It does not itself cancel them.

## Colorado: a smaller law, still starting on 1 January
In 2024 Colorado passed the first broad US AI law, SB 24-205. After delays and heavy lobbying, the legislature repealed and replaced it in 2026 with SB 26-189, which regulates automated decision-making technology. As summarised by law firms, it works like this:

**What it covers.** Technology that processes personal data and materially influences a consequential decision. The covered areas are employment, housing, credit and lending, insurance, health care, education and essential government services. Tools used only for things like scheduling, customer-service triage, advertising or content moderation are outside it.

**What deployers must do** (the businesses that use the tool to make decisions):
- Give clear notice before using the tool.
- After an adverse outcome, give a plain-language explanation within 30 days and say how to ask for more information.
- Let people correct inaccurate personal data and offer a meaningful human review, to the extent commercially reasonable.
- Keep compliance records for at least three years.

**What developers must do** (the businesses that build or sell the tool): give deployers documentation on intended and prohibited uses, limitations, the kinds of training data used, and how to monitor the tool.

**What was dropped.** The 2024 law's duty of reasonable care, its risk management program, its annual impact assessments and its duty to report to the Attorney General are gone from the new law.

**Enforcement.** The Attorney General enforces it as a deceptive trade practice. There is no new private right of action. The Attorney General generally has to give a 60-day chance to fix a violation first, except for knowing or repeated ones. That cure period is set to end on 1 January 2030. Discrimination liability under the Colorado Anti-Discrimination Act still applies.

**What is not settled yet.** The Attorney General is writing rules on the disclosure duties. Interim draft rules appeared on 6 October 2026 and the comment period closed on 26 October. As far as we can tell, the final rules had not been adopted when we wrote this, so check the Attorney General's site. A lawsuit by xAI against the state also includes a court order that may delay when enforcement can start. The legal start date is still 1 January 2027, but enforcement timing is less certain than that.

### Colorado's Chatbot Safety Act
HB 26-1263 was signed on 29 May 2026 and also starts on 1 January 2027. It applies to operators of publicly accessible conversational AI, across industries. As summarised in a policy note from October, operators must tell users they are talking to AI, estimate user age, protect minors from sexually explicit output and unhealthy emotional dependence, keep suicide and self-harm protocols, and file annual reports with the Attorney General. Penalties of up to $20,000 per violation are reported under the Colorado Consumer Protection Act. A narrow chatbot limited to a few topics that cannot produce harmful content is reported to be exempt, so check the final text for your product.

## California: the ADMT rules start on 1 January 2027
California did not pass an AI act for this. Instead, its privacy agency (the CPPA) wrote rules under the California Consumer Privacy Act. They apply to businesses already covered by that law.

- **ADMT compliance date: 1 January 2027.** Businesses must offer people an opt-out where ADMT replaces or substantially replaces human judgment in a significant decision about them. "Human involvement" counts only if the reviewer can understand the output, review it and change the final decision. A person rubber-stamping the tool's answer is unlikely to qualify.
- **Risk assessments: 31 December 2027.** The rules require them when a business, for example, sells or shares personal information, processes sensitive personal information, uses ADMT for significant decisions, or uses personal information to train ADMT.

Two other California measures are reported to start on 1 January 2027: SB 867, which bars companion-chatbot toys for children under 16 and ends on 1 January 2031, and SB 923, which widens the CCPA deletion right to inferences held about a person.

## New York: the RAISE Act for frontier developers
New York's RAISE Act was amended in March 2026 to line up more closely with California's frontier AI law and starts on 1 January 2027. It covers developers of models trained with more than 10^26 operations. "Large" developers, with revenue above $500 million, have extra duties.

- Large developers must publish a frontier AI framework and update it every year.
- All covered developers must publish a transparency report before releasing a new or modified model. A model card with the same information counts.
- Critical safety incidents must be reported within 72 hours, or 24 hours to public safety agencies if there is an imminent risk of death or serious injury.
- A new office in the Department of Financial Services receives the reports.
- The Attorney General can seek penalties of up to $1 million for a first violation and $3 million after that. There is no private right of action.

If you only use someone else's model, this law is mainly the model developer's problem, not yours.

## What about the federal government?
The December 2025 executive order on a national AI policy framework tells the Justice Department, Commerce and other agencies to challenge state AI laws, and ties some federal grant money to them. It does not by itself invalidate any state law. Until a court or Congress says otherwise, treat state laws that start on 1 January 2027 as binding. For the wider picture, see [our US overview](/guides/us-ai-regulation/) and [the earlier state-by-state guide](/guides/us-state-ai-laws/).

## Not on the 2027 list
Several laws you may have heard about do not start in 2027. Texas's TRAIGA, California's SB 53 and Illinois's HB 3773 took effect on 1 January 2026. Illinois's frontier AI law has obligations starting 1 January 2028.

## Who should act before 31 December
1. **You use software to help decide on hiring, housing, credit, insurance, health care, education or public benefits, and have Colorado customers, applicants or employees.** Check whether the tool materially influences the decision, and plan the notice, the 30-day explanation and the human review process.
2. **You are covered by the CCPA and use ADMT for significant decisions.** Work out whether a human reviewer can genuinely change the outcome. If not, plan the opt-out.
3. **You run a public chatbot, especially one that minors can reach, with Colorado users.** Check the Chatbot Safety Act duties and the final rules.
4. **You train a very large frontier model.** Plan the framework, transparency report and incident process for New York.
5. **You buy these tools from vendors.** Ask suppliers in writing what the tool does, what data it uses, and what documentation they will give you.

## A short plan for the next seven weeks
- List every system that helps decide something important about a person. Note which state each affected person lives in.
- For each one, record whether the output is advisory or decisive, and whether a person can override it.
- Draft the notice text and the adverse-outcome explanation template for Colorado.
- Check whether the Colorado Attorney General has adopted final rules, and read them against your plan.
- Get vendor documentation in writing and update contracts to say who is responsible for what.
- Re-read this plan in mid-December. The Colorado rules and the xAI case may have moved.

## What this guide does not cover
Other states have AI rules on deepfakes, elections, health care and employment. If you operate in several countries, start with [which AI laws apply to you](/guides/which-ai-laws-apply-to-you/). If you also sell into Europe, the next date there is 2 December 2026, covered in [our EU guide](/guides/eu-ai-act-2-december-2026-deadline/).

Primary sources: the [Colorado General Assembly](https://leg.colorado.gov/) for the text of SB 26-189 and HB 26-1263, the [Colorado Attorney General](https://coag.gov/) for the rulemaking, the [California Privacy Protection Agency](https://cppa.ca.gov/) for the ADMT rules, and the [New York State Senate](https://www.nysenate.gov/) for the RAISE Act. This guide relies on law-firm and policy-tracker summaries, so check those sources, or ask a qualified lawyer, before you rely on any date or duty here.
