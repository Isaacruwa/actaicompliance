---
title: EU AI Act Annex IV technical documentation: what to include
slug: eu-ai-act-annex-iv-technical-documentation
region: European Union
date: 2026-10-11
updated: 2026-11-03
eu: true
description: A plain-English checklist of what Annex IV technical documentation must contain for high-risk AI systems, who needs it, and when it applies.
---
If you build a high-risk AI system for the EU market, Annex IV is the part of the AI Act that tells you what your technical documentation must contain. This guide walks through each item in plain English, who needs it, and when.

## What Annex IV is
Article 11 of the AI Act requires providers of high-risk AI systems to prepare technical documentation before the system is placed on the market or put into service, and to keep it up to date. Annex IV lists what that documentation must cover. Its job is to show that the system meets the high-risk requirements and to give regulators and notified bodies what they need to assess it.

## Who needs it and when
It applies to **providers** of high-risk AI systems, meaning the organisations that develop a system, or have one developed, and place it on the market under their own name. Deployers (the organisations that use it) have different duties.

After the 2026 AI Omnibus, the high-risk rules apply from **2 December 2027** for stand-alone systems in the Annex III areas (see [Annex III explained](/guides/eu-ai-act-annex-iii-high-risk-ai/)) and from **2 August 2028** for AI built into products covered by EU product-safety law. The AI Act also lets small and medium-sized enterprises, including start-ups, provide some Annex IV elements in a simplified way. Check the Commission's latest guidance, and whether the 2026 changes extend this to your company size.

## What Annex IV requires
Annex IV has nine sections. In plain English:

1. **General description of the system.** Intended purpose, who provides it, the version, how it interacts with other software or hardware, the forms it is supplied in (for example an API or a downloadable package), and the instructions for deployers.
2. **Detailed description of its elements and development process.** How it was built, including any third-party or pre-trained components, the design logic and key choices and why you made them, the architecture and computing resources, and the data used for training, validation and testing: where it came from and how it was selected, labelled and cleaned. This section also covers human oversight measures, any changes planned in advance, your validation and testing procedures with dated and signed test reports, and your cybersecurity measures.
3. **Monitoring, functioning and control.** What the system can and cannot do, expected accuracy (including for specific groups of people), foreseeable unintended outcomes and risks to health, safety and fundamental rights, and the input data it expects.
4. **Why your performance metrics are appropriate** for this particular system.
5. **The risk management system** described in Article 9.
6. **Changes you make over the system's lifecycle.**
7. **Standards applied.** The harmonised standards you used or, if none, how else you met the requirements.
8. **A copy of the EU declaration of conformity.**
9. **The post-market monitoring system and plan** you will use to track performance once the system is in use.

## How long to keep it
Providers must keep the technical documentation available to the authorities for 10 years after the system is placed on the market or put into service.

## Practical tips
- **Write it as you build.** Reconstructing data provenance and test results after the fact is slow and error-prone.
- **Keep evidence, not just prose.** Test reports should be dated and signed, and data decisions should be traceable.
- **Version everything.** Section 6 expects a record of changes, so tie each document version to a system version.
- **Be specific about intended purpose.** A vague purpose makes every later section harder to defend.
- **Have a responsible person review it.** Whoever drafts the document, someone accountable for the system should read and approve it.

## A note on AI agents
Systems built from AI agents generate a lot of operational data: traces, tool calls and logs. These are useful raw evidence for the monitoring, testing and change sections, but traces on their own are not technical documentation. They still need to be organised against the Annex IV headings and reviewed by a person.

Always check the official text on EUR-Lex for the exact wording of Annex IV. Next, read how [the conformity assessment](/guides/eu-ai-act-conformity-assessment/) uses this documentation.

## Frequently asked questions

### What is Article 11 technical documentation under the EU AI Act?
Article 11 requires the provider of a high-risk AI system to prepare technical documentation before the system is placed on the market or put into service, and to keep it up to date. Annex IV sets out what the documentation must contain. Its purpose is to show that the system meets the high-risk requirements and to give regulators the information they need to assess it.

### What are the EU AI Act documentation requirements in short?
Annex IV has nine parts: a general description of the system, a detailed description of its elements and development process, information on monitoring, functioning and control, the reasons your performance metrics are appropriate, the risk management system, changes over the lifecycle, the standards applied, the EU declaration of conformity, and the post-market monitoring plan. The documentation must be available to the authorities for 10 years.

### Who needs Annex IV technical documentation?
Providers of high-risk AI systems, meaning the organisations that develop a system, or have one developed, and place it on the market under their own name. Deployers have different duties. Providers of general-purpose AI models have their own separate documentation duties.

### When do the technical documentation requirements apply?
After the 2026 AI Omnibus, the high-risk rules apply from 2 December 2027 for stand-alone Annex III systems and from 2 August 2028 for AI built into products covered by EU product-safety law. You need the documentation ready before the system goes on the market, not on the deadline.

### Is technical documentation the same as a conformity assessment?
No. The technical documentation is the evidence. The [conformity assessment](/guides/eu-ai-act-conformity-assessment/) is the procedure in which that evidence, and your quality management system, is checked before you issue the declaration of conformity and apply the CE marking.

## Related guides from Attestly
Attestly (our product) publishes practical guides on the same topic:
- [Annex IV explained: every required section](https://www.attestly.online/guides/eu-ai-act-annex-iv-explained?utm_source=actaicompliance)
- [Annex IV technical documentation template](https://www.attestly.online/guides/annex-iv-template?utm_source=actaicompliance)
- [Glossary: Annex IV technical documentation](https://www.attestly.online/glossary/annex-iv-technical-documentation?utm_source=actaicompliance)
