import React from 'react';

/**
 * Standard list of countries with 2-letter ISO codes and names.
 */
export interface CountryItem {
  code: string;
  name: string;
}

export const COUNTRIES: CountryItem[] = [
  { code: 'US', name: 'United States' },
  { code: 'JP', name: 'Japan' },
  { code: 'CA', name: 'Canada' },
  { code: 'IS', name: 'Iceland' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'AU', name: 'Australia' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'KR', name: 'South Korea' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'FI', name: 'Finland' },
  { code: 'DK', name: 'Denmark' },
  { code: 'PL', name: 'Poland' },
  { code: 'AT', name: 'Austria' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'BE', name: 'Belgium' },
  { code: 'IE', name: 'Ireland' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' },
  { code: 'PH', name: 'Philippines' },
  { code: 'SG', name: 'Singapore' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'TH', name: 'Thailand' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'IN', name: 'India' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'PT', name: 'Portugal' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'HU', name: 'Hungary' },
  { code: 'GR', name: 'Greece' },
  { code: 'TR', name: 'Turkey' },
  { code: 'IL', name: 'Israel' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'HK', name: 'Hong Kong' },
];

const countryMap = new Map<string, string>();
COUNTRIES.forEach((c) => {
  countryMap.set(c.code.toUpperCase(), c.code);
  countryMap.set(c.name.toUpperCase(), c.code);
});

/**
 * Converts a 2-letter ISO country code or country name to a Unicode flag emoji.
 * e.g., 'US' -> 🇺🇸, 'JP' -> 🇯🇵
 */
export function getCountryFlag(country?: string): string {
  if (!country) return '';
  const trimmed = country.trim();
  if (!trimmed) return '';

  let code = trimmed.toUpperCase();
  if (code.length !== 2) {
    const matched = countryMap.get(code);
    if (matched) {
      code = matched;
    } else {
      return '';
    }
  }

  // Unicode Regional Indicator Symbols (A = 0x1F1E6 = 127462)
  // 'A'.charCodeAt(0) is 65. 127462 - 65 = 127397
  const codePoints = code.split('').map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

/**
 * Resolve standard country name from code or name
 */
export function getCountryName(country?: string): string {
  if (!country) return '';
  const trimmed = country.trim().toUpperCase();
  const found = COUNTRIES.find(
    (c) => c.code.toUpperCase() === trimmed || c.name.toUpperCase() === trimmed
  );
  return found ? found.name : country;
}

/**
 * Reusable CountryFlag component
 */
interface CountryFlagProps {
  country?: string;
  showName?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const CountryFlag: React.FC<CountryFlagProps> = ({
  country,
  showName = false,
  className,
  style,
}) => {
  const flag = getCountryFlag(country);
  if (!flag) return null;

  return React.createElement(
    'span',
    {
      className,
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        fontSize: '1em',
        lineHeight: 1,
        verticalAlign: 'middle',
        userSelect: 'none',
        ...style,
      },
      title: getCountryName(country),
    },
    React.createElement('span', { style: { fontSize: '1.05em' } }, flag),
    showName ? React.createElement('span', null, getCountryName(country)) : null
  );
};
