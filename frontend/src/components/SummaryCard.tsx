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
    <article className="group relative overflow-hidden rounded-2xl border border-white/80 bg-gradient-to-br from-white via-white to-indigo-50/70 p-6 shadow-lg shadow-indigo-500/10 transition-all duration-250 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/20 dark:border-slate-700/70 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/50 dark:shadow-indigo-950/20 dark:hover:shadow-indigo-500/10">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-600 dark:text-slate-300">{title}</h2>
        {Icon && (
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${iconBgClass}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      <p className={`mt-3 text-3xl font-bold tracking-tight ${colorClass}`}>
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
