import React, { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../services/api";
import { useApp } from "../context/AppContext";
import { EditableProductItem, ProductEditorModal, ProductEditorMode } from "../components/ProductEditorModal";

type SellerManagedItem = {
  _id: string;
  name: string;
  productType: string;
  category: string;
  subCategory?: string;
  brand?: string;
  country?: string;
  originType?: string;
  price: number;
  sizes?: Array<string | { size?: string; price?: number }>;
  sizePricing?: Array<{ size?: string; price?: number }>;
  stock: number;
  rating?: number;
  description?: string;
  alcoholPercentage?: string;
  image?: string;
  spiceLevel?: string;
  vegType?: string;
  pairWith?: string;
  popularInPub?: boolean;
  sellerId?: string | { _id?: string } | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

const matchesCurrentSeller = (item: SellerManagedItem, sellerId: string) => {
  const itemSellerId = String((item?.sellerId as { _id?: string } | null)?._id || item?.sellerId || "");
  return itemSellerId === sellerId;
};

const defaultImage = "https://images.unsplash.com/photo-1516594915697-87eb3b1c14ea?auto=format&fit=crop&q=80&w=400";

export const SellerItemsPage = () => {
  const { state } = useApp();
  const sellerId = String(state.user?.id || "");

  const [items, setItems] = useState<SellerManagedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<ProductEditorMode>("wine");
  const [editorItem, setEditorItem] = useState<EditableProductItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [isChangePickerOpen, setIsChangePickerOpen] = useState(false);
  const [isAddPickerOpen, setIsAddPickerOpen] = useState(false);

  const loadSellerItems = async (options?: { preserveMessage?: boolean }) => {
    setIsLoading(true);
    if (!options?.preserveMessage) {
      setErrorMessage("");
      setSuccessMessage("");
    }

    try {
      const response = await apiRequest<{ items?: SellerManagedItem[] }>("/seller-products");
      const normalizedItems = (response.items || []).filter((item) => matchesCurrentSeller(item, sellerId));
      normalizedItems.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
      setItems(normalizedItems);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load your items");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!sellerId) return;

    void loadSellerItems();
    const timer = window.setInterval(() => {
      void loadSellerItems({ preserveMessage: true });
    }, 10000);

    return () => window.clearInterval(timer);
  }, [sellerId]);

  const totalBrands = useMemo(() => {
    return new Set(items.map((item) => String(item.brand || "").trim()).filter(Boolean)).size;
  }, [items]);

  const totalItems = items.length;

  const averageRating = useMemo(() => {
    if (items.length === 0) return 0;
    const sum = items.reduce((acc, item) => acc + Number(item.rating || 0), 0);
    return sum / items.length;
  }, [items]);

  const groupedByCategory = useMemo(() => {
    const groups = new Map<string, SellerManagedItem[]>();

    items.forEach((item) => {
      const key = String(item.category || "Uncategorized").trim() || "Uncategorized";
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)?.push(item);
    });

    return Array.from(groups.entries())
      .map(([category, categoryItems]) => ({ category, items: categoryItems }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [items]);

  const openAddFlow = (mode: ProductEditorMode) => {
    setEditorMode(mode);
    setEditorItem(null);
    setIsEditorOpen(true);
    setIsAddPickerOpen(false);
  };

  const openEditFlow = (item: SellerManagedItem) => {
    const normalizedMode: ProductEditorMode = ["bite", "food", "beverage"].includes(String(item.productType || "").toLowerCase()) ? "bite" : "wine";
    setEditorMode(normalizedMode);
    setEditorItem({
      ...item,
      sellerId: String((item?.sellerId as { _id?: string } | null)?._id || item?.sellerId || ""),
    });
    setIsEditorOpen(true);
    setIsChangePickerOpen(false);
  };

  const handleSaveItem = async (payload: Record<string, unknown>, itemId?: string) => {
    setIsSaving(true);
    try {
      await apiRequest(itemId ? `/seller-products/${itemId}` : "/seller-products", {
        method: itemId ? "PUT" : "POST",
        body: JSON.stringify({
          ...payload,
          sellerId,
        }),
      });

      setIsEditorOpen(false);
      await loadSellerItems({ preserveMessage: true });
      setSuccessMessage(itemId ? "Item updated successfully." : "Item added successfully.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save item");
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between border-b border-[#333] pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-serif text-white font-bold mb-2">My Items</h1>
          <p className="text-gray-400">Manage and update your liquor, food, beverage, and snack items with live DB sync.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsChangePickerOpen(true)}
            className="px-4 py-2 rounded-lg border border-[#2a2a2a] bg-[#161616] text-xs font-semibold text-[#E3C06A] hover:text-white hover:border-[#E3C06A]/60 transition-colors"
          >
            Change Items
          </button>
          <button
            onClick={() => setIsAddPickerOpen(true)}
            className="px-4 py-2 rounded-lg bg-[#E3C06A] text-black text-xs font-bold hover:bg-[#CDA74C] transition-colors"
          >
            Add Items
          </button>
          <button
            onClick={() => void loadSellerItems()}
            className="px-4 py-2 rounded-lg border border-[#2a2a2a] bg-[#161616] text-xs font-semibold text-[#E3C06A] hover:text-white hover:border-[#E3C06A]/60 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { label: "Total Brands", value: String(totalBrands), delta: "Live from DB" },
          { label: "Total Items", value: String(totalItems), delta: "Live from DB" },
          { label: "Ratings", value: averageRating.toFixed(1), delta: "Average item rating" },
        ].map((item) => (
          <div key={item.label} className="bg-[#111] border border-[#333] rounded-xl p-5 hover:border-[#E3C06A]/50 transition-colors">
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">{item.label}</p>
            <p className="text-3xl font-serif text-white mb-2">{item.value}</p>
            <p className="text-xs text-[#E3C06A] font-semibold">{item.delta}</p>
          </div>
        ))}
      </div>

      {successMessage && <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{successMessage}</div>}
      {errorMessage && <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{errorMessage}</div>}

      <div className="bg-[#111] border border-[#333] rounded-xl p-6">
        <h2 className="text-white text-lg font-bold mb-4">My Item Categories</h2>
        <div
          className="space-y-4 max-h-[62vh] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-[#1a1a1a] [&::-webkit-scrollbar-thumb]:bg-[#E3C06A]/70 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-[#E3C06A]"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#E3C06A #1a1a1a" }}
        >
          {isLoading && items.length === 0 ? (
            <p className="text-sm text-gray-400">Loading your items...</p>
          ) : groupedByCategory.length === 0 ? (
            <p className="text-sm text-gray-400">No items found. Use Add Items to create your catalog.</p>
          ) : (
            groupedByCategory.map((group) => (
              <div key={group.category} className="rounded-lg border border-[#2a2a2a] bg-[#151515] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-white">{group.category}</h3>
                  <span className="text-xs text-[#E3C06A]">{group.items.length} item(s)</span>
                </div>
                <div className="space-y-3">
                  {group.items.map((item) => (
                    <button
                      key={item._id}
                      onClick={() => openEditFlow(item)}
                      className="w-full text-left rounded-xl border border-[#2a2a2a] bg-[#101010] p-4 hover:border-[#E3C06A]/50 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <img src={item.image || defaultImage} alt={item.name} className="h-18 w-18 rounded-lg object-cover border border-[#2a2a2a]" />
                        <div className="min-w-0">
                          <p className="text-lg text-white font-medium leading-tight line-clamp-1">{item.name}</p>
                          <p className="text-sm text-gray-300 mt-1 uppercase">{item.productType} · {item.category}</p>
                          <p className="text-base text-[#E3C06A] mt-2 font-medium">LKR {Number(item.price || 0).toFixed(2)}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-300">
                            <span>Stock: {item.stock}</span>
                            <span>Rating: {Number(item.rating || 0).toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {isAddPickerOpen && (
        <div className="fixed inset-0 z-[85] bg-black/65 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#363636] bg-[#121212] p-5 md:p-6">
            <h3 className="text-lg font-bold text-white mb-2">Add Items</h3>
            <p className="text-xs text-gray-400 mb-4">Select the structure type for your new item.</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => openAddFlow("wine")}
                className="rounded-lg border border-[#E3C06A]/40 bg-[#E3C06A]/10 px-3 py-2 text-xs font-semibold text-[#E3C06A] hover:bg-[#E3C06A] hover:text-black transition-colors"
              >
                Liquor Item
              </button>
              <button
                onClick={() => openAddFlow("bite")}
                className="rounded-lg border border-[#E3C06A]/40 bg-[#E3C06A]/10 px-3 py-2 text-xs font-semibold text-[#E3C06A] hover:bg-[#E3C06A] hover:text-black transition-colors"
              >
                Food / Snack / Drink
              </button>
            </div>
            <button
              onClick={() => setIsAddPickerOpen(false)}
              className="mt-4 w-full rounded-md border border-[#3c3c3c] px-3 py-2 text-xs font-semibold text-gray-300 hover:text-white hover:border-[#E3C06A]/60 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {isChangePickerOpen && (
        <div className="fixed inset-0 z-[85] bg-black/65 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-[#363636] bg-[#121212] p-5 md:p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Change Items</h3>
                <p className="text-xs text-gray-400 mt-1">Select an item to edit.</p>
              </div>
              <button
                onClick={() => setIsChangePickerOpen(false)}
                className="rounded-md border border-[#3c3c3c] px-3 py-1.5 text-xs font-semibold text-gray-300 hover:text-white hover:border-[#E3C06A]/60 transition-colors"
              >
                Close
              </button>
            </div>
            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-[#1a1a1a] [&::-webkit-scrollbar-thumb]:bg-[#E3C06A]/70 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-[#E3C06A]">
              {items.length === 0 ? (
                <p className="text-sm text-gray-400">No items found.</p>
              ) : (
                items.map((item) => (
                  <div key={item._id} className="rounded-lg border border-[#2a2a2a] bg-[#151515] p-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-white font-semibold truncate">{item.name}</p>
                      <p className="text-xs text-gray-400 mt-1 uppercase">{item.productType} · {item.category}</p>
                      <p className="text-xs text-[#E3C06A] mt-1">LKR {Number(item.price || 0).toFixed(2)} · Stock {item.stock}</p>
                    </div>
                    <button
                      onClick={() => openEditFlow(item)}
                      className="rounded-md border border-[#E3C06A]/45 bg-[#E3C06A]/10 px-3 py-1.5 text-xs font-semibold text-[#E3C06A] hover:bg-[#E3C06A] hover:text-black transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <ProductEditorModal
        isOpen={isEditorOpen}
        mode={editorMode}
        item={editorItem}
        isSaving={isSaving}
        onClose={() => setIsEditorOpen(false)}
        onSubmit={handleSaveItem}
      />
    </div>
  );
};
