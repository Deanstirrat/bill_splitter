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

### Allocation rules
- Tax and tip are always allocated **proportionally** based on each person’s subtotal.
- The additional fee is allocated **evenly** or **proportionally** based on the user’s choice.

### Rounding and reconciliation
- Rounding happens **per person**.
- If the calculated total does not match the user-provided actual total, the **difference is displayed** for reconciliation.
