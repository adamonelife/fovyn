import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import {
  currencyCodes,
  currencyLabel,
  currencySearchText,
  isCurrencyCode,
  type CurrencyCode,
} from "./currencies";

export default function CurrencySelector({
  value,
  onChange,
  disabled = false,
  label = "Currency",
}: {
  value: string;
  onChange: (value: CurrencyCode) => void;
  disabled?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState("");
  const options = useMemo(() => {
    const term = query.trim().toLowerCase(),
      matches = currencyCodes.filter(
        (code) => !term || currencySearchText(code).includes(term),
      );
    return [
      value,
      ...matches.filter((code) => code !== value),
    ] as CurrencyCode[];
  }, [query, value]);
  const selected = isCurrencyCode(value)
    ? currencyLabel(value)
    : "Choose a currency";
  return (
    <label className="currency-selector">
      {label}
      <button
        type="button"
        className="currency-selector-trigger"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        {selected}
      </button>
      {open && !disabled && (
        <div className="currency-selector-menu">
          <label>
            <Search />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, code or country"
            />
          </label>
          <div role="listbox" aria-label="Currencies">
            {options.map((code) => (
              <button
                type="button"
                role="option"
                aria-selected={code === value}
                onClick={() => {
                  onChange(code);
                  setOpen(false);
                  setQuery("");
                }}
                key={code}
              >
                <span>{currencyLabel(code)}</span>
                {code === value && <Check />}
              </button>
            ))}
          </div>
        </div>
      )}
      {disabled && (
        <small>
          Currency cannot be changed after transactions have been recorded.
        </small>
      )}
    </label>
  );
}
