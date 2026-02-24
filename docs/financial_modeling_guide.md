# Comprehensive Financial Modeling Guide
## CFA Institute Curriculum (Level I & II) + Wall Street Best Practices

---

## Table of Contents

1. [Revenue Modeling](#1-revenue-modeling)
2. [Cost Structure & Margin Analysis](#2-cost-structure--margin-analysis)
3. [Depreciation & Amortization](#3-depreciation--amortization)
4. [Working Capital Model](#4-working-capital-model)
5. [Capital Expenditure (CapEx) Model](#5-capital-expenditure-capex-model)
6. [Tax Model](#6-tax-model)
7. [Debt Schedule & Interest Modeling](#7-debt-schedule--interest-modeling)
8. [Debt Repayment Structures: Bullet, Balloon & Amortizing](#8-debt-repayment-structures-bullet-balloon--amortizing)
9. [Beta Estimation](#9-beta-estimation)
10. [CAPM & Cost of Equity](#10-capm--cost-of-equity)
11. [WACC (Weighted Average Cost of Capital)](#11-wacc-weighted-average-cost-of-capital)
12. [Free Cash Flow: FCFF & FCFE](#12-free-cash-flow-fcff--fcfe)
13. [DCF Valuation](#13-dcf-valuation)
14. [Dividend Discount Models (DDM)](#14-dividend-discount-models-ddm)
15. [Residual Income Valuation](#15-residual-income-valuation)
16. [Multiples-Based Valuation](#16-multiples-based-valuation)
17. [Sensitivity & Scenario Analysis](#17-sensitivity--scenario-analysis)
18. [Three Financial Statements Linkage](#18-three-financial-statements-linkage)
19. [Excel Model Architecture & Best Practices](#19-excel-model-architecture--best-practices)

---

## 1. Revenue Modeling

Revenue is the single most important driver in any financial model. Every line item downstream — COGS, OpEx, CapEx, Working Capital — is directly or indirectly tied to revenue assumptions.

### 1.1 Top-Down Approach

Start from the macro and narrow down:

```
Total Addressable Market (TAM)
  × Serviceable Addressable Market (SAM) %
  × Serviceable Obtainable Market (SOM) %
  × Market Share %
  = Estimated Revenue
```

**Use Cases:** Early-stage companies, market-entry analysis, macro forecasting.

### 1.2 Bottom-Up Approach (Wall Street Preferred)

Build revenue from the smallest measurable unit:

#### Volume × Price Method
```
Revenue = Units Sold × Average Selling Price (ASP)
```
- Model units and ASP separately
- Apply price inflation / escalation assumptions
- Segment by product line, geography, customer type

#### Capacity-Based Method
```
Revenue = Installed Capacity × Utilization Rate × ASP
```
- Common for manufacturing, energy, mining, airlines
- Utilization Rate typically 70-90% at steady state

#### Store / Unit Economics Method
```
Revenue = Number of Stores × Revenue per Store
```
- Same-Store Sales Growth (SSSG) for existing stores
- New Store Openings × Ramp-Up Revenue Curve
- Used for retail, restaurants, healthcare facilities

#### Subscription / SaaS Method
```
Monthly Recurring Revenue (MRR) = Active Subscribers × ARPU
Annual Recurring Revenue (ARR) = MRR × 12

Net Revenue Retention (NRR) = (Beginning ARR + Expansion - Contraction - Churn) / Beginning ARR

Revenue = Beginning ARR × NRR + New ARR from New Customers
```
- ARPU = Average Revenue Per User
- Track Gross Churn vs. Net Churn (with upsell)
- Customer Acquisition Cost (CAC) and Lifetime Value (LTV) as supporting metrics

#### Contract / Backlog Method
```
Revenue = Opening Backlog + New Orders - Cancellations
```
- Common for aerospace, defense, construction, government contractors
- Book-to-Bill Ratio = New Orders / Revenue (>1.0 is growth indicator)

### 1.3 Revenue Segmentation

A professional model segments revenue across multiple dimensions:

| Dimension | Examples |
|---|---|
| **Product/Service** | Hardware vs. Software vs. Services |
| **Geography** | North America, EMEA, APAC, LATAM |
| **Customer Type** | Enterprise vs. SMB vs. Consumer |
| **Revenue Nature** | Recurring vs. Non-Recurring vs. One-Time |
| **Pricing Effect** | Volume Effect vs. Price/Mix Effect |

### 1.4 Revenue Growth Rate Analysis

```
YoY Growth = (Revenue_t - Revenue_{t-1}) / Revenue_{t-1}

Organic Growth = Total Growth - M&A Contribution - FX Impact
```

Always decompose growth into:
- **Price Effect:** ASP changes (inflation, discounting, product mix)
- **Volume Effect:** Unit changes (market growth, share gains)
- **FX Effect:** Currency translation impact (for multinational companies)
- **M&A Effect:** Acquired revenue (non-organic)

---

## 2. Cost Structure & Margin Analysis

### 2.1 Cost of Goods Sold (COGS)

COGS includes all direct costs attributable to production:

| Component | Modeling Approach |
|---|---|
| **Direct Materials** | Cost per unit × Volume; link to commodity prices |
| **Direct Labor** | Headcount × Hours × Hourly Rate; or % of Revenue |
| **Manufacturing Overhead** | Factory depreciation, utilities, maintenance |
| **Freight / Shipping** | Cost per unit shipped or % of Revenue |
| **Packaging** | Cost per unit |
| **Warranty / Returns** | % of Revenue based on historical rates |

```
Gross Profit = Revenue - COGS
Gross Margin = Gross Profit / Revenue
```

**Key Analysis:**
- Compare Gross Margin trend over 3-5 years
- Benchmark against peers (industry median)
- Understand mix effects: higher-margin products shifting composition

### 2.2 Operating Expenses (OpEx)

#### Selling, General & Administrative (SG&A)

**Sales & Marketing:**
- Advertising & Promotion: % of Revenue (typically 2-15% depending on industry)
- Sales Commissions: % of Revenue or % of New Bookings
- Sales Headcount: Number of Reps × Average Compensation
- Customer Acquisition Cost (CAC) = Total S&M Spend / New Customers Acquired

**General & Administrative:**
- Corporate Headcount Model: Employees × Average Salary × (1 + Benefits Loading %)
- Rent / Leases: Fixed amount or per-square-foot calculation (address IFRS 16 / ASC 842 lease accounting)
- Professional Fees: Legal, audit, consulting — often semi-fixed
- Insurance: Fixed or % of Revenue / Assets
- IT & Infrastructure: % of Revenue or per-employee cost

#### Research & Development (R&D)

```
R&D Expense (Income Statement) = Total R&D Spend - Capitalized R&D
Capitalized R&D → Goes to Balance Sheet as Intangible Asset → Amortized
```

**CFA Note (IAS 38):**
- Research Phase: Always expensed
- Development Phase: Capitalized if ALL six criteria are met (technical feasibility, intention to complete, ability to use/sell, probable future economic benefits, resources available, measurable expenditure)
- US GAAP: Generally all R&D is expensed (except software development costs under ASC 985-20 / ASC 350-40)

### 2.3 Fixed vs. Variable Cost Decomposition

| Category | Fixed Costs | Variable Costs | Semi-Variable |
|---|---|---|---|
| **Examples** | Rent, Base Salaries, Insurance, Depreciation | Raw Materials, Commissions, Shipping, Direct Labor | Utilities, Maintenance, IT costs |
| **Behavior** | Constant regardless of volume | Change proportionally with volume | Fixed base + variable component |
| **Modeling** | Flat dollar amount | % of Revenue or per-unit cost | Base amount + (variable rate × volume) |

### 2.4 Operating Leverage

```
Degree of Operating Leverage (DOL) = % Change in EBIT / % Change in Revenue

Contribution Margin = Revenue - Variable Costs
Operating Breakeven = Fixed Costs / Contribution Margin per Unit
```

High operating leverage → small revenue changes cause large EBIT changes. Capital-intensive businesses (airlines, telecom, manufacturing) typically have high operating leverage.

### 2.5 Margin Waterfall

```
Revenue                          100%
- COGS                          (55%)
= Gross Profit                   45%    ← Gross Margin
- SG&A                          (15%)
- R&D                            (8%)
- Other Operating Expenses        (2%)
= EBIT                           20%    ← Operating Margin
+ D&A (add-back)                  5%
= EBITDA                         25%    ← EBITDA Margin
- Interest Expense                (3%)
- Tax Expense                     (4%)
= Net Income                     13%    ← Net Margin
```

---

## 3. Depreciation & Amortization

### 3.1 Depreciation Methods

#### Straight-Line Depreciation (Most Common in Financial Modeling)

```
Annual Depreciation = (Original Cost - Salvage Value) / Useful Life
```

Example: Machine cost $100,000, salvage $10,000, useful life 10 years:
```
Annual Dep = ($100,000 - $10,000) / 10 = $9,000/year
```

#### Declining Balance Method (Double Declining Balance — DDB)

```
Annual Depreciation = 2 × (1 / Useful Life) × Net Book Value (beginning of period)
```

Example: Asset cost $100,000, useful life 5 years:
```
Year 1: 2 × (1/5) × $100,000 = $40,000  → NBV = $60,000
Year 2: 2 × (1/5) × $60,000  = $24,000  → NBV = $36,000
Year 3: 2 × (1/5) × $36,000  = $14,400  → NBV = $21,600
Year 4: 2 × (1/5) × $21,600  = $8,640   → NBV = $12,960
Year 5: Switch to straight-line → $12,960 - Salvage
```
Note: Switch from DDB to straight-line when straight-line produces a larger charge.

#### Units of Production Method

```
Depreciation = (Original Cost - Salvage) × (Units Produced This Period / Total Estimated Units)
```
- Used for mining, oil & gas, and equipment with measurable output

#### MACRS (Modified Accelerated Cost Recovery System — US Tax)

IRS-prescribed depreciation rates by asset class:

| Property Class | Year 1 | Year 2 | Year 3 | Year 4 | Year 5 | Year 6 | Year 7 | Year 8 |
|---|---|---|---|---|---|---|---|---|
| **3-Year** | 33.33% | 44.45% | 14.81% | 7.41% | | | | |
| **5-Year** | 20.00% | 32.00% | 19.20% | 11.52% | 11.52% | 5.76% | | |
| **7-Year** | 14.29% | 24.49% | 17.49% | 12.49% | 8.93% | 8.92% | 8.93% | 4.46% |

MACRS uses Half-Year Convention (asset placed in service at midpoint of first year).

### 3.2 Depreciation Schedule Construction

Build a **vintage-year depreciation schedule:**

```
                        Year 1    Year 2    Year 3    Year 4    Year 5    Total
Existing PP&E Base       $50       $50       $50       $50       $50      $250
+ CapEx Year 1            —        $20       $20       $20       $20       $80
+ CapEx Year 2            —         —        $25       $25       $25       $75
+ CapEx Year 3            —         —         —        $30       $30       $60
+ CapEx Year 4            —         —         —         —        $35       $35
─────────────────────────────────────────────────────────────────────────────────
Total Depreciation       $50       $70       $95      $125      $160     $500
```

### 3.3 PP&E Roll-Forward

```
Ending PP&E (net) = Beginning PP&E (net) + CapEx - Depreciation - Asset Disposals / Impairments

Ending PP&E (gross) = Beginning PP&E (gross) + CapEx - Retired/Disposed Assets (at cost)
Accumulated Depreciation = Beginning Acc. Dep + Depreciation Expense - Acc. Dep of Disposed Assets
PP&E (net) = PP&E (gross) - Accumulated Depreciation
```

### 3.4 Amortization of Intangible Assets

| Intangible Asset | Treatment |
|---|---|
| **Patents** | Amortize over legal/useful life |
| **Customer Relationships** | Amortize over expected customer life |
| **Licenses** | Amortize over license term |
| **Software (Internally Developed)** | Capitalize development; amortize over useful life |
| **Goodwill** | NOT amortized; tested annually for impairment (both US GAAP and IFRS) |
| **Brand / Trademark (Indefinite)** | NOT amortized; tested annually for impairment |

**CFA Note:** Under IFRS, goodwill impairment is tested at the Cash-Generating Unit (CGU) level. Under US GAAP, at the Reporting Unit level. Goodwill is never amortized under either framework.

### 3.5 Useful Life Assumptions by Asset Type

| Asset Category | Typical Useful Life |
|---|---|
| Buildings | 20–40 years |
| Machinery & Equipment | 7–15 years |
| Vehicles | 3–7 years |
| Furniture & Fixtures | 5–10 years |
| Computers & IT Equipment | 3–5 years |
| Leasehold Improvements | Shorter of useful life or lease term |
| Software | 3–7 years |
| Patents | Legal life (up to 20 years) or economic useful life |

---

## 4. Working Capital Model

### 4.1 Net Working Capital Definition

```
Net Working Capital (NWC) = Current Operating Assets - Current Operating Liabilities
```

**Exclude from working capital:**
- Cash and Cash Equivalents (financing item)
- Short-Term Debt / Current Portion of Long-Term Debt (financing item)
- Current Portion of Capital Leases (financing item)

### 4.2 Key Working Capital Metrics

#### Days Sales Outstanding (DSO) — Accounts Receivable

```
DSO = (Accounts Receivable / Revenue) × 365
Forecasted AR = (DSO / 365) × Forecasted Revenue
```

#### Days Inventory Outstanding (DIO) — Inventory

```
DIO = (Inventory / COGS) × 365
Forecasted Inventory = (DIO / 365) × Forecasted COGS
```

#### Days Payable Outstanding (DPO) — Accounts Payable

```
DPO = (Accounts Payable / COGS) × 365
Forecasted AP = (DPO / 365) × Forecasted COGS
```

#### Cash Conversion Cycle (CCC)

```
CCC = DSO + DIO - DPO
```

A shorter CCC means the company converts its investments into cash faster — generally favorable.

### 4.3 Other Working Capital Items

| Item | Modeling Approach |
|---|---|
| **Prepaid Expenses** | % of Operating Expenses (SG&A + R&D) |
| **Other Current Assets** | % of Revenue or hold constant |
| **Accrued Liabilities** | % of Operating Expenses |
| **Accrued Compensation** | % of Total Payroll Expense |
| **Deferred Revenue** | Based on billing vs. recognition timing |
| **Income Tax Payable** | % of Tax Expense |
| **Other Current Liabilities** | % of Revenue or hold constant |

### 4.4 Change in Working Capital

```
ΔWC = NWC(t) - NWC(t-1)

If ΔWC > 0 → Working Capital INCREASED → Cash OUTFLOW (use of cash)
If ΔWC < 0 → Working Capital DECREASED → Cash INFLOW (source of cash)
```

The Change in Working Capital flows directly into the Cash Flow Statement (Operating Activities section) and into FCFF/FCFE calculations.

### 4.5 Working Capital as % of Revenue (Quick Check)

```
NWC as % of Revenue = NWC / Revenue
```

Typical ranges by industry:
- Technology/Software: 0-10%
- Retail: 5-15%
- Manufacturing: 15-25%
- Construction: 20-35%

---

## 5. Capital Expenditure (CapEx) Model

### 5.1 Maintenance CapEx vs. Growth CapEx

```
Total CapEx = Maintenance CapEx + Growth CapEx
```

**Maintenance CapEx:** Spending required to sustain current operations and replace aging assets.
```
Maintenance CapEx ≈ Depreciation Expense (steady-state assumption)
Alternative: % of Revenue (typically 2-5%)
Alternative: % of PP&E (net) — replacement rate
```

**Growth CapEx:** Spending to expand capacity, enter new markets, or build new capabilities.
```
Growth CapEx = Project-Based (identified expansion projects) 
             OR % of Incremental Revenue
             OR Incremental Capacity × Cost per Unit of Capacity
```

### 5.2 CapEx Intensity

```
CapEx Intensity = Total CapEx / Revenue
CapEx-to-D&A Ratio = Total CapEx / Depreciation & Amortization
```

If CapEx/D&A > 1.0 → Company is investing in growth (assets growing)
If CapEx/D&A ≈ 1.0 → Steady state (maintaining assets)
If CapEx/D&A < 1.0 → Underinvesting (asset base declining)

### 5.3 CapEx Calculation from Financial Statements

```
CapEx = Ending Net PP&E - Beginning Net PP&E + Depreciation

OR (from Cash Flow Statement):
CapEx = "Purchases of Property, Plant & Equipment" (investing section)
```

If asset disposals occur:
```
CapEx = Ending Gross PP&E - Beginning Gross PP&E + Gross Cost of Disposed Assets
```

---

## 6. Tax Model

### 6.1 Effective Tax Rate

```
Effective Tax Rate = Income Tax Expense / Earnings Before Tax (EBT)
```

The effective rate often differs from the statutory rate due to:
- Permanent differences (non-deductible expenses, tax-exempt income)
- Tax credits (R&D credit, foreign tax credits)
- State/local/foreign tax rate differences
- Transfer pricing arrangements

### 6.2 Deferred Tax Assets and Liabilities

**CFA Level I/II Critical Concept:**

| Item | Deferred Tax Asset (DTA) | Deferred Tax Liability (DTL) |
|---|---|---|
| **Definition** | Taxable income > Pretax income (tax paid now, benefit later) | Pretax income > Taxable income (benefit now, tax paid later) |
| **Common Causes** | NOL carryforwards, warranty reserves, bad debt provisions, deferred revenue, stock-based compensation | Accelerated depreciation (MACRS vs. straight-line), installment sales, prepaid expenses |
| **Balance Sheet** | Asset (future tax reduction) | Liability (future tax payment) |

```
DTA = Deductible Temporary Difference × Tax Rate
DTL = Taxable Temporary Difference × Tax Rate
Net DTA/DTL = DTA - DTL
```

### 6.3 Net Operating Loss (NOL) Carryforward

```
IF EBT < 0:
    NOL Generated = |EBT|
    Tax Expense = $0

IF EBT > 0 AND NOL Available > 0:
    Taxable Income = max(0, EBT - NOL Utilized)
    NOL Utilized = min(NOL Available, EBT × 80%)  ← US post-TCJA: 80% limitation
    Tax Expense = Taxable Income × Tax Rate
    
Ending NOL = Beginning NOL + NOL Generated - NOL Utilized
```

**CFA Note:** NOL carryforward rules vary by jurisdiction. US Tax Cuts & Jobs Act (TCJA) 2017: Unlimited carryforward period, but limited to 80% of taxable income per year.

### 6.4 Tax Shield from Debt

```
Interest Tax Shield = Interest Expense × Marginal Tax Rate
```

This tax shield is automatically captured in the WACC through the after-tax cost of debt: `Kd × (1 - T)`.

### 6.5 Modeling Approach

For most models:
```
Tax Expense = EBT × Effective Tax Rate (if EBT > 0)
Tax Expense = 0 (if EBT ≤ 0, with NOL accumulation)
```

For sophisticated models: Build a separate tax schedule with:
1. Statutory rate reconciliation
2. Permanent differences
3. Temporary differences (DTA/DTL roll-forward)
4. NOL schedule
5. Tax credit utilization schedule

---

## 7. Debt Schedule & Interest Modeling

### 7.1 Debt Structure Components

| Debt Instrument | Typical Rate | Maturity | Seniority | Amortization |
|---|---|---|---|---|
| **Revolving Credit Facility** | SOFR + 150-250 bps | 3-5 years | Senior Secured | None (drawn/repaid as needed) |
| **Term Loan A** | SOFR + 175-300 bps | 5-7 years | Senior Secured | 5-10% per year |
| **Term Loan B** | SOFR + 250-400 bps | 6-7 years | Senior Secured | 1% per year (99% bullet) |
| **Senior Secured Notes** | 5-8% Fixed | 5-8 years | Senior Secured | Bullet |
| **Senior Unsecured Notes** | 6-10% Fixed | 7-10 years | Senior Unsecured | Bullet |
| **Subordinated Notes** | 8-12% Fixed | 8-10 years | Subordinated | Bullet |
| **Mezzanine Debt** | 12-18% (often with PIK) | 7-10 years | Junior Subordinated | Bullet + PIK |
| **Capital Leases** | Implicit rate | Lease term | Varies | Amortizing |

### 7.2 Debt Roll-Forward Schedule

For each tranche:
```
Ending Balance = Beginning Balance + New Issuance - Mandatory Amortization - Optional Prepayment

Total Debt = Σ (All Tranche Ending Balances)
Net Debt = Total Debt - Cash and Cash Equivalents
```

### 7.3 Interest Expense Calculation

**Fixed Rate Debt:**
```
Interest Expense = Outstanding Principal × Fixed Coupon Rate
```

**Floating Rate Debt:**
```
Interest Expense = Outstanding Principal × (Reference Rate + Spread)
Reference Rate = SOFR, EURIBOR, etc.
```

**Average Balance Method (avoids circularity):**
```
Average Debt Balance = (Beginning Balance + Ending Balance) / 2
Interest Expense = Average Debt Balance × Interest Rate
```

**Circularity Problem:**
Interest depends on debt → Debt depends on cash balance → Cash depends on interest expense.

**Solutions:**
1. Use average balance method (approximation)
2. Enable iterative calculation in Excel (File → Options → Formulas → Enable Iterative Calculation)
3. Use a circular reference breaker switch (macro or cell toggle)

### 7.4 Revolver (Revolving Credit Facility) Modeling

```
Cash Available Before Revolver = Beginning Cash + CFO - CapEx - Mandatory Debt Payments + Proceeds
Minimum Cash Balance = Company policy (e.g., $50M)

IF Cash Available < Minimum Cash:
    Revolver Draw = Minimum Cash - Cash Available
    Revolver Draw = min(Revolver Draw, Revolver Capacity - Current Revolver Balance)

IF Cash Available > Minimum Cash:
    Excess Cash = Cash Available - Minimum Cash
    Revolver Paydown = min(Excess Cash, Current Revolver Balance)

Revolver Ending Balance = Beginning Balance + Draws - Paydowns
```

The Revolver acts as the **balancing mechanism** (plug) that ensures the balance sheet balances.

### 7.5 Debt Covenants (Key Ratios)

| Covenant | Formula | Typical Threshold |
|---|---|---|
| **Leverage Ratio** | Total Debt / EBITDA | < 4.0x – 6.0x |
| **Interest Coverage** | EBITDA / Interest Expense | > 2.0x – 3.0x |
| **Fixed Charge Coverage** | (EBITDA - CapEx) / (Interest + Mandatory Amortization) | > 1.0x – 1.5x |
| **Debt Service Coverage** | EBITDA / (Interest + Principal Payments) | > 1.2x – 1.5x |
| **Net Leverage** | Net Debt / EBITDA | < 3.5x – 5.5x |

---

## 8. Debt Repayment Structures: Bullet, Balloon & Amortizing

### 8.1 Bullet Bond / Bullet Repayment

**CFA Definition:** A bullet bond pays only periodic coupon (interest) payments throughout its life, with the entire principal repaid at maturity in a single lump sum.

```
Example: $1,000 face value, 5-year, 6% annual coupon (bullet)

Year 1:  $60 interest,   $0 principal    → Total payment: $60
Year 2:  $60 interest,   $0 principal    → Total payment: $60
Year 3:  $60 interest,   $0 principal    → Total payment: $60
Year 4:  $60 interest,   $0 principal    → Total payment: $60
Year 5:  $60 interest,   $1,000 principal → Total payment: $1,060
```

**Cash Flow Profile:**
```
Period    Interest    Principal    Total Payment    Outstanding Balance
1         $60          $0           $60              $1,000
2         $60          $0           $60              $1,000
3         $60          $0           $60              $1,000
4         $60          $0           $60              $1,000
5         $60        $1,000       $1,060                $0
```

**Characteristics:**
- Most common structure for corporate bonds and government bonds
- Highest refinancing risk (entire principal due at once)
- Lowest cash outflow during the life of the bond (only interest)
- Interest expense remains constant throughout
- Issuer has maximum financial flexibility during the term

**Interest Calculation:**
```
Interest_t = Face Value × Coupon Rate (constant every period)
```

### 8.2 Balloon Payment / Partially Amortizing Bond

**CFA Definition:** A partially amortized bond makes periodic payments that cover both interest and a portion of the principal, but not all principal is repaid during the bond's life. The remaining principal (a "balloon payment") is due at maturity.

```
Example: $1,000 face value, 5-year, 6% annual coupon, 
         $100 annual principal amortization → $500 balloon at maturity

Year 1:  $60.0 interest + $100 principal  → Payment: $160   Balance: $900
Year 2:  $54.0 interest + $100 principal  → Payment: $154   Balance: $800
Year 3:  $48.0 interest + $100 principal  → Payment: $148   Balance: $700
Year 4:  $42.0 interest + $100 principal  → Payment: $142   Balance: $600
Year 5:  $36.0 interest + $600 principal  → Payment: $636   Balance: $0
         (includes $500 balloon + $100 regular amortization)
```

**Cash Flow Profile:**
```
Period    Interest    Scheduled Amort    Balloon    Total Payment    Balance
1         $60.0        $100               $0         $160.0          $900
2         $54.0        $100               $0         $154.0          $800
3         $48.0        $100               $0         $148.0          $700
4         $42.0        $100               $0         $142.0          $600
5         $36.0        $100             $500         $636.0            $0
```

**Characteristics:**
- Hybrid between bullet and fully amortizing
- Balloon payment is significantly larger than regular periodic payments
- Reduces (but does not eliminate) refinancing risk vs. pure bullet
- Interest expense decreases over time as outstanding principal declines
- Common in real estate (CMBS), leveraged finance, and project finance

**Interest Calculation:**
```
Interest_t = Outstanding Balance_{t-1} × Coupon Rate (declining over time)
```

### 8.3 Fully Amortizing Bond / Loan

**CFA Definition:** A fully amortized bond has fixed periodic payments that include both interest and principal, designed so that the outstanding principal is completely repaid by maturity.

```
Example: $1,000 face value, 5-year, 6% annual coupon, fully amortizing
Fixed Payment (PMT) = PV × [r / (1 - (1+r)^-n)]
PMT = 1000 × [0.06 / (1 - 1.06^-5)] = $237.40

Year 1:  $60.00 interest + $177.40 principal  → Balance: $822.60
Year 2:  $49.36 interest + $188.04 principal  → Balance: $634.56
Year 3:  $38.07 interest + $199.33 principal  → Balance: $435.23
Year 4:  $26.11 interest + $211.29 principal  → Balance: $223.94
Year 5:  $13.44 interest + $223.96 principal  → Balance: ~$0
```

**Cash Flow Profile:**
```
Period    Payment     Interest    Principal    Outstanding Balance
1         $237.40     $60.00     $177.40       $822.60
2         $237.40     $49.36     $188.04       $634.56
3         $237.40     $38.07     $199.33       $435.23
4         $237.40     $26.11     $211.29       $223.94
5         $237.40     $13.44     $223.96         $0.00
```

**Characteristics:**
- Equal total periodic payments (like a mortgage)
- No refinancing risk (fully repaid at maturity)
- Interest portion decreases over time; principal portion increases
- Highest cash outflow during the life of the bond
- Common for mortgages, auto loans, equipment financing
- Provides the most predictable cash flow for lenders

**Interest Calculation:**
```
Interest_t = Outstanding Balance_{t-1} × Coupon Rate (declining over time)
Principal_t = Fixed Payment - Interest_t (increasing over time)
```

### 8.4 Comparison Summary

| Feature | Bullet | Balloon (Partial Amort.) | Fully Amortizing |
|---|---|---|---|
| **Principal During Term** | $0 | Partial | Full |
| **Principal at Maturity** | 100% of face | Large remaining balance | $0 |
| **Interest Pattern** | Constant | Declining | Declining |
| **Total Payment Pattern** | Constant (interest only) | Declining (+ large final) | Constant |
| **Refinancing Risk** | Highest | Moderate | None |
| **Cash Flexibility** | Highest | Moderate | Lowest |
| **Common Usage** | Corporate bonds, Govt bonds | CMBS, Real estate, Project finance | Mortgages, Auto loans, Equipment |

### 8.5 Sinking Fund Provision

A sinking fund requires the issuer to retire a specified portion of the bond's outstanding principal each year:

```
Example: $100M bond with sinking fund requiring 10% annual retirement starting Year 3

Year 1-2:  Interest only
Year 3:    Interest + $10M principal retirement
Year 4:    Interest + $10M principal retirement
...
Year 10:   Interest + $10M principal retirement (or final payment)
```

The issuer may satisfy the sinking fund by:
1. Making cash payments to the trustee (who retires bonds)
2. Purchasing bonds in the open market (if trading below par)
3. Lottery selection of bonds to be retired at par

### 8.6 Paid-In-Kind (PIK) Interest

PIK interest accrues to the principal balance rather than being paid in cash:

```
Year 1 Balance: $100M
PIK Rate: 12%
Year 1 PIK Interest: $12M (not paid in cash)
Year 2 Beginning Balance: $112M
Year 2 PIK Interest: $13.44M
Year 3 Beginning Balance: $125.44M
...and so on (compounding effect)
```

All principal + accumulated PIK is due at maturity. Used in mezzanine and junior debt.

---

## 9. Beta Estimation

### 9.1 Raw Beta from Regression

```
R_i = α + β × R_m + ε
```

Where:
- R_i = Stock return (dependent variable)
- R_m = Market index return (independent variable)
- α = Intercept (Jensen's Alpha)
- β = Slope coefficient = Cov(R_i, R_m) / Var(R_m)
- ε = Error term

**Standard estimation:** 2-5 years of weekly or monthly returns against a broad market index (S&P 500, MSCI World).

### 9.2 Adjusted Beta (Bloomberg Convention)

```
Adjusted Beta = (2/3) × Raw Beta + (1/3) × 1.0
```

Rationale: Betas tend to revert toward 1.0 over time (mean reversion).

### 9.3 Levered Beta (Equity Beta) and Unlevered Beta (Asset Beta)

**Hamada Equation:**

```
β_L = β_U × [1 + (1 - T) × (D/E)]

β_U = β_L / [1 + (1 - T) × (D/E)]
```

Where:
- β_L = Levered (Equity) Beta — includes financial risk
- β_U = Unlevered (Asset) Beta — reflects only business/operating risk
- T = Marginal Tax Rate
- D/E = Market Debt-to-Equity Ratio

### 9.4 Re-Levering Beta for Target Capital Structure

```
β_L(target) = β_U × [1 + (1 - T_target) × (D/E)_target]
```

### 9.5 Bottom-Up Beta (Pure Play Method)

**CFA Level I/II — Pure Play Method:**

Step 1: Select comparable public companies with similar business risk
Step 2: Obtain each comparable's levered beta (β_L)
Step 3: Unlever each comparable's beta using their own D/E and tax rate:
```
β_U(comp_i) = β_L(comp_i) / [1 + (1 - T_i) × (D/E)_i]
```
Step 4: Calculate the average (or median) unlevered beta of comparables
Step 5: Re-lever using the subject company's target capital structure:
```
β_L(subject) = β_U(avg) × [1 + (1 - T_subject) × (D/E)_target]
```

**Advantages over regression beta:**
- Can be calculated for private companies
- Uses multiple data points (industry average)
- Reflects current capital structure rather than historical
- More stable and reliable estimates

### 9.6 Beta Interpretation

| Beta | Interpretation |
|---|---|
| β > 1.0 | More volatile than the market (higher systematic risk) |
| β = 1.0 | Moves with the market |
| 0 < β < 1.0 | Less volatile than the market (lower systematic risk) |
| β = 0 | No correlation with market (e.g., risk-free asset) |
| β < 0 | Inversely correlated with market (rare — e.g., gold mining) |

---

## 10. CAPM & Cost of Equity

### 10.1 Capital Asset Pricing Model (CAPM)

**CFA Level I/II Core Formula:**

```
Ke = Rf + β × (E[Rm] - Rf)
```

Or equivalently:
```
Ke = Rf + β × ERP
```

Where:
- Ke = Cost of Equity (Expected/Required Return)
- Rf = Risk-Free Rate
- β = Equity Beta (Levered Beta)
- E[Rm] = Expected Market Return
- ERP = Equity Risk Premium = E[Rm] - Rf

### 10.2 CAPM Components — Detailed Estimation

#### Risk-Free Rate (Rf)

| Approach | Source | When to Use |
|---|---|---|
| **10-Year Treasury Yield** | US 10-year T-Note yield | Standard for US-based valuations |
| **20-Year / 30-Year Treasury** | Long-dated government bonds | When valuing long-duration assets |
| **Local Government Bond** | Sovereign yield of the country | Non-US valuations |
| **Adjusted for Inflation** | Real yield + Expected inflation | If working with real cash flows |

**Current Practice:** Use the yield on a government bond matching the duration of projected cash flows. For a 10-year DCF, use the 10-year treasury.

#### Equity Risk Premium (ERP)

| Method | Description | Typical Range |
|---|---|---|
| **Historical Average** | Geometric mean of market return minus T-bond return over 50-100 years | 5.0% – 7.0% |
| **Survey-Based** | CFO/analyst surveys (Fernandez, Graham-Harvey) | 4.5% – 6.5% |
| **Implied ERP** | Backed out from current index level using GGM: ERP = D1/P0 + g - Rf | 4.0% – 6.0% |
| **Damodaran Updated** | Annual update based on S&P 500 implied ERP | ~4.5% – 5.5% |

#### Size Premium

Smaller companies tend to have higher returns than explained by CAPM alone:

| Decile (Market Cap) | Size Premium |
|---|---|
| 1 (Largest) | 0.0% |
| 2-3 | 0.5% – 1.0% |
| 4-6 | 1.0% – 2.0% |
| 7-8 | 2.0% – 3.5% |
| 9-10 (Smallest) | 3.5% – 6.0%+ |

Source: Duff & Phelps / Kroll Cost of Capital Navigator

#### Country Risk Premium (CRP)

For emerging market valuations:
```
CRP = Sovereign Yield Spread × (Equity Volatility / Bond Volatility)

OR (Damodaran approach):
CRP = Sovereign Default Spread × (σ_equity / σ_bond)
```

### 10.3 Extended CAPM (Build-Up Method)

```
Ke = Rf + β × ERP + Size Premium + Country Risk Premium + Company-Specific Risk Premium
```

### 10.4 Alternative Cost of Equity Models

#### Dividend Discount Model (DDM) Approach

```
Ke = (D1 / P0) + g
```

Where D1 = Expected dividend, P0 = Current price, g = Expected dividend growth rate

#### Bond Yield Plus Risk Premium

```
Ke = YTM on company's long-term debt + Equity Risk Premium over Debt
```

Typical equity premium over company debt: 3% – 5%

#### Fama-French Three-Factor Model (CFA Level II)

```
E(Ri) = Rf + β_market × (Rm - Rf) + β_size × SMB + β_value × HML
```

Where:
- SMB = Small Minus Big (size factor premium)
- HML = High Minus Low (value factor premium, book-to-market)

#### Fama-French Five-Factor / Carhart Four-Factor

Adds profitability (RMW), investment (CMA), and/or momentum (WML) factors.

---

## 11. WACC (Weighted Average Cost of Capital)

### 11.1 WACC Formula

**CFA Level I/II:**

```
WACC = (E/V) × Ke + (D/V) × Kd × (1 - T) + (P/V) × Kp
```

Where:
- E = Market Value of Equity = Share Price × Diluted Shares Outstanding
- D = Market Value of Debt ≈ Book Value (if trading near par) or calculate PV of debt cash flows
- P = Market Value of Preferred Stock
- V = E + D + P (Total Firm Value)
- Ke = Cost of Equity (from CAPM)
- Kd = Cost of Debt (pre-tax) = YTM on existing debt or new issuance yield
- T = Marginal Corporate Tax Rate
- Kp = Cost of Preferred Stock = Preferred Dividend / Preferred Stock Price

### 11.2 Cost of Debt Estimation

```
Kd (pre-tax) = Yield to Maturity on existing long-term debt
             OR Yield on new comparable-rated debt issuance
             OR Weighted average interest rate on all debt

Kd (after-tax) = Kd × (1 - T)
```

**For companies with multiple debt tranches:**
```
Weighted Kd = Σ (Balance_i / Total Debt) × Rate_i
```

### 11.3 Cost of Preferred Stock

```
Kp = Dp / Pp

Where:
Dp = Annual preferred dividend per share
Pp = Current market price of preferred stock
```

Note: Preferred dividends are NOT tax-deductible (unlike interest), so no (1-T) adjustment.

### 11.4 Capital Structure Weights

**CFA Guidance:** Use market value weights, not book value weights.

```
Weight of Equity: We = E / (E + D + P)
Weight of Debt:   Wd = D / (E + D + P)  
Weight of Preferred: Wp = P / (E + D + P)
```

If target capital structure is available, use target weights (more forward-looking).
If target is unknown, use:
1. Current market value weights
2. Industry average weights
3. Trend in company's capital structure

### 11.5 WACC Worked Example

```
Given:
  Market Cap (E)           = $500M
  Market Value of Debt (D) = $200M
  Preferred Stock (P)      = $50M
  V = $750M
  
  Cost of Equity (Ke)      = 11.0% (from CAPM)
  Pre-Tax Cost of Debt (Kd)= 6.0% (YTM)
  Cost of Preferred (Kp)   = 8.0%
  Marginal Tax Rate (T)    = 25%

WACC = (500/750) × 11.0% + (200/750) × 6.0% × (1-0.25) + (50/750) × 8.0%
     = 0.6667 × 0.11 + 0.2667 × 0.045 + 0.0667 × 0.08
     = 7.33% + 1.20% + 0.53%
     = 9.07%
```

### 11.6 Key WACC Considerations

- WACC should reflect the **marginal** cost of capital (cost of raising the next dollar)
- **Flotation costs** should be incorporated into project cash flows, NOT into WACC
- WACC changes as the capital structure changes
- In leveraged buyouts (LBOs), use a changing WACC or Adjusted Present Value (APV) method
- For emerging markets, include Country Risk Premium in Ke
- **CFA Note:** The tax rate used should be the marginal tax rate, not the effective tax rate

---

## 12. Free Cash Flow: FCFF & FCFE

### 12.1 Free Cash Flow to the Firm (FCFF)

FCFF represents cash available to ALL capital providers (equity holders + debt holders + preferred stockholders).

#### From Net Income:
```
FCFF = NI + NCC + Int(1-T) - FCInv - WCInv
```

#### From EBIT:
```
FCFF = EBIT(1-T) + Dep - FCInv - WCInv
```

#### From EBITDA:
```
FCFF = EBITDA(1-T) + Dep(T) - FCInv - WCInv
```

#### From CFO (Cash Flow from Operations):
```
FCFF = CFO + Int(1-T) - FCInv
```

Where:
- NI = Net Income
- NCC = Net Non-Cash Charges (depreciation, amortization, impairments, stock-based comp)
- Int(1-T) = After-tax interest expense
- FCInv = Fixed Capital Investment (CapEx) = Ending Net PP&E - Beginning Net PP&E + Depreciation
- WCInv = Working Capital Investment = ΔCurrent Assets (excl. cash) - ΔCurrent Liabilities (excl. debt)
- Dep = Depreciation & Amortization
- T = Tax Rate

### 12.2 Free Cash Flow to Equity (FCFE)

FCFE represents cash available to EQUITY holders only (after all obligations to debt holders are met).

#### From FCFF:
```
FCFE = FCFF - Int(1-T) + Net Borrowing
```

#### From Net Income:
```
FCFE = NI + NCC - FCInv - WCInv + Net Borrowing
```

#### From EBIT:
```
FCFE = EBIT(1-T) - Int(1-T) + Dep - FCInv - WCInv + Net Borrowing
```

#### From EBITDA:
```
FCFE = EBITDA(1-T) - Int(1-T) + Dep(T) - FCInv - WCInv + Net Borrowing
```

#### From CFO:
```
FCFE = CFO - FCInv + Net Borrowing
```

Where:
- Net Borrowing = New Debt Issued - Debt Repaid

### 12.3 FCFE with Target Debt Ratio

**CFA Level II Important Formula:**

When a company maintains a target debt ratio (DR):

```
FCFE = NI - (1-DR)(FCInv - Dep) - (1-DR)(WCInv)
```

Where DR = target debt-to-asset ratio.

Intuition: If DR = 40%, then 40% of net new investment is financed with debt, and only 60% is financed from equity cash flows.

### 12.4 Key Adjustments

| Item | FCFF Treatment | FCFE Treatment |
|---|---|---|
| **Depreciation & Amortization** | Add back (non-cash) | Add back (non-cash) |
| **Stock-Based Compensation** | Add back to NCC | Add back to NCC |
| **Gains/Losses on Asset Sales** | Remove gains, add back losses | Same |
| **Restructuring Charges** | Add back if non-recurring | Same |
| **Interest Expense** | Add back after-tax [Int(1-T)] | Do NOT add back |
| **Net Borrowing** | Not included | Add (reflects financing) |
| **Preferred Dividends** | Add back (if starting from NI) | Do NOT add back |

### 12.5 FCFF vs. FCFE — When to Use Which

| Use FCFF When... | Use FCFE When... |
|---|---|
| Capital structure is changing significantly | Capital structure is relatively stable |
| Company has significant debt | Company has little or no debt |
| FCFE is negative due to high leverage | FCFE is positive and predictable |
| Valuing the entire enterprise | Valuing equity directly |
| Leveraged buyouts, M&A analysis | Equity research, stock valuation |

**CFA Note:** Both approaches should theoretically give the same equity value if applied correctly. FCFF is discounted at WACC; FCFE is discounted at the cost of equity (Ke).

---

## 13. DCF Valuation

### 13.1 Enterprise Value via FCFF

```
Enterprise Value (EV) = Σ [FCFF_t / (1 + WACC)^t] + Terminal Value / (1 + WACC)^n
                        t=1 to n
```

### 13.2 Equity Value via FCFE

```
Equity Value = Σ [FCFE_t / (1 + Ke)^t] + Terminal Value / (1 + Ke)^n
               t=1 to n
```

### 13.3 Terminal Value Calculation

#### Method 1: Gordon Growth Model (Perpetuity Growth)

```
Terminal Value (FCFF approach) = FCFF_{n+1} / (WACC - g)
                                = FCFF_n × (1 + g) / (WACC - g)

Terminal Value (FCFE approach) = FCFE_{n+1} / (Ke - g)
                                = FCFE_n × (1 + g) / (Ke - g)
```

Where g = Long-term sustainable growth rate (typically 2-3%, ≤ long-term GDP growth).

**CFA Note:** g must be LESS than WACC (or Ke) for the formula to be valid. If g ≥ WACC, the model produces infinite or negative values.

#### Method 2: Exit Multiple

```
Terminal Value = EBITDA_n × Exit EV/EBITDA Multiple
OR
Terminal Value = EBIT_n × Exit EV/EBIT Multiple
OR  
Terminal Value = Revenue_n × Exit EV/Revenue Multiple
```

Choose the exit multiple based on:
- Current trading multiples of comparable companies
- Historical average multiples
- Precedent transaction multiples

### 13.4 Equity Value Bridge

```
Enterprise Value (from DCF)
- Net Debt (Total Debt - Cash)
- Preferred Stock (Market Value)
- Minority / Non-Controlling Interest
- Unfunded Pension Liabilities
- Capital Lease Obligations (if not in debt)
+ Equity Method Investments (pro-rata share)
+ Non-Operating Assets (excess real estate, investments)
─────────────────────────────────────────────
= Equity Value

Equity Value per Share = Equity Value / Diluted Shares Outstanding
```

### 13.5 Diluted Shares — Treasury Stock Method (TSM)

```
In-the-Money Options/Warrants:
  Gross Shares from Exercise = Number of Options
  Proceeds = Number of Options × Exercise Price
  Shares Repurchased = Proceeds / Current Share Price
  Net New Shares = Gross Shares - Shares Repurchased

Diluted Shares = Basic Shares Outstanding + Net New Shares (from all in-the-money tranches)
```

Only include options/warrants/convertibles that are in-the-money (exercise price < current share price).

### 13.6 Single-Stage, Two-Stage, and Three-Stage Models

**CFA Level II:**

#### Single-Stage (Constant Growth) FCFF Model:

```
Firm Value = FCFF_1 / (WACC - g) = FCFF_0 × (1+g) / (WACC - g)
Equity Value = Firm Value - Market Value of Debt
```

#### Single-Stage FCFE Model:

```
Equity Value = FCFE_1 / (Ke - g) = FCFE_0 × (1+g) / (Ke - g)
```

#### Two-Stage Model:

```
Firm Value = Σ [FCFF_t / (1+WACC)^t] + [FCFF_{n+1} / (WACC-g)] × [1/(1+WACC)^n]
             t=1 to n (high growth)      terminal value (stable growth)

Two approaches:
  a) Constant high growth in Stage 1, then abrupt drop to long-term rate
  b) Linearly declining growth in Stage 1 (H-model variant)
```

#### Three-Stage Model:

Stage 1: High growth (e.g., 5 years at 15%)
Stage 2: Transition period — growth linearly declines (e.g., 5 years from 15% to 3%)
Stage 3: Mature/stable growth in perpetuity (e.g., 3%)

```
Value = PV(Stage 1 FCFs) + PV(Stage 2 FCFs) + PV(Terminal Value)
```

---

## 14. Dividend Discount Models (DDM)

### 14.1 General DDM

```
V_0 = Σ [D_t / (1+r)^t]   for t = 1 to ∞
```

### 14.2 Gordon Growth Model (Constant Growth DDM)

**CFA Level I/II:**

```
V_0 = D_1 / (r - g) = D_0 × (1+g) / (r - g)
```

**Conditions:**
- r > g (required return must exceed growth rate)
- g is constant and sustainable forever
- Dividends grow at a constant rate

**Implied Return:**
```
r = (D_1 / P_0) + g = Dividend Yield + Capital Gains Yield
```

**Implied Growth Rate:**
```
g = r - (D_1 / P_0)
```

**Sustainable Growth Rate:**
```
g = b × ROE

Where:
b = Retention Ratio = 1 - Payout Ratio = 1 - (DPS/EPS)
ROE = Return on Equity

Extended (DuPont):
g = (1 - D/E) × (NI/Sales) × (Sales/Assets) × (Assets/Equity)
g = Retention × Net Margin × Asset Turnover × Equity Multiplier
```

### 14.3 Two-Stage DDM

```
V_0 = Σ [D_0(1+g_s)^t / (1+r)^t] + [D_0(1+g_s)^n(1+g_L) / (r-g_L)] × [1/(1+r)^n]
      t=1 to n (supernormal)           terminal value (stable growth)
```

### 14.4 H-Model (Linear Transition DDM)

**CFA Level II:**

```
V_0 = [D_0 × (1+g_L)] / (r - g_L)  +  [D_0 × H × (g_S - g_L)] / (r - g_L)
      ─── Gordon Growth ───             ─── Excess Growth Premium ───
```

Where:
- H = Half-life of the high-growth period = n/2 (years)
- g_S = Short-term (supernormal) growth rate
- g_L = Long-term (sustainable) growth rate
- Growth rate declines linearly from g_S to g_L over 2H years

### 14.5 Three-Stage DDM

Stage 1: High constant growth for n₁ years
Stage 2: Linear decline from g_S to g_L over n₂ years (H-model)
Stage 3: Stable growth g_L forever

```
V_0 = PV(Stage 1 dividends) + PV(H-model value at Stage 2) discounted to present
```

### 14.6 Present Value of Growth Opportunities (PVGO)

```
V_0 = E_1/r + PVGO

PVGO = V_0 - (E_1/r)

Where:
E_1/r = No-growth value (perpetuity of earnings if 100% payout)
PVGO = Value attributable to future profitable growth
```

If PVGO > 0: Market expects profitable growth opportunities
If PVGO = 0: Company is valued as a no-growth perpetuity
If PVGO < 0: Market expects value-destroying investments

### 14.7 Justified P/E from Gordon Growth Model

**Leading (Forward) P/E:**
```
P_0/E_1 = (D_1/E_1) / (r - g) = (1-b) / (r-g)
```

**Trailing P/E:**
```
P_0/E_0 = [(1-b)(1+g)] / (r-g)
```

---

## 15. Residual Income Valuation

### 15.1 Residual Income Concept

**CFA Level II:**

```
Residual Income (RI_t) = Net Income_t - Equity Charge_t
                        = NI_t - (r × B_{t-1})
                        = (ROE_t - r) × B_{t-1}
```

Where:
- r = Required return on equity (cost of equity)
- B_{t-1} = Book value of equity at beginning of period
- ROE_t = Return on Equity for period t

**Interpretation:**
- RI > 0: Company creates value (ROE exceeds cost of equity)
- RI = 0: Company earns exactly its cost of equity
- RI < 0: Company destroys value

### 15.2 Residual Income Valuation Model

```
V_0 = B_0 + Σ [RI_t / (1+r)^t]   for t = 1 to ∞

V_0 = B_0 + Σ [(ROE_t - r) × B_{t-1} / (1+r)^t]   for t = 1 to ∞
```

### 15.3 Single-Stage Residual Income Model

If RI grows at constant rate g_RI forever:

```
V_0 = B_0 + [(ROE - r) × B_0] / (r - g_RI)
```

### 15.4 Multi-Stage Residual Income Model

```
V_0 = B_0 + Σ [RI_t / (1+r)^t] + [RI_{n+1} / (r - g)] × [1/(1+r)^n]
             t=1 to n (explicit)    terminal RI (persistence)
```

### 15.5 Residual Income Terminal Value Assumptions

| Assumption | Formula |
|---|---|
| **RI continues forever** | TV = RI_{n+1} / (r - g) |
| **RI drops to zero** | TV = 0 (ROE reverts to r) |
| **RI declines over time (persistence factor ω)** | TV = RI_{n+1} / (1 + r - ω), where 0 ≤ ω ≤ 1 |
| **Price-to-Book reversion** | TV based on industry average P/B |

### 15.6 Economic Value Added (EVA)

```
EVA = NOPAT - (WACC × Invested Capital)
    = EBIT(1-T) - (WACC × [Total Debt + Equity])
```

MVA (Market Value Added) = Market Value of Firm - Book Value of Invested Capital

### 15.7 Relationship to P/B Ratio

```
V_0/B_0 = 1 + [(ROE - r) / (r - g)]   (from GGM-based RI model)

Justified P/B = 1 + [(ROE-r) / (r-g)]
```

If ROE > r → P/B > 1.0 (premium to book)
If ROE = r → P/B = 1.0 (at book value)
If ROE < r → P/B < 1.0 (discount to book)

---

## 16. Multiples-Based Valuation

### 16.1 Price Multiples (Equity Value Based)

#### Price-to-Earnings (P/E)

```
Trailing P/E = Current Price / EPS (last 12 months)
Forward P/E = Current Price / Estimated EPS (next 12 months)
```

**Justified P/E (from GGM):**
```
Forward P/E = (1-b) / (r-g) = Payout Ratio / (r - g)
Trailing P/E = (1-b)(1+g) / (r-g)
```

**Drivers:** Higher justified P/E from → higher growth (g), lower risk (r), higher payout (1-b)

**Limitations:**
- Meaningless when EPS ≤ 0
- Volatile for cyclical companies
- Affected by capital structure (leverage increases EPS volatility)
- Accounting policy differences impact earnings

#### PEG Ratio

```
PEG = (P/E) / Expected EPS Growth Rate (%)

Example: P/E = 20, Growth = 10% → PEG = 20/10 = 2.0
```

PEG < 1.0: Potentially undervalued relative to growth
PEG > 1.0: Potentially overvalued relative to growth

**Limitation:** Does not account for risk differences.

#### Price-to-Book (P/B)

```
P/B = Market Price per Share / Book Value per Share
    = Market Cap / Total Shareholders' Equity
```

**Justified P/B:**
```
P/B = (ROE - g) / (r - g)
```

**Best for:** Financial institutions (banks, insurance), asset-heavy companies.

#### Price-to-Sales (P/S)

```
P/S = Market Price per Share / Revenue per Share
    = Market Cap / Total Revenue
```

**Justified P/S:**
```
P/S = Net Profit Margin × Payout × (1+g) / (r-g)
```

**Advantage:** Always positive (even for loss-making companies), less subject to manipulation.

#### Price-to-Cash Flow (P/CF)

```
P/CF = Price / Cash Flow per Share
P/CFO = Price / Cash Flow from Operations per Share
P/FCFE = Price / Free Cash Flow to Equity per Share
```

### 16.2 Enterprise Value (EV) Multiples

**Enterprise Value Calculation:**
```
EV = Market Cap + Total Debt + Preferred Stock + Minority Interest - Cash & Equivalents
```

#### EV/EBITDA

```
EV/EBITDA = Enterprise Value / Earnings Before Interest, Taxes, Depreciation & Amortization
```

**Why EV/EBITDA is preferred over P/E:**
- Capital structure neutral (comparable across different leverage levels)
- Depreciation policy neutral (comparable across different accounting policies)
- Always positive when EBITDA > 0 (more often than EPS)
- Better for capital-intensive businesses
- Standard metric in M&A and LBO analysis

**Limitations of EV/EBITDA:**
- EBITDA is NOT free cash flow (ignores CapEx and working capital)
- Overstates cash generation when CapEx > Depreciation
- Includes non-cash items from accrual accounting

#### EV/EBIT

```
EV/EBIT = Enterprise Value / EBIT
```

More appropriate than EV/EBITDA when:
- Depreciation represents a real economic cost of using assets
- Comparing companies with different asset ages
- Capital intensity makes depreciation a significant real expense

#### EV/Revenue (EV/Sales)

```
EV/Revenue = Enterprise Value / Total Revenue
```

**Better than P/S** because it accounts for different capital structures.

**Best for:** Early-stage/high-growth companies, SaaS companies, loss-making companies.

#### EV/FCFF

```
EV/FCFF = Enterprise Value / Free Cash Flow to Firm
```

Strongest theoretical link to valuation but FCFF can be volatile.

#### EV/Invested Capital

```
EV/IC = Enterprise Value / Invested Capital
```

Useful for comparing capital efficiency.

### 16.3 Sector-Specific Multiples

| Sector | Preferred Multiples |
|---|---|
| **Technology / SaaS** | EV/Revenue, EV/ARR, P/E (forward), EV/EBITDA |
| **Banks / Financial** | P/B, P/E, P/TBV (Tangible Book Value) |
| **Insurance** | P/B, P/E, Price/Embedded Value |
| **Real Estate / REITs** | P/FFO, P/AFFO, EV/EBITDA, NAV |
| **Oil & Gas** | EV/EBITDAX, EV/Production (BOE), EV/Reserves |
| **Mining** | EV/EBITDA, EV/Resources, P/NAV |
| **Retail** | EV/EBITDA, EV/EBITDAR, P/E, EV/Store |
| **Telecom / Utilities** | EV/EBITDA, P/E, Dividend Yield |
| **Healthcare / Biotech** | EV/Revenue, EV/Pipeline, P/E (forward for profitable) |
| **Airlines** | EV/EBITDAR, EV/Revenue, P/E |

### 16.4 Comparable Company Analysis (Trading Comps)

**Step-by-Step Process:**

1. **Select Comparable Universe:** Similar industry, size, geography, growth, profitability
2. **Gather Market Data:** Share price, shares outstanding, market cap
3. **Calculate Enterprise Value:** For each comp
4. **Standardize Financial Metrics:** LTM (Last Twelve Months) and NTM (Next Twelve Months) figures
5. **Calculate Multiples:** EV/EBITDA, EV/EBIT, P/E, etc. for each comp
6. **Determine Central Tendency:** Mean, median, weighted harmonic mean
7. **Apply to Target:** Target Metric × Selected Multiple = Implied Value

**CFA Note on Central Tendency:**
- **Arithmetic Mean:** Simple average; distorted by outliers
- **Median:** Middle value; more robust to outliers
- **Harmonic Mean:** 1 / [avg of (1/multiple)]; lower than arithmetic mean; used by CFA curriculum
- **Weighted Harmonic Mean:** Weights by fundamentals (e.g., market cap weighted)

### 16.5 Precedent Transactions Analysis (Transaction Comps)

1. **Identify Relevant Transactions:** Same industry, recent (3-5 years), similar size
2. **Gather Transaction Data:** Deal value, premiums paid
3. **Calculate Implied Multiples:** EV/EBITDA, EV/Revenue at time of transaction
4. **Adjust for Control Premium:** Precedent transactions typically include a control premium (20-40%)
5. **Apply to Target**

Precedent transaction multiples are typically higher than trading comps due to:
- Control premium
- Synergy expectations
- Competition among bidders

### 16.6 Football Field / Valuation Summary Chart

Present a range of implied equity values from multiple methods:

```
Valuation Method         Low      Mid      High     Per Share
─────────────────────────────────────────────────────────────
DCF (Perpetuity Growth)  $4.0B    $5.2B    $6.8B    $40-68
DCF (Exit Multiple)      $4.5B    $5.5B    $6.5B    $45-65
Trading Comps            $4.2B    $5.0B    $5.8B    $42-58
Precedent Transactions   $5.0B    $6.0B    $7.0B    $50-70
52-Week Range            $3.8B    $4.8B    $5.5B    $38-55
─────────────────────────────────────────────────────────────
Current Share Price: $48
```

---

## 17. Sensitivity & Scenario Analysis

### 17.1 Two-Variable Sensitivity (Data Table)

Standard Wall Street sensitivity table:

**DCF Value Sensitivity to WACC and Terminal Growth Rate:**

```
                        Terminal Growth Rate
                  1.5%    2.0%    2.5%    3.0%    3.5%
WACC  8.0%        $58     $64     $72     $82     $96
      8.5%        $52     $57     $63     $71     $81
      9.0%        $47     $51     $56     $62     $70
      9.5%        $43     $46     $50     $55     $61
     10.0%        $39     $42     $45     $49     $54
```

**DCF Value Sensitivity to WACC and Exit Multiple:**

```
                        Exit EV/EBITDA Multiple
                   6.0x    7.0x    8.0x    9.0x   10.0x
WACC  8.0%         $42     $50     $58     $66     $74
      8.5%         $40     $47     $55     $62     $70
      9.0%         $38     $45     $52     $59     $66
      9.5%         $36     $43     $49     $56     $63
     10.0%         $34     $41     $47     $53     $60
```

### 17.2 Scenario Analysis

| Parameter | Bear Case | Base Case | Bull Case |
|---|---|---|---|
| Revenue Growth | 3% | 8% | 15% |
| Gross Margin | 38% | 42% | 46% |
| EBITDA Margin | 15% | 20% | 25% |
| CapEx / Revenue | 8% | 6% | 5% |
| Terminal Growth | 1.5% | 2.5% | 3.0% |
| WACC | 10.5% | 9.5% | 8.5% |
| Exit Multiple | 6.0x | 8.0x | 10.0x |
| **Implied EV** | **$3.2B** | **$5.2B** | **$8.0B** |
| **Implied Share Price** | **$32** | **$52** | **$80** |
| **Probability Weight** | **25%** | **50%** | **25%** |
| **Probability-Weighted Value** | | **$54** | |

### 17.3 Monte Carlo Simulation (Advanced)

For complex models, key inputs are assigned probability distributions:
- Revenue growth: Normal distribution (μ=8%, σ=3%)
- Margins: Triangular distribution (min=15%, mode=20%, max=25%)
- WACC: Uniform distribution (8.5%-10.5%)

Run 10,000+ iterations to generate a distribution of equity values with confidence intervals.

---

## 18. Three Financial Statements Linkage

### 18.1 Income Statement → Balance Sheet

| Income Statement Item | Balance Sheet Impact |
|---|---|
| Net Income | → Retained Earnings (increases equity) |
| Depreciation | → Accumulated Depreciation (reduces net PP&E) |
| Amortization | → Reduces Intangible Assets |
| Deferred Tax Expense | → Changes in DTA/DTL |
| Stock-Based Compensation | → Additional Paid-In Capital |

### 18.2 Income Statement → Cash Flow Statement

```
Net Income (IS)
+ D&A, SBC, non-cash charges
- Changes in Working Capital items
= Cash Flow from Operations (CFO)
```

### 18.3 Cash Flow Statement → Balance Sheet

| Cash Flow Item | Balance Sheet Impact |
|---|---|
| **CFO** | → Drives Cash balance |
| **CapEx** | → Increases PP&E |
| **Acquisitions** | → Increases Goodwill/Intangibles |
| **Debt Issuance** | → Increases Debt |
| **Debt Repayment** | → Decreases Debt |
| **Share Issuance** | → Increases Equity (APIC + Common Stock) |
| **Share Buybacks** | → Increases Treasury Stock (decreases equity) |
| **Dividends** | → Decreases Retained Earnings |
| **Ending Cash** | → Cash & Equivalents on Balance Sheet |

### 18.4 The Balance Sheet Must Balance

```
Total Assets = Total Liabilities + Total Shareholders' Equity

If out of balance, check:
1. Retained Earnings = Prior RE + Net Income - Dividends
2. PP&E = Prior PP&E + CapEx - Dep - Disposals
3. Debt = Prior Debt + New Issuance - Repayments
4. Cash = Prior Cash + Net Change in Cash (from CFS)
```

---

## 19. Excel Model Architecture & Best Practices

### 19.1 Recommended Tab Structure

```
Tab 1:  Cover Page / Model Summary
Tab 2:  Assumptions & Drivers (all blue inputs here)
Tab 3:  Income Statement
Tab 4:  Balance Sheet
Tab 5:  Cash Flow Statement
Tab 6:  Revenue Build (detailed)
Tab 7:  Cost Build (detailed)
Tab 8:  Working Capital Schedule
Tab 9:  Depreciation Schedule (vintage year)
Tab 10: Debt Schedule (tranche by tranche)
Tab 11: Tax Schedule (NOL, DTA/DTL)
Tab 12: Share Count Schedule (dilution, buybacks)
Tab 13: WACC Calculation
Tab 14: DCF Valuation (FCFF + Terminal Value)
Tab 15: FCFE Valuation (if applicable)
Tab 16: Comparable Companies (Trading Comps)
Tab 17: Precedent Transactions
Tab 18: LBO Analysis (if applicable)
Tab 19: Sensitivity Tables
Tab 20: Scenario Analysis
Tab 21: Football Field / Valuation Summary
Tab 22: Checks & Balances (BS balance, CF reconciliation)
```

### 19.2 Wall Street Color Coding Convention

| Color | Meaning |
|---|---|
| **Blue font** | Hard-coded input / Assumption (user can change) |
| **Black font** | Formula / Calculation (do not override) |
| **Green font** | Link from another worksheet |
| **Red font** | Hard-coded number that needs to be updated (flag) |
| **Gray/Light fill** | Historical data |
| **White/No fill** | Projected data |

### 19.3 Modeling Best Practices

1. **One row, one formula:** Each row should contain only ONE formula copied across all columns
2. **No hardcoded numbers in formulas:** All inputs should be in a dedicated assumptions area
3. **Time flows left to right:** Historical on left, projections on right
4. **Annual → Quarterly:** Build annual first, then quarterly if needed
5. **Label everything:** Clear row labels, units, and column headers
6. **Use consistent sign conventions:** Revenue positive, costs negative (or all positive with subtraction)
7. **Build checks:** Balance sheet balance check, cash flow reconciliation
8. **Minimize circular references:** Use average balance method for interest
9. **Include source references:** For all assumptions, note the source (10-K, management guidance, analyst estimate)
10. **Version control:** Date and version number on cover page

### 19.4 Key Excel Shortcuts for Financial Modeling

| Shortcut | Function |
|---|---|
| **F2** | Edit cell |
| **F4** | Toggle absolute/relative reference ($) |
| **Ctrl + ~** | Show all formulas |
| **Alt + =** | AutoSum |
| **Ctrl + Shift + #** | Apply date format |
| **Ctrl + 1** | Format cells dialog |
| **Ctrl + [** | Trace precedents (navigate to source) |
| **Alt → H → 0** | Increase decimal |
| **Alt, I, R** | Insert row |

---

## Appendix: Quick Reference Formula Sheet

### Profitability

```
Gross Margin          = (Revenue - COGS) / Revenue
Operating Margin      = EBIT / Revenue
EBITDA Margin         = EBITDA / Revenue
Net Margin            = Net Income / Revenue
ROE                   = Net Income / Average Shareholders' Equity
ROA                   = Net Income / Average Total Assets
ROIC                  = NOPAT / Invested Capital = EBIT(1-T) / (Debt + Equity - Cash)
```

### Leverage

```
Debt/Equity           = Total Debt / Shareholders' Equity
Debt/Capital          = Total Debt / (Total Debt + Equity)
Net Debt/EBITDA       = (Total Debt - Cash) / EBITDA
Interest Coverage     = EBIT / Interest Expense (or EBITDA / Interest)
```

### Valuation

```
P/E                   = Price / EPS
EV/EBITDA             = Enterprise Value / EBITDA
P/B                   = Price / Book Value per Share
P/S                   = Price / Sales per Share
FCF Yield             = FCFE / Market Cap (or FCFF / EV)
Dividend Yield        = DPS / Price
Earnings Yield        = EPS / Price = 1 / (P/E)
```

### Return Decomposition (DuPont)

```
ROE = Net Margin × Asset Turnover × Equity Multiplier
    = (NI/Revenue) × (Revenue/Assets) × (Assets/Equity)

5-Factor DuPont:
ROE = Tax Burden × Interest Burden × EBIT Margin × Asset Turnover × Equity Multiplier
    = (NI/EBT) × (EBT/EBIT) × (EBIT/Revenue) × (Revenue/Assets) × (Assets/Equity)
```

---

**References & Sources:**
- CFA Institute. (2026). *CFA Program Curriculum Level I & Level II — Equity Valuation, Corporate Issuers, Fixed Income.*
- Damodaran, A. *Investment Valuation: Tools and Techniques for Determining the Value of Any Asset.*
- Rosenbaum, J. & Pearl, J. *Investment Banking: Valuation, LBOs, M&A, and IPOs.*
- Koller, T., Goedhart, M., & Wessels, D. *Valuation: Measuring and Managing the Value of Companies (McKinsey).*
- Wall Street Prep / Financial Edge Training best practices.
- Duff & Phelps / Kroll. *Cost of Capital Navigator.*

---

*This guide is intended for educational purposes and aligns with the CFA Institute Level I and Level II curriculum as well as standard Wall Street financial modeling practices.*
