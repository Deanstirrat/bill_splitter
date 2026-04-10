const express = require("express");
const path = require("path");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

const anthropic = new Anthropic.default();

const EXTRACTION_PROMPT = `Extract all line items, tax, tip, fees, and totals from this receipt. Return ONLY valid JSON with this exact shape:
{
  "merchant": "string or null",
  "items": [{ "name": "string", "price": number, "quantity": number }],
  "subtotal": number or null,
  "tax": number or null,
  "tip": number or null,
  "fees": number or null,
  "total": number or null
}
Prices should be plain numbers (e.g. 6.00, not "$6.00"). If a field is not present, use null. Each item's quantity defaults to 1 if not specified.`;

app.post("/api/parse-receipt", async (req, res) => {
  try {
    const { type, url, image } = req.body;

    let messages;

    if (type === "url") {
      const response = await fetch(url);
      const html = await response.text();
      messages = [
        {
          role: "user",
          content: `Here is the HTML of a receipt page. ${EXTRACTION_PROMPT}\n\n${html}`,
        },
      ];
    } else if (type === "image") {
      const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
      if (!match) {
        return res.status(400).json({ error: "Invalid image data" });
      }
      messages = [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: match[1],
                data: match[2],
              },
            },
            { type: "text", text: EXTRACTION_PROMPT },
          ],
        },
      ];
    } else {
      return res.status(400).json({ error: 'type must be "url" or "image"' });
    }

    const result = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages,
    });

    const text = result.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: "Failed to extract structured data" });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    res.json(parsed);
  } catch (err) {
    console.error("Parse receipt error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
