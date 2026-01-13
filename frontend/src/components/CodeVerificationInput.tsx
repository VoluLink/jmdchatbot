"use client";

import { useState, useRef, KeyboardEvent, ChangeEvent, ClipboardEvent } from "react";

interface CodeVerificationInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
}

export default function CodeVerificationInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  error = false,
}: CodeVerificationInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    // Only allow digits
    if (val && !/^\d$/.test(val)) {
      return;
    }

    const newValue = value.split("");
    newValue[index] = val;
    const newCode = newValue.join("");

    onChange(newCode);

    // Auto-focus next input
    if (val && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Call onComplete if all digits are filled
    if (newCode.length === length && onComplete) {
      onComplete(newCode);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    // Handle arrow keys
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text/plain");
    const digits = pastedData.replace(/\D/g, "").slice(0, length);

    if (digits) {
      onChange(digits);

      // Focus the last filled input
      const lastIndex = Math.min(digits.length, length) - 1;
      inputRefs.current[lastIndex]?.focus();

      // Call onComplete if all digits are filled
      if (digits.length === length && onComplete) {
        onComplete(digits);
      }
    }
  };

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[index] || ""}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className={`
            w-12 h-14 text-center text-2xl font-semibold
            border-2 rounded-lg
            focus:outline-none focus:ring-2
            transition-colors
            ${
              error
                ? "border-red-500 focus:ring-red-500"
                : "border-slate-300 dark:border-slate-600 focus:ring-blue-500"
            }
            ${disabled ? "bg-slate-100 dark:bg-slate-800 cursor-not-allowed" : "bg-white dark:bg-slate-700"}
            text-slate-900 dark:text-slate-100
          `}
        />
      ))}
    </div>
  );
}
