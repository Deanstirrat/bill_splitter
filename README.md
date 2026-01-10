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
