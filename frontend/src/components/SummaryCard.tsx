import type { LucideIcon } from 'lucide-react'

type SummaryCardProps = {
  title: string
  amount: string
  colorClass?: string
  icon?: LucideIcon
  iconBgClass?: string
  subtitle?: string
}

function SummaryCard({
  title,
  amount,
  colorClass = 'text-gray-900 dark:text-gray-100',
  icon: Icon,
  iconBgClass = 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  subtitle,
}: SummaryCardProps) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h2>
        {Icon && (
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${iconBgClass}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      <p className={`mt-3 text-2xl font-bold tracking-tight ${colorClass}`}>
        {amount}
      </p>

      {subtitle && (
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          {subtitle}
        </p>
      )}
    </article>
  )
}

export default SummaryCard
