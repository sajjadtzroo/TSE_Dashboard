# Comprehensive Financial Modeling Guide
## CFA Institute Curriculum (Level I, II & III) + Wall Street Best Practices + FMVA

---

## Table of Contents

### Part I: Core Financial Modeling (CFA L1/L2 & Wall Street)

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

### Part II: Advanced Wall Street & Investment Banking

20. [LBO Modeling](#20-lbo-modeling)
21. [M&A Modeling & Accretion/Dilution Analysis](#21-ma-modeling--accretiondilution-analysis)
22. [IPO Valuation & Pricing](#22-ipo-valuation--pricing)
23. [Restructuring & Distressed Valuation](#23-restructuring--distressed-valuation)
24. [Leveraged Finance & Credit Analysis](#24-leveraged-finance--credit-analysis)

### Part III: CFA Level III — Portfolio Management & Advanced Topics

25. [Private Company Valuation](#25-private-company-valuation)
26. [Adjusted Present Value (APV)](#26-adjusted-present-value-apv)
27. [Real Options Valuation](#27-real-options-valuation)
28. [Fixed Income Valuation & Analytics](#28-fixed-income-valuation--analytics)
29. [Portfolio Risk & Return](#29-portfolio-risk--return)
30. [Asset Allocation & Portfolio Construction](#30-asset-allocation--portfolio-construction)
31. [Behavioral Finance in Valuation](#31-behavioral-finance-in-valuation)
32. [Alternative Investments Valuation](#32-alternative-investments-valuation)
33. [ESG Integration in Valuation](#33-esg-integration-in-valuation)
34. [Currency & International Valuation](#34-currency--international-valuation)

### Part IV: FMVA — Applied Financial Modeling & Analysis

35. [Financial Statement Analysis & Quality of Earnings](#35-financial-statement-analysis--quality-of-earnings)
36. [FP&A: Budgeting & Forecasting](#36-fpa-budgeting--forecasting)
37. [Sum-of-the-Parts (SOTP) Valuation](#37-sum-of-the-parts-sotp-valuation)
38. [Real Estate Financial Modeling](#38-real-estate-financial-modeling)
39. [Project Finance Modeling](#39-project-finance-modeling)
40. [Model Audit, Error Checking & Governance](#40-model-audit-error-checking--governance)

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

## PART II: Advanced Wall Street & Investment Banking

---

## 20. LBO Modeling

### 20.1 LBO Overview

A Leveraged Buyout (LBO) is the acquisition of a company using a significant amount of debt (typically 50-80% of the purchase price), with the equity portion funded by a private equity (PE) sponsor.

**LBO Value Creation Levers:**
```
1. Debt Paydown (De-leveraging): FCF used to repay debt → equity value grows
2. EBITDA Growth: Revenue growth + margin expansion → larger enterprise value
3. Multiple Expansion: Exit at higher EV/EBITDA than entry → windfall to equity
4. Dividend Recapitalization: Refinance to pay special dividends to sponsors
```

### 20.2 Sources & Uses Table

```
SOURCES                              USES
─────────────────────────           ─────────────────────────
Revolving Credit Facility    $0M    Enterprise Value (EV)     $1,000M
Term Loan B                $400M    Transaction Fees            $25M
Senior Notes               $200M    Financing Fees              $15M
Sponsor Equity             $415M    Refinance Existing Debt     $50M
Rollover Management Equity  $25M    Cash to Balance Sheet       $10M
Seller Note (if any)         $0M    
─────────────────────────           ─────────────────────────
Total Sources            $1,040M    Total Uses              $1,040M
                                    (Sources MUST = Uses)
```

### 20.3 LBO Model Structure

```
Step 1: Purchase Price & Entry Multiple
  Entry EV = LTM EBITDA × Entry Multiple
  Entry Equity = EV - Net Debt Raised + Fees

Step 2: Project Operating Model (5-7 years)
  Revenue → EBITDA → CapEx → Working Capital → FCF

Step 3: Debt Schedule (tranche-by-tranche)
  Mandatory Amortization → Cash Sweep → Revolver Draw/Paydown
  Track beginning balance, interest, principal, ending balance for each tranche

Step 4: Free Cash Flow to Equity (Levered FCF)
  EBITDA
  - Cash Interest Expense
  - Cash Taxes (shield from interest deduction)
  - CapEx
  - ΔWorking Capital
  - Mandatory Debt Amortization
  = Levered Free Cash Flow (used for optional prepayment / cash sweep)

Step 5: Exit Valuation
  Exit EV = Projected EBITDA × Exit Multiple
  Exit Equity = Exit EV - Net Debt at Exit

Step 6: Returns Calculation
  MOIC = Exit Equity / Initial Equity Invested
  IRR = Internal Rate of Return on equity invested
```

### 20.4 Cash Sweep Mechanics

```
Available for Cash Sweep = Levered FCF - Minimum Cash Balance Reserve

Sweep Priority (waterfall):
  1. Revolver Paydown (first, always)
  2. Term Loan B prepayment (typically 50-75% sweep percentage)
  3. Subordinated Debt (if allowed)
  4. Cash accumulation on balance sheet

Cash Sweep % = Percentage of excess cash flow required for mandatory prepayment
  - Typically 50-75%, with step-downs based on leverage ratio
  - e.g., 75% sweep if Net Debt/EBITDA > 4.0x; 50% if < 4.0x
```

### 20.5 LBO Returns Analysis

```
Multiple on Invested Capital (MOIC):
  MOIC = Total Distributions to Sponsor / Total Equity Invested

Internal Rate of Return (IRR):
  Solve for r:  0 = -Equity_0 + Σ [CF_t / (1+r)^t] + Exit Equity / (1+r)^n

Target Returns:
  Minimum IRR: 20-25% (typical PE hurdle rate)
  Target MOIC: 2.0x-3.0x over 5-7 year hold period
```

**IRR vs. MOIC Relationship:**

| Hold Period | MOIC for ~20% IRR | MOIC for ~25% IRR |
|---|---|---|
| 3 years | 1.7x | 2.0x |
| 5 years | 2.5x | 3.1x |
| 7 years | 3.6x | 4.8x |

### 20.6 Returns Attribution

```
Total Equity Value Creation = Exit Equity - Entry Equity

Decomposition:
  1. Leverage Effect = Debt Paydown during hold period
  2. EBITDA Growth Effect = ΔEBITDAx × Entry Multiple (at entry capital structure)
  3. Multiple Expansion = ΔEBITDA Multiple × Exit EBITDA
  4. FCF Generation = Cumulative free cash flow generated (dividends, recaps)
```

### 20.7 Key LBO Credit Metrics

| Metric | Formula | Acceptable Range |
|---|---|---|
| **Total Leverage** | Total Debt / EBITDA | 4.0x – 7.0x at entry |
| **Senior Leverage** | Senior Debt / EBITDA | 3.0x – 5.0x |
| **Interest Coverage** | EBITDA / Cash Interest | > 2.0x |
| **Fixed Charge Coverage** | (EBITDA - CapEx) / (Cash Interest + Mandatory Amort.) | > 1.0x |
| **Debt / Total Capitalization** | Total Debt / (Debt + Equity) | 50% – 80% |

---

## 21. M&A Modeling & Accretion/Dilution Analysis

### 21.1 M&A Transaction Overview

**Consideration Types:**
```
All-Cash Deal:     Buyer pays cash → no dilution, increases leverage
All-Stock Deal:    Buyer issues shares → no debt, but share dilution
Mixed Deal:        Combination of cash + stock (+ assumed debt)
```

### 21.2 Purchase Price & Premium Analysis

```
Offer Price = Target's Current Price × (1 + Premium %)
Typical Control Premiums: 20% – 40% over undisturbed price

Equity Value (Offer) = Offer Price × Target Diluted Shares
Enterprise Value (Offer) = Equity Value + Target Net Debt + Minority Interest - Associates
```

### 21.3 Sources & Uses (M&A)

```
SOURCES                              USES
─────────────────────────           ─────────────────────────
Cash on Hand (Buyer)       $200M    Equity Value (to target)   $800M
New Debt Issuance          $300M    Refinance Target Debt      $200M
Stock Issued               $400M    Transaction Fees (advisory) $15M
                                    Financing Fees               $5M
─────────────────────────           ─────────────────────────
Total Sources              $900M    Total Uses               $1,020M

Note: Does not balance → need $120M more debt or equity
```

### 21.4 Goodwill & Purchase Price Allocation (PPA)

**CFA Level II / IFRS 3 / ASC 805:**

```
Purchase Price
- Fair Value of Identifiable Net Assets Acquired
  (Tangible Assets + Identifiable Intangible Assets - Liabilities at Fair Value)
= Goodwill

If Purchase Price < Fair Value of Net Assets → Bargain Purchase Gain (negative goodwill)
  → Recognized immediately in Income Statement (rare)
```

**Key PPA Adjustments:**
- PP&E step-up to fair value → higher future depreciation
- Identifiable intangibles (customer relationships, trade names, technology, contracts)
- Deferred revenue "haircut" (reduction to fair value)
- Deferred tax liabilities on asset step-ups

### 21.5 Accretion/Dilution Analysis

**Core Question:** Will the combined company's EPS increase (accretive) or decrease (dilutive) vs. the acquirer's standalone EPS?

```
Step 1: Pro Forma Combined Net Income
  Acquirer Net Income
  + Target Net Income
  + After-Tax Synergies (cost savings × (1-T))
  - After-Tax Integration Costs (one-time)
  - Incremental Interest Expense × (1-T) (on new debt)
  - Incremental D&A from PPA Step-Ups × (1-T)
  + Lost Interest Income on Cash Used × (1-T)
  = Pro Forma Combined Net Income

Step 2: Pro Forma Diluted Share Count
  Acquirer Diluted Shares + New Shares Issued (if stock deal)

Step 3: Pro Forma EPS
  Pro Forma EPS = Pro Forma Combined NI / Pro Forma Diluted Shares

Step 4: Compare
  If Pro Forma EPS > Acquirer Standalone EPS → ACCRETIVE ✓
  If Pro Forma EPS < Acquirer Standalone EPS → DILUTIVE ✗
```

### 21.6 Synergy Analysis

```
Revenue Synergies (harder to achieve, take longer):
  - Cross-selling, pricing power, new market access
  - Typically 2-5% of combined revenue
  - Phase-in over 2-3 years

Cost Synergies (more certain, faster to realize):
  - Headcount reduction (duplicate roles)
  - Facility consolidation
  - Procurement savings
  - IT/systems integration
  - Typically 5-15% of target's cost base
  - Phase-in over 1-2 years

Financial Synergies:
  - Lower cost of debt (combined credit profile)
  - Tax benefits (NOL utilization)
  - Improved working capital management
```

### 21.7 Exchange Ratio Analysis

For stock deals:
```
Exchange Ratio = Offer Price per Target Share / Acquirer Share Price

New Shares Issued = Target Diluted Shares × Exchange Ratio
Pro Forma Ownership:
  Acquirer Shareholders = Acquirer Shares / (Acquirer Shares + New Shares)
  Target Shareholders = New Shares / (Acquirer Shares + New Shares)
```

### 21.8 Contribution Analysis

```
                            Acquirer    Target    % Acquirer    % Target
Revenue                      $5.0B      $2.0B        71%          29%
EBITDA                       $1.2B      $0.5B        71%          29%
Net Income                   $0.6B      $0.2B        75%          25%
Total Assets                 $8.0B      $3.0B        73%          27%

Pro Forma Ownership                                  65%          35%

If Target shareholders receive > their contribution % → value transfer to target
```

---

## 22. IPO Valuation & Pricing

### 22.1 IPO Process Overview

```
Pre-IPO Timeline:
  6-12 months: Organizational readiness, audited financials, S-1 preparation
  3-6 months:  SEC review, roadshow preparation
  2-4 weeks:   Roadshow, book-building, pricing
  Day 0:       Pricing & allocation
  Day 1:       Trading begins
  Day 25+:     Quiet period ends, analyst coverage begins
```

### 22.2 IPO Valuation Methods

**Primary Approaches:**
```
1. Comparable Company Analysis (Trading Comps)
   - Select peer group of publicly traded companies
   - Apply relevant multiples (EV/Revenue, EV/EBITDA, P/E)
   - Apply IPO discount: typically 10-20% to reflect illiquidity and risk

2. Precedent IPO Transactions
   - Recent IPOs in same sector
   - Compare offering multiples and first-day performance

3. DCF Valuation
   - Forward-looking cash flow projections
   - Higher discount rate for IPO-stage companies (illiquidity premium)

4. Venture Capital / Pre-IPO Rounds
   - Last private round valuation as reference
   - Apply expected "IPO step-up" (typically 20-50%)
```

### 22.3 IPO Pricing Mechanics

```
Price Range: Set by underwriters based on valuation analysis
  Preliminary Range: e.g., $18-$21 per share

Book Building: Institutional investors indicate interest
  - Shares demanded at various price points
  - Oversubscription ratio target: 3-10x

Final Pricing:
  If oversubscribed → price at top of range or above
  If undersubscribed → price at bottom or narrow range

Offering Size = Shares Offered × Offer Price
Gross Proceeds = Offering Size
Net Proceeds = Gross Proceeds - Underwriting Discount (typically 3-7%)
```

### 22.4 IPO-Specific Metrics

```
Underpricing = (First Day Close - Offer Price) / Offer Price
  Average underpricing: 10-20% (varies by market conditions)

Money Left on the Table = (First Day Close - Offer Price) × Shares Offered

Greenshoe / Overallotment: Additional 15% shares available for stabilization

Lock-Up Period: Insiders restricted from selling (typically 90-180 days)
```

---

## 23. Restructuring & Distressed Valuation

### 23.1 Distressed Company Indicators

```
Financial Distress Signals:
  - Debt/EBITDA > 6.0x with declining EBITDA
  - Interest Coverage < 1.0x
  - Negative free cash flow for multiple quarters
  - Credit rating downgrade to CCC or below
  - Covenant violations
  - Debt trading below 80 cents on the dollar
  - Going concern qualification from auditors
  - Delayed SEC filings
```

### 23.2 Restructuring Options

```
Out-of-Court Restructuring:
  - Debt-for-equity swap
  - Debt exchange / tender offer
  - Covenant amendment / waiver
  - Asset sales
  - Sale-leaseback transactions

In-Court (Chapter 11 Bankruptcy):
  - DIP (Debtor-in-Possession) financing
  - Rejection of unfavorable contracts / leases
  - Plan of Reorganization
  - Section 363 asset sale
  - Equitization of debt (debt → new equity)
  - Fresh-start accounting
```

### 23.3 Liquidation Analysis (Chapter 7)

```
Liquidation Value = Σ (Asset × Recovery Rate) - Administrative Costs

Typical Recovery Rates:
  Cash & Cash Equivalents           100%
  Accounts Receivable               70-90%
  Inventory (finished goods)        50-70%
  Inventory (raw materials)         30-50%
  PP&E (machinery/equipment)        20-50%
  Real Estate                       50-80%
  Intangible Assets                 0-10%
  Goodwill                          0%

Administrative Claims (priority):
  1. Secured creditors (up to collateral value)
  2. DIP lenders
  3. Administrative expenses (legal, advisory fees)
  4. Priority claims (employee wages, taxes)
  5. Unsecured creditors (pro-rata)
  6. Subordinated debt
  7. Preferred equity
  8. Common equity (usually receive nothing)
```

### 23.4 Claims Waterfall Analysis

```
Enterprise Value (Reorganization Value)  $500M

Claim Structure & Recovery:
                          Claim    Cumulative    Recovery
  DIP Financing            $50M        $50M       100%
  Admin / Priority Claims  $20M        $70M       100%
  Secured Bank Debt       $200M       $270M       100%
  Senior Unsecured Notes  $300M       $570M        77% ← Impaired (fulcrum security)
  Subordinated Notes      $150M       $720M         0%
  Preferred Equity         $50M       $770M         0%
  Common Equity            $—M           —          0%

Fulcrum Security = The security that is partially impaired
  (receives some but not all of its claim)
  Here: Senior Unsecured Notes receive $230M / $300M = 76.7%
  → These holders control the reorganization process
```

### 23.5 Distressed Valuation Methods

```
1. Reorganization Value (Going Concern)
   - DCF using restructured cash flows
   - EV/EBITDA of comparable non-distressed companies (apply discount)
   - Adjusted for: DIP financing costs, professional fees, business disruption

2. Liquidation Value
   - Asset-by-asset recovery rates
   - Floor value in any restructuring negotiation

3. Precedent Restructuring Transactions
   - Recovery rates from comparable Chapter 11 cases
   - Plan confirmation values
```

---

## 24. Leveraged Finance & Credit Analysis

### 24.1 Credit Analysis Framework

**CFA Level II / FMVA:**

```
5 C's of Credit:
  1. Character: Management quality, track record, integrity
  2. Capacity: Ability to repay (cash flow analysis)
  3. Capital: Owner's equity / financial cushion
  4. Collateral: Assets pledged against the loan
  5. Conditions: Economic environment, industry outlook
```

### 24.2 Credit Ratios & Benchmarks

| Metric | Investment Grade | High Yield / Leveraged |
|---|---|---|
| **Debt / EBITDA** | 1.0x – 3.0x | 3.0x – 7.0x+ |
| **EBITDA / Interest** | > 4.0x | 1.5x – 3.0x |
| **FFO / Debt** | > 30% | 10% – 25% |
| **Debt / Capital** | < 50% | 50% – 80% |
| **FCF / Debt** | > 15% | 5% – 15% |
| **EBITDA - CapEx / Interest** | > 3.0x | > 1.0x |

### 24.3 Credit Rating Mapping

| Rating (S&P/Moody's) | Category | Typical Leverage | Spread (bps) |
|---|---|---|---|
| AAA / Aaa | Prime | < 1.0x | 30-60 |
| AA / Aa | High Grade | 1.0-1.5x | 60-100 |
| A / A | Upper Medium | 1.5-2.5x | 100-150 |
| BBB / Baa | Medium Grade | 2.5-3.5x | 150-250 |
| BB / Ba | Speculative | 3.5-5.0x | 250-450 |
| B / B | Highly Speculative | 5.0-7.0x | 450-700 |
| CCC / Caa | Substantial Risk | > 7.0x | 700-1500+ |

### 24.4 Debt Capacity Analysis

```
Maximum Debt = EBITDA × Maximum Leverage Multiple

Debt Sizing Based on Cash Flow:
  Maximum Annual Debt Service = EBITDA × Coverage Ratio Inverse
  Example: If EBITDA = $100M and min DSCR = 1.5x
  Max Debt Service = $100M / 1.5 = $66.7M/year

Debt Sizing Based on Asset Coverage:
  Maximum Secured Debt = Collateral Value × Advance Rate
  Typical Advance Rates:
    - Cash: 100%
    - A/R: 80-85%
    - Inventory: 50-65%
    - PP&E: 50-75%
    - Real Estate: 60-80%
```

### 24.5 Yield & Spread Analysis

```
Yield to Maturity (YTM): Solve for y in:
  Price = Σ [C / (1+y)^t] + [FV / (1+y)^n]

Credit Spread = YTM on Corporate Bond - YTM on Comparable Treasury
  OAS (Option-Adjusted Spread): Spread after removing embedded option value
  Z-Spread: Constant spread over entire Treasury curve

Yield to Worst (YTW): Minimum of YTM and Yield to each Call date
```

---

## PART III: CFA Level III — Portfolio Management & Advanced Topics

---

## 25. Private Company Valuation

### 25.1 CFA Level III — Private Company Adjustments

```
Key Differences from Public Company Valuation:
  1. Lack of market price → no observable beta
  2. Less transparent financial reporting
  3. Concentrated ownership / key-person risk
  4. Lower liquidity → requires discount
  5. Smaller size → requires size premium
  6. Potentially intermingled personal and business expenses
```

### 25.2 Private Company Discount & Premium

```
Discount for Lack of Marketability (DLOM):
  Range: 15% – 35%
  Methods: Restricted stock studies, Pre-IPO studies, option pricing models
  Formula: Private Value = Public Market Value × (1 - DLOM)

Discount for Lack of Control (DLOC):
  Range: 15% – 30%
  Inverse of control premium: DLOC = 1 - [1 / (1 + Control Premium)]
  Example: If control premium = 30%, DLOC = 1 - 1/1.30 = 23.1%

Key-Person Discount: 5% – 25% (if business heavily dependent on founder)

Size Adjustment:
  Apply size premium from Duff & Phelps decile tables
  Or adjust beta upward for size-related risk
```

### 25.3 Normalized Earnings

```
Reported EBITDA
+ Owner excess compensation (above market rate)
+ Personal expenses charged to business
+ Above-market rent to related parties
+ Non-recurring / unusual items
- Market-rate compensation for owner's role
= Normalized EBITDA
```

### 25.4 Valuation Approaches for Private Companies

```
Income Approach:
  - Capitalized Cash Flow: Value = Normalized Earnings / (r - g)
  - Multi-Period DCF with DLOM applied to terminal value

Market Approach:
  - Guideline Public Company Method (apply DLOM)
  - Guideline Transaction Method (M&A precedents)
  - Prior Transaction Method (past rounds of the subject company)

Asset-Based Approach:
  - Adjusted Net Asset Value (restate assets/liabilities to fair value)
  - Excess Earnings Method: Tangible Asset Value + (Excess Earnings / Cap Rate)
```

---

## 26. Adjusted Present Value (APV)

### 26.1 APV Concept

**CFA Level II / Advanced Wall Street:**

APV separates the value of the unlevered firm from the value of financing side effects (mainly the interest tax shield).

```
APV = Unlevered Firm Value + PV(Tax Shield) - PV(Costs of Financial Distress)
```

### 26.2 APV Calculation

```
Step 1: Value Unlevered Free Cash Flows at Unlevered Cost of Equity
  Unlevered Firm Value = Σ [FCFF_t / (1 + Ku)^t] + TV / (1 + Ku)^n
  
  Where Ku = Rf + βu × ERP (unlevered cost of equity = cost of assets)

Step 2: Calculate PV of Interest Tax Shield
  Annual Tax Shield = Interest Expense × Tax Rate
  
  If debt is permanent:
    PV(Tax Shield) = Σ [Tax Shield_t / (1 + Kd)^t]  (discount at Kd)
  
  If debt is proportional to firm value (rebalanced):
    PV(Tax Shield) = Σ [Tax Shield_t / (1 + Ku)^t]  (discount at Ku)

Step 3: Deduct Distress Costs (if applicable)
  PV(Distress) = Probability of Distress × Expected Cost of Distress

APV = Step 1 + Step 2 - Step 3
Equity Value = APV - Market Value of Debt
```

### 26.3 When to Use APV vs. WACC

| Use APV | Use WACC |
|---|---|
| Capital structure is changing significantly | Stable, target capital structure |
| LBOs (debt declines over time) | Mature companies |
| Project finance (custom debt schedules) | Standard corporate valuations |
| High financial risk / potential distress | Investment-grade companies |
| Tax shield value needs explicit modeling | Simple, predictable tax shield |

---

## 27. Real Options Valuation

### 27.1 CFA Level III Concept

Traditional DCF fails to capture managerial flexibility. Real options add value for the ability to defer, expand, contract, abandon, or switch.

```
Strategic NPV = Traditional NPV + Value of Real Options
```

### 27.2 Types of Real Options

| Option Type | Description | Example |
|---|---|---|
| **Option to Defer** | Wait for better information before investing | Holding a mining lease |
| **Option to Expand** | Scale up if conditions are favorable | Building additional capacity |
| **Option to Contract** | Scale down if demand falls | Reducing workforce/capacity |
| **Option to Abandon** | Exit and recover salvage value | Selling off an underperforming division |
| **Option to Switch** | Change inputs or outputs | Dual-fuel power plant |
| **Growth Option** | Initial investment creates follow-on opportunities | R&D leading to new products |

### 27.3 Real Options Valuation Methods

```
Black-Scholes (Adapted for Real Options):
  C = S × N(d1) - X × e^(-rT) × N(d2)
  
  Where:
    S = PV of expected cash flows from the project (underlying asset)
    X = Investment cost (exercise price)
    T = Time until option expires
    r = Risk-free rate
    σ = Volatility of project cash flows
    d1 = [ln(S/X) + (r + σ²/2)T] / (σ√T)
    d2 = d1 - σ√T

Binomial Tree Model:
  - Construct up/down price tree
  - u = e^(σ√Δt), d = 1/u
  - Risk-neutral probability: p = (e^(rΔt) - d) / (u - d)
  - Work backward from terminal nodes, applying decision rules at each node

Monte Carlo Simulation:
  - Simulate thousands of paths for project cash flows
  - At each decision point, apply optimal strategy
  - Average across paths
```

---

## 28. Fixed Income Valuation & Analytics

### 28.1 Bond Pricing Fundamentals (CFA L1/L2)

```
Bond Price = Σ [C / (1+r)^t] + [FV / (1+r)^n]

Clean Price = Dirty Price - Accrued Interest
Dirty Price = Full Price (actual cash settlement price)
Accrued Interest = Coupon × (Days Since Last Coupon / Days in Coupon Period)
```

### 28.2 Yield Measures

```
Current Yield = Annual Coupon / Current Price

Yield to Maturity (YTM): Internal rate of return if held to maturity
  Assumes reinvestment at YTM

Yield to Call (YTC): YTM calculated to first call date at call price

Bond Equivalent Yield (BEY) = 2 × Semi-Annual Yield

Effective Annual Yield (EAY) = (1 + periodic yield)^n - 1

Discount Margin (Floating Rate): Spread over reference rate that equates PV of expected
  cash flows to market price (assuming reference rate stays constant)
```

### 28.3 Term Structure & Spot Rates

```
Bootstrapping Spot Rates:
  From par yield curve → derive zero-coupon (spot) rates sequentially
  
  1-year spot: s1 from 1-year par bond
  2-year spot: s2 from 2-year par bond using s1
  ...

Forward Rates:
  f(t1, t2) = [(1 + s2)^2 / (1 + s1)]  - 1   (for 1-year forward, 1 year from now)
  
  General: (1 + s_n)^n = (1 + s_{n-1})^{n-1} × (1 + f_{n-1,n})
```

### 28.4 Duration & Convexity (CFA L1/L2/L3)

```
Macaulay Duration = Σ [t × PV(CF_t)] / Price  (weighted average time to receive CFs)

Modified Duration = Macaulay Duration / (1 + y/k)
  Where k = compounding frequency per year

Effective Duration = (P(-Δy) - P(+Δy)) / (2 × P0 × Δy)
  Used for bonds with embedded options

Key Duration = Duration of a bond with respect to a specific key rate point on the curve

Approximate Price Change:
  ΔP/P ≈ -ModDur × Δy + ½ × Convexity × (Δy)²

Convexity:
  Convexity = [P(-Δy) + P(+Δy) - 2P0] / (P0 × Δy²)

Dollar Duration = ModDur × Price × 0.01 (price change per 1bp yield change)
DV01 = Dollar value of 01 = Dollar Duration / 100
```

### 28.5 Credit Spread Analysis

```
Expected Loss = Probability of Default (PD) × Loss Given Default (LGD)
LGD = 1 - Recovery Rate

Credit Valuation Adjustment (CVA) = Σ [PD_t × LGD × Exposure_t × DF_t]

Structural Models (Merton Model):
  Equity = Call option on firm assets with strike = face value of debt
  PD = N(-d2) from Black-Scholes framework applied to firm value vs. debt

Reduced-Form Models:
  Model default as a Poisson process with hazard rate λ
  Survival probability over T years = e^(-λT)
  1-year PD ≈ Credit Spread / LGD (approximation)
```

### 28.6 Mortgage-Backed Securities (MBS) — CFA L2/L3

```
Weighted Average Coupon (WAC): Weighted average of mortgage rates in pool
Weighted Average Maturity (WAM): Weighted average of remaining terms

Prepayment Speed:
  CPR (Conditional Prepayment Rate): Annual prepayment rate
  SMM (Single Monthly Mortality) = 1 - (1 - CPR)^(1/12)
  PSA (Public Securities Association): Benchmark prepayment model
    100% PSA: CPR ramps from 0% to 6% over first 30 months, then constant 6%

OAS (Option-Adjusted Spread):
  Spread over Treasury after removing prepayment option value
  OAS = Z-Spread - Option Cost
  If OAS > required spread → bond is undervalued (buy)
```

---

## 29. Portfolio Risk & Return

### 29.1 Portfolio Return (CFA L1/L3)

```
E(Rp) = Σ wi × E(Ri)   (weighted average of expected returns)

Portfolio Variance (2 assets):
  σp² = w1²σ1² + w2²σ2² + 2w1w2σ1σ2ρ12

Portfolio Variance (n assets):
  σp² = ΣΣ wi wj σi σj ρij
      = w'Σw   (matrix notation)
```

### 29.2 Risk Measures

```
Standard Deviation (σ): Total risk

Value at Risk (VaR):
  - Maximum loss at a given confidence level over a specified period
  - Parametric VaR = μ - zα × σ
    At 95%: VaR = μ - 1.645σ
    At 99%: VaR = μ - 2.326σ
  - Historical VaR: Sort returns, find percentile cutoff
  - Monte Carlo VaR: Simulate portfolio returns, find percentile

Conditional VaR (CVaR / Expected Shortfall):
  Average loss beyond the VaR threshold
  CVaR = E[Loss | Loss > VaR]

Tracking Error (TE):
  TE = σ(Rp - Rb) = Standard deviation of active returns

Information Ratio (IR):
  IR = (Rp - Rb) / TE = Active Return / Tracking Error
  Exceptional: IR > 0.5
  Good: IR 0.3-0.5

Sharpe Ratio:
  S = (Rp - Rf) / σp
  Exceptional: S > 1.0
  Good: S 0.5-1.0

Sortino Ratio:
  Sortino = (Rp - Rf) / σdownside
  Uses only downside deviation (returns below target)

Maximum Drawdown:
  Largest peak-to-trough decline in portfolio value
```

### 29.3 Performance Attribution (CFA L3)

```
Brinson-Fachler Attribution (Equity):

  Total Active Return = Rp - Rb

  Allocation Effect = Σ (wp,i - wb,i) × (Rb,i - Rb)
    Did the manager overweight outperforming sectors?

  Selection Effect = Σ wb,i × (Rp,i - Rb,i)
    Did the manager pick better stocks within sectors?

  Interaction Effect = Σ (wp,i - wb,i) × (Rp,i - Rb,i)
    Combined allocation and selection

Fixed Income Attribution:
  - Duration management effect
  - Yield curve positioning effect
  - Spread management effect
  - Security selection effect
  - Currency effect (for international portfolios)
```

### 29.4 Risk Budgeting (CFA L3)

```
Risk Budget = Total tracking error allocated across strategies/managers

Marginal Contribution to Risk (MCR):
  MCR_i = ∂σp / ∂wi = (Σw)_i / σp

Component Risk (CR):
  CR_i = wi × MCR_i
  Σ CR_i = σp (total portfolio risk)

% Contribution to Risk:
  %CR_i = CR_i / σp

Optimal Risk Budget:
  Equalize the ratio of expected active return to marginal contribution
  across all positions: E(Ra_i) / MCR_i = constant for all i
```

---

## 30. Asset Allocation & Portfolio Construction

### 30.1 Strategic Asset Allocation (CFA L3)

```
Mean-Variance Optimization (MVO):
  Maximize: E(Rp) - (λ/2) × σp²
  Subject to: Σwi = 1, wi ≥ 0 (if no short selling)
  
  Where λ = risk aversion coefficient (typical range: 1-10)

Efficient Frontier: Set of portfolios offering highest return for each risk level

Capital Market Line (CML):
  E(Rp) = Rf + [(E(Rm) - Rf) / σm] × σp
  Slope = Sharpe Ratio of market portfolio

Black-Litterman Model:
  Combines equilibrium returns (implied by market cap weights) with investor views
  Posterior E(R) = [(τΣ)^-1 + P'Ω^-1P]^-1 × [(τΣ)^-1π + P'Ω^-1Q]
  Where:
    π = Equilibrium excess returns (from reverse optimization)
    P = Pick matrix (identifies assets in each view)
    Q = View vector (expected returns from views)
    Ω = Uncertainty of views
    τ = Scalar (confidence in equilibrium, typically 0.01-0.05)
```

### 30.2 Rebalancing Strategies

```
Calendar Rebalancing: Fixed schedule (monthly, quarterly, annually)
  Simple but may miss large drifts or trigger unnecessary trades

Percentage-of-Portfolio (Threshold) Rebalancing:
  Rebalance when weight drifts beyond ±X% from target
  E.g., 60/40 target with 5% corridor → rebalance when equities > 65% or < 55%

CPPI (Constant Proportion Portfolio Insurance):
  $ in risky asset = m × (Portfolio Value - Floor)
  Where m = multiplier (typically 3-6), Floor = minimum acceptable value
```

### 30.3 Liability-Driven Investing (LDI) — CFA L3

```
Asset-Liability Management for Pension Funds:

Surplus = Assets - PV(Liabilities)
Surplus Risk = σ(ΔAssets - ΔLiabilities)

Duration Matching:
  Dollar Duration of Assets = Dollar Duration of Liabilities
  DA × MVA = DL × MVL

Cash Flow Matching: Match asset cash flows to liability payment schedule

Immunization (Single Liability):
  1. Portfolio Macaulay Duration = Liability horizon
  2. PV(Assets) ≥ PV(Liability)
  3. Convexity of assets ≥ Convexity of liability (minimize structural risk)
  4. Minimize dispersion of portfolio cash flows around the liability date
```

---

## 31. Behavioral Finance in Valuation

### 31.1 Cognitive Biases Affecting Valuation (CFA L3)

| Bias | Description | Valuation Impact |
|---|---|---|
| **Anchoring** | Over-relying on first piece of information | Anchoring to historical multiples or prior targets |
| **Overconfidence** | Overestimating accuracy of estimates | Narrow sensitivity ranges, false precision |
| **Confirmation Bias** | Seeking info that confirms existing views | Ignoring contradictory data in due diligence |
| **Representativeness** | Judging by similarity to stereotypes | Misclassifying growth stage of company |
| **Herding** | Following crowd behavior | Bubbles and crashes; consensus estimates cluster |
| **Loss Aversion** | Pain of losses > pleasure of gains (2x) | Reluctance to write down impaired assets |
| **Framing** | Different conclusions from same data based on presentation | Bull vs. bear case framing affects conclusions |
| **Availability** | Overweighting recent/memorable events | Overreaction to recent news in forecasts |
| **Mental Accounting** | Treating money differently by source | Separate evaluation of divisions vs. whole |
| **Status Quo Bias** | Preference for current state | Reluctance to update models or assumptions |

### 31.2 Market Anomalies Related to Behavioral Finance

```
Value Effect:     Low P/E, low P/B stocks outperform (overreaction to bad news)
Momentum Effect:  Winners keep winning (3-12 months); underreaction to news
Size Effect:      Small-cap premium (behavioral: neglected firm effect)
Post-Earnings Announcement Drift (PEAD): Prices adjust slowly after earnings surprises
Calendar Effects: January effect, day-of-week effect (tax-loss selling, window dressing)
```

### 31.3 Debiasing in Financial Modeling

```
1. Use pre-mortem analysis (imagine the model's conclusion is wrong — why?)
2. Seek disconfirming evidence explicitly
3. Use base rates (industry averages) before adjusting for specific factors
4. Widen sensitivity ranges beyond comfort zone
5. Get independent reviews of key assumptions
6. Use standardized checklists for model inputs
7. Document reasoning for each assumption (audit trail)
8. Apply disciplined rebalancing / review schedules
```

---

## 32. Alternative Investments Valuation

### 32.1 Private Equity Fund Valuation (CFA L3)

```
Gross IRR: Return before management fees and carried interest
Net IRR: Return after fees

J-Curve Effect: PE funds typically show negative returns in early years
  (management fees + capital deployment) before returns materialize

Vintage Year: Year of fund's first capital call (key for benchmarking)

Multiples:
  DPI (Distributed to Paid-In) = Cumulative Distributions / Cumulative Contributions
  RVPI (Residual Value to Paid-In) = NAV / Cumulative Contributions
  TVPI (Total Value to Paid-In) = DPI + RVPI

Fee Structure (typical "2 and 20"):
  Management Fee: 1.5-2.0% of committed capital (investment period)
                  or 1.5-2.0% of invested capital (harvest period)
  Carried Interest: 20% of profits above preferred return (hurdle rate)
  Preferred Return (Hurdle): 8% (typical)
  GP Catch-Up: After LP receives hurdle, GP receives 100% until 20/80 split achieved
```

### 32.2 Real Estate Valuation (CFA L3)

```
Income Approach:
  Value = Net Operating Income (NOI) / Cap Rate
  Cap Rate = NOI / Market Value (comparable property sales)
  
  NOI = Gross Potential Rent
      - Vacancy & Credit Loss
      + Other Income
      = Effective Gross Income
      - Operating Expenses
      = NOI

DCF Approach:
  Value = Σ [NOI_t / (1+r)^t] + [Terminal Value / (1+r)^n]
  Terminal Value = NOI_{n+1} / (Terminal Cap Rate)
  Terminal Cap Rate = Going-In Cap Rate + 50-100 bps (deterioration assumption)

Cost Approach:
  Value = Land Value + Replacement Cost of Improvements - Depreciation

Sales Comparison Approach:
  Value based on $/sqft from comparable recent transactions, adjusted for differences
```

### 32.3 Hedge Fund Valuation & Metrics

```
Sharpe Ratio: (Return - Rf) / Volatility
Sortino Ratio: (Return - Rf) / Downside Deviation
Maximum Drawdown: Largest peak-to-trough loss
Calmar Ratio: Annualized Return / Maximum Drawdown

Bias Adjustments (Self-Reported Data):
  - Survivorship Bias: Failed funds excluded → overstates returns by 2-4%/year
  - Backfill Bias: Only add good performers → overstates returns by 1-3%/year
  - Smoothing Bias: Illiquid assets marked slowly → understates volatility

Liquidity Terms:
  Lock-Up Period: Minimum holding period (1-3 years typical)
  Redemption Notice: 30-90 days advance notice required
  Gate Provision: Limits on % of fund that can be redeemed per period
```

### 32.4 Commodity Valuation

```
Futures Pricing:
  F(T) = S × e^((r + c - y)T)
  Where:
    S = Spot price
    r = Risk-free rate
    c = Cost of carry (storage + insurance)
    y = Convenience yield

Roll Return:
  Contango: F > S → negative roll return (futures-based funds underperform spot)
  Backwardation: F < S → positive roll return

Commodity Index Return = Spot Return + Roll Return + Collateral Return
```

---

## 33. ESG Integration in Valuation

### 33.1 CFA L3 — ESG Framework

```
ESG Integration Methods:
  1. Exclusionary Screening: Remove sectors/companies (tobacco, weapons, fossil fuels)
  2. Positive/Best-in-Class: Select ESG leaders within each sector
  3. ESG Integration: Incorporate ESG factors into fundamental analysis
  4. Thematic Investing: Target ESG themes (clean energy, water, social impact)
  5. Impact Investing: Measurable positive impact alongside financial returns
  6. Active Ownership: Shareholder engagement, proxy voting
```

### 33.2 ESG Impact on Valuation

```
Revenue Impact:
  - Green revenue growth (new market opportunities)
  - Stranded asset risk (fossil fuel reserves that can't be extracted)
  - Regulatory risk (carbon taxes, emissions penalties)

Cost Impact:
  - Carbon pricing / emissions costs
  - Energy efficiency savings
  - Employee turnover reduction (better workplace → lower recruiting costs)
  - Supply chain resilience

Risk Premium Adjustments:
  High ESG Score → lower WACC (lower cost of equity + lower cost of debt)
  Typical adjustment: 50-200 bps reduction in cost of equity for top-quartile ESG
  
DCF Integration:
  Adjust cash flows: carbon costs, transition CapEx, green revenue
  Adjust discount rate: ESG risk premium (positive or negative)
  Adjust terminal value: sustainability of competitive advantage
```

---

## 34. Currency & International Valuation

### 34.1 Foreign Currency Concepts (CFA L1/L2/L3)

```
Spot Rate (S): Current exchange rate for immediate delivery
Forward Rate (F): Rate agreed today for future delivery

Covered Interest Rate Parity:
  F/S = (1 + r_domestic) / (1 + r_foreign)

Uncovered Interest Rate Parity:
  E(S_future) / S = (1 + r_domestic) / (1 + r_foreign)
  Higher interest rate currency expected to depreciate

Purchasing Power Parity (PPP):
  Relative PPP: %ΔS ≈ π_domestic - π_foreign
  Absolute PPP: S = P_domestic / P_foreign
```

### 34.2 International DCF Valuation

```
Approach 1: Foreign Currency Cash Flows → Convert to Domestic
  1. Project FCFs in foreign currency
  2. Discount at foreign-currency WACC
  3. Convert terminal EV at projected spot rate
  OR
  1. Convert each year's FCF at projected forward rates
  2. Discount at domestic-currency WACC

Approach 2: Domestic Currency Cash Flows
  1. Convert all FCFs to domestic currency at forward rates
  2. Discount at domestic-currency WACC
  
Both approaches should give the same result if forward rates are used consistently.

Foreign Currency WACC:
  WACC_foreign = WACC_domestic × [(1 + r_foreign) / (1 + r_domestic)]
  (Fisher approximation)
```

### 34.3 Country Risk in Valuation

```
Approaches to Country Risk:
  1. Country Spread Model:
     Ke = Rf(domestic) + β × ERP(global) + Country Risk Premium

  2. Sovereign Spread:
     CRP = Sovereign Bond Yield - US Treasury Yield (same maturity)

  3. Damodaran Approach:
     CRP = Sovereign Default Spread × (σ_equity_market / σ_sovereign_bond)

  4. Relative Equity Market Volatility:
     CRP = ERP_US × (σ_foreign_equity / σ_US_equity) - ERP_US

  5. Political Risk Rating:
     Map ICRG or similar scores to risk premiums
```

### 34.4 Currency Hedging in Portfolio Context (CFA L3)

```
Hedging Decision Framework:
  Hedge Ratio = % of foreign currency exposure hedged

  Full Hedge: 100% hedged → eliminates currency risk (but costs carry)
  Partial Hedge: 50% typical starting point
  No Hedge: Accept currency risk for potential diversification benefit

Cost of Hedging:
  Forward Premium/Discount = (F - S) / S ≈ r_domestic - r_foreign
  If r_domestic > r_foreign → hedging costs money (forward premium)
  If r_domestic < r_foreign → hedging generates income (forward discount)

Regret Minimization:
  Hedge at least 50% → minimizes regret in both rising and falling FX scenarios
```

---

## PART IV: FMVA — Applied Financial Modeling & Analysis

---

## 35. Financial Statement Analysis & Quality of Earnings

### 35.1 Quality of Earnings Assessment (CFA L2 / FMVA)

```
Earnings Quality Indicators:
  HIGH Quality:                          LOW Quality:
  - Cash earnings ≈ Accrual earnings     - Large gap between NI and CFO
  - Sustainable, recurring revenue       - One-time gains boosting NI
  - Conservative accounting policies     - Aggressive revenue recognition
  - Low receivables growth vs revenue    - Receivables growing faster than revenue
  - Consistent with industry norms       - Frequent "non-recurring" charges
  - Clean audit opinion                  - Qualified audit opinion
```

### 35.2 Accrual Analysis

```
Total Accruals = Net Income - Cash Flow from Operations

Accrual Ratio (Balance Sheet Approach):
  Accrual Ratio = (ΔNon-Cash Assets - ΔNon-Debt Liabilities) / Average Total Assets

Accrual Ratio (Cash Flow Approach):
  Accrual Ratio = (NI - CFO - CFI) / Average Total Assets

Red Flag: Persistently high positive accruals → earnings quality concern
  → Earnings may be overstated relative to cash generation
```

### 35.3 Revenue Recognition Red Flags

```
Warning Signs:
  - Revenue growing faster than cash collections (DSO rising)
  - Bill-and-hold transactions
  - Channel stuffing (loading distributors at quarter-end)
  - Round-tripping / barter transactions
  - Premature revenue recognition on long-term contracts
  - Changes in revenue recognition policy
  - Related-party transactions as revenue source

Beneish M-Score (Earnings Manipulation Detector):
  M = -4.84 + 0.920(DSRI) + 0.528(GMI) + 0.404(AQI) + 0.892(SGI) 
      + 0.115(DEPI) - 0.172(SGAI) + 4.679(TATA) - 0.327(LVGI)
  
  Where:
    DSRI = Days Sales in Receivables Index (DSO growth)
    GMI = Gross Margin Index (margin deterioration)
    AQI = Asset Quality Index (capitalization aggressiveness)
    SGI = Sales Growth Index
    DEPI = Depreciation Index (slowing depreciation)
    SGAI = SGA Index
    TATA = Total Accruals to Total Assets
    LVGI = Leverage Index
  
  M > -1.78 → likely earnings manipulation
```

### 35.4 Adjustments for Normalized Earnings (FMVA)

```
Common Quality-of-Earnings Adjustments:
  Reported Net Income
  + Restructuring charges (if non-recurring)
  + Asset impairments / write-downs
  + Litigation settlements (one-time)
  - Gains on asset sales (non-operating)
  - Insurance proceeds (non-recurring)
  + Stock-based compensation (real cost, add back for cash but include for economics)
  ± LIFO to FIFO inventory adjustment
  ± Operating lease adjustments (pre-ASC 842)
  ± Pension adjustment (normalize pension expense)
  ± Excess owner compensation (for private companies)
  = Adjusted / Normalized Earnings
```

### 35.5 Altman Z-Score (Bankruptcy Prediction)

```
For Public Manufacturing Companies:
  Z = 1.2(X1) + 1.4(X2) + 3.3(X3) + 0.6(X4) + 1.0(X5)

  Where:
    X1 = Working Capital / Total Assets
    X2 = Retained Earnings / Total Assets
    X3 = EBIT / Total Assets
    X4 = Market Value of Equity / Book Value of Total Liabilities
    X5 = Sales / Total Assets

  Interpretation:
    Z > 2.99 → "Safe" zone (low bankruptcy risk)
    1.81 < Z < 2.99 → "Grey" zone (moderate risk)
    Z < 1.81 → "Distress" zone (high bankruptcy risk)

For Private Companies (Z'-Score):
  Z' = 0.717(X1) + 0.847(X2) + 3.107(X3) + 0.420(X4) + 0.998(X5)
  X4 modified: Book Value of Equity / Book Value of Total Liabilities
```

---

## 36. FP&A: Budgeting & Forecasting

### 36.1 FP&A Framework (FMVA)

```
Planning Hierarchy:
  Strategic Plan (3-5 years): Long-term direction, capital allocation
  Annual Budget (1 year): Detailed revenue, cost, and capital plans
  Rolling Forecast (12-18 months): Updated quarterly, replaces static budget
  Monthly Variance Analysis: Actual vs. Budget vs. Forecast
```

### 36.2 Budgeting Methods

```
Incremental Budget:
  Next Year = This Year × (1 + Adjustment %)
  Pro: Simple, fast
  Con: Perpetuates inefficiencies, no zero-base review

Zero-Based Budget (ZBB):
  Start from $0; every expense must be justified
  Pro: Eliminates waste, forces prioritization
  Con: Time-consuming, can cut productive spending

Activity-Based Budget (ABB):
  Cost = Activity Driver × Cost per Activity
  Example: Customer Support Cost = # Tickets × Cost per Ticket Resolution
  Pro: Links costs to business drivers
  Con: Requires detailed activity tracking

Driver-Based Budget:
  Key drivers (headcount, units sold, subscribers) → cascade to financial outcomes
  Most aligned with financial modeling principles
```

### 36.3 Variance Analysis

```
Revenue Variance:
  Total Revenue Variance = Actual Revenue - Budgeted Revenue
  
  Price Variance = (Actual Price - Budget Price) × Actual Volume
  Volume Variance = (Actual Volume - Budget Volume) × Budget Price
  Mix Variance = Δ(Product Mix) × Weighted Contribution Margin

Cost Variance:
  Total Cost Variance = Actual Cost - Budgeted Cost (favorable if negative)
  
  Spending Variance = (Actual Rate - Budget Rate) × Actual Hours/Units
  Efficiency Variance = (Actual Hours - Budget Hours) × Budget Rate
  
  Flexible Budget Variance: vs. budget adjusted for actual volume
  Sales Volume Variance: Flexible Budget vs. Static Budget
```

### 36.4 Rolling Forecast Best Practices

```
Always maintain 12-18 month forward view:
  Each quarter, drop the completed quarter and add a new one

Key Principles:
  1. Focus on material line items (80/20 rule)
  2. Driver-based, not line-item detail
  3. 3-5 scenarios (base, optimistic, pessimistic)
  4. Update assumptions, not formulas
  5. Separate known (contracted) from unknown (pipeline) revenue
  6. Track forecast accuracy over time (improve calibration)
```

---

## 37. Sum-of-the-Parts (SOTP) Valuation

### 37.1 SOTP Concept (FMVA / Wall Street)

```
When to Use SOTP:
  - Conglomerates with diverse business segments
  - Company with a high-growth division + mature division
  - Pre-spin-off / divestiture analysis
  - When segment-level multiples differ significantly

SOTP Value = Σ (Segment Value) - Corporate Overhead - Net Debt + Excess Cash
```

### 37.2 SOTP Calculation

```
Step 1: Identify distinct business segments (use 10-K segment reporting)

Step 2: Select appropriate valuation method per segment
  - DCF for segments with predictable cash flows
  - EV/EBITDA for segments with comparable public peers
  - EV/Revenue for high-growth/unprofitable segments

Step 3: Value each segment independently

Step 4: Sum segment values

Step 5: Apply adjustments
  - Subtract: Unallocated corporate costs (capitalize at appropriate multiple)
  - Subtract: Net Debt (total company level)
  - Add: Excess cash, non-operating assets, equity investments
  - Subtract: Minority interests, pension deficits, other claims

Step 6: Divide by diluted shares for per-share value

Example SOTP:
  Segment A (Tech): $200M EBITDA × 15x = $3,000M
  Segment B (Mfg):  $150M EBITDA × 8x  = $1,200M  
  Segment C (Svcs): $80M EBITDA × 12x  = $960M
  Total Segment Value                   = $5,160M
  - Corporate Costs: $40M × 10x         = ($400M)
  = Aggregate Enterprise Value           = $4,760M
  - Net Debt                             = ($800M)
  = Equity Value                         = $3,960M
  ÷ Diluted Shares                       = 100M
  = Implied Share Price                  = $39.60
```

### 37.3 Conglomerate Discount

```
Conglomerate Discount = (SOTP Value - Market Trading Value) / SOTP Value

Typical Range: 10% – 30%

Reasons for Conglomerate Discount:
  - Management complexity / inefficiency
  - Lack of transparency (hard to analyze)
  - Cross-subsidization of poor segments
  - Capital allocation inefficiency
  - Investor preference for "pure plays"
  - Agency costs

Catalyst for Value Unlock:
  - Spin-off or split-up
  - Activist investor involvement
  - Sale of underperforming segments
  - Tracking stocks
  - IPO of subsidiary
```

---

## 38. Real Estate Financial Modeling

### 38.1 Property-Level Financial Model (FMVA)

```
Revenue Build:
  Gross Potential Rent (GPR) = Σ (Unit_i × Rent/Unit_i × 12)
  - Vacancy Loss: GPR × Vacancy Rate (5-10% stabilized)
  - Concessions / Free Rent
  + Other Income (parking, laundry, late fees, pet fees)
  = Effective Gross Income (EGI)

Operating Expenses:
  - Property Taxes (mill rate × assessed value)
  - Insurance
  - Utilities
  - Repairs & Maintenance
  - Property Management Fee (3-8% of EGI)
  - Reserves for Replacement (CapEx reserves)
  - General & Administrative
  = Total Operating Expenses

Net Operating Income (NOI) = EGI - Operating Expenses
```

### 38.2 Real Estate Return Metrics

```
Cap Rate = NOI / Property Value
  Going-In Cap Rate: Based on Year 1 NOI / Purchase Price
  Exit Cap Rate: Based on projected NOI at sale / Exit Price
  Typically: Exit Cap = Going-In Cap + 25-100 bps

Cash-on-Cash Return = Before-Tax Cash Flow / Equity Invested
  Before-Tax Cash Flow = NOI - Debt Service
  Target: 8-12% (stabilized)

Equity Multiple = Total Distributions / Total Equity Invested
  Target: 1.5x - 2.5x over 5-7 year hold

IRR = Solve for rate that equates PV of all cash flows to initial equity investment
  Target IRR (Value-Add): 15-20%
  Target IRR (Core): 7-10%
  Target IRR (Opportunistic): 20%+
```

### 38.3 Debt Structure in Real Estate

```
Loan-to-Value (LTV) = Loan Amount / Property Value
  Typical: 60-80%

Debt Service Coverage Ratio (DSCR) = NOI / Annual Debt Service
  Minimum Required: 1.20x - 1.40x

Debt Yield = NOI / Loan Amount
  Minimum Required: 8-10%

Interest-Only Period: 1-5 years (common in commercial)
Amortization: 25-30 years (fully amortizing after IO period)
Loan Term: 5-10 years (with balloon payment at maturity)
```

### 38.4 Waterfall / Promote Structure

```
Typical GP/LP Waterfall:

Tier 1: Return of Capital (100% to LPs until initial equity returned)
Tier 2: Preferred Return (e.g., 8% IRR to LPs)
Tier 3: Catch-Up (e.g., 50/50 GP/LP until GP receives 20% of total profits)
Tier 4: Residual Split (e.g., 80% LP / 20% GP above target IRR)

Promote = GP's share of profits above the preferred return
  "Carried interest" equivalent in real estate
```

---

## 39. Project Finance Modeling

### 39.1 Project Finance Overview (FMVA)

```
Key Characteristics:
  - Non-recourse or limited recourse financing
  - SPV (Special Purpose Vehicle) isolates project risk
  - Cash flows are sole source of debt repayment
  - High leverage (60-90% debt)
  - Long tenors (10-30 years)
  - Detailed contractual framework (offtake agreements, supply contracts)

Common Sectors:
  - Power & energy (conventional, renewable)
  - Infrastructure (toll roads, bridges, airports)
  - Mining & natural resources
  - Telecommunications
  - Public-Private Partnerships (PPP/P3)
```

### 39.2 Project Finance Model Structure

```
Revenue:
  Contracted Revenue: Volume × Price (from offtake/PPA agreement)
  Merchant Revenue: Volume × Market Price (uncontracted, higher risk)
  Availability Payments: Fixed payments for being operational (PPP)

Operating Costs:
  Fixed O&M: Annual maintenance, insurance, land lease
  Variable O&M: Per-unit operating cost (fuel, consumables)
  Major Maintenance Reserve: Periodic overhaul / lifecycle costs

Capital Structure:
  Senior Debt: 60-80% of total project cost
  Mezzanine / Subordinated Debt: 5-15%
  Equity: 15-30%
  
  Construction Phase: Drawdown schedule (equity first, then debt)
  Operating Phase: Debt service from project cash flows
```

### 39.3 Key Project Finance Metrics

```
DSCR (Debt Service Coverage Ratio):
  DSCR = Cash Flow Available for Debt Service (CFADS) / Total Debt Service
  Minimum DSCR: 1.20x - 1.50x (varies by sector and risk)
  Average DSCR (ADSCR): Average over loan life
  Lock-Up DSCR: Below this triggers cash lock-up (e.g., 1.10x)
  Default DSCR: Below this triggers event of default (e.g., 1.05x)

LLCR (Loan Life Coverage Ratio):
  LLCR = NPV(CFADS over remaining loan life) / Debt Outstanding
  Minimum: 1.20x - 1.50x

PLCR (Project Life Coverage Ratio):
  PLCR = NPV(CFADS over remaining project life) / Debt Outstanding
  Generally > LLCR (captures post-loan-repayment cash flows)

Maximum Debt Size:
  Sculpted Debt = CFADS_t / Target DSCR (for each period)
  PV(Sculpted Payments) at lending rate = Maximum Debt Size
```

### 39.4 Debt Sculpting

```
Sculpting matches debt service payments to the project's cash flow profile:

Period    CFADS    Target DSCR    Max Debt Service    Principal    Interest
1         $10M     1.30x          $7.7M               $4.7M        $3.0M
2         $12M     1.30x          $9.2M               $6.5M        $2.7M
3         $15M     1.30x          $11.5M              $9.1M        $2.4M
4         $13M     1.30x          $10.0M              $8.2M        $1.8M
5         $11M     1.30x          $8.5M               $7.4M        $1.1M

Benefits: Maximizes debt capacity, maintains constant coverage
vs. Level Payment: Fixed annual payments regardless of cash flow profile
```

---

## 40. Model Audit, Error Checking & Governance

### 40.1 Model Audit Framework (FMVA / Wall Street)

```
Model Audit Scope:
  1. Integrity Testing: No errors, circular references, broken links
  2. Logic Review: Formulas correctly implement stated methodology
  3. Assumption Validation: Inputs are reasonable and sourced
  4. Stress Testing: Model behaves correctly under extreme scenarios
  5. Presentation Review: Output is clear, consistent, professional
```

### 40.2 Common Financial Model Errors

| Error Type | Description | Detection Method |
|---|---|---|
| **Hard-coded overrides** | Constant in formula row | Formula audit (Ctrl+~) |
| **Broken links** | #REF! errors from deleted sheets | Error scan |
| **Circular references** | Interest ↔ Cash ↔ Debt | Excel status bar check |
| **Inconsistent formulas** | Row formula changes mid-row | Row comparison audit |
| **Sign convention errors** | Mixed positive/negative treatments | Sum check; trace large variances |
| **Timing errors** | Off-by-one in discounting | Verify: Year 0 vs Year 1 cash flows |
| **Double counting** | Same item in multiple places | Trace through flow |
| **Unit errors** | Mixing millions / thousands / actuals | Check all row labels |
| **Missing intercompany eliminations** | Consolidation errors | Separate elimination schedule |
| **Terminal value errors** | g > WACC, wrong year's FCF | Sanity check TV as % of total value |

### 40.3 Built-In Model Checks

```
Essential Checks Tab:

Check 1: Balance Sheet Balances
  = Assets - Liabilities - Equity = 0 (every period)

Check 2: Cash Flow Reconciliation
  Beginning Cash + Net Change in Cash (from CFS) = Ending Cash

Check 3: Retained Earnings Roll-Forward
  Beginning RE + Net Income - Dividends = Ending RE

Check 4: Debt Schedule Reconciliation
  Σ Individual Tranche Balances = Total Debt on Balance Sheet

Check 5: Revenue Build Tie-Out
  Detail Revenue Schedule Total = Income Statement Revenue

Check 6: Interest Expense Tie-Out
  Debt Schedule Interest = Income Statement Interest Expense

Check 7: CapEx Tie-Out
  CapEx Schedule = CFS Investing Activities CapEx

Check 8: Tax Schedule Tie-Out
  Tax Schedule Tax Expense = Income Statement Tax Expense

Check 9: Share Count Reconciliation
  Share Schedule Diluted Shares = EPS Denominator

Check 10: Terminal Value Reasonableness
  TV as % of Total Enterprise Value < 75% (ideally 60-70%)
  Implied Terminal FCF Yield > 3%
  Implied Terminal Multiple within reasonable range
```

### 40.4 Model Governance Best Practices

```
1. Version Control:
   - File naming: [Company]_Model_v[X.Y]_[Date]_[Initials]
   - Change log on cover page
   - Archive each major version

2. Access Control:
   - Protect formula cells (lock all non-input cells)
   - Password protect structural sheets
   - Use data validation for assumption inputs

3. Documentation:
   - Assumption source references (10-K page, analyst report, mgmt call)
   - Methodology notes for complex calculations
   - Model map / flow diagram

4. Peer Review Protocol:
   - Independent review of all assumptions
   - Formula audit by someone other than the builder
   - Sign-off checklist before external distribution

5. Sensitivity Testing Protocol:
   - Test extreme values for all key inputs
   - Verify model doesn't break (no #DIV/0!, #REF!, negative prices)
   - Confirm directional logic (higher WACC → lower valuation)
```

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
- CFA Institute. (2026). *CFA Program Curriculum Level I, Level II & Level III — Equity Valuation, Corporate Issuers, Fixed Income, Portfolio Management, Alternative Investments, Behavioral Finance.*
- Damodaran, A. *Investment Valuation: Tools and Techniques for Determining the Value of Any Asset.*
- Rosenbaum, J. & Pearl, J. *Investment Banking: Valuation, LBOs, M&A, and IPOs.*
- Koller, T., Goedhart, M., & Wessels, D. *Valuation: Measuring and Managing the Value of Companies (McKinsey).*
- Wall Street Prep / Financial Edge Training best practices.
- Corporate Finance Institute (CFI). *FMVA Certification Curriculum — Financial Modeling, Business Valuation, FP&A, Credit Analysis.*
- Duff & Phelps / Kroll. *Cost of Capital Navigator.*
- Beneish, M.D. *The Detection of Earnings Manipulation.*
- Altman, E.I. *Financial Ratios, Discriminant Analysis and the Prediction of Corporate Bankruptcy.*
- Geltner, D. et al. *Commercial Real Estate Analysis and Investments.*
- Yescombe, E.R. *Principles of Project Finance.*

---

*This guide is intended for educational purposes and aligns with the CFA Institute Level I, Level II, and Level III curriculum, Wall Street investment banking best practices, and the Corporate Finance Institute (CFI) FMVA certification program.*
