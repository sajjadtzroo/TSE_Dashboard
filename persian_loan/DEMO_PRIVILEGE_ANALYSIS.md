# Privilege Analysis Demo Guide

## Quick Demo Steps

### 1. Navigate to Loan Optimizer
Open browser and go to: `http://localhost:5174/loan-optimizer`

### 2. Enter Basic Parameters

**Required Fields:**
- مبلغ سپرده (Deposit Amount): `100,000,000` تومان
- مدت سپرده (Deposit Duration): `3` ماه
- مبلغ وام مورد نیاز (Loan Amount Needed): `50,000,000` تومان

**Discount Rate Method:**
- Select: `CAPM (مدل قیمت‌گذاری دارایی سرمایه‌ای)`

**Risk Tolerance:**
- Select: `متوسط (متعادل)` (Medium)

### 3. Enable Privilege Analysis

**Check the box:**
- ☑ تحلیل خرید امتیاز (Privilege Purchase)

**Optional: Enter Privilege Price:**
- قیمت پیشنهادی خرید امتیاز: `5,000,000` تومان (optional)
- Leave empty to only see break-even calculations

### 4. Calculate

Click: **محاسبه و مقایسه همه وام‌ها**

## Expected Results

### A. Summary Cards (Top of Page)

You should see 4 cards:

1. **بهترین NPV** (Best NPV)
   - Shows loan with highest net present value
   - Example: "بانک ملت - وام تسهیلات ویژه"

2. **بهترین IRR** (Best IRR)
   - Shows loan with highest internal rate of return
   - Percentage displayed

3. **کمترین هزینه کل** (Lowest Total Cost)
   - Shows loan with minimum total cost
   - Amount in Toman

4. **بهترین معامله کلی** (Best Overall Deal) 🆕
   - Shows best recommendation considering all scenarios
   - "خرید امتیاز" or "منتظر بمانید" or "مذاکره کنید"

### B. Top 5 Detailed Analysis Section 🆕

**Section Title:** تحلیل جزئی ۵ وام برتر

Each loan shows:
- Bank and loan name
- NPV and recommendation summary
- Click to expand for full scenario analysis

**Expanded View Shows:**

1. **Scenario Grid (3 columns):**
   - انتظار X ماهه (Wait X months)
     - NPV value
     - ✓ سودآور or ✗ زیان‌ده

   - خرید امتیاز (Buy Privilege) - if price entered
     - NPV value
     - ✓ سودآور or ✗ زیان‌ده

   - سرمایه‌گذاری جایگزین (Alternative Investment)
     - NPV = 0 (baseline)
     - — مبنا

2. **Key Metrics:**
   - قیمت سر‌به‌سر امتیاز: ~7-18M Toman
   - حداکثر انتظار: ~2-5 months
   - قسط ماهانه: Monthly payment
   - نرخ بهره: Interest rate

3. **Alternatives (if deal is unprofitable):**
   - کاهش انتظار به X ماه
   - دریافت Y تومان (نسبت ۱.۵ برابر)
   - افزایش بازپرداخت به ۲۴ ماه

4. **Python Code Snippet:**
   - Expandable code block
   - Copy-paste ready
   - Shows exact parameters used

### C. Results Table

**New Columns Added:** 🆕

1. **قیمت سر‌به‌سر امتیاز** (Break-even Privilege Price)
   - Amount in millions (م)
   - Subtitle: "حداکثر قیمت خرید"
   - Sortable

2. **حداکثر انتظار** (Maximum Wait Time)
   - Months with one decimal
   - Green ✓ if current wait is acceptable
   - Red ✗ if current wait exceeds maximum
   - Sortable

3. **توصیه** (Recommendation)
   - Colored badge:
     - 🔵 Blue: منتظر بمانید (WAIT)
     - 🟢 Green: خرید امتیاز (BUY_PRIVILEGE)
     - 🟡 Yellow: مذاکره کنید (NEGOTIATE)
     - 🔴 Red: رد کنید (REJECT)
   - Reasoning text below
   - Sortable

## Test Scenarios

### Scenario 1: Short Wait, High Leverage (Profitable)

**Inputs:**
- Deposit: 50M
- Wait: 2 months
- Loan needed: 50M
- Risk: Medium

**Expected Results:**
- Most loans show "منتظر بمانید" (WAIT)
- Break-even prices: 15-25M range
- Max wait times: 4-6 months
- Positive NPV values

### Scenario 2: Long Wait, Small Loan (Unprofitable)

**Inputs:**
- Deposit: 100M
- Wait: 6 months
- Loan needed: 50M
- Risk: Medium

**Expected Results:**
- Many loans show "رد کنید" (REJECT)
- Break-even prices: 0 or negative
- Max wait times: 1-3 months (red ✗)
- Alternatives suggested

### Scenario 3: With Privilege Price (Comparison)

**Inputs:**
- Deposit: 100M
- Wait: 3 months
- Loan needed: 80M
- Privilege price: 5M
- Risk: Medium

**Expected Results:**
- Some loans show "خرید امتیاز" (BUY_PRIVILEGE)
- Scenario comparison shows all 3 options
- Clear NPV difference between Wait and Buy
- Recommendation based on best scenario

## Visual Indicators

### Color Coding

**Table:**
- 🟢 Green text: Positive NPV, can afford wait
- 🔴 Red text: Negative NPV, cannot afford wait
- 🔵 Blue badge: WAIT recommendation
- 🟢 Green badge: BUY_PRIVILEGE recommendation
- 🟡 Yellow badge: NEGOTIATE recommendation
- 🔴 Red badge: REJECT recommendation

**Scenario Cards:**
- Green border: ✓ سودآور (Profitable)
- Red border: ✗ زیان‌ده (Unprofitable)
- Gray border: — مبنا (Baseline)

### Icons Used

- ✓ Checkmark: Acceptable/Profitable
- ✗ Cross: Unacceptable/Unprofitable
- • Bullet: Alternative suggestion
- 💡 Lightbulb: Alternatives section
- ▶ Arrow: Expandable details

## Interaction Features

### Sortable Columns
Click any column header to sort:
- First click: Descending
- Second click: Ascending
- Arrow indicator shows current sort

### Expandable Scenarios
- Click row to expand/collapse
- "نمایش همه" / "بستن همه" button
- Smooth animation

### Python Code
- Click "کد پایتون برای تحلیل این وام" to expand
- Code is formatted and ready to copy
- Shows actual parameters used

## Performance Notes

### Expected Load Times
- Initial calculation: 1-2 seconds for ~72 loans
- Expanding scenarios: Instant
- Sorting table: Instant
- Toggling privilege analysis: <500ms

### Browser Compatibility
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile: Responsive design works

## Troubleshooting

### No Results Showing
- Check if loans loaded (network tab)
- Verify parameters are valid
- Try different loan amount needed

### Privilege Analysis Not Visible
- Ensure checkbox is checked
- Scroll to "تحلیل جزئی ۵ وام برتر" section
- Check that at least one loan has positive NPV

### Table Too Wide
- Use horizontal scroll
- Zoom out browser (Ctrl/Cmd -)
- Use full screen mode

## Sample Data to Expect

### Typical Break-Even Prices
- High leverage (1.5x): 15-25M Toman
- Standard (1x): 5-15M Toman
- Low amount: 0-5M Toman

### Typical Max Wait Times
- Good deals: 4-8 months
- Average deals: 2-4 months
- Poor deals: 0-2 months

### Recommendation Distribution
For 72 loans with medium risk:
- ~30% WAIT (blue)
- ~10% BUY_PRIVILEGE (green) - if price provided
- ~20% NEGOTIATE (yellow)
- ~40% REJECT (red)

## Advanced Features

### Custom Discount Rate
Instead of CAPM, select "نرخ دلخواه" and enter:
- 30% for conservative analysis
- 45% for standard analysis (CAPM equivalent)
- 60% for aggressive opportunity cost

### Risk Tolerance Impact
- Low (کم): Lower CAPM rate (~35%)
- Medium (متوسط): Standard CAPM rate (~45%)
- High (زیاد): Higher CAPM rate (~55%)

## Testing Checklist

- [ ] Toggle privilege analysis checkbox
- [ ] Enter privilege price
- [ ] Calculate and see 4 summary cards
- [ ] Expand top 5 scenarios
- [ ] See 3 scenarios per loan
- [ ] Check alternatives for unprofitable loans
- [ ] View Python code snippet
- [ ] Sort by break-even price
- [ ] Sort by max wait time
- [ ] Sort by recommendation
- [ ] See colored badges
- [ ] See green/red indicators

## Screenshots to Take

1. Full page with results
2. Summary cards with 4th card highlighted
3. Expanded scenario comparison
4. Results table with new columns
5. Alternatives section (if visible)
6. Python code expanded
7. Different recommendation badges

## Live Demo Script

**"Let me show you the new Privilege Analysis feature..."**

1. "First, we enter our loan parameters - 100M deposit, 3 month wait, need 50M loan"
2. "Now I enable the Privilege Analysis checkbox"
3. "Let's say the market is offering privilege for 5M - I'll enter that"
4. "Click calculate... and in 2 seconds we have results for all 72 loans!"
5. "See the new 4th card? It shows the best overall deal considering all scenarios"
6. "Here's the Top 5 analysis - let's expand this first loan..."
7. "We see 3 scenarios: Wait 3 months, Buy for 5M, or Invest elsewhere"
8. "The Wait scenario shows NPV of -2.3M - unprofitable!"
9. "But buying privilege for 5M shows +2.1M NPV - profitable!"
10. "The break-even price is 7.16M, so 5M is a good deal"
11. "Here are alternatives if we don't want to buy: reduce wait to 2 months, or get 1.5x leverage"
12. "And here's Python code to verify the calculations independently"
13. "Now look at the table - new columns show break-even price, max wait time, and recommendation"
14. "This loan shows 'خرید امتیاز' in green - clear action to take"
15. "Let's sort by recommendation to see all the BUY opportunities..."

**Done! Professional-grade financial analysis at your fingertips.**
