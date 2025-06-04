import React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import ClientLayout from "@/components/LayoutClient";
import "./globals.css";
import { Toaster } from 'sonner';
import config from '@/config'

const inter = Inter({ subsets: ["latin"] });

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
	viewport: {
		width: "device-width",
		initialScale: 1,
		maximumScale: 5,
		userScalable: true,
	},
	themeColor: "#1f1b2e",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" className="scroll-smooth">
			<body className={`${inter.className} antialiased`}>
				{/* ClientLayout contains all the client wrappers (Crisp chat support, toast messages, tooltips, etc.) */}
				<ClientLayout>{children}</ClientLayout>
				<Toaster />
			</body>
		</html>
	);
}
