"""
Financial Calculation Engine

Provides precise financial calculations for loan payments using Decimal arithmetic.
Supports multiple loan types and Persian/Jalali calendar integration.
"""

from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal, getcontext
from typing import List, Optional, Tuple

from app.modules.reminders.schemas import LoanTypeEnum, PaymentScheduleItem, PaymentStatusEnum

# Set precision for financial calculations
getcontext().prec = 28

# Constants
MONTHS_PER_YEAR = Decimal("12")
DAYS_PER_YEAR = Decimal("365")
PERCENT_DIVISOR = Decimal("100")


def to_jalali(gregorian_date: date) -> str:
    """
    Convert Gregorian date to Jalali (Persian) calendar string.

    This is a simplified implementation. For production, consider using
    a library like jdatetime or persiantools.
    """
    # Jalali calendar algorithm
    gy = gregorian_date.year
    gm = gregorian_date.month
    gd = gregorian_date.day

    g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]

    gy2 = gy - 1600 if gm > 2 else gy - 1601
    days = 365 * gy2 + (gy2 + 3) // 4 - (gy2 + 99) // 100 + (gy2 + 399) // 400 + gd + g_d_m[gm - 1]

    jy = -1595 + 33 * (days // 12053)
    days %= 12053
    jy += 4 * (days // 1461)
    days %= 1461

    if days > 365:
        jy += (days - 1) // 365
        days = (days - 1) % 365

    if days < 186:
        jm = 1 + days // 31
        jd = 1 + days % 31
    else:
        jm = 7 + (days - 186) // 30
        jd = 1 + (days - 186) % 30

    return f"{jy}/{jm:02d}/{jd:02d}"


def get_persian_month_name(month: int) -> str:
    """Get Persian month name."""
    months = [
        "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
        "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
    ]
    return months[month - 1] if 1 <= month <= 12 else ""


def decimal_str(value: Decimal, places: int = 0) -> str:
    """Convert Decimal to string with specified decimal places."""
    if places == 0:
        return str(value.quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    quantizer = Decimal("0." + "0" * places)
    return str(value.quantize(quantizer, rounding=ROUND_HALF_UP))


def calculate_monthly_interest_rate(annual_rate_percent: Decimal) -> Decimal:
    """
    Calculate monthly interest rate from annual rate.

    Args:
        annual_rate_percent: Annual interest rate in percent (e.g., 18 for 18%)

    Returns:
        Monthly interest rate as decimal (e.g., 0.015 for 1.5%)
    """
    return annual_rate_percent / PERCENT_DIVISOR / MONTHS_PER_YEAR


def calculate_equal_installment(
    principal: Decimal,
    annual_rate_percent: Decimal,
    total_months: int
) -> Decimal:
    """
    Calculate monthly payment for equal installment (annuity) method.

    Formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
    Where:
        M = Monthly payment
        P = Principal
        r = Monthly interest rate
        n = Number of payments

    This is the most common method in Iranian banks (قسط مساوی).
    """
    if annual_rate_percent == Decimal("0"):
        # Interest-free loan
        return principal / Decimal(total_months)

    r = calculate_monthly_interest_rate(annual_rate_percent)
    n = Decimal(total_months)

    # Calculate (1 + r)^n using precise arithmetic
    one_plus_r = Decimal("1") + r
    compound_factor = one_plus_r ** n

    # Calculate monthly payment
    numerator = principal * r * compound_factor
    denominator = compound_factor - Decimal("1")

    return numerator / denominator


def calculate_reducing_balance_payment(
    remaining_principal: Decimal,
    principal_payment: Decimal,
    monthly_rate: Decimal
) -> Tuple[Decimal, Decimal]:
    """
    Calculate payment for reducing balance method.

    In this method, the principal payment is fixed but interest decreases
    as the balance reduces (مانده نزولی).

    Returns:
        Tuple of (interest_payment, total_payment)
    """
    interest_payment = remaining_principal * monthly_rate
    total_payment = principal_payment + interest_payment
    return interest_payment, total_payment


def calculate_graduated_payment(
    principal: Decimal,
    annual_rate_percent: Decimal,
    current_month: int,
    total_months: int,
    graduation_rate: Decimal = Decimal("0.05")
) -> Decimal:
    """
    Calculate payment for graduated (step-up) method.

    Payments increase periodically (usually annually) by a fixed percentage.
    This is used for borrowers expecting income growth (پلکانی).
    """
    # Calculate base payment
    base_payment = calculate_equal_installment(principal, annual_rate_percent, total_months)

    # Calculate year number (0-indexed)
    year = (current_month - 1) // 12

    # Apply graduation factor
    graduation_factor = (Decimal("1") + graduation_rate) ** year

    return base_payment * graduation_factor


def generate_payment_schedule(
    principal_amount: str,
    interest_rate: str,
    total_installments: int,
    loan_type: LoanTypeEnum,
    start_date: date,
    payment_day: int
) -> List[PaymentScheduleItem]:
    """
    Generate complete payment schedule for a loan.

    Args:
        principal_amount: Loan principal as string
        interest_rate: Annual interest rate percent as string
        total_installments: Number of monthly payments
        loan_type: Type of loan repayment method
        start_date: Loan start date
        payment_day: Day of month for payments

    Returns:
        List of PaymentScheduleItem objects
    """
    principal = Decimal(principal_amount)
    annual_rate = Decimal(interest_rate)
    monthly_rate = calculate_monthly_interest_rate(annual_rate)

    schedule: List[PaymentScheduleItem] = []
    remaining_balance = principal

    if loan_type == LoanTypeEnum.EQUAL_INSTALLMENTS:
        monthly_payment = calculate_equal_installment(principal, annual_rate, total_installments)

        for i in range(1, total_installments + 1):
            # Calculate interest for this period
            interest_payment = remaining_balance * monthly_rate
            principal_payment = monthly_payment - interest_payment

            # Adjust last payment for rounding
            if i == total_installments:
                principal_payment = remaining_balance
                monthly_payment = principal_payment + interest_payment

            remaining_balance -= principal_payment

            # Ensure remaining balance doesn't go negative
            if remaining_balance < Decimal("0"):
                remaining_balance = Decimal("0")

            # Calculate due date
            due_date = calculate_due_date(start_date, i, payment_day)

            schedule.append(PaymentScheduleItem(
                installment_number=i,
                due_date=due_date,
                due_date_jalali=to_jalali(due_date),
                principal_payment=decimal_str(principal_payment),
                interest_payment=decimal_str(interest_payment),
                total_payment=decimal_str(monthly_payment),
                remaining_balance=decimal_str(remaining_balance),
                status=PaymentStatusEnum.PENDING
            ))

    elif loan_type == LoanTypeEnum.REDUCING_BALANCE:
        fixed_principal = principal / Decimal(total_installments)

        for i in range(1, total_installments + 1):
            interest_payment = remaining_balance * monthly_rate

            # Adjust last payment
            if i == total_installments:
                principal_payment = remaining_balance
            else:
                principal_payment = fixed_principal

            total_payment = principal_payment + interest_payment
            remaining_balance -= principal_payment

            if remaining_balance < Decimal("0"):
                remaining_balance = Decimal("0")

            due_date = calculate_due_date(start_date, i, payment_day)

            schedule.append(PaymentScheduleItem(
                installment_number=i,
                due_date=due_date,
                due_date_jalali=to_jalali(due_date),
                principal_payment=decimal_str(principal_payment),
                interest_payment=decimal_str(interest_payment),
                total_payment=decimal_str(total_payment),
                remaining_balance=decimal_str(remaining_balance),
                status=PaymentStatusEnum.PENDING
            ))

    elif loan_type == LoanTypeEnum.GRADUATED:
        # Graduated payments with 5% annual increase
        graduation_rate = Decimal("0.05")
        base_payment = calculate_equal_installment(principal, annual_rate, total_installments)

        for i in range(1, total_installments + 1):
            year = (i - 1) // 12
            current_payment = base_payment * ((Decimal("1") + graduation_rate) ** year)

            interest_payment = remaining_balance * monthly_rate
            principal_payment = current_payment - interest_payment

            # Adjust if principal payment exceeds remaining balance
            if principal_payment > remaining_balance:
                principal_payment = remaining_balance
                current_payment = principal_payment + interest_payment

            remaining_balance -= principal_payment

            if remaining_balance < Decimal("0"):
                remaining_balance = Decimal("0")

            due_date = calculate_due_date(start_date, i, payment_day)

            schedule.append(PaymentScheduleItem(
                installment_number=i,
                due_date=due_date,
                due_date_jalali=to_jalali(due_date),
                principal_payment=decimal_str(principal_payment),
                interest_payment=decimal_str(interest_payment),
                total_payment=decimal_str(current_payment),
                remaining_balance=decimal_str(remaining_balance),
                status=PaymentStatusEnum.PENDING
            ))

    elif loan_type == LoanTypeEnum.BALLOON:
        # Interest only during term, principal paid at end
        for i in range(1, total_installments + 1):
            interest_payment = remaining_balance * monthly_rate

            if i == total_installments:
                # Final balloon payment
                principal_payment = remaining_balance
                total_payment = principal_payment + interest_payment
                remaining_balance = Decimal("0")
            else:
                principal_payment = Decimal("0")
                total_payment = interest_payment

            due_date = calculate_due_date(start_date, i, payment_day)

            schedule.append(PaymentScheduleItem(
                installment_number=i,
                due_date=due_date,
                due_date_jalali=to_jalali(due_date),
                principal_payment=decimal_str(principal_payment),
                interest_payment=decimal_str(interest_payment),
                total_payment=decimal_str(total_payment),
                remaining_balance=decimal_str(remaining_balance),
                status=PaymentStatusEnum.PENDING
            ))

    elif loan_type == LoanTypeEnum.INTEREST_ONLY:
        # Interest only, no principal reduction
        for i in range(1, total_installments + 1):
            interest_payment = principal * monthly_rate

            due_date = calculate_due_date(start_date, i, payment_day)

            schedule.append(PaymentScheduleItem(
                installment_number=i,
                due_date=due_date,
                due_date_jalali=to_jalali(due_date),
                principal_payment=decimal_str(Decimal("0")),
                interest_payment=decimal_str(interest_payment),
                total_payment=decimal_str(interest_payment),
                remaining_balance=decimal_str(principal),  # Principal unchanged
                status=PaymentStatusEnum.PENDING
            ))

    return schedule


def calculate_due_date(start_date: date, installment_number: int, payment_day: int) -> date:
    """
    Calculate the due date for a specific installment.

    Handles month-end edge cases (e.g., payment_day=31 in February).
    """
    # Calculate target month and year
    total_months = start_date.month + installment_number
    target_year = start_date.year + (total_months - 1) // 12
    target_month = ((total_months - 1) % 12) + 1

    # Handle day overflow (e.g., day 31 in February)
    import calendar
    max_day = calendar.monthrange(target_year, target_month)[1]
    actual_day = min(payment_day, max_day)

    return date(target_year, target_month, actual_day)


def calculate_loan_summary(
    principal_amount: str,
    interest_rate: str,
    total_installments: int,
    loan_type: LoanTypeEnum
) -> dict:
    """
    Calculate loan summary without full schedule.

    Returns:
        Dictionary with monthly_payment, total_payment, total_interest, effective_rate
    """
    principal = Decimal(principal_amount)
    annual_rate = Decimal(interest_rate)

    if loan_type == LoanTypeEnum.EQUAL_INSTALLMENTS:
        monthly_payment = calculate_equal_installment(principal, annual_rate, total_installments)
        total_payment = monthly_payment * Decimal(total_installments)
    elif loan_type == LoanTypeEnum.REDUCING_BALANCE:
        # Calculate total by summing decreasing payments
        monthly_rate = calculate_monthly_interest_rate(annual_rate)
        fixed_principal = principal / Decimal(total_installments)
        total_interest = Decimal("0")
        remaining = principal

        for _ in range(total_installments):
            total_interest += remaining * monthly_rate
            remaining -= fixed_principal

        total_payment = principal + total_interest
        monthly_payment = total_payment / Decimal(total_installments)  # Average
    elif loan_type == LoanTypeEnum.BALLOON:
        monthly_rate = calculate_monthly_interest_rate(annual_rate)
        monthly_interest = principal * monthly_rate
        total_payment = (monthly_interest * Decimal(total_installments - 1)) + principal + monthly_interest
        monthly_payment = monthly_interest  # Regular payment (excluding balloon)
    elif loan_type == LoanTypeEnum.INTEREST_ONLY:
        monthly_rate = calculate_monthly_interest_rate(annual_rate)
        monthly_payment = principal * monthly_rate
        total_payment = monthly_payment * Decimal(total_installments)
    else:
        # Default to equal installments
        monthly_payment = calculate_equal_installment(principal, annual_rate, total_installments)
        total_payment = monthly_payment * Decimal(total_installments)

    total_interest = total_payment - principal

    # Calculate effective annual rate
    if principal > Decimal("0") and total_installments > 0:
        years = Decimal(total_installments) / MONTHS_PER_YEAR
        if years > Decimal("0"):
            effective_rate = ((total_payment / principal) ** (Decimal("1") / years) - Decimal("1")) * PERCENT_DIVISOR
        else:
            effective_rate = Decimal("0")
    else:
        effective_rate = Decimal("0")

    return {
        "monthly_payment": decimal_str(monthly_payment),
        "total_payment": decimal_str(total_payment),
        "total_interest": decimal_str(total_interest),
        "effective_rate": decimal_str(effective_rate, 2)
    }


def calculate_early_payoff(
    remaining_balance: str,
    monthly_payment: str,
    annual_rate_percent: str,
    remaining_months: int,
    prepayment_amount: str
) -> dict:
    """
    Calculate the impact of an early/extra payment.

    Returns savings and new payoff timeline.
    """
    balance = Decimal(remaining_balance)
    payment = Decimal(monthly_payment)
    rate = Decimal(annual_rate_percent)
    prepayment = Decimal(prepayment_amount)

    monthly_rate = calculate_monthly_interest_rate(rate)

    # Calculate remaining interest without prepayment
    original_total_interest = Decimal("0")
    temp_balance = balance
    for _ in range(remaining_months):
        interest = temp_balance * monthly_rate
        original_total_interest += interest
        principal = payment - interest
        temp_balance -= principal

    # Calculate remaining interest with prepayment
    new_balance = balance - prepayment
    new_total_interest = Decimal("0")
    new_months = 0

    while new_balance > Decimal("0") and new_months < remaining_months * 2:
        interest = new_balance * monthly_rate
        new_total_interest += interest
        principal = payment - interest
        new_balance -= principal
        new_months += 1

    interest_savings = original_total_interest - new_total_interest
    months_saved = remaining_months - new_months

    return {
        "interest_savings": decimal_str(interest_savings),
        "months_saved": max(0, months_saved),
        "new_payoff_months": new_months,
        "new_total_interest": decimal_str(new_total_interest)
    }


def calculate_late_payment_penalty(
    amount_due: str,
    days_late: int,
    penalty_rate_percent: str = "6"  # Default 6% annual late penalty
) -> dict:
    """
    Calculate late payment penalty.

    Iranian banks typically charge additional interest for late payments.
    """
    amount = Decimal(amount_due)
    rate = Decimal(penalty_rate_percent)

    daily_rate = rate / PERCENT_DIVISOR / DAYS_PER_YEAR
    penalty = amount * daily_rate * Decimal(days_late)
    total_due = amount + penalty

    return {
        "original_amount": decimal_str(amount),
        "penalty": decimal_str(penalty),
        "total_due": decimal_str(total_due),
        "days_late": days_late
    }
