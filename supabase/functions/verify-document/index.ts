import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const DOCUMENT_DESCRIPTIONS: Record<string, string> = {
  drivers_license:
    "A driver's license or driving permit card. It typically has a photo, name, license number, date of birth, vehicle class/category, and expiry date. May be from Namibia or another country.",
  id_document:
    "A national ID card or passport. It typically has a photo, full name, ID/passport number, date of birth, nationality, and may have a barcode or chip. May be a Namibian ID or passport.",
  pdp:
    "A Professional Driving Permit (PDP). It is an official permit card or certificate that authorizes professional/commercial driving. It may reference vehicle categories and has an expiry date.",
  police_clearance:
    "A Police Clearance Certificate. It is an official letter or certificate from a police department or government agency stating that a person has no criminal record. It has stamps, signatures, and official letterhead.",
  reference_letter:
    "A reference letter or recommendation letter. It is a formal letter from a previous employer or professional contact vouching for the person. Written on letterhead or signed by the referee.",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function downloadAndEncode(supabase: any, path: string) {
  const { data, error } = await supabase.storage
    .from("driver_documents")
    .download(path);

  if (error || !data) {
    throw new Error(`Could not download file: ${error?.message || "unknown error"}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function buildDocOnlyPrompt(expectedType: string, expectedDescription: string): string {
  return `You are a document verification system. Analyze this uploaded document image.

The user claims this is: "${expectedType.replace(/_/g, " ")}"

Expected document description: ${expectedDescription}

Analyze the image and respond in EXACTLY this JSON format (no other text):
{
  "isMatch": true/false,
  "confidence": "high"/"medium"/"low",
  "detectedType": "what you think this document actually is",
  "details": "brief explanation of why you think this is or isn't the claimed document type",
  "isReadable": true/false,
  "issues": ["list of any issues like blurry, cropped, obscured, etc."]
}

Be strict but fair:
- If the document is clearly the claimed type, isMatch = true
- If it's a completely different document, isMatch = false
- If the image is too blurry or cropped to determine, set confidence = "low" and note in issues
- A random photo or selfie should NOT match any document type`;
}

function buildSelfieVerificationPrompt(expectedType: string, expectedDescription: string): string {
  return `You are a document verification system. You are given two images:
1. The first image is the original document
2. The second image is a selfie of a person holding what should be the same document

Perform TWO verifications:

DOCUMENT VERIFICATION - Check the first image:
- Is it the claimed document type: "${expectedType.replace(/_/g, " ")}"?
- Expected: ${expectedDescription}

SELFIE VERIFICATION - Check the second image:
- Is a human face clearly visible?
- Is a document visible being held in the person's hand?
- Does the document in the selfie appear to plausibly match the first document image?

Respond in EXACTLY this JSON format (no other text):
{
  "documentVerification": {
    "isMatch": true/false,
    "confidence": "high"/"medium"/"low",
    "detectedType": "what you think this document actually is",
    "details": "brief explanation",
    "isReadable": true/false,
    "issues": []
  },
  "selfieVerification": {
    "faceVisible": true/false,
    "documentInHand": true/false,
    "matchesUploadedDoc": true/false,
    "confidence": "high"/"medium"/"low",
    "issues": []
  }
}

Be strict but fair. A person must clearly be holding a document that looks like the uploaded one.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { storagePath, expectedType, documentId, selfieStoragePath } = await req.json();

    if (!storagePath || !expectedType) {
      return new Response(
        JSON.stringify({ error: "storagePath and expectedType are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Download document
    const docBase64 = await downloadAndEncode(supabase, storagePath);
    const isPdf = storagePath.toLowerCase().endsWith(".pdf");
    const docMediaType = isPdf ? "application/pdf" : "image/jpeg";
    const expectedDescription = DOCUMENT_DESCRIPTIONS[expectedType] || `A ${expectedType.replace(/_/g, " ")} document.`;

    // Build message content
    const hasSelfie = !!selfieStoragePath;
    const messageContent: any[] = [
      {
        type: isPdf ? "document" : "image",
        source: { type: "base64", media_type: docMediaType, data: docBase64 },
      },
    ];

    // If selfie provided, add it as second image
    if (hasSelfie) {
      const selfieBase64 = await downloadAndEncode(supabase, selfieStoragePath);
      messageContent.push({
        type: "image",
        source: { type: "base64", media_type: "image/jpeg", data: selfieBase64 },
      });
    }

    // Add prompt
    messageContent.push({
      type: "text",
      text: hasSelfie
        ? buildSelfieVerificationPrompt(expectedType, expectedDescription)
        : buildDocOnlyPrompt(expectedType, expectedDescription),
    });

    // Call Claude Vision API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        messages: [{ role: "user", content: messageContent }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(
        JSON.stringify({ error: "Claude API error", details: errText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const claudeResponse = await response.json();
    const textContent = claudeResponse.content?.[0]?.text || "";

    // Parse the JSON response from Claude
    let result: any;
    try {
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "Could not parse AI response" };
    } catch {
      result = { error: "Could not parse AI response", raw: textContent };
    }

    // Write AI results back to database
    if (documentId && !result.error) {
      await supabase
        .from("driver_documents")
        .update({
          ai_verification_result: result,
          ai_verified_at: new Date().toISOString(),
        })
        .eq("id", documentId)
        .catch(() => {}); // Non-critical: don't fail the response if DB write fails
    }

    return new Response(
      JSON.stringify({
        documentId,
        expectedType,
        hasSelfie,
        ...result,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal error", details: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
