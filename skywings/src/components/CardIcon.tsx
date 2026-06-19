import React, { useState } from 'react';
import { CreditCard } from 'lucide-react';

interface CardIconProps {
  brand: string;
  className?: string;
  showName?: boolean;
}

const cardIcons: Record<string, string> = {
  visa: 'https://www.logo.wine/a/logo/Visa_Inc./Visa_Inc.-Logo.wine.svg',
  mastercard: 'https://www.logo.wine/a/logo/Mastercard/Mastercard-Logo.wine.svg',
  amex: 'https://www.logo.wine/a/logo/American_Express/American_Express-Logo.wine.svg',
  discover: 'https://upload.wikimedia.org/wikipedia/commons/5/57/Discover_Card_logo.svg',
  'diners-club': 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Diners_Club_Logo3.svg',
  diners: 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Diners_Club_Logo3.svg',
  jcb: 'https://www.logo.wine/a/logo/JCB_(company)/JCB_(company)-Logo.wine.svg',
};

const iconScale: Record<string, string> = {
  visa: 'scale-150',
  mastercard: 'scale-150',
  amex: 'scale-125',
  discover: 'scale-150',
  'diners-club': 'scale-150',
  diners: 'scale-150',
  jcb: 'scale-150',
};

export const CardIcon: React.FC<CardIconProps> = ({ brand, className = "h-4", showName = false }) => {
  const [error, setError] = useState(false);
  
  // Normalize brand
  const normalizedBrand = brand?.toLowerCase().replace(/\s+/g, '-') || 'unknown';
  const iconUrl = cardIcons[normalizedBrand] || cardIcons[normalizedBrand.split('-')[0]];

  if (!iconUrl || error || normalizedBrand === 'unknown') {
    return (
      <div className="flex items-center gap-2">
        <CreditCard className={className} />
        {showName && brand && brand !== 'unknown' && <span className="capitalize">{brand}</span>}
      </div>
    );
  }

  const scaleClass = iconScale[normalizedBrand] || iconScale[normalizedBrand.split('-')[0]] || '';

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex items-center justify-center overflow-hidden w-8 h-5">
        <img
          src={iconUrl}
          alt={brand}
          className={`${className} ${scaleClass} object-contain transition-opacity duration-300`}
          referrerPolicy="no-referrer"
          onError={() => {
            console.error(`Failed to load card icon for brand: ${brand}`);
            setError(true);
          }}
        />
      </div>
      {showName && <span className="capitalize">{brand}</span>}
    </div>
  );
};
