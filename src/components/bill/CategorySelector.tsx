
import { useEffect, useMemo, useState } from 'react'
import { Package, Search, Star, X } from 'lucide-react'

import type { Category } from '../../services/catalogService'
import { getCategoryImage } from '../../services/categoryImageService'

interface CategorySelectorProps {
  categories: Category[]
  isLoading: boolean
  error: string
  onSelect: (category: Category) => void
  onClose: () => void
}

function CategoryThumbnail({
  categoryId,
}: {
  categoryId: string
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null

    async function loadImage() {
      try {
        const blob = await getCategoryImage(categoryId)

        if (cancelled || !blob) return

        objectUrl = URL.createObjectURL(blob)
        setImageUrl(objectUrl)
      } catch (error) {
        console.error('Failed to load category image:', error)
      }
    }

    loadImage()

    return () => {
      cancelled = true

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [categoryId])

  return (
    <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        <Package size={21} className="text-slate-400" />
      )}
    </div>
  )
}

export default function CategorySelector({
  categories,
  isLoading,
  error,
  onSelect,
  onClose,
}: CategorySelectorProps) {
  const [search, setSearch] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('Favorites')

  // Build filters dynamically from the category tags.
  const availableFilters = useMemo(() => {
    const tags = new Set(
      categories.map((category) => category.tag ?? 'Others'),
    )

    const sortedTags = [...tags]
      .filter((tag) => tag !== 'Favorites' && tag !== 'All')
      .sort((a, b) => a.localeCompare(b))

    return ['Favorites', 'All', ...sortedTags]
  }, [categories])

  // Derive a valid active filter without updating state inside an effect.
  const activeFilter = availableFilters.includes(selectedFilter)
    ? selectedFilter
    : 'Favorites'

  // Apply search and selected category filter.
  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase()

    return categories
      .filter((category) => {
        const matchesSearch = category.label
          .toLowerCase()
          .includes(query)

        const categoryTag = category.tag ?? 'Others'

        const matchesFilter =
          activeFilter === 'Favorites'
            ? category.isFavorite
            : activeFilter === 'All'
              ? true
              : categoryTag === activeFilter

        return matchesSearch && matchesFilter
      })
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [categories, search, activeFilter])

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-t-3xl bg-white shadow-xl sm:rounded-2xl">
        {/* Header */}
        <div className="border-b border-slate-100 px-5 pb-4 pt-3">
          <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden" />

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Select Category
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Choose the category for your manual item
              </p>
            </div>

            <button
              onClick={onClose}
              className="rounded-full bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="border-b border-slate-100 p-4">
          <div className="relative">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search categories..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* Category filters */}
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {availableFilters.map((filter) => {
              const isSelected = activeFilter === filter

              return (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {filter === 'Favorites' ? '★ Favorites' : filter}
                </button>
              )
            })}
          </div>
        </div>

        {/* Category list */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <p className="py-10 text-center text-sm text-slate-500">
              Loading categories...
            </p>
          ) : error ? (
            <p className="py-10 text-center text-sm text-red-600">
              {error}
            </p>
          ) : filteredCategories.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              No categories found.
            </p>
          ) : (
            <div className="space-y-2">
              {filteredCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => onSelect(category)}
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-blue-400 hover:bg-blue-50"
                >
                  <CategoryThumbnail categoryId={category.id} />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {category.label}
                      </p>

                      {category.isFavorite && (
                        <Star
                          size={13}
                          className="shrink-0 fill-amber-400 text-amber-400"
                        />
                      )}
                    </div>

                    <p className="mt-1 text-xs text-slate-500">
                      {category.tag ?? 'Others'}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      category.discount > 0
                        ? 'bg-red-50 text-red-600'
                        : 'bg-blue-50 text-blue-600'
                    }`}
                  >
                    {category.discount > 0
                      ? `-${category.discount}%`
                      : 'No discount'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 p-4">
          <p className="text-center text-xs text-slate-500">
            {filteredCategories.length} categor
            {filteredCategories.length === 1 ? 'y' : 'ies'} found
          </p>
        </div>
      </div>
    </div>
  )
}
