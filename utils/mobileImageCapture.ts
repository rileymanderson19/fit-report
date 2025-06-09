interface DeviceInfo {
  pixelRatio: number;
  isMobile: boolean;
  isTablet: boolean;
  screenWidth: number;
  userAgent: string;
}

interface CaptureOptions {
  quality: number;
  pixelRatio: number;
  backgroundColor: string;
  width?: number;
  height?: number;
  style?: Record<string, string>;
}

export function getDeviceInfo(): DeviceInfo {
  if (typeof window === 'undefined') {
    return {
      pixelRatio: 2,
      isMobile: false,
      isTablet: false,
      screenWidth: 1200,
      userAgent: ''
    };
  }

  const userAgent = navigator.userAgent.toLowerCase();
  const screenWidth = window.innerWidth;
  const pixelRatio = window.devicePixelRatio || 1;

  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) || screenWidth < 768;
  const isTablet = /ipad|android(?!.*mobile)/i.test(userAgent) || (screenWidth >= 768 && screenWidth < 1024);

  return {
    pixelRatio,
    isMobile,
    isTablet,
    screenWidth,
    userAgent
  };
}

export function getMobileOptimizedCaptureOptions(): CaptureOptions {
  const deviceInfo = getDeviceInfo();
  
  // Base options
  let options: CaptureOptions = {
    quality: 1,
    pixelRatio: 2,
    backgroundColor: '#ffffff',
    style: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }
  };

  // Mobile-specific optimizations
  if (deviceInfo.isMobile) {
    options = {
      ...options,
      pixelRatio: Math.min(deviceInfo.pixelRatio * 1.5, 3), // Increase for mobile, cap at 3
      quality: 0.95, // Slightly reduce quality for faster processing on mobile
      style: {
        ...options.style,
        // Mobile-optimized font rendering
        '-webkit-font-smoothing': 'antialiased',
        '-moz-osx-font-smoothing': 'grayscale',
        'text-rendering': 'optimizeLegibility'
      }
    };

    // Smaller screen adjustments
    if (deviceInfo.screenWidth < 480) {
      options.width = Math.min(deviceInfo.screenWidth * 2, 800);
    }
  }

  // High-DPI display optimizations
  if (deviceInfo.pixelRatio >= 2) {
    options.pixelRatio = Math.min(deviceInfo.pixelRatio * 1.2, 3);
  }

  // Tablet-specific optimizations
  if (deviceInfo.isTablet) {
    options.pixelRatio = Math.min(deviceInfo.pixelRatio * 1.3, 3);
    options.quality = 0.98;
  }

  return options;
}

export function getMobileOptimizedStyles(): string {
  const deviceInfo = getDeviceInfo();
  
  let baseStyles = `
    #report-container {
      background: white !important;
      padding: 40px !important;
      color: #1a1a1a !important;
      font-size: 16px !important;
      line-height: 1.6 !important;
    }
    #report-container h3 {
      color: #1a1a1a !important;
      font-size: 24px !important;
      font-weight: 600 !important;
      margin-bottom: 20px !important;
      line-height: 1.3 !important;
    }
    #report-container .card {
      background: #f8fafc !important;
      border: 1px solid #e2e8f0 !important;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
      margin-bottom: 24px !important;
      border-radius: 8px !important;
    }
    #report-container .card-body {
      padding: 24px !important;
    }
    #report-container table {
      width: 100% !important;
      border-collapse: collapse !important;
      margin-bottom: 16px !important;
      background: white !important;
      font-size: 14px !important;
    }
    #report-container th {
      background: #f1f5f9 !important;
      color: #1a1a1a !important;
      font-weight: 600 !important;
      text-align: left !important;
      padding: 12px 16px !important;
      border-bottom: 2px solid #e2e8f0 !important;
      font-size: 14px !important;
    }
    #report-container td {
      padding: 12px 16px !important;
      border-bottom: 1px solid #e2e8f0 !important;
      color: #1a1a1a !important;
      font-size: 13px !important;
      line-height: 1.4 !important;
    }
    #report-container tr:nth-child(even) {
      background: #f8fafc !important;
    }
         #report-container .text-base-content {
       color: #1a1a1a !important;
     }
     #report-container .text-base-content/80 {
       color: #1a1a1a !important;
     }
    #report-container .text-primary {
      color: #2563eb !important;
    }
    #report-container .font-medium {
      font-weight: 500 !important;
    }
    #report-container .font-semibold {
      font-weight: 600 !important;
    }
    #report-container .text-xl {
      font-size: 20px !important;
    }
    #report-container .text-lg {
      font-size: 18px !important;
    }
    #report-container .border-base-300 {
      border-color: #e2e8f0 !important;
    }
    #report-container .bg-base-200 {
      background: #f8fafc !important;
    }
    #report-container .bg-base-200/50 {
      background: #f8fafc !important;
    }
    #report-container .bg-base-200/30 {
      background: #f8fafc !important;
    }
    #report-container .overflow-x-auto::-webkit-scrollbar {
      display: none !important;
    }
    #report-container .overflow-x-auto {
      -ms-overflow-style: none !important;
      scrollbar-width: none !important;
    }
    /* Hide all interactive elements for clean capture */
    #report-container button {
      display: none !important;
    }
    #report-container .btn {
      display: none !important;
    }
    #report-container [data-delete] {
      display: none !important;
    }
    #report-container .delete-btn {
      display: none !important;
    }
    #report-container .trash-icon {
      display: none !important;
    }
    #report-container svg[data-icon="trash"] {
      display: none !important;
    }
    #report-container .text-error {
      display: none !important;
    }
    #report-container .btn-error {
      display: none !important;
    }
    #report-container .cursor-pointer[onclick] {
      display: none !important;
    }
    @media print {
      #report-container {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  `;

  // Mobile-specific style adjustments
  if (deviceInfo.isMobile) {
    baseStyles += `
      #report-container {
        padding: 32px !important;
        font-size: 15px !important;
      }
      #report-container h3 {
        font-size: 22px !important;
        margin-bottom: 16px !important;
      }
      #report-container .card-body {
        padding: 20px !important;
      }
      #report-container th {
        padding: 10px 12px !important;
        font-size: 13px !important;
      }
      #report-container td {
        padding: 10px 12px !important;
        font-size: 12px !important;
      }
    `;

    // Very small screens
    if (deviceInfo.screenWidth < 480) {
      baseStyles += `
        #report-container {
          padding: 24px !important;
          font-size: 14px !important;
        }
        #report-container h3 {
          font-size: 20px !important;
        }
        #report-container .card-body {
          padding: 16px !important;
        }
        #report-container th {
          padding: 8px 10px !important;
          font-size: 12px !important;
        }
        #report-container td {
          padding: 8px 10px !important;
          font-size: 11px !important;
        }
      `;
    }
  }

  return baseStyles;
}

export async function captureReportWithMobileOptimization(elementId: string, filename: string) {
  const reportElement = document.getElementById(elementId);
  if (!reportElement) {
    throw new Error('Report container not found');
  }

  // Get mobile-optimized settings
  const captureOptions = getMobileOptimizedCaptureOptions();
  const mobileStyles = getMobileOptimizedStyles();

  // Apply optimized styles
  const captureStylesElement = document.createElement('style');
  captureStylesElement.textContent = mobileStyles;
  document.head.appendChild(captureStylesElement);

  try {
    // Wait for styles to apply
    await new Promise(resolve => setTimeout(resolve, 150));

    // Import and use html-to-image with optimized settings
    const canvas = await import('html-to-image');
    const dataUrl = await canvas.toPng(reportElement, captureOptions);

    // Create download link with better mobile support
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    
    // For mobile compatibility
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return dataUrl;
  } finally {
    // Clean up styles safely
    if (captureStylesElement.parentNode) {
      document.head.removeChild(captureStylesElement);
    }
  }
}

// Alternative function for getting image data without triggering download
export async function captureReportImageData(elementId: string) {
  const reportElement = document.getElementById(elementId);
  if (!reportElement) {
    throw new Error('Report container not found');
  }

  // Get mobile-optimized settings
  const captureOptions = getMobileOptimizedCaptureOptions();
  const mobileStyles = getMobileOptimizedStyles();

  // Apply optimized styles
  const captureStylesElement = document.createElement('style');
  captureStylesElement.textContent = mobileStyles;
  document.head.appendChild(captureStylesElement);

  try {
    // Wait for styles to apply
    await new Promise(resolve => setTimeout(resolve, 150));

    // Import and use html-to-image with optimized settings
    const canvas = await import('html-to-image');
    const dataUrl = await canvas.toPng(reportElement, captureOptions);

    return dataUrl;
  } finally {
    // Clean up styles safely
    if (captureStylesElement.parentNode) {
      document.head.removeChild(captureStylesElement);
    }
  }
} 