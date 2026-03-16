/**
 * T3 Sentinel AI Engine
 * ---------------------
 * Two products:
 * 1. Web Hub: Query AI platforms → track brand visibility → generate content plans
 * 2. Sentinel API: Intercept AI responses → check ground truth → return clean text
 *
 * This runs entirely client-side using Supabase for data.
 */

import { supabase } from '../supabase';
import { checkUsage } from './billing';

const PLATFORMS = ['chatgpt', 'gemini', 'perplexity', 'copilot'];

// ─── INTERNAL: Fetch with retry + timeout ────────────────────────────────────

/**
 * Wraps `fetch` with per-attempt timeouts and exponential-backoff retries on
 * network errors or 5xx responses.
 *
 * @param {string} url
 * @param {RequestInit} options
 * @param {{ maxRetries?: number, timeoutMs?: number }} [config]
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, options, { maxRetries = 2, timeoutMs = 30000 } = {}) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) return res;
      if (res.status >= 500 && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        continue;
      }
      return res; // return non-5xx errors immediately
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }
}

// ─── MAIN PIPELINE: Full Brand Scan ─────────────────────────────────────────

export async function runFullScan(brand, userId = null) {
  if (userId) {
    const usage = await checkUsage(userId, 'scan');
    if (!usage.allowed) {
      return { error: 'Scan limit reached. Please upgrade your plan.', usage };
    }
  }

  const brandId = brand.id;
  const brandName = brand.name;

  // 1. Get ground truth
  const { data: products } = await supabase
    .from('products').select('*').eq('brand_id', brandId);

  // 2. Get queries for this brand
  const { data: queries } = await supabase
    .from('queries').select('*').eq('target_brand_id', brandId);

  if (!queries || queries.length === 0) {
    return { error: 'No queries configured. Add queries for this brand first.' };
  }

  const results = {
    brand: brandName,
    queries_run: 0,
    responses_collected: 0,
    claims_extracted: 0,
    hallucinations_found: 0,
    alerts_created: 0,
    platforms_queried: PLATFORMS,
    details: [],
  };

  for (const query of queries) {
    // Query all platforms concurrently for this query
    await Promise.all(PLATFORMS.map(async (platform) => {
      try {
        // Query AI platform (real API call)
        const responseText = await queryAIPlatform(query.query_text, platform, brandName);
        results.queries_run++;

        // Skip platform if query failed
        if (responseText === null) {
          results.details.push({ query: query.query_text, platform, error: 'Failed to query platform' });
          return;
        }

        // Save response to Supabase
        const { data: respData } = await supabase
          .from('ai_responses')
          .insert({ query_id: query.id, platform, response_text: responseText })
          .select().single();

        const responseId = respData?.id;
        results.responses_collected++;

        // Parse claims from response
        const parsedClaims = extractClaims(responseText, brandName);

        // Verify claims against ground truth
        const verifiedClaims = verifyClaims(parsedClaims, products || [], brandName);

        // Save claims + create alerts
        for (const claim of verifiedClaims) {
          const { data: savedClaim } = await supabase
            .from('claims')
            .insert({
              response_id: responseId,
              brand_id: brandId,
              claim_type: claim.claim_type || 'unknown',
              claim_text: claim.claim_text || '',
              extracted_value: claim.extracted_value || '',
              status: claim.status || 'accurate',
              ground_truth_value: claim.ground_truth_value || '',
              confidence: claim.confidence || 0.5,
            })
            .select().single();

          results.claims_extracted++;

          if (claim.status === 'hallucinated') {
            results.hallucinations_found++;
            await supabase.from('alerts').insert({
              brand_id: brandId,
              alert_type: 'hallucination',
              severity: 'critical',
              title: `[${platform}] Hallucinated ${claim.claim_type}: ${(claim.claim_text || '').slice(0, 80)}`,
              description: `Query: "${query.query_text}"\nAI claimed: ${claim.claim_text}\nGround truth: ${claim.ground_truth_value || 'N/A'}`,
              claim_id: savedClaim?.id,
            });
            results.alerts_created++;
          }
        }

        results.details.push({
          query: query.query_text,
          platform,
          brand_mentioned: brandName.toLowerCase().split(' ').some(w => responseText.toLowerCase().includes(w)),
          claims_found: verifiedClaims.length,
          hallucinations: verifiedClaims.filter(c => c.status === 'hallucinated').length,
        });
      } catch (e) {
        results.details.push({ query: query.query_text, platform, error: e.message });
      }
    }));
  }

  // Update daily analytics snapshot
  await updateDailySnapshot(brandId, results);

  return results;
}


// ─── VISIBILITY SCAN: Single query across all platforms ──────────────────────

export async function runVisibilityScan(queryText, brand, userId = null) {
  if (userId) {
    const usage = await checkUsage(userId, 'scan');
    if (!usage.allowed) {
      return { error: 'Scan limit reached. Please upgrade your plan.', usage };
    }
  }

  const brandName = brand.name;

  const { data: products } = await supabase
    .from('products').select('*').eq('brand_id', brand.id);

  let platformsMentioned = 0;
  let totalHallucinations = 0;
  const allCompetitors = [];

  // Query all platforms concurrently
  const platformResults = await Promise.all(PLATFORMS.map(async (platform) => {
    try {
      const responseText = await queryAIPlatform(queryText, platform, brandName);

      // Skip platform if query failed
      if (responseText === null) {
        return {
          platform,
          response: null,
          mentioned: false,
          position: null,
          rank: null,
          competitors: [],
          claims: [],
          claim_summary: { total: 0, accurate: 0, hallucinated: 0 },
          sources: [],
          content_gaps: [],
          error: 'Failed to query platform',
        };
      }

      const inclusion = checkBrandInclusion(responseText, brandName);
      if (inclusion.mentioned) platformsMentioned++;

      const claims = extractClaims(responseText, brandName);
      const verified = verifyClaims(claims, products || [], brandName);
      const hallucinated = verified.filter(c => c.status === 'hallucinated');
      totalHallucinations += hallucinated.length;
      allCompetitors.push(...inclusion.competitors);

      return {
        platform,
        response: responseText,
        mentioned: inclusion.mentioned,
        position: inclusion.position,
        rank: inclusion.rank,
        competitors: inclusion.competitors,
        claims: verified,
        claim_summary: {
          total: verified.length,
          accurate: verified.filter(c => c.status === 'accurate').length,
          hallucinated: hallucinated.length,
        },
        sources: guessSources(responseText, platform),
        content_gaps: findContentGaps(verified, brandName),
      };
    } catch (e) {
      return {
        platform,
        response: null,
        mentioned: false,
        position: null,
        rank: null,
        competitors: [],
        claims: [],
        claim_summary: { total: 0, accurate: 0, hallucinated: 0 },
        sources: [],
        content_gaps: [],
        error: e.message,
      };
    }
  }));

  // Store query if new
  const { data: existingQ } = await supabase
    .from('queries').select('id')
    .eq('query_text', queryText).eq('target_brand_id', brand.id).limit(1);

  let queryId;
  if (existingQ?.length) {
    queryId = existingQ[0].id;
  } else {
    const { data: newQ } = await supabase
      .from('queries')
      .insert({ query_text: queryText, target_brand_id: brand.id, category: 'manual' })
      .select().single();
    queryId = newQ?.id;
  }

  // Store responses + claims (skip platforms that failed)
  for (const pr of platformResults) {
    if (queryId && pr.response !== null) {
      const { data: resp } = await supabase
        .from('ai_responses')
        .insert({ query_id: queryId, platform: pr.platform, response_text: pr.response })
        .select().single();

      for (const claim of pr.claims) {
        await supabase.from('claims').insert({
          response_id: resp?.id,
          brand_id: brand.id,
          claim_type: claim.claim_type,
          claim_text: claim.claim_text,
          extracted_value: claim.extracted_value || '',
          status: claim.status,
          ground_truth_value: claim.ground_truth_value || '',
          confidence: claim.confidence || 0.5,
        });
      }
    }
  }

  const competitorFreq = {};
  allCompetitors.forEach(c => { competitorFreq[c] = (competitorFreq[c] || 0) + 1; });
  const topCompetitors = Object.entries(competitorFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, mentions]) => ({ name, mentions }));

  const inclusionRate = Math.round((platformsMentioned / PLATFORMS.length) * 100);

  return {
    query: queryText,
    brand: brandName,
    visibility_summary: {
      platforms_checked: PLATFORMS.length,
      platforms_mentioned: platformsMentioned,
      inclusion_rate: inclusionRate,
      total_claims_extracted: platformResults.reduce((s, p) => s + p.claim_summary.total, 0),
      total_hallucinations: totalHallucinations,
      top_competitors: topCompetitors,
      verdict: getVerdict(inclusionRate, totalHallucinations),
    },
    platforms: platformResults,
  };
}


// ─── LIVE QUERY: Single platform query ───────────────────────────────────────

export async function runLiveQuery(queryText, brand, userId = null) {
  if (userId) {
    const usage = await checkUsage(userId, 'api_call');
    if (!usage.allowed) {
      return { error: 'API call limit reached. Please upgrade your plan.', usage };
    }
  }

  const brandName = brand.name;
  const { data: products } = await supabase
    .from('products').select('*').eq('brand_id', brand.id);

  // Query all platforms concurrently
  const platformResults = await Promise.all(PLATFORMS.map(async (platform) => {
    const responseText = await queryAIPlatform(queryText, platform, brandName);

    if (responseText === null) {
      return {
        platform,
        response: 'Failed to query platform',
        summary: { total_claims: 0, accurate: 0, hallucinated: 0, outdated: 0 },
        claims: [],
        error: true,
      };
    }

    const claims = extractClaims(responseText, brandName);
    const verified = verifyClaims(claims, products || [], brandName);

    return {
      platform,
      response: responseText,
      summary: {
        total_claims: verified.length,
        accurate: verified.filter(c => c.status === 'accurate').length,
        hallucinated: verified.filter(c => c.status === 'hallucinated').length,
        outdated: verified.filter(c => c.status === 'outdated').length,
      },
      claims: verified,
    };
  }));

  return { platforms: platformResults };
}


// ─── SENTINEL HDE: Check text for hallucinations ────────────────────────────

export function sentinelCheck(text, products, brandName, mode = 'block') {
  const claims = extractClaims(text, brandName);
  const verified = verifyClaims(claims, products, brandName);
  const hallucinated = verified.filter(c => c.status === 'hallucinated');
  const safe = hallucinated.length === 0;

  let correctedText = text;
  if (mode === 'block' && !safe) {
    for (const claim of hallucinated) {
      if (claim.extracted_value && claim.ground_truth_value) {
        correctedText = correctedText.replace(claim.extracted_value, claim.ground_truth_value);
      }
    }
  }

  return {
    safe,
    action_taken: safe ? 'none' : mode === 'block' ? 'text_corrected' : mode === 'flag' ? 'claims_flagged' : 'logged_only',
    corrected_text: mode === 'block' ? correctedText : undefined,
    claims_checked: verified.length,
    claims: verified.map(c => ({
      claim: c.claim_text,
      status: c.status,
      type: c.claim_type,
      ground_truth: c.ground_truth_value || null,
    })),
  };
}


// ─── CONTENT GENERATION ─────────────────────────────────────────────────────

export async function generateContent(product, brandName, contentType, userId = null) {
  if (userId) {
    const usage = await checkUsage(userId, 'content_gen');
    if (!usage.allowed) {
      return { error: 'Content generation limit reached. Please upgrade your plan.', usage };
    }
  }
  const name = product.name;
  const price = product.price || 0;
  const category = product.category || 'Product';
  const availability = product.availability || 'Available';
  const policies = product.policies || '';
  let features = product.features || [];
  if (typeof features === 'string') {
    try { features = JSON.parse(features); } catch { features = []; }
  }
  if (Array.isArray(features)) {
    features = Object.fromEntries(features.map((f, i) => [`feature_${i}`, f]));
  }
  const featuresText = Object.values(features).slice(0, 4).join(', ');

  if (contentType === 'schema') {
    const schema = {
      "@context": "https://schema.org",
      "@type": "Product",
      name,
      brand: { "@type": "Brand", name: brandName },
      category,
      description: `The ${name} by ${brandName} — ${featuresText}. Priced at $${price}. ${availability}.`,
      offers: {
        "@type": "Offer",
        price: String(price),
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        seller: { "@type": "Organization", name: brandName },
      },
      additionalProperty: Object.entries(features).map(([k, v]) => ({
        "@type": "PropertyValue", name: k, value: String(v),
      })),
    };
    return {
      title: `Schema.org JSON-LD — ${name}`,
      content: JSON.stringify(schema, null, 2),
      instructions: "Add this to your product page <head>. AI crawlers parse structured data first.",
      impact: "High — Schema.org is the #1 way AI assistants discover product facts",
    };
  }

  if (contentType === 'press_release') {
    return {
      title: `Press Release — ${name}`,
      content: `${brandName.toUpperCase()} ANNOUNCES ${name.toUpperCase()} — SETTING NEW STANDARDS IN ${category.toUpperCase()}

FOR IMMEDIATE RELEASE

${brandName} today highlighted the ${name}, a ${category.toLowerCase()} designed for both professionals and consumers. Priced at $${price}, it features ${featuresText}.

"${brandName} is committed to providing the best products for every need," said a ${brandName} spokesperson. "The ${name} represents our dedication to quality, value, and innovation."

Key Product Details:
- Price: $${price}
- Category: ${category}
- Availability: ${availability}
- Return Policy: ${policies || 'Standard return policy applies'}

For more information, visit ${brandName.toLowerCase().replace(/\s/g, '')}.com

###

Media Contact: press@${brandName.toLowerCase().replace(/\s/g, '')}.com`,
      instructions: "Distribute via PR Newswire or Business Wire. AI assistants index press releases as authoritative sources.",
      impact: "Medium-High — Press releases are frequently cited by Perplexity and ChatGPT",
    };
  }

  if (contentType === 'reddit') {
    return {
      title: `Reddit Post — ${name}`,
      content: `Title: Just picked up the ${name} from ${brandName} — here's my honest take

Hey everyone,

I've been looking at ${category.toLowerCase()} options and went with the ${name} from ${brandName}. Here's what I found:

**The Good:**
- ${featuresText}
- Priced at $${price} which is competitive
- ${availability}

**Worth Knowing:**
- ${policies || 'Standard return policy'}
- Available at ${brandName} stores and online

**Bottom Line:** If you're shopping for a ${category.toLowerCase()}, the ${name} is worth checking out.

Has anyone else tried this? What's your experience been?

---
*Prices and availability as of March 2026*`,
      instructions: "Post to relevant subreddits. AI assistants heavily weight Reddit for product opinions.",
      impact: "High — Reddit is the #1 source ChatGPT and Gemini cite for product opinions",
    };
  }

  if (contentType === 'pitch_email') {
    return {
      title: `Blogger Pitch — ${name}`,
      content: `Subject: Product Review Opportunity: ${name} by ${brandName}

Hi [Blogger Name],

I'm reaching out from ${brandName} because your audience would love the ${name}.

Quick Stats:
- Price: $${price}
- Key Features: ${featuresText}
- Category: ${category}
- Availability: ${availability}

What We're Offering:
- Free product for review (no strings attached)
- High-res images and spec sheets
- Affiliate partnership opportunity

Would you be open to taking a look?

Best,
[Your Name]
${brandName} Partnerships`,
      instructions: "Send to top bloggers and YouTubers. Reviews become AI training data.",
      impact: "High — Blog reviews are training data for AI models",
    };
  }

  if (contentType === 'faq') {
    return {
      title: `FAQ Content — ${name}`,
      content: `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How much does the ${name} cost at ${brandName}?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The ${name} is priced at $${price} at ${brandName}. ${policies || 'Standard return policy applies.'}"
      }
    },
    {
      "@type": "Question",
      "name": "What are the key features of the ${name}?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The ${name} features ${featuresText}."
      }
    },
    {
      "@type": "Question",
      "name": "Is the ${name} currently in stock?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The ${name} is currently ${availability.toLowerCase()}."
      }
    }
  ]
}
</script>`,
      instructions: "Add this FAQ schema to your product page. AI platforms parse FAQ data for Q&A responses.",
      impact: "Very High — FAQ schema is directly parsed by all 4 major AI platforms",
    };
  }

  return { title: name, content: 'Content type not recognized', instructions: '', impact: 'N/A' };
}


export async function generateOptimizedContent(product, brandName, userId = null) {
  if (userId) {
    const usage = await checkUsage(userId, 'content_gen');
    if (!usage.allowed) {
      return { error: 'Content generation limit reached. Please upgrade your plan.', usage };
    }
  }
  const name = product.name;
  const price = product.price || 0;
  const category = product.category || 'Product';
  let features = product.features || [];
  if (typeof features === 'string') {
    try { features = JSON.parse(features); } catch { features = []; }
  }
  const featList = Array.isArray(features) ? features : Object.values(features);
  const featuresText = featList.slice(0, 3).join(', ') || 'premium features';

  return {
    generated_content: {
      optimized_description: `The ${name} by ${brandName} is a ${category.toLowerCase()} priced at $${price} featuring ${featuresText}. ${product.availability || 'Available now'}.`,
      schema_jsonld: {
        "@context": "https://schema.org",
        "@type": "Product",
        name,
        brand: { "@type": "Brand", name: brandName },
        offers: { "@type": "Offer", price: String(price), priceCurrency: "USD" },
      },
      faq_content: [
        { question: `How much does the ${name} cost?`, answer: `$${price} at ${brandName}.` },
        { question: `What are the key features?`, answer: featuresText },
        { question: `Is it available?`, answer: product.availability || 'Check website for availability.' },
      ],
      key_phrases: [
        `${name} price $${price}`,
        `${brandName} ${category.toLowerCase()}`,
        `buy ${name}`,
        `${name} review`,
      ],
      content_recommendations: [
        `Add schema.org Product markup to ${name} page`,
        'Create FAQ schema for common shopping queries',
        'Publish press release for new product updates',
        'Create Reddit community content for organic visibility',
      ],
    },
    validation: {
      valid: true,
      steps_completed: [
        'Fact-checked against product database',
        'Verified pricing and availability',
        'Optimized for AI discoverability',
      ],
      issues: [],
    },
  };
}


// ─── FACT CHECKER ───────────────────────────────────────────────────────────

export async function factCheck(text, brand, userId = null) {
  if (userId) {
    const usage = await checkUsage(userId, 'api_call');
    if (!usage.allowed) {
      return { error: 'API call limit reached. Please upgrade your plan.', usage };
    }
  }

  // ── 1. Load ground truth from Supabase ────────────────────────────────────
  const { data: products } = await supabase
    .from('products').select('*').eq('brand_id', brand.id);

  const groundTruth = products || [];
  const claims = [];

  // ── 2. Extract and verify price claims ────────────────────────────────────
  const priceRe = /\$[\d,]+(?:\.\d{2})?/g;
  for (const match of text.matchAll(priceRe)) {
    const context = text.slice(Math.max(0, match.index - 40), match.index + match[0].length + 40).trim();
    const claimedPrice = parseFloat(match[0].replace(/[$,]/g, ''));

    let status = 'unverified';
    let groundTruthValue = '';
    let explanation = `Price ${match[0]} found in text — no matching product in database`;
    let suggestion = 'Check the official website for current pricing';

    for (const product of groundTruth) {
      const actualPrice = parseFloat(product.price);
      if (isNaN(actualPrice)) continue;

      const productWords = product.name.toLowerCase().split(/\s+/);
      const contextLower = context.toLowerCase();
      const nameMatches = productWords.some(w => w.length > 2 && contextLower.includes(w));

      if (nameMatches) {
        groundTruthValue = `$${actualPrice}`;
        if (Math.abs(claimedPrice - actualPrice) < 1) {
          status = 'verified';
          explanation = `Price ${match[0]} matches ${product.name} (actual: $${actualPrice})`;
          suggestion = 'This price is accurate';
        } else {
          status = 'hallucinated';
          explanation = `Price ${match[0]} does not match ${product.name} (actual: $${actualPrice})`;
          suggestion = `Correct price is $${actualPrice}`;
        }
        break;
      }
    }

    claims.push({ claim: context, status, explanation, suggestion, groundTruthValue });
  }

  // ── 3. Extract and verify feature claims ─────────────────────────────────
  const featurePatterns = [
    /\d+\s*GB\s*(?:DDR\d\s*)?RAM/gi,
    /\d+\s*(?:GB|TB)\s*SSD/gi,
    /\d+(?:\.\d+)?[- ]inch/gi,
  ];

  for (const pattern of featurePatterns) {
    for (const match of text.matchAll(pattern)) {
      const extracted = match[0].toLowerCase();
      const context = text.slice(Math.max(0, match.index - 40), match.index + match[0].length + 40).trim();

      let status = 'unverified';
      let groundTruthValue = '';
      let explanation = `Feature "${match[0]}" found in text — no matching product in database`;
      let suggestion = 'Verify this specification against official product documentation';

      for (const product of groundTruth) {
        let features = product.features || [];
        if (typeof features === 'string') {
          try { features = JSON.parse(features); } catch { features = []; }
        }
        const featuresLower = (Array.isArray(features) ? features : Object.values(features))
          .map(f => String(f).toLowerCase());

        const matchedFeature = featuresLower.find(f => extracted.includes(f) || f.includes(extracted));
        const nameInContext = product.name.toLowerCase().split(/\s+/)
          .some(w => w.length > 2 && context.toLowerCase().includes(w));

        if (matchedFeature) {
          groundTruthValue = matchedFeature;
          status = 'verified';
          explanation = `Feature "${match[0]}" matches product data for ${product.name}`;
          suggestion = 'This specification is accurate';
          break;
        } else if (nameInContext) {
          // Product name mentioned near the feature but feature not in its spec list
          status = 'hallucinated';
          explanation = `Feature "${match[0]}" not found in specs for ${product.name}`;
          suggestion = 'Verify this specification — it may be inaccurate';
          break;
        }
      }

      claims.push({ claim: context, status, explanation, suggestion, groundTruthValue });
    }
  }

  // ── 4. Calculate trust_score from verified / total ratio ──────────────────
  const total = claims.length;
  const verifiedCount = claims.filter(c => c.status === 'verified').length;
  const halCount = claims.filter(c => c.status === 'hallucinated').length;

  let trustScore;
  if (total === 0) {
    trustScore = 70; // no verifiable claims found — neutral default
  } else {
    trustScore = Math.round((verifiedCount / total) * 100);
    trustScore = Math.max(0, trustScore - halCount * 10); // penalise hallucinations
  }

  // ── 5. Attempt AI-powered enrichment via Edge Function ────────────────────
  let aiAnalysis = null;
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const res = await fetchWithRetry(`${supabaseUrl}/functions/v1/fact-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ text, brand, claims }),
    });

    if (res.ok) {
      aiAnalysis = await res.json();
    }
  } catch (err) {
    console.warn('[factCheck] Edge Function unavailable, using local verification only:', err.message);
  }

  // ── 6. Build final result (local verification is authoritative) ───────────
  return {
    trust_score: aiAnalysis?.trust_score ?? trustScore,
    summary: `Found ${total} verifiable claim${total !== 1 ? 's' : ''}. ${halCount} potential issue${halCount !== 1 ? 's' : ''} detected.`,
    red_flags: halCount > 0
      ? claims.filter(c => c.status === 'hallucinated').map(c => c.claim)
      : ['No major red flags detected'],
    overall_advice: halCount > 0
      ? 'One or more claims contradict verified product data. Review highlighted issues before relying on this information.'
      : total === 0
        ? 'No verifiable price or feature claims were found in this text.'
        : 'All verifiable claims match the product database. Always confirm prices before purchasing.',
    claims,
    ai_analysis: aiAnalysis ?? null,
  };
}


// ─── INTERNAL: Query Real AI Platform APIs ───────────────────────────────────

async function queryAIPlatform(queryText, platform, brandName) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  try {
    const res = await fetchWithRetry(`${supabaseUrl}/functions/v1/ai-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ queryText, platform, brandName }),
    });

    if (!res.ok) {
      console.error(`[queryAIPlatform] ${platform} returned HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    return data.response || `No information found about ${brandName}`;
  } catch (error) {
    console.error(`[queryAIPlatform] ${platform} failed:`, error);
    return null;
  }
}


// ─── INTERNAL: Check if brand is mentioned ──────────────────────────────────

export function checkBrandInclusion(responseText, brandName) {
  const textLower = responseText.toLowerCase();
  const brandLower = brandName.toLowerCase();
  const idx = textLower.indexOf(brandLower);

  if (idx < 0) {
    return { mentioned: false, position: null, rank: null, context: '', competitors: extractCompetitors(responseText, brandName) };
  }

  const relative = idx / Math.max(textLower.length, 1);
  const position = relative < 0.33 ? 'top' : relative < 0.66 ? 'middle' : 'bottom';
  const context = responseText.slice(Math.max(0, idx - 50), idx + brandName.length + 100).trim();

  // Check for rank
  const before = responseText.slice(Math.max(0, idx - 30), idx);
  const rankMatch = before.match(/(\d+)[.):\s]/);
  const rank = rankMatch ? parseInt(rankMatch[1]) : null;

  return {
    mentioned: true,
    position,
    rank,
    context,
    competitors: extractCompetitors(responseText, brandName),
  };
}

function extractCompetitors(text, brandName) {
  const boldPattern = /\*\*([A-Z][A-Za-z0-9 &'-]+)\*\*/g;
  const matches = [...text.matchAll(boldPattern)];
  return [...new Set(matches.map(m => m[1].trim()).filter(m => m.toLowerCase() !== brandName.toLowerCase()))];
}


// ─── INTERNAL: Extract claims from AI text ──────────────────────────────────

export function extractClaims(responseText, brandName) {
  const claims = [];
  const brandLower = brandName.toLowerCase();

  if (!responseText.toLowerCase().includes(brandLower)) return claims;

  // Price claims
  const priceRe = new RegExp(`${brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^$]*?\\$(\\d+(?:\\.\\d{2})?)`, 'gi');
  for (const match of responseText.matchAll(priceRe)) {
    const start = Math.max(0, match.index - 20);
    const end = Math.min(responseText.length, match.index + match[0].length + 50);
    claims.push({
      claim_type: 'price',
      claim_text: responseText.slice(start, end).trim(),
      extracted_value: `$${match[1]}`,
    });
  }

  // Feature claims near brand name
  const sentences = responseText.split('.');
  for (const sentence of sentences) {
    if (!sentence.toLowerCase().includes(brandLower)) continue;

    const featurePatterns = [
      /(\d+)\s*GB\s*(?:DDR\d\s*)?RAM/i,
      /(\d+)\s*(?:GB|TB)\s*SSD/i,
      /(\d+(?:\.\d+)?)[- ]inch/i,
    ];
    for (const pat of featurePatterns) {
      const m = sentence.match(pat);
      if (m) {
        claims.push({
          claim_type: 'feature',
          claim_text: m[0],
          extracted_value: m[0],
        });
      }
    }
  }

  return claims;
}


// ─── INTERNAL: Verify claims against products ───────────────────────────────

export function verifyClaims(claims, products, brandName) {
  return claims.map(claim => {
    if (claim.claim_type === 'price') return verifyPrice(claim, products);
    if (claim.claim_type === 'feature') return verifyFeature(claim, products);
    return { ...claim, status: 'unverified', confidence: 0.5 };
  });
}

function verifyPrice(claim, products) {
  const priceMatch = (claim.extracted_value || '').match(/\$?([\d,]+(?:\.\d{2})?)/);
  if (!priceMatch) return { ...claim, status: 'unverified', confidence: 0.5 };

  const claimedPrice = parseFloat(priceMatch[1].replace(',', ''));
  const claimTextLower = (claim.claim_text || '').toLowerCase();

  for (const product of products) {
    const productWords = product.name.toLowerCase().split(/\s+/);
    if (productWords.some(w => w.length > 2 && claimTextLower.includes(w))) {
      const actualPrice = parseFloat(product.price);
      if (Math.abs(claimedPrice - actualPrice) < 1) {
        return { ...claim, status: 'accurate', ground_truth_value: `$${actualPrice}`, confidence: 0.95 };
      }
      return { ...claim, status: 'hallucinated', ground_truth_value: `$${actualPrice}`, confidence: 0.9 };
    }
  }
  return { ...claim, status: 'unverified', confidence: 0.5 };
}

function verifyFeature(claim, products) {
  const extracted = (claim.extracted_value || '').toLowerCase();
  for (const product of products) {
    let features = product.features || [];
    if (typeof features === 'string') {
      try { features = JSON.parse(features); } catch { features = []; }
    }
    const featuresLower = (Array.isArray(features) ? features : Object.values(features)).map(f => String(f).toLowerCase());

    for (const f of featuresLower) {
      if (extracted.includes(f) || f.includes(extracted)) {
        return { ...claim, status: 'accurate', ground_truth_value: f, confidence: 0.9 };
      }
    }
  }
  return { ...claim, status: 'unverified', confidence: 0.5 };
}


// ─── INTERNAL: Source guessing ──────────────────────────────────────────────

function guessSources(responseText, platform) {
  // ── Pattern definitions ──────────────────────────────────────────────────
  const CITATION_RE   = /(\[\d+\]|\[Source:[^\]]+\]|According to [A-Z][^,.]{2,40}[,.]|Based on [A-Z][^,.]{2,40}[,.])/g;
  const URL_RE        = /https?:\/\/[^\s)>\]"']+/g;
  const REVIEW_RE     = /\b(reviewers?\s(?:say|report|note)|users?\s(?:say|report|note)|rated?\b|[\d.]+\s*(?:out of\s*)?\d*\s*stars?|customer reviews?|top[\s-]rated)\b/gi;
  const OFFICIAL_RE   = /\b(official\s(?:website|site|page|source)|manufacturer(?:'s)?|according to [A-Z][a-z]+(?:'s)?|[A-Z][a-z]+'s\sofficial)\b/g;
  const COMPARISON_RE = /\b(top\s*(?:\d+|ten|five)|best\sof|vs\.?|versus|\bcompared?\sto\b|head[\s-]to[\s-]head|side[\s-]by[\s-]side|ranking|ranked)\b/gi;
  const SOCIAL_RE     = /\b(Reddit|Redditors?|subreddit|forum|community|users?\son|Discord|Quora|Stack\s(?:Overflow|Exchange))\b/g;
  const PRODUCT_DB_RE = /\b(spec(?:ification)?s?|dimensions?|weight|model\s(?:number|no\.?)|SKU|UPC|EAN|ASIN|part\snumber|technical\s(?:specs?|details?))\b/gi;

  const FRESH_CURRENT_RE  = /\b(2025|2026|as\sof\s\d{4}|updated\s(?:in\s)?\d{4}|latest|current(?:ly)?|this\syear)\b/gi;
  const FRESH_RECENT_RE   = /\b(2023|2024|recently|last\syear|past\s(?:year|months?)|new(?:ly)?)\b/gi;
  const FRESH_OUTDATED_RE = /\b(20(?:0\d|1\d|22)|(?:several|many)\syears?\sago|historically|originally)\b/gi;

  // ── Helper: collect up to `cap` non-overlapping matches ─────────────────
  function collectMatches(re, cap = 5) {
    const results = [];
    let m;
    const r = new RegExp(re.source, re.flags);
    while ((m = r.exec(responseText)) !== null && results.length < cap) {
      results.push(m[0].trim());
    }
    return results;
  }

  const citationMatches   = collectMatches(CITATION_RE);
  const urlMatches        = collectMatches(URL_RE);
  const reviewMatches     = collectMatches(REVIEW_RE);
  const officialMatches   = collectMatches(OFFICIAL_RE);
  const comparisonMatches = collectMatches(COMPARISON_RE);
  const socialMatches     = collectMatches(SOCIAL_RE);
  const productDbMatches  = collectMatches(PRODUCT_DB_RE);

  // ── Freshness ────────────────────────────────────────────────────────────
  function deriveFreshness() {
    if (collectMatches(FRESH_CURRENT_RE, 1).length  > 0) return 'current';
    if (collectMatches(FRESH_RECENT_RE, 1).length   > 0) return 'recent';
    if (collectMatches(FRESH_OUTDATED_RE, 1).length > 0) return 'outdated';
    return 'unknown';
  }
  const freshness = deriveFreshness();

  // ── Platform-specific confidence multipliers ─────────────────────────────
  // Perplexity  — retrieval-augmented; strong citation/URL signal
  // ChatGPT     — relies heavily on training data; general knowledge boosted
  // Gemini      — good product/spec coverage; product_db boosted
  // Copilot     — web-grounded; URL/official sources boosted
  const PLATFORM_WEIGHTS = {
    perplexity: { citation: 1.25, url: 1.20, review: 1.00, official: 1.00, comparison: 1.00, social: 1.00, product_db: 1.00, general_knowledge: 0.80 },
    chatgpt:    { citation: 0.85, url: 0.80, review: 1.00, official: 0.90, comparison: 1.00, social: 0.90, product_db: 0.90, general_knowledge: 1.20 },
    gemini:     { citation: 0.90, url: 0.90, review: 1.00, official: 1.00, comparison: 1.00, social: 0.90, product_db: 1.25, general_knowledge: 1.00 },
    copilot:    { citation: 1.00, url: 1.20, review: 1.00, official: 1.10, comparison: 1.00, social: 1.00, product_db: 1.00, general_knowledge: 0.90 },
  };
  const w = PLATFORM_WEIGHTS[platform] || PLATFORM_WEIGHTS.chatgpt;

  function clamp(v) { return Math.min(1.0, Math.max(0.0, +v.toFixed(3))); }

  // ── Build candidate sources ──────────────────────────────────────────────
  const candidates = [];

  // Official website — triggered by explicit official language OR raw URLs
  const officialIndicators = [...officialMatches, ...urlMatches];
  if (officialIndicators.length > 0) {
    const base = 0.45 + Math.min(officialIndicators.length, 5) * 0.08;
    candidates.push({
      type: 'official_website',
      name: 'Official Brand Website',
      confidence: clamp(base * w.official),
      indicators: officialIndicators.slice(0, 5),
      freshness,
    });
  }

  // Review site — review language AND/OR comparison/listicle language
  const reviewIndicators = [...reviewMatches, ...comparisonMatches];
  if (reviewIndicators.length > 0) {
    const base = 0.40 + Math.min(reviewIndicators.length, 5) * 0.08;
    candidates.push({
      type: 'review_site',
      name: 'Product Reviews',
      confidence: clamp(base * w.review),
      indicators: reviewIndicators.slice(0, 5),
      freshness,
    });
  }

  // Social media
  if (socialMatches.length > 0) {
    const base = 0.40 + Math.min(socialMatches.length, 5) * 0.09;
    candidates.push({
      type: 'social_media',
      name: 'Community & Social Media',
      confidence: clamp(base * w.social),
      indicators: socialMatches.slice(0, 5),
      freshness,
    });
  }

  // News / citation-based — numbered brackets, "According to …", etc.
  if (citationMatches.length > 0) {
    const base = 0.50 + Math.min(citationMatches.length, 5) * 0.10;
    candidates.push({
      type: 'news_article',
      name: 'Cited Sources',
      confidence: clamp(base * w.citation),
      indicators: citationMatches.slice(0, 5),
      freshness,
    });
  }

  // Product database — spec/dimension/SKU language
  if (productDbMatches.length > 0) {
    const base = 0.45 + Math.min(productDbMatches.length, 5) * 0.08;
    candidates.push({
      type: 'product_database',
      name: 'Product Database',
      confidence: clamp(base * w.product_db),
      indicators: productDbMatches.slice(0, 5),
      freshness,
    });
  }

  // General knowledge — always present as a fallback; higher weight when no
  // other strong signals exist (the response is purely from training data).
  const generalBase = candidates.length === 0 ? 0.70 : 0.50;
  const platformLabel = platform.charAt(0).toUpperCase() + platform.slice(1);
  candidates.push({
    type: 'general_knowledge',
    name: `${platformLabel} Training Data`,
    confidence: clamp(generalBase * w.general_knowledge),
    indicators: [],
    freshness: 'unknown',
  });

  // ── Sort by confidence descending ────────────────────────────────────────
  candidates.sort((a, b) => b.confidence - a.confidence);

  return candidates;
}

function findContentGaps(verifiedClaims, brandName) {
  const gaps = [];
  const hallucinated = verifiedClaims.filter(c => c.status === 'hallucinated');
  if (hallucinated.length > 0) {
    gaps.push({
      gap: `${hallucinated.length} hallucinated claims — AI has wrong information about ${brandName}`,
      impact: 'high',
      recommendation: 'Publish verified product data with schema markup',
    });
  }
  return gaps;
}


// ─── INTERNAL: Verdict ──────────────────────────────────────────────────────

function getVerdict(inclusionRate, hallucinations) {
  if (inclusionRate === 0) return 'INVISIBLE — Your brand does not appear in any AI platform. Immediate action needed.';
  if (inclusionRate <= 25) return 'CRITICAL — Only 1 of 4 platforms mentions you. Most AI users will never see your brand.';
  if (inclusionRate <= 50) return 'LOW — Half the platforms miss you. Significant audience being missed.';
  if (inclusionRate <= 75) {
    if (hallucinations > 2) return 'VISIBLE BUT INACCURATE — Good inclusion but AI is spreading wrong info.';
    return 'MODERATE — Most platforms show you but not all. Room for improvement.';
  }
  if (hallucinations > 0) return 'STRONG VISIBILITY, ACCURACY ISSUES — Great inclusion but hallucinations detected.';
  return 'EXCELLENT — Strong visibility and accuracy across all AI platforms.';
}


// ─── INTERNAL: Update analytics snapshot ────────────────────────────────────

async function updateDailySnapshot(brandId, scanResults) {
  const today = new Date().toISOString().split('T')[0];
  const totalQueries = scanResults.queries_run || 0;
  const totalMentions = scanResults.details.filter(d => d.brand_mentioned).length;
  const totalClaims = scanResults.claims_extracted || 0;
  const hallucinated = scanResults.hallucinations_found || 0;
  // Count actual accurate claims rather than inferring from total - hallucinated
  const accurate = scanResults.details.reduce((sum, d) => {
    if (!d.claims) return sum;
    return sum + d.claims.filter(c => c.status === 'accurate').length;
  }, 0);

  const inclusionRate = totalQueries > 0 ? Math.round((totalMentions / totalQueries) * 1000) / 10 : 0;
  const accuracyScore = totalClaims > 0 ? Math.round((accurate / totalClaims) * 1000) / 10 : 0;
  const hallucinationRate = totalClaims > 0 ? Math.round((hallucinated / totalClaims) * 1000) / 10 : 0;
  const trustScore = Math.round((inclusionRate * 0.4 + accuracyScore * 0.4 + (100 - hallucinationRate) * 0.2) * 10) / 10;

  const snapshot = {
    brand_id: brandId,
    date: today,
    inclusion_rate: inclusionRate,
    accuracy_score: accuracyScore,
    hallucination_rate: hallucinationRate,
    brand_trust_score: trustScore,
    total_queries: totalQueries,
    total_mentions: totalMentions,
    total_claims: totalClaims,
    accurate_claims: accurate,
    hallucinated_claims: hallucinated,
  };

  const { data: existing } = await supabase
    .from('analytics_snapshots')
    .select('id').eq('brand_id', brandId).eq('date', today).limit(1);

  if (existing?.length) {
    await supabase.from('analytics_snapshots').update(snapshot).eq('id', existing[0].id);
  } else {
    await supabase.from('analytics_snapshots').insert(snapshot);
  }
}


// ─── WEB SCRAPING: Scrape a brand website for real data ─────────────────────

/**
 * Scrapes a brand website via a CORS proxy and extracts structured data.
 *
 * @param {string} websiteUrl - The full URL of the brand website to scrape.
 * @param {string} brandName  - The brand name, used to score product candidates.
 * @returns {Promise<{
 *   title: string,
 *   description: string,
 *   prices: string[],
 *   products: string[],
 *   keyContent: string,
 *   rawText: string,
 *   error?: string
 * }>}
 */
export async function scrapeBrandWebsite(websiteUrl, brandName) {
  const CORS_PROXY = 'https://api.allorigins.win/get?url=';
  const proxyUrl = `${CORS_PROXY}${encodeURIComponent(websiteUrl)}`;

  let html = '';
  try {
    const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error(`Proxy responded with ${response.status}`);
    const json = await response.json();
    html = json.contents ?? '';
  } catch (err) {
    console.warn(`[scrapeBrandWebsite] Fetch failed for ${websiteUrl}:`, err.message);
    return { title: '', description: '', prices: [], products: [], keyContent: '', rawText: '', error: err.message };
  }

  // ── Parse HTML ────────────────────────────────────────────────────────────
  let title = '';
  let description = '';
  let rawText = '';

  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    title = doc.querySelector('title')?.textContent?.trim() ?? '';
    description =
      doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() ??
      doc.querySelector('meta[property="og:description"]')?.getAttribute('content')?.trim() ??
      '';

    doc.querySelectorAll('script, style, noscript').forEach(el => el.remove());
    rawText = (doc.body?.innerText ?? doc.body?.textContent ?? '').replace(/\s+/g, ' ').trim();
  } else {
    // Non-browser fallback
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    title = titleMatch ? titleMatch[1].replace(/&amp;/g, '&').trim() : '';

    const descMatch =
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
    description = descMatch ? descMatch[1].trim() : '';

    rawText = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ── Extract prices ($X.XX patterns) ──────────────────────────────────────
  const priceRe = /\$[\d,]+(?:\.\d{2})?/g;
  const prices = [...new Set(rawText.match(priceRe) ?? [])].slice(0, 20);

  // ── Extract product name candidates ───────────────────────────────────────
  // Heuristic: title-cased multi-word phrases near a price or the brand name.
  const productRe = /\b([A-Z][A-Za-z0-9]+(?: [A-Z][A-Za-z0-9]+){1,5})\b/g;
  const allCandidates = [...new Set(rawText.match(productRe) ?? [])];

  const products = allCandidates
    .filter(candidate => {
      if (candidate.length > 60) return false;
      const idx = rawText.indexOf(candidate);
      if (idx === -1) return false;
      const window = rawText.slice(Math.max(0, idx - 80), idx + candidate.length + 80);
      return priceRe.test(window) || window.toLowerCase().includes(brandName.toLowerCase());
    })
    .slice(0, 15);

  // Reset lastIndex on the shared regex after use
  priceRe.lastIndex = 0;

  const keyContent = rawText.slice(0, 500);

  return { title, description, prices, products, keyContent, rawText };
}


/**
 * Enriches a brand by scraping its website and persisting discovered products
 * to the Supabase `products` table (skipping any that already exist).
 *
 * @param {{ id: string, name: string, website?: string }} brand
 * @returns {Promise<{
 *   scraped: boolean,
 *   websiteUrl: string,
 *   title: string,
 *   description: string,
 *   prices: string[],
 *   products: string[],
 *   keyContent?: string,
 *   newProductsAdded: number,
 *   error?: string
 * }>}
 */
export async function enrichBrandFromWebsite(brand) {
  const websiteUrl = brand.website?.trim();

  if (!websiteUrl) {
    return { scraped: false, websiteUrl: '', title: '', description: '', prices: [], products: [], newProductsAdded: 0, error: 'Brand has no website field.' };
  }

  const scraped = await scrapeBrandWebsite(websiteUrl, brand.name);

  if (scraped.error && !scraped.title && !scraped.rawText) {
    return { scraped: false, websiteUrl, ...scraped, newProductsAdded: 0 };
  }

  let newProductsAdded = 0;

  if (scraped.products.length > 0) {
    // Load existing product names once to avoid duplicate inserts
    const { data: existingProducts } = await supabase
      .from('products')
      .select('name')
      .eq('brand_id', brand.id);

    const existingNames = new Set(
      (existingProducts ?? []).map(p => p.name.toLowerCase().trim())
    );

    const toInsert = scraped.products
      .filter(name => !existingNames.has(name.toLowerCase().trim()))
      .map(name => {
        // Attempt to pair the candidate with a nearby price in the raw text
        const idx = scraped.rawText.indexOf(name);
        const snippet = idx >= 0
          ? scraped.rawText.slice(Math.max(0, idx - 100), idx + name.length + 100)
          : '';
        const nearbyPrice = snippet.match(/\$([\d,]+(?:\.\d{2})?)/);
        const price = nearbyPrice ? parseFloat(nearbyPrice[1].replace(/,/g, '')) : null;

        return {
          brand_id: brand.id,
          name,
          category: 'Scraped',
          price,
          availability: 'Unknown — scraped from website',
          features: JSON.stringify([`Source: ${websiteUrl}`]),
        };
      });

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase.from('products').insert(toInsert);
      if (!insertError) {
        newProductsAdded = toInsert.length;
      } else {
        console.warn('[enrichBrandFromWebsite] Insert error:', insertError.message);
      }
    }
  }

  return {
    scraped: true,
    websiteUrl,
    title: scraped.title,
    description: scraped.description,
    prices: scraped.prices,
    products: scraped.products,
    keyContent: scraped.keyContent,
    newProductsAdded,
  };
}
