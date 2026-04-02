import { useCallback, useMemo, useState, memo } from "react";
import PropTypes from "prop-types";
import Button from "./Button";

/* =========================
   Helpers
========================= */
const parseNumber = (val) => {
  if (val === null || val === undefined) return NaN;
  const s = String(val).trim();
  if (!s) return NaN;

  // EU: remove thousands dots, convert comma to dot
  const normalized = s.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
};

const formatEuroNumber = (n) =>
  Number.isFinite(n)
    ? n.toLocaleString("nl-NL", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "";

const REQUIRED_WITHDRAWAL_RATE = 0.035;

const requiredPortfolioFromMonthlyWithdrawal = (monthly) =>
  (monthly * 12) / REQUIRED_WITHDRAWAL_RATE;

/* =========================
   Pension helpers
========================= */
const PENSION_DATES = [
  { label: "Earliest retirement date", date: new Date(2064, 4, 1) },
  { label: "State pension date", date: new Date(2068, 5, 1) },
];

const monthsBetween = (from, to) =>
  (to.getFullYear() - from.getFullYear()) * 12 +
  (to.getMonth() - from.getMonth());

/* =========================
   Input Field (improved € alignment)
========================= */
const InputField = memo(function InputField({
  label,
  value,
  onChange,
  unit,
  unitPosition = "right",
  readOnly,
  helpText,
  inputId,
}) {
  const hasLeftUnit = unit && unitPosition === "left";
  const hasRightUnit = unit && unitPosition === "right";

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={inputId}
        className="text-sm font-medium text-gray-700 dark:text-gray-200"
      >
        {label}
      </label>

      <div className="relative">
        {hasLeftUnit && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
            {unit}
          </span>
        )}

        <input
          id={inputId}
          type="text"
          inputMode="number"
          value={value ?? ""}
          readOnly={readOnly}
          onChange={(e) => !readOnly && onChange?.(e.target.value)}
          className={[
            "h-11 w-full rounded-lg border",
            "border-gray-300 dark:border-gray-600",
            "bg-white dark:bg-gray-700",
            "text-gray-900 dark:text-white",
            "px-3",
            "text-base",
            "shadow-sm",
            "outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500",
            readOnly ? "opacity-70 cursor-not-allowed" : "",
            hasLeftUnit ? "pl-10" : "",
            hasRightUnit ? "pr-10" : "",
          ].join(" ")}
        />

        {hasRightUnit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
            {unit}
          </span>
        )}
      </div>

      {helpText ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">{helpText}</p>
      ) : null}
    </div>
  );
});

InputField.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func,
  unit: PropTypes.string,
  unitPosition: PropTypes.oneOf(["left", "right"]),
  readOnly: PropTypes.bool,
  helpText: PropTypes.string,
  inputId: PropTypes.string,
};

/* =========================
   Compound Calculator
========================= */
export default function CompoundCalculator({
  defaultCurrentValue = "",
  variant = "page", // "page" | "modal"
}) {
  const [currentValue, setCurrentValue] = useState(defaultCurrentValue);
  const [interest, setInterest] = useState("8,86");
  const [months, setMonths] = useState("");
  const [years, setYears] = useState("");
  const [futureValue, setFutureValue] = useState("");
  const [contribution, setContribution] = useState("");
  const [targetMonthlyWithdrawal, setTargetMonthlyWithdrawal] = useState("");

  /* ===== Sync months <-> years ===== */
  const handleMonthsChange = useCallback((val) => {
    setMonths(val);
    const n = parseNumber(val);
    setYears(Number.isFinite(n) ? (n / 12).toFixed(2).replace(".", ",") : "");
  }, []);

  const handleYearsChange = useCallback((val) => {
    setYears(val);
    const y = parseNumber(val);
    setMonths(Number.isFinite(y) ? String(Math.ceil(y * 12)) : "");
  }, []);

  /* ===== Reset ===== */
  const handleReset = useCallback(() => {
    setCurrentValue("");
    setInterest("");
    setMonths("");
    setYears("");
    setFutureValue("");
    setContribution("");
    setTargetMonthlyWithdrawal("");
  }, []);

  /* ===== Derived parsed values ===== */
  const parsed = useMemo(() => {
    const P = parseNumber(currentValue);
    const FV = parseNumber(futureValue);
    const n = parseNumber(months);
    const C = parseNumber(contribution);
    const iAnnual = parseNumber(interest) / 100;
    const targetW = parseNumber(targetMonthlyWithdrawal);

    const rMonthly = Number.isFinite(iAnnual)
      ? Math.pow(1 + iAnnual, 1 / 12) - 1
      : NaN;

    return {
      P,
      FV,
      n,
      C: Number.isFinite(C) ? C : 0,
      iAnnual,
      rMonthly,
      targetW,
    };
  }, [
    currentValue,
    futureValue,
    months,
    contribution,
    interest,
    targetMonthlyWithdrawal,
  ]);

  const interestValid =
    Number.isFinite(parsed.rMonthly) && parsed.rMonthly > -1;

  /* ===== Robust formulas (handle r=0) ===== */
  const fvWithContrib = useCallback((P, r, n, C) => {
    const pow = Math.pow(1 + r, n);
    if (Math.abs(r) < 1e-10) return P + C * n; // no growth
    return P * pow + C * ((pow - 1) / r);
  }, []);

  const pvFromFv = useCallback((FV, r, n, C) => {
    const pow = Math.pow(1 + r, n);
    if (Math.abs(r) < 1e-10) return FV - C * n; // no growth
    return (FV - C * ((pow - 1) / r)) / pow;
  }, []);

  const contribFromPvFv = useCallback((P, FV, r, n) => {
    if (n <= 0) return NaN;
    const pow = Math.pow(1 + r, n);

    if (Math.abs(r) < 1e-10) return (FV - P) / n; // no growth

    const denom = pow - 1;
    if (Math.abs(denom) < 1e-12) return NaN;

    return ((FV - P * pow) * r) / denom;
  }, []);

  const monthsFromPvFv = useCallback((P, FV, r, C) => {
    if (FV <= 0) return NaN;

    if (Math.abs(r) < 1e-10) {
      if (C <= 0) return NaN;
      return (FV - P) / C;
    }

    const numerator = FV * r + C;
    const denominator = P * r + C;
    if (denominator <= 0 || numerator <= 0) return NaN;

    return Math.log(numerator / denominator) / Math.log(1 + r);
  }, []);

  /* ===== Calculate ===== */
  const handleCalculate = useCallback(() => {
    if (!interestValid) return;

    const { P, FV, n, C, rMonthly: r, targetW } = parsed;

    // Solve months using target withdrawal (months empty)
    if (Number.isFinite(P) && months === "" && Number.isFinite(targetW)) {
      const targetPortfolio = requiredPortfolioFromMonthlyWithdrawal(targetW);
      const nCalc = monthsFromPvFv(P, targetPortfolio, r, C);
      if (!Number.isFinite(nCalc) || nCalc <= 0) return;

      handleMonthsChange(String(Math.ceil(nCalc)));
      setFutureValue(formatEuroNumber(targetPortfolio));
      return;
    }

    // Solve contribution using target withdrawal (contribution empty)
    if (
      Number.isFinite(P) &&
      Number.isFinite(n) &&
      contribution === "" &&
      Number.isFinite(targetW)
    ) {
      const targetPortfolio = requiredPortfolioFromMonthlyWithdrawal(targetW);
      const cCalc = contribFromPvFv(P, targetPortfolio, r, n);
      if (!Number.isFinite(cCalc)) return;

      setContribution(formatEuroNumber(cCalc));
      setFutureValue(formatEuroNumber(targetPortfolio));
      return;
    }

    // Solve FV (future value empty)
    if (Number.isFinite(P) && Number.isFinite(n) && futureValue === "") {
      const fv = fvWithContrib(P, r, n, C);
      if (!Number.isFinite(fv)) return;

      setFutureValue(formatEuroNumber(fv));
      return;
    }

    // Solve PV (current value empty)
    if (Number.isFinite(FV) && Number.isFinite(n) && currentValue === "") {
      const pv = pvFromFv(FV, r, n, C);
      if (!Number.isFinite(pv)) return;

      setCurrentValue(formatEuroNumber(pv));
      return;
    }

    // Solve C (contribution empty)
    if (
      Number.isFinite(P) &&
      Number.isFinite(FV) &&
      Number.isFinite(n) &&
      contribution === ""
    ) {
      const cCalc = contribFromPvFv(P, FV, r, n);
      if (!Number.isFinite(cCalc)) return;

      setContribution(formatEuroNumber(cCalc));
      return;
    }

    // Solve months (months empty)
    if (Number.isFinite(P) && Number.isFinite(FV) && months === "") {
      const nCalc = monthsFromPvFv(P, FV, r, C);
      if (!Number.isFinite(nCalc) || nCalc <= 0) return;

      handleMonthsChange(String(Math.ceil(nCalc)));
    }
  }, [
    interestValid,
    parsed,
    months,
    contribution,
    futureValue,
    currentValue,
    handleMonthsChange,
    fvWithContrib,
    pvFromFv,
    contribFromPvFv,
    monthsFromPvFv,
  ]);

  /* ===== Derived 3.5% Rule ===== */
  const { yearlyWithdrawal, monthlyWithdrawal } = useMemo(() => {
    const portfolioValue =
      parseNumber(futureValue) || parseNumber(currentValue);

    const yearly = Number.isFinite(portfolioValue)
      ? portfolioValue * REQUIRED_WITHDRAWAL_RATE
      : NaN;

    const monthly = Number.isFinite(yearly) ? yearly / 12 : NaN;

    return { yearlyWithdrawal: yearly, monthlyWithdrawal: monthly };
  }, [futureValue, currentValue]);

  /* ===== Pension projections ===== */
  const pensionProjections = useMemo(() => {
    const today = new Date();
    const Pcurr = parseNumber(currentValue);
    const Ccurr = parseNumber(contribution) || 0;
    const iAnnual = parseNumber(interest) / 100;

    const r = Number.isFinite(iAnnual)
      ? Math.pow(1 + iAnnual, 1 / 12) - 1
      : NaN;

    return PENSION_DATES.map(({ label, date }) => {
      const n = monthsBetween(today, date);

      if (!Number.isFinite(Pcurr) || !Number.isFinite(r) || n <= 0) {
        return { label, date, value: NaN, monthlyWithdrawal: NaN };
      }

      const fv =
        Math.abs(r) < 1e-10
          ? Pcurr + Ccurr * n
          : Pcurr * Math.pow(1 + r, n) + Ccurr * ((Math.pow(1 + r, n) - 1) / r);

      const mw = (fv * REQUIRED_WITHDRAWAL_RATE) / 12;

      return { label, date, value: fv, monthlyWithdrawal: mw };
    });
  }, [currentValue, contribution, interest]);

  const containerClass =
    variant === "modal"
      ? "space-y-4 md:space-y-6 max-w-none"
      : "p-4 md:p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl space-y-4 md:space-y-6 max-w-4xl mx-auto";

  return (
    <div className={containerClass}>
      {/* ===== Title (Modal Only) ===== */}
      {variant === "modal" && (
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Calculator
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Leave one field empty and press Calculate.
          </p>
        </div>
      )}

      {/* ===== INPUT SECTION ===== */}
      <div className="space-y-6">
        {/* Primary Inputs Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 md:p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="space-y-5">
            <InputField
              inputId="cc-current"
              label="Current Value"
              value={currentValue}
              onChange={setCurrentValue}
              unit="€"
              unitPosition="left"
            />

            <InputField
              inputId="cc-interest"
              label="Annual Interest (nominal 8,86% / real 6,31%)"
              value={interest}
              onChange={setInterest}
              unit="%"
              helpText={
                !interestValid && interest
                  ? "Enter a valid annual % (e.g. 8,86)"
                  : ""
              }
            />

            <div className="grid grid-cols-2 gap-4">
              <InputField
                inputId="cc-months"
                label="Months"
                value={months}
                onChange={handleMonthsChange}
              />
              <InputField
                inputId="cc-years"
                label="Years"
                value={years}
                onChange={handleYearsChange}
              />
            </div>

            <InputField
              inputId="cc-contrib"
              label="Monthly Contribution"
              value={contribution}
              onChange={setContribution}
              unit="€"
              unitPosition="left"
            />

            <InputField
              inputId="cc-targetw"
              label="Target Monthly Withdrawal (3.5%)"
              value={targetMonthlyWithdrawal}
              onChange={setTargetMonthlyWithdrawal}
              unit="€"
              unitPosition="left"
              helpText="If months is empty, Calculate will solve time-to-FIRE."
            />

            <InputField
              inputId="cc-fv"
              label="Future Value"
              value={futureValue}
              onChange={setFutureValue}
              unit="€"
              unitPosition="left"
            />
          </div>
        </div>
      </div>

      {/* ===== 3.5% RULE OUTPUT ===== */}
      <div className="mt-6 rounded-2xl bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-600 p-4 md:p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
          3.5% Rule Output
        </h3>

        <div className="space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
          <InputField
            inputId="cc-withdraw-year"
            label="Yearly Withdrawal"
            value={formatEuroNumber(yearlyWithdrawal)}
            readOnly
            unit="€"
            unitPosition="left"
          />
          <InputField
            inputId="cc-withdraw-month"
            label="Monthly Withdrawal"
            value={formatEuroNumber(monthlyWithdrawal)}
            readOnly
            unit="€"
            unitPosition="left"
          />
        </div>
      </div>

      {/* ===== RETIREMENT PROJECTIONS ===== */}
      <div className="mt-6 rounded-2xl bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-600 p-4 md:p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Retirement Projections
        </h3>

        <div className="space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
          {pensionProjections.map((p) => (
            <div
              key={p.label}
              className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 p-4 space-y-3 shadow-sm"
            >
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                {p.label} ({p.date.toLocaleDateString("en-GB")})
              </div>

              <InputField
                inputId={`cc-proj-${p.label}-fv`}
                label="Projected Portfolio"
                value={formatEuroNumber(p.value)}
                readOnly
                unit="€"
                unitPosition="left"
              />

              <InputField
                inputId={`cc-proj-${p.label}-mw`}
                label="Monthly Withdrawal"
                value={formatEuroNumber(p.monthlyWithdrawal)}
                readOnly
                unit="€"
                unitPosition="left"
              />
            </div>
          ))}
        </div>
      </div>

      {/* ===== STICKY MOBILE BUTTON BAR ===== */}
      <div className="fixed bottom-0 left-0 right-0 md:static bg-white/95 dark:bg-gray-900/95 backdrop-blur border-t border-gray-200 dark:border-gray-700 p-4 flex gap-3 z-50">
        <Button
          onClick={handleCalculate}
          variant="primary"
          className="flex-1 h-12 text-base"
          disabled={!interestValid}
          title={
            !interestValid ? "Enter a valid annual interest rate" : "Calculate"
          }
        >
          Calculate
        </Button>

        <Button
          onClick={handleReset}
          variant="secondary"
          className="flex-1 h-12 text-base"
        >
          Reset
        </Button>
      </div>

      {/* Spacer so content isn't hidden behind sticky bar */}
      <div className="h-20 md:hidden" />
    </div>
  );
}

CompoundCalculator.propTypes = {
  defaultCurrentValue: PropTypes.string,
  variant: PropTypes.oneOf(["page", "modal"]),
};
``;
