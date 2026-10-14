'use client';
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
}

const StatsCard: React.FC<StatsCardProps> = ({ label, value, icon: Icon }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 flex items-center justify-between border border-gray-100">
      <div>
        <h3 className="text-3xl font-bold text-gray-800 mb-1">{value}</h3>
        <p className="text-gray-500 text-sm font-medium">{label}</p>
      </div>
      <div className="h-12 w-12 bg-slate-800 rounded-lg flex items-center justify-center text-white">
        <Icon size={24} />
      </div>
    </div>
  );
};

export default StatsCard;