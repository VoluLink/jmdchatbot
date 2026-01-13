"use client";

import { useState } from "react";
import { parsePhoneNumber, isValidPhoneNumber, CountryCode } from "libphonenumber-js";

interface PhoneNumberInputProps {
  value: string;
  onChange: (value: string) => void;
  countryCode: string;
  onCountryCodeChange: (code: string) => void;
  disabled?: boolean;
  error?: string;
}

const COUNTRIES = [
  { code: "+49", name: "Germany", flag: "🇩🇪", iso: "DE" },
  { code: "+43", name: "Austria", flag: "🇦🇹", iso: "AT" },
  { code: "+41", name: "Switzerland", flag: "🇨🇭", iso: "CH" },
  { code: "+1", name: "USA/Canada", flag: "🇺🇸", iso: "US" },
  { code: "+44", name: "UK", flag: "🇬🇧", iso: "GB" },
  { code: "+33", name: "France", flag: "🇫🇷", iso: "FR" },
  { code: "+39", name: "Italy", flag: "🇮🇹", iso: "IT" },
  { code: "+34", name: "Spain", flag: "🇪🇸", iso: "ES" },
];

export default function PhoneNumberInput({
  value,
  onChange,
  countryCode,
  onCountryCodeChange,
  disabled = false,
  error,
}: PhoneNumberInputProps) {
  const [isValid, setIsValid] = useState<boolean>(true);

  const validatePhone = (phone: string, country: string) => {
    if (!phone) {
      setIsValid(true);
      return;
    }

    try {
      const fullNumber = phone.startsWith("+") ? phone : `${country}${phone}`;
      const valid = isValidPhoneNumber(fullNumber);
      setIsValid(valid);
    } catch {
      setIsValid(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const phone = e.target.value;
    onChange(phone);
    validatePhone(phone, countryCode);
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCountryCode = e.target.value;
    onCountryCodeChange(newCountryCode);
    validatePhone(value, newCountryCode);
  };

  const selectedCountry = COUNTRIES.find((c) => c.code === countryCode) || COUNTRIES[0];

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {/* Country Code Selector */}
        <select
          value={countryCode}
          onChange={handleCountryChange}
          disabled={disabled}
          className="w-32 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500
                     bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600
                     text-slate-900 dark:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.flag} {country.code}
            </option>
          ))}
        </select>

        {/* Phone Number Input */}
        <input
          type="tel"
          value={value}
          onChange={handlePhoneChange}
          disabled={disabled}
          placeholder="1234567890"
          className={`
            flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2
            transition-colors
            ${
              error || !isValid
                ? "border-red-500 focus:ring-red-500"
                : "border-slate-300 dark:border-slate-600 focus:ring-blue-500"
            }
            bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        />
      </div>

      {/* Validation Messages */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {!error && value && !isValid && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Ungültige Telefonnummer für {selectedCountry.name}
        </p>
      )}
      {!error && value && isValid && (
        <p className="text-sm text-indigo-600 dark:text-indigo-400">
          Gültige Telefonnummer
        </p>
      )}
    </div>
  );
}
