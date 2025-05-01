import React from "react";
import { BarChart3, LineChart, Calendar } from "lucide-react";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard = ({ icon, title, description }: FeatureCardProps) => (
  <div className="rounded-xl bg-[#111111] p-8 transition-all hover:scale-[1.02]">
    <div className="mb-6">
      {icon}
    </div>
    <h3 className="mb-4 text-2xl font-semibold text-white">{title}</h3>
    <p className="text-lg text-gray-400 leading-relaxed">{description}</p>
  </div>
);

export default function GridFeatures() {
  const features = [
    {
      icon: <BarChart3 className="h-10 w-10 text-emerald-400" />,
      title: "Enhanced Analytics",
      description: "Transform Trainerize data into actionable insights with customizable dashboards showing client progress at a glance.",
    },
    {
      icon: <LineChart className="h-10 w-10 text-purple-400" />,
      title: "Progress Tracking",
      description: "Visualize client progress over time with detailed charts and metrics that highlight improvements and identify areas needing attention.",
    },
    {
      icon: <Calendar className="h-10 w-10 text-emerald-400" />,
      title: "Automated Reporting",
      description: "Schedule and send professional reports to clients automatically, saving hours of manual data compilation each week.",
    },
  ];

  return (
    <section className="w-full py-16 lg:py-24">
      <div className="max-w-[1600px] mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
            <span className="text-emerald-400">Features</span>{" "}
            <span className="text-white">Trainers Love</span>
          </h2>
          <p className="text-lg lg:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            FitReport transforms your Trainerize data into powerful insights, helping you deliver better results with less administrative work.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
} 