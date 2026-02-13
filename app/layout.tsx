import React from "react";
import type { Metadata } from "next";
import { Space_Grotesk, Manrope, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import ClientLayout from "@/components/LayoutClient";
import "./globals.css";
import { Toaster } from 'sonner';
import config from '@/config'

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: '--font-manrope',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
	title: {
		template: `%s | ${config.appName}`,
		default: config.appName,
	},
	description: config.appDescription,
	metadataBase: new URL(config.siteUrl),
	openGraph: {
		title: config.appName,
		description: config.appDescription,
		url: config.siteUrl,
		siteName: config.appName,
		locale: 'en_US',
		type: 'website',
		images: [
			{
				url: `${config.siteUrl}/opengraph-image.png`,
				width: 1200,
				height: 630,
				alt: `${config.appName} - Transform your Trainerize data into powerful insights`,
			},
		],
	},
	twitter: {
		card: 'summary_large_image',
		title: config.appName,
		description: config.appDescription,
		images: [
			{
				url: `${config.siteUrl}/twitter-image.png`,
				width: 1200,
				height: 600,
				alt: `${config.appName} - Transform your Trainerize data into powerful insights`,
			},
		],
	},
	robots: {
		index: true,
		follow: true,
	},
	manifest: '/manifest.json',
};

export const viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 5,
	userScalable: true,
	themeColor: "#2563EB",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" data-theme="fitreport" className="scroll-smooth">
			<head>
				<Script
					defer
					data-website-id="68417884330d70aeb1bbb6cf"
					data-domain="fitreport.co"
					src="https://datafa.st/js/script.js"
					strategy="afterInteractive"
				/>
			</head>
			<body className={`${manrope.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
				{/* ClientLayout contains all the client wrappers (Crisp chat support, toast messages, tooltips, etc.) */}
				<ClientLayout>{children}</ClientLayout>
				<Toaster />
			</body>
		</html>
	);
}
