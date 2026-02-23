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

serve(async (req) => {
  // Handle CORS preflight
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

    const { storagePath, expectedType, documentId } = await req.json();

    if (!storagePath || !expectedType) {
      return new Response(
        JSON.stringify({ error: "storagePath and expectedType are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Download the document from Supabase Storage
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("driver_documents")
      .download(storagePath);

    if (downloadError || !fileData) {
      return new Response(
        JSON.stringify({ error: "Could not download document", details: downloadError?.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if it's a PDF - we can still analyze the first page
    const isPdf = storagePath.toLowerCase().endsWith(".pdf");

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    const mediaType = isPdf ? "application/pdf" : "image/jpeg";
    const expectedDescription = DOCUMENT_DESCRIPTIONS[expectedType] || `A ${expectedType.replace(/_/g, " ")} document.`;

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
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: [
              {
                type: isPdf ? "document" : "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64,
                },
              },
              {
                type: "text",
                text: `You are a document verification system. Analyze this uploaded document image.

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
- A random photo or selfie should NOT match any document type`,
              },
            ],
          },
        ],
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
    let result;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "Could not parse AI response" };
    } catch {
      result = { error: "Could not parse AI response", raw: textContent };
    }

    return new Response(
      JSON.stringify({
        documentId,
        expectedType,
        ...result,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal error", details: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
