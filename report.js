// Personal AI law report: validates questionnaire answers and builds the report text.
// Runs only on the server, after payment. Reuses the same reading of the law as the free checkers, across EU, US, UK, Canada and China.

const SITE = 'https://actaicompliance.com';
const REGIONS = ['eu', 'uk', 'us', 'ca', 'cn', 'other'];
const STATES = ['CA', 'CO', 'TX', 'IL', 'NY', 'CT', 'WA', 'OT'];
const WHAT = ['ban', 'a1', 'emp', 'cons', 'a3o', 'gpai', 'chat', 'gen', 'front', 'none'];
const pick = (v, allowed) => (typeof v === 'string' && allowed.includes(v) ? v : '');
const pickMany = (v, allowed) => (Array.isArray(v) ? [...new Set(v.filter((x) => allowed.includes(x)))] : []);

export function validateAnswers(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const email = String(r.email || '').trim().toLowerCase();
  if (email.length > 200 || !/^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']{2,}$/.test(email)) return { error: 'Please enter a valid email address.' };
  const a = {
    email,
    base: pick(r.base, REGIONS),
    markets: pickMany(r.markets, REGIONS),
    states: pickMany(r.states, STATES),
    role: pick(r.role, ['provider', 'deployer', 'importer', 'modifier', 'personal']),
    what: pickMany(r.what, WHAT),
    how: pick(r.how, ['prod', 'svc', 'int']),
    human: pick(r.human, ['main', 'review', 'narrow']),
    prof: pick(r.prof, ['yes', 'no']),
    who: pickMany(r.who, ['con', 'wrk', 'kid', 'biz']),
    scale: pick(r.scale, ['big', 'mid', 'small']),
    size: pick(r.size, ['sme', 'smid', 'large']),
    pd: pick(r.pd, ['yes', 'no', 'unsure'])
  };
  if (!a.base || !a.markets.length || !a.role) return { error: 'Some answers are missing. Please go back and complete the questions.' };
  if (a.role === 'personal') { a.what = ['none']; a.how = a.how || 'int'; }
  if (!a.what.length) return { error: 'Some answers are missing. Please go back and complete the questions.' };
  if (a.what.includes('none') && a.what.length > 1) a.what = ['none'];
  if (!a.how) a.how = 'svc';
  if (!a.size) a.size = 'sme';
  if (!a.pd) a.pd = 'unsure';
  if (!a.who.length) a.who = ['biz'];
  return { answers: a };
}

const SRC = {
  act: ['Regulation (EU) 2024/1689 (the AI Act), EUR-Lex', 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj'],
  omni: ['Regulation (EU) 2026/1744 (Digital Omnibus on AI), EUR-Lex', 'https://eur-lex.europa.eu/eli/reg/2026/1744/oj'],
  pol: ['European Commission: AI Act policy page', 'https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai'],
  desk: ['AI Act Service Desk (European Commission)', 'https://ai-act-service-desk.ec.europa.eu/en'],
  ban: ['Commission guidelines on prohibited AI practices', 'https://digital-strategy.ec.europa.eu/en/library/commission-publishes-guidelines-prohibited-artificial-intelligence-ai-practices-defined-ai-act'],
  co: ['Colorado General Assembly', 'https://leg.colorado.gov/'],
  coag: ['Colorado Attorney General', 'https://coag.gov/'],
  ca: ['California Legislative Information', 'https://leginfo.legislature.ca.gov/'],
  cppa: ['California Privacy Protection Agency', 'https://cppa.ca.gov/'],
  tx: ['Texas Legislature Online', 'https://capitol.texas.gov/'],
  txag: ['Texas Attorney General', 'https://www.texasattorneygeneral.gov/'],
  il: ['Illinois General Assembly', 'https://www.ilga.gov/'],
  ny: ['New York State Senate (bills and laws)', 'https://www.nysenate.gov/'],
  nyc: ['NYC Department of Consumer and Worker Protection', 'https://www.nyc.gov/site/dca/index.page'],
  ct: ['Connecticut General Assembly', 'https://www.cga.ct.gov/'],
  wa: ['Washington State Legislature', 'https://leg.wa.gov/'],
  ftc: ['Federal Trade Commission: artificial intelligence', 'https://www.ftc.gov/industry/technology/artificial-intelligence'],
  eeoc: ['US Equal Employment Opportunity Commission', 'https://www.eeoc.gov/'],
  nist: ['NIST AI Risk Management Framework', 'https://www.nist.gov/itl/ai-risk-management-framework'],
  uk: ['GOV.UK', 'https://www.gov.uk/'],
  ico: ['Information Commissioner\'s Office (ICO)', 'https://ico.org.uk/'],
  opc: ['Office of the Privacy Commissioner of Canada', 'https://www.priv.gc.ca/'],
  tbs: ['Treasury Board of Canada Secretariat', 'https://www.canada.ca/en/treasury-board-secretariat.html'],
  cac: ['Cyberspace Administration of China', 'https://www.cac.gov.cn/'],
  flk: ['National Laws and Regulations Database (China)', 'https://flk.npc.gov.cn/']
};
const srcList = (keys) => [...new Set(keys)].map((k) => SRC[k]);

/* ---------------- EU ---------------- */
function euSection(a) {
  const has = (k) => a.what.includes(k), r = a.role;
  const inEU = a.base === 'eu' || a.markets.includes('eu');
  const a3 = has('emp') || has('cons') || has('a3o');
  const tr = has('chat') || has('gen');
  const fines = (k) => (k === 'ban' ? 'Up to €35 million or 7% of worldwide annual turnover, whichever is higher.' : 'Up to €15 million or 3% of worldwide annual turnover for most other breaches. Small businesses pay whichever of the two amounts is lower.');
  const out = (status, tone, title, points, dates, keys) => ({ region: 'EU', flag: '🇪🇺', status, tone, title, points, dates, sources: srcList(keys) });
  const smid = a.size === 'smid' ? ['You said you have fewer than 750 employees but more than 250. The Digital Omnibus extended some of the lighter rules for small businesses to "small mid-caps" (under 750 employees and up to €150 million turnover or €129 million balance sheet). Check whether you qualify.'] : [];
  if (!inEU) return out('Probably outside scope', 'green', 'Not likely in scope of the EU AI Act', ['The Act reaches providers and deployers outside the EU only where the system is placed on the EU market or its output is used in the EU. Your answers say neither applies.', 'Watch for change: if EU customers start using it, or its output is used in the EU, the Act can apply to you even from outside the EU. Non-EU providers of high-risk systems must also appoint an authorised representative in the EU.'], ['No date applies today. Check again if your market changes.'], ['act', 'pol']);
  if (r === 'personal') return out('Probably outside scope', 'green', 'Outside scope (Article 2)', ['The Act does not apply to purely personal, non-professional use, to AI developed and used only for scientific research, or to AI used only for military, defence or national security purposes.', 'If the system is later offered commercially or used for another purpose, the answer can change.'], ['None triggered by your answers.'], ['act', 'pol']);
  if (has('ban')) return out('Applies', 'red', 'Possible ban under Article 5', ['Your description matches a practice the Act prohibits. Prohibited means you may not place it on the EU market, put it into service or use it. There is no compliance route that makes it legal.', 'Several bans have narrow exceptions, for example some law-enforcement uses of biometric identification with prior authorisation. Whether you fall in or out depends on exact facts. Read the Commission guidelines with examples before drawing any conclusion.', 'Whether or not you are the provider, a deployer using a banned system is also caught.'], ['Bans have applied since 2 February 2025.', 'Fines: ' + fines('ban'), 'New bans on AI "nudification" apps and AI-generated child sexual abuse material apply from 2 December 2026.'], ['act', 'ban', 'desk']);
  const sub = [];
  if (tr) sub.push('Transparency duties (Article 50) may also apply: tell people when they are talking to an AI, label deepfakes and AI-generated content, and make synthetic output detectable by machines. Deployers of emotion recognition or biometric categorisation must inform the people affected.');
  if (has('gpai') && (r === 'provider' || r === 'modifier')) sub.push('Because you offer a general-purpose model, the separate rules for those models apply as well. They are described in a later outcome below.');
  const provLike = r === 'provider' || r === 'modifier';
  if (has('a1')) {
    const o = provLike
      ? ['Your system is likely high-risk because it is a safety component of a product covered by EU product legislation (Annex I), or is itself such a product, and that product needs a third-party conformity assessment.', 'As the provider, you carry the heaviest duties: a risk management system, data governance, technical documentation, record-keeping, human oversight, accuracy and cybersecurity, a conformity assessment, CE marking and registration before the product is sold.', 'The AI obligations run alongside the product rules (for example the Medical Devices Regulation or the Machinery Regulation), and the same notified body is often involved.']
      : r === 'importer'
        ? ['As importer or distributor of a high-risk product you must check, before it is sold in the EU, that the provider has done the conformity assessment, the CE marking and documentation are present, and an EU representative is named where needed.', 'You must not sell a product you believe does not comply, and you must tell the provider and the authority if it presents a risk.', 'Keep the paperwork you received and store and transport the product so compliance is not harmed.']
        : ['Where you use a high-risk system that is part of a regulated product, you must follow the provider\'s instructions for use, assign competent human oversight, keep the logs you control and report serious incidents.', 'Check whether you are also a provider: changing the purpose or modifying the system substantially makes you one.'];
    return out('Applies', 'amber', r === 'deployer' ? 'High-risk deployer (product route)' : r === 'importer' ? 'Importer or distributor of a high-risk product' : 'Provider of a high-risk product (Annex I)', o.concat(sub, smid), ['Obligations for Annex I product-linked systems start on 2 August 2028 after the Digital Omnibus.', 'Fines for breaching high-risk obligations: ' + fines('x')], ['act', 'omni', 'pol', 'desk']);
  }
  if (a3) {
    const exempt = a.human === 'narrow' && a.prof === 'no';
    if (exempt && provLike) return out('Likely applies', 'amber', 'Provider relying on the Article 6(3) exception', ['A system in an Annex III area is not high-risk if it does not pose a significant risk to people\'s health, safety or rights, for example because it only does a narrow procedural task, improves a previous human activity, detects patterns without replacing human judgement, or does preparatory work. It must not profile people.', 'You decide this yourself, so the risk of getting it wrong sits with you. You must write down your assessment, and you must still register the system in the EU database. Authorities can challenge your conclusion.', 'If your system is not exempt, the high-risk provider obligations apply. Read Article 6 and the Commission guidance on classification.'].concat(sub, smid), ['High-risk Annex III rules start on 2 December 2027 after the Digital Omnibus. The exception assessment and registration should be done before the system is placed on the market.', 'Fines: ' + fines('x')], ['act', 'omni', 'desk']);
    if (provLike) return out('Applies', 'amber', r === 'modifier' ? 'Treated as the provider of a high-risk system (Article 25)' : 'Provider of a high-risk system (Annex III)', (r === 'modifier' ? ['Putting your name or trademark on a high-risk system, changing its intended purpose, or making a substantial modification makes you the provider, with the original provider\'s duties. The first provider must then cooperate with you.'] : []).concat(['Your system falls in a listed high-risk area and it materially influences decisions, so it is likely high-risk.', 'As provider you must run a risk management system, use suitable and representative data, keep technical documentation and automatic logs, design for human oversight, ensure accuracy, robustness and cybersecurity, complete a conformity assessment, affix CE marking and register the system in the EU database before it is placed on the market.', 'You must also set up a quality management system, give deployers clear instructions for use, report serious incidents and take corrective action. Providers outside the EU need an authorised representative in the EU.'], sub, smid), ['High-risk Annex III obligations apply from 2 December 2027 after the Digital Omnibus.', 'Fines for breaching these obligations: ' + fines('x')], ['act', 'omni', 'pol', 'desk']);
    if (r === 'importer') return out('Applies', 'amber', 'Importer or distributor of a high-risk system', ['Before a high-risk system is made available in the EU you must check that the provider completed the conformity assessment, the documentation and CE marking exist, instructions are included, and the provider or its EU representative is named.', 'You must not sell a system you have reason to think is non-compliant, you must tell the provider and the authority if it presents a risk, and you must keep copies of key paperwork for ten years.'].concat(sub), ['High-risk Annex III obligations apply from 2 December 2027 after the Digital Omnibus.'], ['act', 'omni', 'desk']);
    return out('Applies', 'amber', 'Deployer of a high-risk system', ['You use a system in a listed high-risk area, so you are likely a high-risk deployer. Your duties are lighter than the provider\'s but real.', 'Use the system as the provider\'s instructions say, give oversight to trained and authorised staff, make sure input data you control is relevant, monitor operation, keep the logs you control for at least six months and report serious incidents or risks to the provider and the authority.', 'Tell workers and their representatives before using such a system at work, and tell people affected when a high-risk system is used to make or assist decisions about them. Public bodies and some others must carry out a fundamental rights impact assessment first.'].concat(sub, smid), ['High-risk Annex III obligations apply from 2 December 2027 after the Digital Omnibus.', 'Fines: ' + fines('x')], ['act', 'omni', 'pol', 'desk']);
  }
  if (has('gpai') && provLike) return out('Applies', 'amber', 'Provider of a general-purpose AI model', ['If you place a general-purpose AI model on the EU market you must keep technical documentation, give downstream providers the information they need, set a copyright-compliance policy and publish a summary of the training content.', 'Models with systemic risk (very large training compute) have extra duties: model evaluation, adversarial testing, incident reporting and cybersecurity. The Commission publishes a code of practice and guidance. Open-source models get some relief but not from copyright or systemic-risk duties.', 'If you build a product on top of someone else\'s model, you are normally a downstream provider or deployer, not a model provider. Check the Commission guidelines.'].concat(sub), ['General-purpose model obligations have applied since 2 August 2025.', 'Models already on the market before that date have until 2 August 2027.', 'Commission enforcement powers over these models, including fines, started on 2 August 2026.'], ['act', 'pol', 'desk']);
  if (tr) return out('Applies', 'amber', r === 'deployer' ? 'Deployer with transparency duties (Article 50)' : r === 'importer' ? 'Importer or distributor (limited duties)' : 'Provider with transparency duties (Article 50)', r === 'deployer' ? ['If you use AI that creates deepfakes or publishes AI-generated text on matters of public interest, you must disclose that it is AI-generated or manipulated. Where you use emotion recognition or biometric categorisation, you must inform the people exposed to it.', 'Using a chatbot to talk to customers does not by itself put the duty on you: the provider must design the system so people are told they are dealing with AI, unless that is obvious.'] : r === 'importer' ? ['You have no stand-alone duties for transparency-only systems beyond not selling something you know does not meet the Act. Make sure the provider has done its part.'] : ['Design the system so people know they are interacting with AI unless that is obvious, mark AI-generated or edited audio, image, video and text in a machine-readable way, and make it detectable as artificial.'], ['Article 50 transparency duties apply from 2 August 2026.', 'Systems already on the market before then have until 2 December 2026 for machine-readable marking.'], ['act', 'omni', 'desk']);
  return out('Probably outside scope', 'green', 'Low-risk AI (no specific obligations)', ['Your system is not banned, not high-risk, and has no special transparency duty on your answers. The Act does not impose specific obligations for it.', 'You may follow voluntary codes of conduct. Other laws, such as data-protection, consumer, employment or sector rules, still apply.', 'Reassess if you change what the system is used for. A new purpose can move it into a higher category.'], ['No specific AI Act date applies to you on these answers.'], ['act', 'pol', 'desk']);
}

/* ---------------- US ---------------- */
function usSection(a) {
  const has = (k) => a.what.includes(k), st = (k) => a.states.includes(k);
  const dev = a.role === 'provider' || a.role === 'modifier';
  const emp = has('emp'), cons = has('cons') || has('a3o');
  const inte = a.how === 'int' && !emp && !cons;
  const inUS = a.base === 'us' || a.markets.includes('us');
  const mk = (status, tone, title, points, dates, keys) => ({ region: 'United States', flag: '🇺🇸', status, tone, title, points, dates, sources: srcList(keys) });
  if (!inUS) return mk('Probably outside scope', 'green', 'US AI laws are unlikely to apply', ['You said you have no users, customers, employees or applicants in the United States. US state AI laws follow your users, so the main ones are unlikely to reach you. The Federal Trade Commission can still act against deceptive AI claims that affect US consumers.', 'Check again if your market changes.'], ['No date applies today.'], ['ftc']);
  const L = [], S = ['ftc', 'nist'];
  const narrow = a.human === 'narrow';
  const add = (n, w, d, keys) => { L.push({ n, w, d }); S.push(...keys); };
  const decides = emp || cons;
  if (emp && !inte) {
    if (st('CO') && !narrow) add('Colorado SB 26-189 (automated decision-making)', 'Covers automated decision-making that materially influences employment decisions. Deployers give notice before use, send an adverse-outcome notice within 30 days, and offer correction and human review. Only the attorney general enforces it, with a cure period until 1 January 2030.', 'Effective 1 January 2027', ['co', 'coag']);
    if (st('IL')) add('Illinois HB 3773', 'Using AI in employment decisions in a discriminatory way is a civil rights violation, and employers must give notice when AI is used.', 'In effect since 1 January 2026', ['il']);
    if (st('NY')) add('New York City Local Law 144', 'If you hire or promote in New York City with an automated employment decision tool, you need an annual independent bias audit and must notify candidates.', 'In effect since 5 July 2023', ['nyc']);
    if (st('CA') && !narrow) add('California CCPA automated decision-making rules', 'Rules on automated decision-making technology for significant decisions, including employment, with notices, opt-out and access rights. Also check California SB 947 on automated discipline and firing.', 'Significant-decision rules from 1 January 2027', ['cppa', 'ca']);
    if (st('CT')) add('Connecticut CART Act (Public Act 26-15)', 'Includes duties for automated employment decision tools. Details changed in later amendments, so read the act.', 'Deployments from 1 October 2027', ['ct']);
  }
  if (cons && !inte) {
    if (st('CO') && !narrow) add('Colorado SB 26-189 (automated decision-making)', 'Covers consequential decisions in education, housing, lending, insurance, health care and essential government services. Notice before use, adverse-outcome notice within 30 days, and correction and human review rights. Attorney general enforcement only.', 'Effective 1 January 2027', ['co', 'coag']);
    if (st('CA') && !narrow) add('California CCPA automated decision-making rules', 'Rules for significant decisions about people, with notice, opt-out and access rights.', 'Significant-decision rules from 1 January 2027', ['cppa']);
  }
  if (has('chat')) {
    if (st('CA')) add('California companion chatbot and child-safety laws', 'California signed laws in September 2026 on companion chatbots, including SB 1119. Check the scope and the duties for minors.', 'Signed September 2026. Check start dates in the bill text', ['ca']);
    if (st('WA')) add('Washington HB 2225 (chatbots)', 'Reported to impose companion-chatbot duties. Check the bill text.', 'Reported start 1 January 2027', ['wa']);
    if (st('CT')) add('Connecticut companion-chatbot duties', 'Duties for companion chatbots offered to the public. Check the act.', 'From 1 January 2027', ['ct']);
  }
  if (has('gen') && st('CA')) add('California AI Transparency Act (SB 942, as amended by SB 1000)', 'Covered providers of public generative AI systems must offer disclosure and provenance tools. SB 1000, enacted on 30 September 2026, changed the scope, so re-check whether you are covered.', 'Amended 30 September 2026', ['ca']);
  if (has('front') && dev) {
    if (st('CA') && a.scale !== 'small') add('California SB 53 (frontier AI)', a.scale === 'big' ? 'You are likely a large frontier developer: a published safety framework, transparency reports and critical-incident reporting.' : 'You are likely a frontier developer under the revenue threshold, with lighter duties. Read the bill.', 'In effect since 1 January 2026', ['ca']);
    if (st('NY') && a.scale !== 'small') add('New York RAISE Act', 'Duties for large frontier developers, including 72-hour incident reporting. Penalties up to $1 million for a first violation.', 'Effective 1 January 2027', ['ny']);
  }
  if (st('TX') && !inte) add('Texas Responsible AI Governance Act (HB 149)', 'Bans specific harmful uses, such as intentionally discriminatory systems and manipulation that causes harm. Only the attorney general enforces it, with a 60-day cure period. For most private companies the duties are narrower than in Colorado.', 'In effect since 1 January 2026', ['tx', 'txag']);
  if (emp) S.push('eeoc');
  const points = [];
  if (inte) points.push('Purely internal productivity use with no decisions about people is mostly outside the state AI laws. Privacy, consumer-protection and employment rules still apply.');
  else if (!L.length) points.push('On your answers, none of the main state AI laws we track clearly applies. ' + (st('OT') && a.states.length === 1 ? 'You selected other states only. Many have narrower AI laws, so check your state attorney general. ' : '') + 'Laws are changing quickly, so check again if your use changes.');
  L.forEach((x) => points.push(x.n + ': ' + x.w));
  points.push('There is no comprehensive federal AI law. Agencies apply existing laws: the Federal Trade Commission polices deceptive or unfair AI claims' + (emp ? ', and the Equal Employment Opportunity Commission looks at discrimination in hiring tools' : '') + '.');
  points.push('Executive Order 14365 (11 December 2025) set up a Justice Department task force aimed at state AI laws. It cannot cancel a state law by itself, so plan for state laws to apply.');
  if (a.who.includes('kid') && has('chat')) points.push('You serve children or teenagers with a chatbot, so look closely at age-assurance and minor-protection duties in every state where you have users.');
  if (a.who.length === 1 && a.who[0] === 'biz') points.push('You said only businesses are affected. Many of these laws protect consumers, workers and residents, so a business-only product may be less exposed. Confirm the definitions.');
  void decides;
  return mk(L.length ? 'Applies' : 'Few AI-specific rules', L.length ? 'amber' : 'green', L.length ? 'US state laws to look at first' : 'No clear state AI law on your answers', points, L.map((x) => x.n + ': ' + x.d + '.'), S);
}

/* ---------------- UK, Canada, China ---------------- */
function ukSection(a) {
  const inUK = a.base === 'uk' || a.markets.includes('uk');
  const mk = (status, tone, title, points, dates, keys) => ({ region: 'United Kingdom', flag: '🇬🇧', status, tone, title, points, dates, sources: srcList(keys) });
  if (!inUK) return mk('Probably outside scope', 'green', 'UK rules are unlikely to reach you', ['You said you have no UK base or UK users. The UK has no single AI law, so there is little AI-specific to watch. Check again if you start serving UK customers.'], ['No date applies today.'], ['uk']);
  const p = ['The UK has no single AI Act. Existing regulators apply five cross-sector principles (safety, transparency, fairness, accountability and contestability) within their own areas, so what matters is the regulator for your sector.'];
  if (a.pd !== 'no') p.push('UK GDPR and the Data Protection Act 2018 apply whenever your AI processes personal data, including rules on automated decision-making. The Data (Use and Access) Act 2025 updated parts of this area, so check the current text. Run a data protection impact assessment for AI that handles personal data.');
  if (a.what.includes('emp') || a.what.includes('cons') || a.what.includes('a3o')) p.push('The Equality Act 2010 applies to decisions made or supported by AI. Discrimination by an AI system can still be unlawful discrimination, whoever built the tool.');
  p.push('Consumer and competition law still apply to claims you make about your AI. Financial services, healthcare and other regulated sectors have their own expectations from the FCA, MHRA and others.');
  p.push('The government has said it may legislate, especially for the most powerful AI models. Timing and scope have shifted, so check current announcements.');
  if (a.markets.includes('eu') || a.base === 'eu') p.push('Because you also serve the EU, follow the stricter EU standard for your whole product if maintaining two sets of practices is costly. See the EU section of this report.');
  return mk('Applies', 'amber', 'Existing UK laws and regulators', p, ['No AI-specific UK statute with a start date. Check GOV.UK for any announced bill.'], ['uk', 'ico']);
}
function caSection(a) {
  const inCA = a.base === 'ca' || a.markets.includes('ca');
  const mk = (status, tone, title, points, dates, keys) => ({ region: 'Canada', flag: '🇨🇦', status, tone, title, points, dates, sources: srcList(keys) });
  if (!inCA) return mk('Probably outside scope', 'green', 'Canadian rules are unlikely to reach you', ['You said you have no Canadian base or Canadian users. Canada has no federal AI statute in force, so there is little AI-specific to watch. Check again if you start serving Canadian customers.'], ['No date applies today.'], ['opc']);
  const p = ['As far as we know there is no federal AI statute in force. The proposed Artificial Intelligence and Data Act was part of Bill C-27, which died when Parliament was prorogued in January 2025.'];
  if (a.pd !== 'no') p.push('Privacy law is the main constraint. PIPEDA governs how private-sector organisations collect, use and disclose personal information in commercial activity across much of Canada, and Alberta and British Columbia have their own private-sector privacy laws. Quebec Law 25 adds duties, including transparency when a decision is made exclusively by automated processing and a right to ask about it.');
  else p.push('You said your AI does not process personal data. Privacy law is Canada\'s main AI constraint, so confirm that is really the case, including any data used for training.');
  p.push('Human rights law, consumer protection law and sector rules for areas such as financial services and health apply to AI-driven decisions just as they do to human ones.');
  p.push('Canada introduced a voluntary code of conduct for advanced generative AI systems in 2023. It is not law, but signing on can matter commercially.');
  p.push('The federal government has said it wants a different approach from AIDA, but timing and form are uncertain. Check official announcements before assuming anything.');
  return mk('Applies', 'amber', 'Privacy and existing law apply, no AI statute', p, ['No federal AI statute date. Quebec Law 25 duties are already in force.'], ['opc', 'tbs']);
}
function cnSection(a) {
  const inCN = a.base === 'cn' || a.markets.includes('cn');
  const has = (k) => a.what.includes(k);
  const mk = (status, tone, title, points, dates, keys) => ({ region: 'China', flag: '🇨🇳', status, tone, title, points, dates, sources: srcList(keys) });
  if (!inCN) return mk('Probably outside scope', 'green', 'Chinese AI rules are unlikely to reach you', ['You said you have no base in China and no users in China. China\'s generative AI rules apply to public services offered in China, whatever the provider\'s location, so you are likely outside them. If you handle personal information of people in China, check data rules.'], ['No date applies today.'], ['cac']);
  const internal = a.how === 'int';
  const p = ['China has no single AI statute. It regulates AI through targeted rules, mostly from the Cyberspace Administration of China (CAC), on top of the data and cybersecurity laws.'];
  const d = [];
  if (!internal && (has('gen') || has('chat') || has('gpai') || has('front'))) {
    p.push('Public generative AI services in China must be filed or registered. Model providers file with the national CAC. Apps that only call an already filed model through an API register with their provincial CAC office. Services with the ability to influence public opinion or mobilise people need a security assessment before launch.');
    d.push('Interim Measures for Generative AI Services: in force since 15 August 2023.');
  }
  if (!internal && (has('gen') || has('chat'))) {
    p.push('AI-generated text, images, audio, video and virtual scenes must carry visible labels and labels in the file metadata. Removing or forging labels is banned. Enforcement is real: in April 2026 the CAC told local regulators to act against apps with poor labelling.');
    d.push('Labelling measures and standard GB 45438-2025: in force since 1 September 2025.');
  }
  if (has('chat') && !internal) {
    p.push('If your chatbot is an AI companion or role-play service offered to the public, the Anthropomorphic AI Interactive Services measures apply: tell users they are talking to an AI, parental consent for children under 14, age checks and time-limited minor modes, warnings for signs of dependence, and crisis monitoring. Customer service, Q&A, work assistants, education and research tools are outside them.');
    d.push('Anthropomorphic AI Interactive Services measures: in force since 15 July 2026.');
  }
  if (a.pd !== 'no') {
    p.push('The Personal Information Protection Law, the Data Security Law and the Cybersecurity Law (as amended from 1 January 2026) apply to personal information of people in China, including processing outside China aimed at offering them products or services. Serious breaches can bring fines up to RMB 10 million under the amended Cybersecurity Law. Check the amended text before relying on exact figures.');
    d.push('Amended Cybersecurity Law: in force since 1 January 2026.');
  }
  if (a.what.includes('cons') || a.what.includes('a3o')) p.push('Finance has its own AI guidance: on 18 June 2026 the National Financial Regulatory Administration issued guiding opinions on AI in banking and insurance.');
  if (internal) p.push('You said the system is only an internal tool. Staff-only tools fall outside the generative AI measures, but data and ethics-review rules can still apply.');
  p.push('The CAC can ask other agencies to block non-compliant services provided from abroad. The official texts are in Chinese, so confirm details with qualified counsel in China before you act.');
  if (!d.length) d.push('Check the CAC site for filings and notices that match your service.');
  return mk('Applies', 'amber', 'China\'s stack of AI rules', p, d, ['cac', 'flk']);
}

export function buildReport(a) {
  const sections = [euSection(a), usSection(a), ukSection(a), caSection(a), cnSection(a)];
  const hit = sections.filter((s) => s.status !== 'Probably outside scope');
  const summary = hit.length
    ? 'Based on your answers, rules in ' + hit.map((s) => s.region).join(', ') + ' are worth your attention. ' + sections.filter((s) => s.status === 'Probably outside scope').map((s) => s.region).join(', ') + (sections.length === hit.length ? '' : ' look unlikely to apply today.')
    : 'Based on your answers, none of the regions covered clearly applies to you today.';
  return { version: 1, generated: new Date().toISOString().slice(0, 10), summary: summary.trim(), sections, otherRegions: a.markets.includes('other') || a.base === 'other' };
}

/* ---------------- rendering ---------------- */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TONE = { red: ['#fee2e2', '#991b1b'], amber: ['#fef3c7', '#92400e'], green: ['#dcfce7', '#166534'] };
const NEXT = [['Is my AI system high-risk?', '/guides/is-my-ai-system-high-risk/'], ['US state AI laws', '/guides/us-state-ai-laws/'], ['Which AI laws apply to your business', '/guides/which-ai-laws-apply-to-you/']];

export function renderReportHtml(report, email) {
  const h = [];
  h.push('<div style="font-size:16px;line-height:1.6;color:#1f2937">');
  h.push('<h1 style="font-size:24px;margin:0 0 6px;color:#0b1220">Your personal AI law report</h1>');
  h.push('<p style="margin:0 0 14px;color:#6b7280;font-size:14px">Prepared ' + esc(report.generated) + (email ? ' for ' + esc(email) : '') + '. Reflects the law as understood in November 2026.</p>');
  h.push('<p style="margin:0 0 18px"><strong>In short:</strong> ' + esc(report.summary) + '</p>');
  report.sections.forEach((s) => {
    const t = TONE[s.tone] || TONE.amber;
    h.push('<div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px 18px;margin:0 0 16px">');
    h.push('<div style="font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">' + s.flag + ' ' + esc(s.region) + '</div>');
    h.push('<span style="display:inline-block;margin:6px 0;font-size:13px;font-weight:700;padding:3px 10px;border-radius:99px;background:' + t[0] + ';color:' + t[1] + '">' + esc(s.status) + '</span>');
    h.push('<h2 style="font-size:19px;margin:4px 0 8px;color:#0b1220">' + esc(s.title) + '</h2>');
    h.push('<ul style="margin:0 0 8px;padding-left:20px">' + s.points.map((x) => '<li style="margin:0 0 6px">' + esc(x) + '</li>').join('') + '</ul>');
    h.push('<h3 style="font-size:15px;margin:10px 0 4px;color:#0b1220">Key dates and penalties</h3><ul style="margin:0 0 8px;padding-left:20px">' + s.dates.map((x) => '<li style="margin:0 0 4px">' + esc(x) + '</li>').join('') + '</ul>');
    h.push('<h3 style="font-size:15px;margin:10px 0 4px;color:#0b1220">Official sources</h3><ul style="margin:0;padding-left:20px">' + s.sources.map((x) => '<li style="margin:0 0 4px"><a href="' + esc(x[1]) + '" style="color:#4f46e5">' + esc(x[0]) + '</a></li>').join('') + '</ul>');
    h.push('</div>');
  });
  if (report.otherRegions) h.push('<p style="margin:0 0 16px">You also selected a country outside the five regions covered here. Many countries are drafting AI rules, so read our guide on <a href="' + SITE + '/guides/which-ai-laws-apply-to-you/" style="color:#4f46e5">which AI laws apply to your business</a> and check that country\'s regulator.</p>');
  h.push('<h3 style="font-size:16px;margin:18px 0 6px;color:#0b1220">Keep reading</h3><ul style="margin:0 0 14px;padding-left:20px">' + NEXT.map((n) => '<li><a href="' + SITE + n[1] + '" style="color:#4f46e5">' + esc(n[0]) + '</a></li>').join('') + '</ul>');
  h.push('<p style="background:#f6f7fb;border-radius:10px;padding:12px 14px;font-size:15px;margin:0 0 14px"><strong>Rules change every month.</strong> The <a href="' + SITE + '/tracker/" style="color:#4f46e5">AI Regulation Tracker</a> is a monthly briefing on what changed, which dates moved and what to do about it.</p>');
  h.push('<p style="font-size:14px;color:#6b7280;margin:0"><strong>Educational only, not legal advice.</strong> This report is a simplified reading of the law based on the answers you gave. Real cases depend on facts the questions cannot capture, and rules and guidance keep changing. Confirm against the official sources above or ask a qualified lawyer before you act.</p>');
  h.push('</div>');
  return h.join('\n');
}

export function renderReportText(report) {
  const t = ['YOUR PERSONAL AI LAW REPORT', 'Prepared ' + report.generated, '', 'In short: ' + report.summary, ''];
  report.sections.forEach((s) => {
    t.push(s.flag + ' ' + s.region.toUpperCase() + ' - ' + s.status, s.title, '');
    s.points.forEach((x) => t.push('- ' + x));
    t.push('', 'Key dates and penalties:');
    s.dates.forEach((x) => t.push('- ' + x));
    t.push('', 'Official sources:');
    s.sources.forEach((x) => t.push('- ' + x[0] + ': ' + x[1]));
    t.push('', '');
  });
  t.push('Keep this current: ' + SITE + '/tracker/', '', 'Educational only, not legal advice.');
  return t.join('\n');
}
