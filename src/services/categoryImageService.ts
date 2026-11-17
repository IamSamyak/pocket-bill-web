
import JSZip from "jszip";

const DB_NAME = "pocket-bill-local";
const STORE_NAME = "category-images";
const DB_VERSION = 1;

export interface CategoryImageCategory {
  id: string;
  label: string;
}

export interface CategoryImageImportResult {
  importedCategories: number;
  unmatchedFiles: string[];
  duplicateFiles: string[];
}

interface StoredCategoryImage {
  categoryId: string;
  blob: Blob;
  updatedAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "categoryId",
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

// Keep this compatible with Flutter's filename convention.
function sanitizeLabel(label: string): string {
  return (
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") + ".png"
  );
}

function getFilename(path: string): string {
  return path.split("/").pop()?.toLowerCase() ?? "";
}

export async function importCategoryImages(
  zipFile: File,
  categories: CategoryImageCategory[],
): Promise<CategoryImageImportResult> {
  if (!zipFile.name.toLowerCase().endsWith(".zip")) {
    throw new Error("Please select a ZIP file.");
  }

  if (zipFile.size === 0) {
    throw new Error("The selected ZIP file is empty.");
  }

  const zip = await JSZip.loadAsync(zipFile);

  const categoryMap = new Map<string, string[]>();

  for (const category of categories) {
    const filename = sanitizeLabel(category.label);
    const existing = categoryMap.get(filename) ?? [];

    existing.push(category.id);
    categoryMap.set(filename, existing);
  }

  const unmatchedFiles: string[] = [];
  const duplicateFiles: string[] = [];
  const imagesToSave = new Map<string, Blob>();
  const seenFilenames = new Set<string>();

  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir || !path.toLowerCase().endsWith(".png")) {
      continue;
    }

    const filename = getFilename(path);

    if (seenFilenames.has(filename)) {
      duplicateFiles.push(path);
      continue;
    }

    seenFilenames.add(filename);

    const matchingCategoryIds = categoryMap.get(filename);

    if (!matchingCategoryIds?.length) {
      unmatchedFiles.push(path);
      continue;
    }

    const blob = await entry.async("blob");

    if (blob.size === 0) {
      unmatchedFiles.push(path);
      continue;
    }

    // One image can belong to multiple categories with the same label.
    for (const categoryId of matchingCategoryIds) {
      imagesToSave.set(categoryId, blob);
    }
  }

  const db = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    for (const [categoryId, blob] of imagesToSave) {
      const record: StoredCategoryImage = {
        categoryId,
        blob,
        updatedAt: Date.now(),
      };

      store.put(record);
    }

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Image import was cancelled."));
  });

  // Ask the browser to protect this site's locally stored data.
  if (navigator.storage?.persist) {
    await navigator.storage.persist().catch(() => false);
  }

  return {
    importedCategories: imagesToSave.size,
    unmatchedFiles,
    duplicateFiles,
  };
}

export async function getCategoryImage(
  categoryId: string,
): Promise<Blob | null> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction
      .objectStore(STORE_NAME)
      .get(categoryId);

    request.onsuccess = () => {
      const record = request.result as StoredCategoryImage | undefined;
      resolve(record?.blob ?? null);
    };

    request.onerror = () => reject(request.error);
  });
}

export async function deleteCategoryImage(
  categoryId: string,
): Promise<void> {
  const db = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");

    transaction.objectStore(STORE_NAME).delete(categoryId);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}
