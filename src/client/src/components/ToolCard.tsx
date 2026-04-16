import { LucideIcon } from 'lucide-react';
import { Link } from 'wouter';

interface ToolCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  colorClass: 'blue' | 'green' | 'purple';
  buttonText?: string;
}

const colorMap = {
  blue: {
    bg: 'from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10',
    icon: 'from-blue-500 to-blue-600',
    text: 'text-blue-600 dark:text-blue-400',
    hover: 'hover:border-blue-200 dark:hover:border-blue-700',
  },
  green: {
    bg: 'from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10',
    icon: 'from-green-500 to-green-600',
    text: 'text-green-600 dark:text-green-400',
    hover: 'hover:border-green-200 dark:hover:border-green-700',
  },
  purple: {
    bg: 'from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10',
    icon: 'from-purple-500 to-purple-600',
    text: 'text-purple-600 dark:text-purple-400',
    hover: 'hover:border-purple-200 dark:hover:border-purple-700',
  },
};

export function ToolCard({
  icon: Icon,
  title,
  description,
  href,
  colorClass,
  buttonText = 'Utiliser l\'outil',
}: ToolCardProps) {
  const colors = colorMap[colorClass];

  return (
    <Link href={href}>
      <a className="group relative bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-lg hover:shadow-2xl border border-gray-100 dark:border-slate-700 transition-all duration-300 hover:-translate-y-1 cursor-pointer">
        {/* Gradient background on hover */}
        <div className={`absolute inset-0 bg-gradient-to-br ${colors.bg} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

        {/* Content */}
        <div className="relative">
          {/* Icon */}
          <div className={`w-12 h-12 bg-gradient-to-br ${colors.icon} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-6 h-6 text-white" />
          </div>

          {/* Title */}
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
            {title}
          </h3>

          {/* Description */}
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {description}
          </p>

          {/* Link */}
          <div className={`inline-flex items-center ${colors.text} font-semibold hover:${colors.text.replace('text-', 'text-opacity-80')} transition-colors`}>
            {buttonText}
            <svg className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </a>
    </Link>
  );
}
