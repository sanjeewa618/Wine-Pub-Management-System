import React, { useEffect, useMemo, useState } from "react";

export type ProductEditorMode = "wine" | "bite";

export interface EditableProductItem {
  _id?: string;
  name?: string;
  productType?: string;
  category?: string;
  subCategory?: string;
  brand?: string;
  country?: string;
  originType?: string;
  price?: number;
  sizes?: Array<string | { size?: string; price?: number }>;
  sizePricing?: Array<{ size?: string; price?: number }>;
  stock?: number;
  rating?: number;
  description?: string;
  alcoholPercentage?: string;
  image?: string;
  spiceLevel?: string;
  vegType?: string;
  pairWith?: string;
  popularInPub?: boolean;
  sellerId?: string | null;
  isActive?: boolean;
}

interface ProductEditorModalProps {
  isOpen: boolean;
  mode: ProductEditorMode;
  item: EditableProductItem | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>, itemId?: string) => Promise<void>;
}

interface BiteSizeRow {
  size: string;
  price: string;
}

interface ProductFormState {
  name: string;
  productType: string;
  category: string;
  subCategory: string;
  brand: string;
  country: string;
  originType: string;
  price: string;
  wineSizesText: string;
  biteSizes: BiteSizeRow[];
  stock: string;
  rating: string;
  description: string;
  alcoholPercentage: string;
  image: string;
  spiceLevel: string;
  vegType: string;
  pairWith: string;
  popularInPub: boolean;
  sellerId: string;
  isActive: boolean;
}

const defaultBiteSizes: BiteSizeRow[] = [
  { size: "Regular", price: "" },
  { size: "Large", price: "" },
];

function parseBiteSizes(item: EditableProductItem | null): BiteSizeRow[] {
  const fromSizePricing = Array.isArray(item?.sizePricing)
    ? item?.sizePricing
        .map((entry) => ({
          size: String(entry?.size || "").trim(),
          price: entry?.price !== undefined && entry?.price !== null ? String(entry.price) : "",
        }))
        .filter((entry) => entry.size)
    : [];

  if (fromSizePricing.length > 0) {
    return fromSizePricing;
  }

  const fromSizes = Array.isArray(item?.sizes)
    ? item?.sizes
        .map((entry) => {
          if (typeof entry === "string") {
            return { size: entry.trim(), price: "" };
          }

          return {
            size: String(entry?.size || "").trim(),
            price: entry?.price !== undefined && entry?.price !== null ? String(entry.price) : "",
          };
        })
        .filter((entry) => entry.size)
    : [];

  return fromSizes.length > 0 ? fromSizes : defaultBiteSizes;
}

function buildInitialFormState(mode: ProductEditorMode, item: EditableProductItem | null): ProductFormState {
  const isWine = mode === "wine";
  const fallbackType = isWine ? "wine" : "food";

  const wineSizes = Array.isArray(item?.sizes)
    ? item?.sizes.map((entry) => (typeof entry === "string" ? entry : String(entry?.size || "").trim())).filter(Boolean)
    : [];

  return {
    name: item?.name || "",
    productType: item?.productType || fallbackType,
    category: item?.category || (isWine ? "Wine" : "Foods"),
    subCategory: item?.subCategory || "",
    brand: item?.brand || "",
    country: item?.country || "",
    originType: item?.originType || "Imported",
    price: item?.price !== undefined && item?.price !== null ? String(item.price) : "",
    wineSizesText: wineSizes.join(", "),
    biteSizes: parseBiteSizes(item),
    stock: item?.stock !== undefined && item?.stock !== null ? String(item.stock) : "",
    rating: item?.rating !== undefined && item?.rating !== null ? String(item.rating) : "4.0",
    description: item?.description || "",
    alcoholPercentage: item?.alcoholPercentage || "",
    image: item?.image || "",
    spiceLevel: item?.spiceLevel || "",
    vegType: item?.vegType || "",
    pairWith: item?.pairWith || "",
    popularInPub: Boolean(item?.popularInPub),
    sellerId: String(item?.sellerId || ""),
    isActive: item?.isActive === undefined ? true : Boolean(item.isActive),
  };
}

async function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

export const ProductEditorModal = ({ isOpen, mode, item, isSaving, onClose, onSubmit }: ProductEditorModalProps) => {
  const [form, setForm] = useState<ProductFormState>(() => buildInitialFormState(mode, item));
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setForm(buildInitialFormState(mode, item));
    setFormError("");
  }, [isOpen, item, mode]);

  const title = useMemo(() => {
    const noun = mode === "wine" ? "Wine" : "Bite Item";
    return item?._id ? `Update ${noun}` : `Add New ${noun}`;
  }, [item?._id, mode]);

  if (!isOpen) {
    return null;
  }

  const isWine = mode === "wine";
  const isEditing = Boolean(item?._id);

  const updateForm = <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateBiteSizeRow = (index: number, key: keyof BiteSizeRow, value: string) => {
    setForm((prev) => ({
      ...prev,
      biteSizes: prev.biteSizes.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)),
    }));
  };

  const addSizeRow = () => {
    setForm((prev) => ({
      ...prev,
      biteSizes: [...prev.biteSizes, { size: "", price: "" }],
    }));
  };

  const removeSizeRow = (index: number) => {
    setForm((prev) => ({
      ...prev,
      biteSizes: prev.biteSizes.filter((_, rowIndex) => rowIndex !== index),
    }));
  };

  const handlePickImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setFormError("Please select a valid image file");
      return;
    }

    try {
      const imageUrl = await toDataUrl(file);
      updateForm("image", imageUrl);
      setFormError("");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to process image");
    }
  };

  const handleSave = async () => {
    setFormError("");

    if (!form.name.trim()) {
      setFormError("Name is required");
      return;
    }

    if (!form.category.trim()) {
      setFormError("Category is required");
      return;
    }

    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) {
      setFormError("Price must be a valid positive number");
      return;
    }

    const stock = Number(form.stock);
    if (!Number.isFinite(stock) || stock < 0) {
      setFormError("Stock must be a valid positive number");
      return;
    }

    const rating = Number(form.rating);
    if (!Number.isFinite(rating) || rating < 0) {
      setFormError("Rating must be a valid positive number");
      return;
    }

    let sizes: string[] | Array<{ size: string; price: number }> = [];

    if (isWine) {
      sizes = form.wineSizesText
        .split(/[\n,]/)
        .map((size) => size.trim())
        .filter(Boolean);
    } else {
      sizes = form.biteSizes
        .map((row) => ({ size: row.size.trim(), price: Number(row.price || form.price || 0) }))
        .filter((row) => row.size && Number.isFinite(row.price) && row.price >= 0);
    }

    const sellerId = form.sellerId.trim() || (isEditing ? (item?.sellerId ? String(item.sellerId) : null) : null);

    const safeExistingFields: Record<string, unknown> = isEditing ? { ...(item as Record<string, unknown>) } : {};
    delete safeExistingFields._id;
    delete safeExistingFields.createdAt;
    delete safeExistingFields.updatedAt;

    const payload = {
      ...(isEditing ? safeExistingFields : {}),
      name: form.name.trim(),
      productType: form.productType,
      category: form.category.trim(),
      subCategory: form.subCategory.trim(),
      brand: form.brand.trim(),
      country: form.country.trim(),
      originType: form.originType,
      price,
      sizes,
      stock,
      rating,
      description: form.description.trim(),
      alcoholPercentage: form.alcoholPercentage.trim(),
      image: form.image.trim(),
      spiceLevel: form.spiceLevel.trim(),
      vegType: form.vegType.trim(),
      pairWith: form.pairWith.trim(),
      popularInPub: form.popularInPub,
      sellerId,
      isActive: form.isActive,
    };

    try {
      await onSubmit(payload, item?._id);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to save item");
    }
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-3 md:p-6">
      <div
        className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl border border-[#363636] bg-[#121212] p-5 md:p-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-[#151515] [&::-webkit-scrollbar-thumb]:bg-[#D4AF37]/70 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-[#D4AF37]"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#D4AF37 #151515" }}
      >
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h3 className="text-xl font-bold text-white">{title}</h3>
            <p className="text-xs text-gray-400 mt-1">
              {isWine
                ? "Use wine structure fields. Changes are saved to database immediately."
                : "Use bite structure fields with size-price rows. Changes are saved to database immediately."}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="rounded-md border border-[#3c3c3c] px-3 py-1.5 text-xs font-semibold text-gray-300 hover:text-white hover:border-[#D4AF37]/60 transition-colors disabled:opacity-60"
          >
            Close
          </button>
        </div>

        {formError && (
          <div className="mb-4 rounded-lg border border-red-400/40 bg-red-500/10 text-red-300 text-sm px-3 py-2">
            {formError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Name *</label>
            <input
              value={form.name}
              onChange={(event) => updateForm("name", event.target.value)}
              className="w-full rounded-md border border-[#333] bg-[#161616] px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Product Type *</label>
            <select
              value={form.productType}
              onChange={(event) => updateForm("productType", event.target.value)}
              className="w-full rounded-md border border-[#333] bg-[#161616] px-3 py-2 text-sm text-white"
            >
              {isWine ? (
                ["wine", "arrack", "whiskey", "whisky", "rum", "beer"].map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))
              ) : (
                ["food", "beverage", "bite"].map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Category *</label>
            <input
              value={form.category}
              onChange={(event) => updateForm("category", event.target.value)}
              className="w-full rounded-md border border-[#333] bg-[#161616] px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Sub Category</label>
            <input
              value={form.subCategory}
              onChange={(event) => updateForm("subCategory", event.target.value)}
              className="w-full rounded-md border border-[#333] bg-[#161616] px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Price (LKR) *</label>
            <input
              type="number"
              min={0}
              value={form.price}
              onChange={(event) => updateForm("price", event.target.value)}
              className="w-full rounded-md border border-[#333] bg-[#161616] px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Stock *</label>
            <input
              type="number"
              min={0}
              value={form.stock}
              onChange={(event) => updateForm("stock", event.target.value)}
              className="w-full rounded-md border border-[#333] bg-[#161616] px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Rating</label>
            <input
              type="number"
              min={0}
              max={5}
              step="0.1"
              value={form.rating}
              onChange={(event) => updateForm("rating", event.target.value)}
              className="w-full rounded-md border border-[#333] bg-[#161616] px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Pair With</label>
            <input
              value={form.pairWith}
              onChange={(event) => updateForm("pairWith", event.target.value)}
              className="w-full rounded-md border border-[#333] bg-[#161616] px-3 py-2 text-sm text-white"
            />
          </div>

          {isWine ? (
            <>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Brand</label>
                <input
                  value={form.brand}
                  onChange={(event) => updateForm("brand", event.target.value)}
                  className="w-full rounded-md border border-[#333] bg-[#161616] px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Country</label>
                <input
                  value={form.country}
                  onChange={(event) => updateForm("country", event.target.value)}
                  className="w-full rounded-md border border-[#333] bg-[#161616] px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Origin Type</label>
                <select
                  value={form.originType}
                  onChange={(event) => updateForm("originType", event.target.value)}
                  className="w-full rounded-md border border-[#333] bg-[#161616] px-3 py-2 text-sm text-white"
                >
                  <option value="Imported">Imported</option>
                  <option value="Local">Local</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Alcohol Percentage</label>
                <input
                  value={form.alcoholPercentage}
                  onChange={(event) => updateForm("alcoholPercentage", event.target.value)}
                  placeholder="13.9%"
                  className="w-full rounded-md border border-[#333] bg-[#161616] px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Sizes (comma separated)</label>
                <input
                  value={form.wineSizesText}
                  onChange={(event) => updateForm("wineSizesText", event.target.value)}
                  placeholder="750 ml, 1 L"
                  className="w-full rounded-md border border-[#333] bg-[#161616] px-3 py-2 text-sm text-white"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Spice Level</label>
                <input
                  value={form.spiceLevel}
                  onChange={(event) => updateForm("spiceLevel", event.target.value)}
                  placeholder="Mild"
                  className="w-full rounded-md border border-[#333] bg-[#161616] px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Veg Type</label>
                <select
                  value={form.vegType}
                  onChange={(event) => updateForm("vegType", event.target.value)}
                  className="w-full rounded-md border border-[#333] bg-[#161616] px-3 py-2 text-sm text-white"
                >
                  <option value="">Select</option>
                  <option value="Veg">Veg</option>
                  <option value="Non-Veg">Non-Veg</option>
                </select>
              </div>

              <div className="md:col-span-2 rounded-lg border border-[#2e2e2e] bg-[#171717] p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-[#D4AF37]">Sizes and Prices</p>
                  <button
                    type="button"
                    onClick={addSizeRow}
                    className="text-xs rounded border border-[#D4AF37]/40 px-2 py-1 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-colors"
                  >
                    Add Row
                  </button>
                </div>
                <div className="space-y-2">
                  {form.biteSizes.map((row, index) => (
                    <div key={`size-row-${index}`} className="grid grid-cols-[1fr_120px_auto] gap-2">
                      <input
                        value={row.size}
                        onChange={(event) => updateBiteSizeRow(index, "size", event.target.value)}
                        placeholder="Regular"
                        className="rounded-md border border-[#333] bg-[#111] px-3 py-2 text-sm text-white"
                      />
                      <input
                        type="number"
                        min={0}
                        value={row.price}
                        onChange={(event) => updateBiteSizeRow(index, "price", event.target.value)}
                        placeholder="900"
                        className="rounded-md border border-[#333] bg-[#111] px-3 py-2 text-sm text-white"
                      />
                      <button
                        type="button"
                        onClick={() => removeSizeRow(index)}
                        className="rounded-md border border-red-400/40 px-2 text-xs text-red-300 hover:bg-red-500/10"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="md:col-span-2">
            <label className="block text-xs text-gray-400 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(event) => updateForm("description", event.target.value)}
              rows={3}
              className="w-full rounded-md border border-[#333] bg-[#161616] px-3 py-2 text-sm text-white"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs text-gray-400 mb-1">Image URL / Data</label>
            <input
              value={form.image}
              onChange={(event) => updateForm("image", event.target.value)}
              placeholder="Paste URL or use Choose Image"
              className="w-full rounded-md border border-[#333] bg-[#161616] px-3 py-2 text-sm text-white"
            />
            <div className="mt-2 flex items-center gap-3 flex-wrap">
              <label className="rounded-md border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-3 py-1.5 text-xs font-semibold text-[#D4AF37] cursor-pointer hover:bg-[#D4AF37] hover:text-black transition-colors">
                Choose Image
                <input type="file" accept="image/*" onChange={handlePickImage} className="hidden" />
              </label>
              <p className="text-[11px] text-gray-400">You can upload from local machine. It will be saved to DB as image data URL.</p>
            </div>
          </div>

          {form.image && (
            <div className="md:col-span-2">
              <p className="text-xs text-gray-400 mb-1">Image Preview</p>
              <img src={form.image} alt="Preview" className="h-36 w-full rounded-lg border border-[#2e2e2e] object-cover bg-[#0d0d0d]" />
            </div>
          )}

          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex items-center gap-2 rounded-md border border-[#2e2e2e] bg-[#161616] px-3 py-2 text-sm text-gray-200">
              <input
                type="checkbox"
                checked={form.popularInPub}
                onChange={(event) => updateForm("popularInPub", event.target.checked)}
                className="accent-[#D4AF37]"
              />
              Popular In Pub
            </label>
            <label className="flex items-center gap-2 rounded-md border border-[#2e2e2e] bg-[#161616] px-3 py-2 text-sm text-gray-200">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => updateForm("isActive", event.target.checked)}
                className="accent-[#D4AF37]"
              />
              Active Item
            </label>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-[#2e2e2e] flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="rounded-md border border-[#3c3c3c] px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white hover:border-[#D4AF37]/60 transition-colors disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="rounded-md bg-[#D4AF37] px-4 py-2 text-xs font-bold text-black hover:bg-[#c39b22] transition-colors disabled:opacity-60"
          >
            {isSaving ? "Saving..." : item?._id ? "Update Item" : "Add Item"}
          </button>
        </div>
      </div>
    </div>
  );
};
