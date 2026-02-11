'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/libs/supabase/client';

export interface BrandConfig {
  logo_url: string | null;
  business_name: string | null;
  primary_color: string;
  accent_color: string;
  footer_text: string | null;
  show_fitreport_badge: boolean;
}

const DEFAULT_BRAND: BrandConfig = {
  logo_url: null,
  business_name: null,
  primary_color: '#2563EB',
  accent_color: '#1D4ED8',
  footer_text: null,
  show_fitreport_badge: true,
};

const CACHE_KEY = 'fitreport_brand_config';
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

function getCachedBrand(): BrandConfig | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const { brand, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return brand;
  } catch {
    return null;
  }
}

function setCachedBrand(brand: BrandConfig) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ brand, timestamp: Date.now() }));
  } catch {
    // localStorage full or unavailable
  }
}

export function useBrandConfig() {
  const [brand, setBrand] = useState<BrandConfig>(DEFAULT_BRAND);
  const [loading, setLoading] = useState(true);

  const fetchBrand = useCallback(async () => {
    // Check cache first
    const cached = getCachedBrand();
    if (cached) {
      setBrand(cached);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/brand-settings');
      if (res.ok) {
        const data = await res.json();
        const brandData = { ...DEFAULT_BRAND, ...data.brand };
        setBrand(brandData);
        setCachedBrand(brandData);
      }
    } catch (error) {
      console.error('Failed to load brand config:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrand();
  }, [fetchBrand]);

  const refreshBrand = useCallback(async () => {
    localStorage.removeItem(CACHE_KEY);
    setLoading(true);
    await fetchBrand();
  }, [fetchBrand]);

  const updateBrand = useCallback(async (updates: Partial<BrandConfig>) => {
    const newBrand = { ...brand, ...updates };
    setBrand(newBrand);
    setCachedBrand(newBrand);

    const res = await fetch('/api/brand-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      // Revert on failure
      setBrand(brand);
      setCachedBrand(brand);
      throw new Error('Failed to save brand settings');
    }

    return newBrand;
  }, [brand]);

  const uploadLogo = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('logo', file);

    const res = await fetch('/api/brand-settings/upload-logo', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to upload logo');
    }

    const { logo_url } = await res.json();
    const newBrand = { ...brand, logo_url };
    setBrand(newBrand);
    setCachedBrand(newBrand);
    return logo_url;
  }, [brand]);

  const removeLogo = useCallback(async () => {
    const res = await fetch('/api/brand-settings/upload-logo', {
      method: 'DELETE',
    });

    if (!res.ok) {
      throw new Error('Failed to remove logo');
    }

    const newBrand: BrandConfig = { ...brand, logo_url: null };
    setBrand(newBrand);
    setCachedBrand(newBrand);
  }, [brand]);

  return {
    brand,
    loading,
    updateBrand,
    uploadLogo,
    removeLogo,
    refreshBrand,
  };
}

/**
 * Generate CSS custom property style object from brand config.
 * Apply this to a parent element to cascade brand colors to children.
 */
export function getBrandStyles(brand: BrandConfig): React.CSSProperties {
  return {
    '--brand-primary': brand.primary_color,
    '--brand-accent': brand.accent_color,
  } as React.CSSProperties;
}
