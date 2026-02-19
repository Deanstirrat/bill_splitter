# bill_splitter

## Bill splitting spec

### Model

**Bill**
- **name** (optional): defaults to "bill 1", "bill 2", etc.
- **people**: list of people
- **tax rate** (optional): percentage
- **tax amount** (optional): number
- **tip rate** (optional): percentage
- **tip amount** (optional): number
- **subtotal**: number
- **additional fee** (optional): number
- **additional fee allocation**: `even` or `proportional`
- **total**: calculated value
- **actual total** (optional): number used to compare against calculated total

**Person**
- **name** (optional): string
- **items**: list of items
- **subtotal**: calculated value
- **tax**: calculated value
- **tip**: calculated value
- **total**: calculated value

**Item**
- **name** (optional): string
- **price** (required): number

### OCR staging and mapping
- OCR extraction lives in a **staging area** before it affects the live bill: `state.ocr.items` holds line items and `state.ocr.summary` holds totals (`tax`, `tip`, `fee`, `total`).
- **Line item mapping:** each OCR line item maps to `Item { name, price }` where `name` is optional and `price` is required.
- **Totals mapping:** OCR summary fields map into `state.bill.tax`, `state.bill.tip`, `state.bill.fee`, and `state.bill.actualTotal`.
- **Unassigned items:** approved OCR items are added to a temporary **"Unassigned"** person so they can be reassigned later without overwriting existing people/items.
- **Apply behavior:** when the user confirms, approved OCR items are appended to `state.people[].items`, existing items remain untouched, and totals are recalculated (summary + per-person).

### Allocation rules
- Tax and tip are always allocated **proportionally** based on each person’s subtotal.
- The additional fee is allocated **evenly** or **proportionally** based on the user’s choice.

### Rounding and reconciliation
- Rounding happens **per person**.
- If the calculated total does not match the user-provided actual total, the **difference is displayed** for reconciliation.

---

## OCR provider comparison (receipts)

**Scope:** Receipt OCR focused on itemized line extraction, totals/tax/tip detection, structured output, confidence scoring, geometry for UI mapping, latency, and cost.

### Validation summary (sample receipts)

**Status:** Pending automated validation. This repo does not include sample receipt images or provider credentials, so run results are not recorded yet. Use the template below once sample images and API keys are available.

**Sample set (suggested):**
- 3–5 receipts with varied layouts (restaurant with tip, grocery with tax, long multi-column receipt).
- Include skewed/low-light images to test robustness.

| Provider | Line item detection rate (name + price) | Totals/tax/tip accuracy | Line boxes | Token boxes | Notes |
| --- | --- | --- | --- | --- | --- |
| Google Vision (Document/Text) | TBD | TBD | Yes (lines) | Yes (tokens) | Strong text detection and geometry. |
| Azure Document Intelligence (Receipt/General) | TBD | TBD | Yes (lines) | Yes (tokens) | Structured receipts with fields + geometry. |
| Tesseract (open source) | TBD | TBD | Limited (word/line via TSV) | Yes (word-level) | Requires layout heuristics for structured receipts. |

### Comparison matrix (operational + qualitative)

| Dimension | Google Vision | Azure Document Intelligence | Tesseract |
| --- | --- | --- | --- |
| Line-item extraction accuracy | High on clean receipts; needs parsing rules for item/price pairing | High with prebuilt receipt model | Moderate; sensitive to skew/noise |
| Totals/tax/tip detection | Good with keyword parsing; may need heuristics | Strong with prebuilt fields | Heuristic-only; lower reliability |
| Receipt-structured output | Lines/tokens only; structure built in app | Prebuilt Receipt fields + line items | None; structure built in app |
| Confidence scores | Per block/word/symbol | Per field + text | Per word/line (TSV) |
| Bounding boxes/line coords | Words + blocks; lines inferred | Words/lines + polygons | Word boxes; line grouping via TSV |
| Latency | Low–medium (API) | Low–medium (API) | Local, fastest after setup |
| Cost | Per image/page | Per page (model tiered) | Free (infra only) |

### Preferred provider + fallback

**Preferred:** Azure Document Intelligence (Receipt model) for structured fields (line items, totals, tax, tip) and strong geometry.  
**Fallback:** Google Vision for robust text extraction and geometry when receipt model fails or receipt types are non-standard.  
**Ensemble option:** Run Azure first; if totals/line items missing or low confidence, fall back to Google Vision and apply line-item parser heuristics.

---

## Expected OCR JSON structure to ingest

This is the normalized payload the app should ingest after provider-specific parsing:

```json
{
  "vendor": "azure|google|tesseract",
  "currency": "USD",
  "totals": {
    "subtotal": { "value": 42.5, "confidence": 0.98, "bbox": [x1, y1, x2, y2] },
    "tax": { "value": 3.4, "confidence": 0.96, "bbox": [x1, y1, x2, y2] },
    "tip": { "value": 8.5, "confidence": 0.93, "bbox": [x1, y1, x2, y2] },
    "total": { "value": 54.4, "confidence": 0.99, "bbox": [x1, y1, x2, y2] }
  },
  "lineItems": [
    {
      "name": { "text": "Burger", "confidence": 0.98, "bbox": [x1, y1, x2, y2] },
      "price": { "value": 12.5, "confidence": 0.97, "bbox": [x1, y1, x2, y2] },
      "tokens": [
        { "text": "Burger", "confidence": 0.98, "bbox": [x1, y1, x2, y2] },
        { "text": "12.50", "confidence": 0.97, "bbox": [x1, y1, x2, y2] }
      ]
    }
  ],
  "raw": {
    "providerResponseId": "string",
    "pages": [
      {
        "pageNumber": 1,
        "width": 0,
        "height": 0,
        "unit": "pixel"
      }
    ]
  }
}
```

**Geometry notes:** `bbox` uses `[x1, y1, x2, y2]` in pixel coordinates of the original image. Tokens are optional but recommended for UI mapping.

---

## OCR integration points (frontend + model)

### Frontend state shape (index.html)
OCR ingestion should map into the in-memory state:

- `state.bill` fields (tax, tip, total, name, etc.) for totals/tax/tip detection and bill metadata.
- `state.people[].items[]` for line items, after any item-to-person assignment workflow.

See `state` in `index.html` for current fields and defaults. The minimum required item data is `name` and `price` for `items` (matching the Item model spec above).

### Model fields required
The OCR-normalized JSON should provide:
- `totals.subtotal`, `totals.tax`, `totals.tip`, `totals.total` (numbers).
- `lineItems[].name.text` and `lineItems[].price.value` (mapped to Item name/price).

These map directly into the Bill and Item fields in the model spec above.
