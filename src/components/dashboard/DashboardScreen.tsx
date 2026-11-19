
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
    ArrowLeft,
    RefreshCw,
    TrendingUp,
    TrendingDown,
    ShoppingBag,
    IndianRupee,
    Package,
    ReceiptText,
    Wallet,
    AlertCircle,
} from 'lucide-react'

import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    PieChart,
    Pie,
    Cell,
    Legend,
} from 'recharts'

import {
    getDashboardData,
    type DashboardData,
} from '../../services/dashboardService'

import {
    getCatalog,
    type Category,
    type InventoryProduct,
} from '../../services/catalogService'

type DashboardScreenProps = {
    onBack: () => void
}

const money = (amount: number) =>
    `₹${Math.round(amount).toLocaleString('en-IN')}`

const PAYMENT_COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#8b5cf6']

function formatDate(date: string) {
    const parsed = new Date(`${date}T00:00:00`)

    return parsed.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
    })
}

function MetricCard({
    label,
    value,
    icon: Icon,
    description,
}: {
    label: string
    value: string
    icon: typeof IndianRupee
    description?: string
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-slate-500 sm:text-sm">
                    {label}
                </p>

                <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
                    <Icon size={18} />
                </div>
            </div>

            <p className="mt-3 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                {value}
            </p>

            {description && (
                <p className="mt-1 text-xs text-slate-500">
                    {description}
                </p>
            )}
        </div>
    )
}

function Comparison({
    current,
    previous,
}: {
    current: number
    previous: number
}) {
    if (previous === 0) {
        return (
            <span className="text-xs font-medium text-slate-500">
                No previous-period baseline
            </span>
        )
    }

    const change = ((current - previous) / previous) * 100
    const positive = change >= 0
    const Icon = positive ? TrendingUp : TrendingDown

    return (
        <span
            className={`inline-flex items-center gap-1 text-xs font-semibold ${positive ? 'text-emerald-600' : 'text-red-600'
                }`}
        >
            <Icon size={14} />
            {Math.abs(change).toFixed(1)}% vs previous 7 days
        </span>
    )
}

function SectionHeading({
    title,
    subtitle,
}: {
    title: string
    subtitle?: string
}) {
    return (
        <div>
            <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                {title}
            </h2>

            {subtitle && (
                <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                    {subtitle}
                </p>
            )}
        </div>
    )
}

function DashboardScreen({ onBack }: DashboardScreenProps) {
    const [dashboard, setDashboard] = useState<DashboardData | null>(null)
    const [categories, setCategories] = useState<Category[]>([])
    const [products, setProducts] = useState<InventoryProduct[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')

    const loadDashboard = useCallback(async () => {
        setIsLoading(true)
        setError('')

        try {
            const [dashboardData, catalog] = await Promise.all([
                getDashboardData(),
                getCatalog(),
            ])

            setDashboard(dashboardData)
            setCategories(catalog.categories)
            setProducts(catalog.products)
        } catch (err) {
            console.error('Dashboard loading failed:', err)
            setError('Unable to load dashboard data. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        let cancelled = false

        async function initializeDashboard() {
            setError('')

            try {
                const [dashboardData, catalog] = await Promise.all([
                    getDashboardData(),
                    getCatalog(),
                ])

                if (cancelled) return

                setDashboard(dashboardData)
                setCategories(catalog.categories)
                setProducts(catalog.products)
            } catch (err) {
                if (cancelled) return

                console.error('Dashboard loading failed:', err)
                setError('Unable to load dashboard data. Please try again.')
            } finally {
                if (!cancelled) {
                    setIsLoading(false)
                }
            }
        }

        void initializeDashboard()

        return () => {
            cancelled = true
        }
    }, [])

    const categoryNames = useMemo(
        () => new Map(categories.map((item) => [item.id, item.label])),
        [categories],
    )

    const inventory = useMemo(() => {
        return products.reduce(
            (summary, product) => {
                summary.totalUnits += product.quantity
                summary.soldUnits += product.soldQuantity
                summary.availableUnits += Math.max(
                    0,
                    product.availableQuantity,
                )

                if (product.availableQuantity <= 0) {
                    summary.outOfStockItems += 1
                }

                return summary
            },
            {
                totalUnits: 0,
                soldUnits: 0,
                availableUnits: 0,
                outOfStockItems: 0,
            },
        )
    }, [products])

    const todayPaymentTotal = useMemo(
        () =>
            dashboard?.paymentBreakdown.reduce(
                (sum, item) => sum + item.amount,
                0,
            ) ?? 0,
        [dashboard],
    )

    const paymentChartData = useMemo(
        () =>
            (dashboard?.paymentBreakdown ?? []).map((item) => ({
                name: item.paymentMethod.toUpperCase(),
                amount: item.amount,
            })),
        [dashboard],
    )

    if (isLoading && !dashboard) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
                <div className="text-center">
                    <RefreshCw
                        size={28}
                        className="mx-auto animate-spin text-blue-600"
                    />
                    <p className="mt-3 text-sm font-medium text-slate-600">
                        Loading your business dashboard...
                    </p>
                </div>
            </div>
        )
    }

    if (error && !dashboard) {
        return (
            <div className="min-h-screen bg-slate-50 px-4 py-6">
                <div className="mx-auto max-w-5xl">
                    <button
                        onClick={onBack}
                        className="mb-6 flex items-center gap-2 text-sm font-medium text-slate-600"
                    >
                        <ArrowLeft size={18} />
                        Back to billing
                    </button>

                    <div className="rounded-2xl border border-red-200 bg-white p-6 text-center">
                        <AlertCircle
                            size={28}
                            className="mx-auto text-red-500"
                        />
                        <p className="mt-3 font-semibold text-slate-900">
                            Dashboard unavailable
                        </p>
                        <p className="mt-1 text-sm text-slate-500">{error}</p>

                        <button
                            onClick={() => void loadDashboard()}
                            className="mt-4 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white"
                        >
                            Try again
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    if (!dashboard) return null

    const { overview, previousOverview, today } = dashboard

    return (
        <div className="min-h-screen bg-slate-50 pb-10">
            <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-7">
                {/* Header */}
                <header className="mb-7 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <button
                            onClick={onBack}
                            aria-label="Back to billing"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-100"
                        >
                            <ArrowLeft size={19} />
                        </button>

                        <div className="min-w-0">
                            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                                Dashboard
                            </h1>
                            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                                Your shop's performance at a glance
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => void loadDashboard()}
                        disabled={isLoading}
                        aria-label="Refresh dashboard"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-100 disabled:opacity-50"
                    >
                        <RefreshCw
                            size={17}
                            className={isLoading ? 'animate-spin' : ''}
                        />
                    </button>
                </header>

                {error && (
                    <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        Some refreshed data could not be loaded. Showing the last successfully loaded dashboard.
                    </div>
                )}

                {/* Seven-day overview */}
                <section className="mb-8">
                    <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                        <SectionHeading
                            title="Business Overview"
                            subtitle="Last 7 calendar days, including today"
                        />
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                            Last 7 days
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <MetricCard
                            label="Total sales"
                            value={money(overview.totalSales)}
                            icon={IndianRupee}
                            description="Bill value generated"
                        />

                        <MetricCard
                            label="Collected"
                            value={money(overview.collected)}
                            icon={Wallet}
                            description="Amount received"
                        />

                        <MetricCard
                            label="Bills generated"
                            value={overview.billCount.toLocaleString('en-IN')}
                            icon={ReceiptText}
                            description="Successful bills"
                        />

                        <MetricCard
                            label="Units sold"
                            value={overview.unitsSold.toLocaleString('en-IN')}
                            icon={ShoppingBag}
                            description="Total pieces sold"
                        />
                    </div>

                    <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-slate-800">
                                    Sales performance
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                    Compared with the previous 7 days
                                </p>
                            </div>

                            <Comparison
                                current={overview.totalSales}
                                previous={previousOverview.totalSales}
                            />
                        </div>

                        <div className="mt-4 h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={dashboard.salesTrend}
                                    margin={{
                                        top: 8,
                                        right: 4,
                                        left: -16,
                                        bottom: 0,
                                    }}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        vertical={false}
                                        stroke="#e2e8f0"
                                    />

                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={formatDate}
                                        tick={{ fontSize: 11, fill: '#64748b' }}
                                        axisLine={false}
                                        tickLine={false}
                                    />

                                    <YAxis
                                        tickFormatter={(value: number) =>
                                            value >= 1000
                                                ? `₹${(value / 1000).toFixed(0)}k`
                                                : `₹${value}`
                                        }
                                        tick={{ fontSize: 10, fill: '#64748b' }}
                                        axisLine={false}
                                        tickLine={false}
                                        width={48}
                                    />

                                    <Tooltip
                                        formatter={(value) => [
                                            money(Number(value)),
                                            'Sales',
                                        ]}
                                        labelFormatter={(label) =>
                                            formatDate(String(label))
                                        }
                                        contentStyle={{
                                            borderRadius: 12,
                                            border: '1px solid #e2e8f0',
                                            fontSize: 12,
                                        }}
                                    />

                                    <Bar
                                        dataKey="sales"
                                        name="Sales"
                                        fill="#2563eb"
                                        radius={[6, 6, 0, 0]}
                                        maxBarSize={38}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                            <div>
                                <p className="text-xs text-slate-500">
                                    Previous 7 days
                                </p>
                                <p className="mt-1 text-sm font-bold text-slate-800">
                                    {money(previousOverview.totalSales)}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs text-slate-500">
                                    Outstanding amount
                                </p>
                                <p className="mt-1 text-sm font-bold text-amber-600">
                                    {money(overview.outstanding)}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Today's performance */}
                <section className="mb-8">
                    <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                        <SectionHeading
                            title="Today's Performance"
                            subtitle="A closer look at today's business"
                        />
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            Today
                        </span>
                    </div>

                    <div className="mb-4 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
                        <p className="text-sm font-medium text-emerald-800">
                            Today's sales
                        </p>

                        <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                            {money(today.totalSales)}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600">
                            <span>{today.billCount} bills generated</span>
                            <span>{today.unitsSold} units sold</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <MetricCard
                            label="Collected"
                            value={money(today.collected)}
                            icon={Wallet}
                            description="Received today"
                        />

                        <MetricCard
                            label="Outstanding"
                            value={money(today.outstanding)}
                            icon={AlertCircle}
                            description="Pending collection"
                        />

                        <MetricCard
                            label="Average bill"
                            value={money(today.averageBillValue)}
                            icon={ReceiptText}
                            description="Average bill value"
                        />

                        <MetricCard
                            label="Units sold"
                            value={today.unitsSold.toLocaleString('en-IN')}
                            icon={ShoppingBag}
                            description="Pieces sold today"
                        />
                    </div>

                    {/* What sold */}
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <SectionHeading
                            title="What Sold Today"
                            subtitle="Category-wise sales and quantities"
                        />

                        {dashboard.topCategories.length === 0 ? (
                            <p className="py-8 text-center text-sm text-slate-500">
                                No items sold today yet.
                            </p>
                        ) : (
                            <div className="mt-4 divide-y divide-slate-100">
                                {dashboard.topCategories.map((item) => (
                                    <div
                                        key={item.categoryId}
                                        className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-slate-800">
                                                {categoryNames.get(item.categoryId) ??
                                                    'Unknown Category'}
                                            </p>

                                            <p className="mt-1 text-xs text-slate-500">
                                                {item.quantity} pieces sold
                                            </p>
                                        </div>

                                        <p className="shrink-0 text-sm font-bold text-slate-900">
                                            {money(item.amount)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Payment mode breakdown */}
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <SectionHeading
                            title="Payment Mode Breakdown"
                            subtitle="Today's actual amount collected by payment method"
                        />

                        {paymentChartData.length === 0 ? (
                            <div className="py-8 text-center">
                                <Wallet
                                    size={28}
                                    className="mx-auto text-slate-300"
                                />
                                <p className="mt-3 text-sm text-slate-500">
                                    No payments recorded today yet.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="relative mt-3 h-56 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={paymentChartData}
                                                dataKey="amount"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={57}
                                                outerRadius={83}
                                                paddingAngle={3}
                                                stroke="none"
                                            >
                                                {paymentChartData.map((item, index) => (
                                                    <Cell
                                                        key={item.name}
                                                        fill={
                                                            PAYMENT_COLORS[
                                                            index % PAYMENT_COLORS.length
                                                            ]
                                                        }
                                                    />
                                                ))}
                                            </Pie>

                                            <Tooltip
                                                formatter={(value) => [
                                                    money(Number(value)),
                                                    'Collected',
                                                ]}
                                                contentStyle={{
                                                    borderRadius: 12,
                                                    border: '1px solid #e2e8f0',
                                                    fontSize: 12,
                                                }}
                                            />

                                            <Legend
                                                verticalAlign="bottom"
                                                iconType="circle"
                                                wrapperStyle={{ fontSize: 11 }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>

                                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-6">
                                        <span className="text-xs text-slate-500">
                                            Total received
                                        </span>
                                        <span className="mt-1 text-lg font-bold text-slate-900">
                                            {money(todayPaymentTotal)}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-2 divide-y divide-slate-100">
                                    {paymentChartData.map((item, index) => {
                                        const percentage =
                                            todayPaymentTotal > 0
                                                ? (item.amount / todayPaymentTotal) * 100
                                                : 0

                                        return (
                                            <div
                                                key={item.name}
                                                className="flex items-center justify-between gap-3 py-3"
                                            >
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <span
                                                        className="h-3 w-3 shrink-0 rounded-full"
                                                        style={{
                                                            backgroundColor:
                                                                PAYMENT_COLORS[
                                                                index % PAYMENT_COLORS.length
                                                                ],
                                                        }}
                                                    />

                                                    <span className="text-sm font-semibold text-slate-700">
                                                        {item.name}
                                                    </span>
                                                </div>

                                                <div className="shrink-0 text-right">
                                                    <p className="text-sm font-bold text-slate-900">
                                                        {money(item.amount)}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {percentage.toFixed(1)}%
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                </section>

                {/* Current inventory */}
                <section>
                    <div className="mb-4">
                        <SectionHeading
                            title="Inventory Overview"
                            subtitle="Current stock position across all batches"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <MetricCard
                            label="Available stock"
                            value={inventory.availableUnits.toLocaleString('en-IN')}
                            icon={Package}
                            description="Units currently available"
                        />

                        <MetricCard
                            label="Units sold"
                            value={inventory.soldUnits.toLocaleString('en-IN')}
                            icon={ShoppingBag}
                            description="Across all inventory"
                        />

                        <MetricCard
                            label="Total received"
                            value={inventory.totalUnits.toLocaleString('en-IN')}
                            icon={ReceiptText}
                            description="Units received"
                        />

                        <MetricCard
                            label="Out of stock"
                            value={inventory.outOfStockItems.toLocaleString('en-IN')}
                            icon={AlertCircle}
                            description="Inventory variants"
                        />
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-slate-800">
                                    Stock availability
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                    Available units compared with total received
                                </p>
                            </div>

                            <span className="text-sm font-bold text-blue-700">
                                {inventory.totalUnits > 0
                                    ? `${Math.round(
                                        (inventory.availableUnits /
                                            inventory.totalUnits) *
                                        100,
                                    )}%`
                                    : '0%'}
                            </span>
                        </div>

                        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                                className="h-full rounded-full bg-blue-600 transition-all"
                                style={{
                                    width: `${inventory.totalUnits > 0
                                            ? Math.min(
                                                100,
                                                (inventory.availableUnits /
                                                    inventory.totalUnits) *
                                                100,
                                            )
                                            : 0
                                        }%`,
                                }}
                            />
                        </div>

                        <div className="mt-2 flex justify-between text-xs text-slate-500">
                            <span>
                                {inventory.availableUnits.toLocaleString('en-IN')} available
                            </span>
                            <span>
                                {inventory.soldUnits.toLocaleString('en-IN')} sold
                            </span>
                        </div>
                    </div>
                </section>

                <p className="mt-8 text-center text-xs text-slate-400">
                    Pocket Bill · Business Dashboard
                </p>
            </main>
        </div>
    )
}

export default DashboardScreen
