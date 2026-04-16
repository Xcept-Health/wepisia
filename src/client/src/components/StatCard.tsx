interface StatCardProps {
  value: string;
  label: string;
  colorClass: 'blue' | 'green' | 'purple' | 'indigo';
}

const colorMap = {
  blue: 'text-blue-600 dark:text-blue-400',
  green: 'text-green-600 dark:text-green-400',
  purple: 'text-purple-600 dark:text-purple-400',
  indigo: 'text-indigo-600 dark:text-indigo-400',
};

export function StatCard({ value, label, colorClass }: StatCardProps) {
  return (
    <div className="text-center">
      <div className={`text-3xl font-bold ${colorMap[colorClass]} mb-2`}>
        {value}
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {label}
      </div>
    </div>
  );
}
