
import { useEffect, useRef, useState } from "react";
import { ImagePlus, Upload, Image, AlertCircle, CheckCircle2 } from "lucide-react";

import { getCatalog, type Category } from "../../services/catalogService";
import {
  importCategoryImages,
  getCategoryImage,
  type CategoryImageImportResult,
} from "../../services/categoryImageService";

export default function CategoryImageManager() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] =
    useState<CategoryImageImportResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    const createdUrls: string[] = [];

    async function loadCategories() {
      try {
        setLoading(true);

        const catalog = await getCatalog();

        if (!cancelled) {
          setCategories(catalog.categories);
        }

        const entries = await Promise.all(
          catalog.categories.map(async (category) => {
            const blob = await getCategoryImage(category.id);

            if (!blob) return null;

            const url = URL.createObjectURL(blob);
            createdUrls.push(url);

            return [category.id, url] as const;
          }),
        );

        if (!cancelled) {
          setImageUrls(
            Object.fromEntries(entries.filter(Boolean) as [string, string][]),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load category images.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCategories();

    return () => {
      cancelled = true;
      createdUrls.forEach(URL.revokeObjectURL);
    };
  }, []);

  async function handleImport(file?: File) {
    if (!file) return;

    setError("");
    setResult(null);
    setImporting(true);

    try {
      const importResult = await importCategoryImages(file, categories);

      setResult(importResult);

      // Reload previews from IndexedDB after the import.
      const newUrls: Record<string, string> = {};

      for (const category of categories) {
        const blob = await getCategoryImage(category.id);

        if (blob) {
          newUrls[category.id] = URL.createObjectURL(blob);
        }
      }

      setImageUrls((previous) => {
        Object.values(previous).forEach(URL.revokeObjectURL);
        return newUrls;
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Image import failed.",
      );
    } finally {
      setImporting(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  const categoriesWithImages = categories.filter(
    (category) => imageUrls[category.id],
  );

  if (loading) {
    return (
      <div className="p-6 text-sm text-slate-500">
        Loading category images...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Category Images
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Import your existing category PNG images from a ZIP file.
          Images stay in this browser and are not uploaded to Firebase.
        </p>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
          <ImagePlus size={22} className="text-slate-600" />
        </div>

        <h3 className="mt-4 font-medium text-slate-900">
          Import category images
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Select the category_images_export.zip file from your device.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={(event) => handleImport(event.target.files?.[0])}
        />

        <button
          type="button"
          disabled={importing || categories.length === 0}
          onClick={() => fileInputRef.current?.click()}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Upload size={16} />
          {importing ? "Importing..." : "Choose ZIP file"}
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 font-medium text-emerald-800">
            <CheckCircle2 size={18} />
            Import completed
          </div>

          <p className="text-sm text-emerald-800">
            Images assigned to {result.importedCategories} categories.
          </p>

          {result.unmatchedFiles.length > 0 && (
            <div className="text-sm text-amber-800">
              <p className="font-medium">Unmatched files</p>
              <ul className="mt-1 list-inside list-disc">
                {result.unmatchedFiles.map((file) => (
                  <li key={file}>{file}</li>
                ))}
              </ul>
            </div>
          )}

          {result.duplicateFiles.length > 0 && (
            <div className="text-sm text-amber-800">
              <p className="font-medium">Duplicate filenames skipped</p>
              <ul className="mt-1 list-inside list-disc">
                {result.duplicateFiles.map((file) => (
                  <li key={file}>{file}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">
            Imported images
          </h3>
          <span className="text-sm text-slate-500">
            {categoriesWithImages.length} / {categories.length}
          </span>
        </div>

        {categoriesWithImages.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <Image size={28} className="mx-auto text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">
              No category images imported yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {categoriesWithImages.map((category) => (
              <div
                key={category.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                <div className="aspect-square bg-slate-100">
                  <img
                    src={imageUrls[category.id]}
                    alt={category.label}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="truncate px-3 py-2 text-sm font-medium text-slate-700">
                  {category.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
