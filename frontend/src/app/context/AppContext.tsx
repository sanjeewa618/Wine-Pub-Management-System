import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { apiRequest, clearApiToken, getApiToken, setApiToken } from "../services/api";

export type Role = "guest" | "customer" | "seller" | "admin";

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  phone?: string;
  status?: string;
  twoFactorEnabled?: boolean;
}

interface Product {
  id: string;
  name: string;
  productType?: string;
  type: "wine" | "bite";
  category: string;
  subCategory?: string;
  price: number;
  image: string;
  rating: number;
  description: string;
  alcohol?: string;
  sizes?: string[];
  sellerId?: string;
  brand?: string;
  country?: string;
  originType?: string;
  sizePricing?: { size: string; price: number }[];
}

interface CartItem extends Product {
  quantity: number;
  selectedSize?: string;
}

interface AppState {
  user: User | null;
  cart: CartItem[];
  theme: "dark" | "light";
}

interface AppContextType {
  state: AppState;
  isAuthResolved: boolean;
  sessionRefreshKey: number;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: { name: string; email: string; password: string; role?: Role }) => Promise<{ user: User; requiresApproval?: boolean; message?: string }>;
  logout: () => Promise<void>;
  addToCart: (product: Product, size?: string, quantity?: number) => Promise<void>;
  removeFromCart: (productId: string, selectedSize?: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number, selectedSize?: string) => Promise<void>;
  checkout: (payload: { orderType: "pickup" | "delivery"; deliveryAddress?: string; paymentMethod: string; pickupTableNumber?: string }) => Promise<unknown>;
  createReservation: (payload: { date: string; time: string; guests: string; tableNumbers: string[]; name: string; email: string; phone: string; requests: string }) => Promise<unknown>;
  updateProfile: (payload: { name: string; email: string; phone?: string; avatar?: string }) => Promise<User>;
  changePassword: (payload: { currentPassword: string; newPassword: string }) => Promise<void>;
  toggleTwoFactor: (enabled: boolean) => Promise<User>;
  toggleTheme: () => void;
  products: Product[];
}

const mockProducts: Product[] = [
  {
    id: "1",
    name: "Château Margaux 2015",
    type: "wine",
    category: "Red",
    price: 850,
    image: "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&q=80&w=800",
    rating: 4.9,
    description: "A premier cru Bordeaux, known for its elegant structure and rich, complex flavors of blackcurrant and truffle.",
    alcohol: "13.5%",
    sizes: ["750ml", "1.5L"],
    sellerId: "s1",
  },
  {
    id: "2",
    name: "Dom Pérignon Vintage 2012",
    type: "wine",
    category: "Sparkling",
    price: 299,
    image: "https://images.unsplash.com/photo-1590664216390-50fb3d63bd18?auto=format&fit=crop&q=80&w=800",
    rating: 4.8,
    description: "Iconic vintage champagne offering an energetic harmony of fruits, florals, and toasty notes.",
    alcohol: "12.5%",
    sizes: ["750ml"],
    sellerId: "s1",
  },
  {
    id: "3",
    name: "Cloudy Bay Sauvignon Blanc",
    type: "wine",
    category: "White",
    price: 45,
    image: "https://images.unsplash.com/photo-1569914442111-c91838637775?auto=format&fit=crop&q=80&w=800",
    rating: 4.7,
    description: "Vibrant and aromatic with notes of passionfruit, citrus, and a crisp, refreshing finish.",
    alcohol: "13.0%",
    sizes: ["750ml"],
    sellerId: "s2",
  },
  {
    id: "4",
    name: "Opus One 2018",
    type: "wine",
    category: "Red",
    price: 450,
    image: "https://images.unsplash.com/photo-1606115915130-4507a4f92bc5?auto=format&fit=crop&q=80&w=800",
    rating: 4.9,
    description: "A legendary Napa Valley blend offering deep flavors of blackberry, cassis, and subtle cocoa.",
    alcohol: "14.5%",
    sizes: ["750ml"],
    sellerId: "s2",
  },
  {
    id: "5",
    name: "Truffle Fries",
    type: "bite",
    category: "Snacks",
    price: 15,
    image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&q=80&w=800",
    rating: 4.6,
    description: "Crispy french fries tossed with truffle oil and parmesan cheese.",
  },
  {
    id: "6",
    name: "Artisan Cheese Board",
    type: "bite",
    category: "Platters",
    price: 35,
    image: "https://images.unsplash.com/photo-1551044439-d3e8e25dd057?auto=format&fit=crop&q=80&w=800",
    rating: 4.8,
    description: "A curated selection of imported cheeses, cured meats, and fresh fruits.",
  },
  {
    id: "7",
    name: "Spicy Devilled Chicken",
    type: "bite",
    category: "Hot Bites",
    price: 18,
    image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&q=80&w=800",
    rating: 4.7,
    description: "Wok-tossed chicken with bell peppers, onion, and signature spicy devilled sauce.",
  },
  {
    id: "8",
    name: "Crispy Calamari Rings",
    type: "bite",
    category: "Seafood",
    price: 22,
    image: "https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&q=80&w=800",
    rating: 4.6,
    description: "Golden fried calamari with lime aioli and chili flakes.",
  },
  {
    id: "9",
    name: "Loaded Nacho Skillet",
    type: "bite",
    category: "Bar Snacks",
    price: 16,
    image: "https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&q=80&w=800",
    rating: 4.5,
    description: "Crunchy nachos layered with cheese, salsa, jalapenos, and smoky chicken.",
  },
  {
    id: "10",
    name: "Chicken Kottu",
    type: "bite",
    category: "Rice & Kottu",
    price: 14,
    image: "https://images.unsplash.com/photo-1625938144755-652e08e359b7?auto=format&fit=crop&q=80&w=800",
    rating: 4.8,
    description: "Classic Sri Lankan kottu with chopped roti, chicken, egg, and aromatic spices.",
  },
  {
    id: "11",
    name: "Seafood Kottu",
    type: "bite",
    category: "Rice & Kottu",
    price: 17,
    image: "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?auto=format&fit=crop&q=80&w=800",
    rating: 4.7,
    description: "Prawn and cuttlefish kottu finished with black pepper and spring onion.",
  },
  {
    id: "12",
    name: "Egg Kottu",
    type: "bite",
    category: "Rice & Kottu",
    price: 12,
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800",
    rating: 4.4,
    description: "Soft-scrambled egg kottu with curry leaves and mild chili heat.",
  },
  {
    id: "13",
    name: "Seafood Fried Rice",
    type: "bite",
    category: "Rice & Kottu",
    price: 15,
    image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&q=80&w=800",
    rating: 4.5,
    description: "Fragrant rice stir-fried with prawns, squid, egg, and sesame soy glaze.",
  },
  {
    id: "14",
    name: "BBQ Pork Ribs",
    type: "bite",
    category: "Street Grill",
    price: 24,
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=800",
    rating: 4.8,
    description: "Slow-cooked ribs glazed with smoky BBQ reduction and toasted sesame.",
  },
  {
    id: "15",
    name: "Garlic Butter Prawns",
    type: "bite",
    category: "Seafood",
    price: 23,
    image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&q=80&w=800",
    rating: 4.7,
    description: "Sauteed jumbo prawns in garlic butter with lemon zest and herbs.",
  },
  {
    id: "16",
    name: "Signature Mixed Platter",
    type: "bite",
    category: "Platters",
    price: 32,
    image: "https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&q=80&w=800",
    rating: 4.9,
    description: "Chef's mix of grilled meats, seafood bites, dips, and house flatbread.",
  }
];

const AppContext = createContext<AppContextType | undefined>(undefined);
const CART_STORAGE_KEY = "wine-pub-cart";

function loadStoredCart(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return mapCartItems(parsed);
  } catch {
    return [];
  }
}

function saveStoredCart(cart: CartItem[]) {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // Ignore storage write failures.
  }
}

function mapUser(user: any): User {
  return {
    id: String(user?.id ?? user?._id ?? ""),
    name: user?.name ?? "",
    email: user?.email ?? "",
    role: user?.role ?? "guest",
    avatar: user?.avatar,
    phone: user?.phone,
    status: user?.status,
    twoFactorEnabled: Boolean(user?.twoFactorEnabled),
  };
}

function mapProduct(product: any): Product {
  return {
    id: String(product?.id ?? product?._id ?? ""),
    name: product?.name ?? "Untitled",
    productType: product?.productType ?? "",
    type: ["bite", "food", "beverage"].includes(product?.productType) ? "bite" : "wine",
    category: product?.category ?? "General",
    subCategory: product?.subCategory ?? "",
    price: Number(product?.price ?? 0),
    image:
      product?.image ||
      "https://images.unsplash.com/photo-1514361892635-eae31a3d0f1d?auto=format&fit=crop&q=80&w=800",
    rating: Number(product?.rating ?? 0),
    description: product?.description ?? "",
    alcohol: product?.alcoholPercentage ?? product?.alcohol,
    sizes: product?.sizes ?? [],
    sizePricing: Array.isArray(product?.sizePricing)
      ? product.sizePricing.map((entry: any) => ({
          size: String(entry?.size ?? ""),
          price: Number(entry?.price ?? 0),
        }))
      : [],
    sellerId: String(product?.sellerId?._id ?? product?.sellerId ?? ""),
    brand: product?.brand ?? "",
    country: product?.country ?? "",
    originType: product?.originType ?? "",
  };
}

function mapCartItem(item: any): CartItem {
  const product = item?.productId ?? item;

  const fallbackProduct = {
    id: String(item?.productId?._id ?? item?.productId ?? item?._id ?? ""),
    name: item?.name ?? product?.name ?? "Untitled",
    productType: item?.productType ?? product?.productType ?? "wine",
    category: item?.category ?? product?.category ?? "General",
    subCategory: item?.subCategory ?? product?.subCategory ?? "",
    price: Number(item?.price ?? product?.price ?? 0),
    image:
      item?.image ||
      product?.image ||
      "https://images.unsplash.com/photo-1514361892635-eae31a3d0f1d?auto=format&fit=crop&q=80&w=800",
    rating: Number(item?.rating ?? product?.rating ?? 0),
    description: item?.description ?? product?.description ?? "",
    alcohol: item?.alcoholPercentage ?? item?.alcohol ?? product?.alcoholPercentage ?? product?.alcohol,
    sizes: item?.sizes ?? product?.sizes ?? [],
    sizePricing: Array.isArray(item?.sizePricing)
      ? item.sizePricing.map((entry: any) => ({ size: String(entry?.size ?? ""), price: Number(entry?.price ?? 0) }))
      : Array.isArray(product?.sizePricing)
      ? product.sizePricing.map((entry: any) => ({ size: String(entry?.size ?? ""), price: Number(entry?.price ?? 0) }))
      : [],
    sellerId: String(item?.sellerId ?? product?.sellerId?._id ?? product?.sellerId ?? ""),
    brand: item?.brand ?? product?.brand ?? "",
    country: item?.country ?? product?.country ?? "",
    originType: item?.originType ?? product?.originType ?? "",
  };

  return {
    ...mapProduct(fallbackProduct),
    quantity: Number(item?.quantity ?? 1),
    selectedSize: item?.selectedSize || undefined,
    price: Number(item?.price ?? product?.price ?? 0),
  };
}

function mapCartItems(items: any[] = []): CartItem[] {
  const merged = new Map<string, CartItem>();

  items.forEach((item) => {
    const mapped = mapCartItem(item);
    const normalizedSize = String(mapped.selectedSize || "");
    const key = `${mapped.id}::${normalizedSize}`;
    const existing = merged.get(key);

    if (existing) {
      existing.quantity += Math.max(1, Number(mapped.quantity || 1));
      return;
    }

    merged.set(key, {
      ...mapped,
      selectedSize: normalizedSize || undefined,
      quantity: Math.max(1, Number(mapped.quantity || 1)),
    });
  });

  return Array.from(merged.values());
}

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AppState>({
    user: null,
    cart: loadStoredCart(),
    theme: "dark",
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [isAuthResolved, setIsAuthResolved] = useState(false);
  const [sessionRefreshKey, setSessionRefreshKey] = useState(0);

  const fetchProducts = useCallback(async () => {
    const [winesResult, bitesResult] = await Promise.allSettled([
      apiRequest<{ items: any[] }>("/wines"),
      apiRequest<{ items: any[] }>("/bites"),
    ]);

    const mappedProducts = [
      ...(winesResult.status === "fulfilled" ? winesResult.value.items.map(mapProduct) : []),
      ...(bitesResult.status === "fulfilled" ? bitesResult.value.items.map(mapProduct) : []),
    ];

    setProducts(mappedProducts);
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadProducts = async () => {
      try {
        await fetchProducts();
      } catch (error) {
        if (isActive) {
          setProducts([]);
        }
      }
    };

    const bootstrapSession = async () => {
      try {
        await loadProducts();

        if (!getApiToken()) {
          if (isActive) {
            setIsAuthResolved(true);
          }
          return;
        }

        const [meResponse, cartResponse] = await Promise.all([
          apiRequest<{ user: any }>("/auth/me"),
          apiRequest<{ cart: any }>("/cart"),
        ]);

        if (!isActive) {
          return;
        }

        const serverCartItems = mapCartItems(cartResponse.cart?.items ?? []);
        const storedCartItems = loadStoredCart();
        const resolvedCart = serverCartItems.length > 0 ? serverCartItems : storedCartItems;

        setState((prev) => ({
          ...prev,
          user: mapUser(meResponse.user),
          cart: resolvedCart,
        }));
        setSessionRefreshKey((prev) => prev + 1);
      } catch (error) {
        // Keep token as-is on bootstrap failure (e.g., backend temporarily unavailable).
      } finally {
        if (isActive) {
          setIsAuthResolved(true);
        }
      }
    };

    void bootstrapSession();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void fetchProducts().catch(() => {
        // Keep last known product list if a periodic poll fails.
      });
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [fetchProducts]);

  useEffect(() => {
    saveStoredCart(state.cart);
  }, [state.cart]);

  const refreshCart = async () => {
    if (!getApiToken()) {
      return;
    }

    const response = await apiRequest<{ cart: any }>("/cart");
    const serverCartItems = mapCartItems(response.cart?.items ?? []);
    const storedCartItems = loadStoredCart();
    const resolvedCart = serverCartItems.length > 0 ? serverCartItems : storedCartItems;

    setState((prev) => ({
      ...prev,
      cart: resolvedCart,
    }));
  };

  const login = async (email: string, password: string) => {
    const response = await apiRequest<{ token: string; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    setApiToken(response.token);
    const user = mapUser(response.user);

    setState((prev) => ({
      ...prev,
      user,
    }));
    setSessionRefreshKey((prev) => prev + 1);

    await refreshCart();
    return user;
  };

  const register = async (payload: { name: string; email: string; password: string; role?: Role }) => {
    const response = await apiRequest<{ user: any; requiresApproval?: boolean; message?: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const user = mapUser(response.user);

    clearApiToken();
    setState((prev) => ({
      ...prev,
      user: null,
      cart: [],
    }));

    return {
      user,
      requiresApproval: response.requiresApproval,
      message: response.message,
    };
  };

  const logout = async () => {
    try {
      if (getApiToken()) {
        await apiRequest<{ success: boolean }>("/auth/logout", { method: "POST" });
      }
    } finally {
      clearApiToken();
      setState((prev) => ({
        ...prev,
        user: null,
        cart: [],
      }));
      setSessionRefreshKey((prev) => prev + 1);
    }
  };

  const addToCart = async (product: Product, size?: string, quantity = 1) => {
    if (!getApiToken()) {
      setState((prev) => {
        const existing = prev.cart.find((item) => item.id === product.id && item.selectedSize === size);

        if (existing) {
          return {
            ...prev,
            cart: prev.cart.map((item) =>
              item.id === product.id && item.selectedSize === size
                ? { ...item, quantity: item.quantity + Math.max(1, quantity) }
                : item
            ),
          };
        }

        return {
          ...prev,
          cart: [...prev.cart, { ...product, quantity: Math.max(1, quantity), selectedSize: size }],
        };
      });

      return;
    }

    const response = await apiRequest<{ cart: any }>("/cart/items", {
      method: "POST",
      body: JSON.stringify({ productId: product.id, quantity: Math.max(1, quantity), selectedSize: size || "" }),
    });

    setState((prev) => ({
      ...prev,
      cart: mapCartItems(response.cart?.items ?? []),
    }));
  };

  const removeFromCart = async (productId: string, selectedSize?: string) => {
    if (!getApiToken()) {
      setState((prev) => ({
        ...prev,
        cart: prev.cart.filter((item) => item.id !== productId || (selectedSize ? item.selectedSize !== selectedSize : false)),
      }));
      return;
    }

    try {
      const response = await apiRequest<{ cart: any }>(`/cart/items/${productId}${selectedSize ? `?selectedSize=${encodeURIComponent(selectedSize)}` : ""}`, {
        method: "DELETE",
      });

      setState((prev) => ({
        ...prev,
        cart: mapCartItems(response.cart?.items ?? []),
      }));
    } catch {
      // Keep cart interaction responsive even if backend call fails.
      setState((prev) => ({
        ...prev,
        cart: prev.cart.filter((item) => item.id !== productId || (selectedSize ? item.selectedSize !== selectedSize : false)),
      }));
    }
  };

  const updateQuantity = async (productId: string, quantity: number, selectedSize?: string) => {
    if (!getApiToken()) {
      setState((prev) => ({
        ...prev,
        cart: prev.cart.map((item) =>
          item.id === productId && (selectedSize ? item.selectedSize === selectedSize : true)
            ? { ...item, quantity: Math.max(1, quantity) }
            : item
        ),
      }));
      return;
    }

    const response = await apiRequest<{ cart: any }>(`/cart/items/${productId}`, {
      method: "PUT",
      body: JSON.stringify({ quantity, selectedSize: selectedSize || "" }),
    });

    setState((prev) => ({
      ...prev,
      cart: mapCartItems(response.cart?.items ?? []),
    }));
  };

  const checkout = async (payload: { orderType: "pickup" | "delivery"; deliveryAddress?: string; paymentMethod: string; pickupTableNumber?: string }) => {
    if (!getApiToken()) {
      throw new Error("Please sign in before checkout");
    }

    const response = await apiRequest<{ order: unknown }>("/cart/checkout", {
      method: "POST",
      body: JSON.stringify({
        orderType: payload.orderType,
        deliveryAddress: payload.deliveryAddress || "",
        paymentMethod: payload.paymentMethod,
        pickupTableNumber: payload.pickupTableNumber || "",
      }),
    });

    setState((prev) => ({
      ...prev,
      cart: [],
    }));

    return response.order;
  };

  const createReservation = async (payload: { date: string; time: string; guests: string; tableNumbers: string[]; name: string; email: string; phone: string; requests: string }) => {
    if (!getApiToken()) {
      throw new Error("Please sign in before creating a reservation");
    }

    const response = await apiRequest<{ reservation: unknown }>("/reservations", {
      method: "POST",
      body: JSON.stringify({
        date: payload.date,
        time: payload.time,
        guestCount: payload.guests,
        tableLabel: payload.tableNumbers[0] || "",
        tableLabels: payload.tableNumbers,
        customerName: payload.name,
        email: payload.email,
        phone: payload.phone,
        specialRequests: payload.requests,
      }),
    });

    return response.reservation;
  };

  const toggleTheme = () => {
    setState((prev) => ({
      ...prev,
      theme: prev.theme === "dark" ? "light" : "dark",
    }));
  };

  const updateProfile = async (payload: { name: string; email: string; phone?: string; avatar?: string }) => {
    if (!getApiToken()) {
      throw new Error("Please sign in before updating profile");
    }

    const response = await apiRequest<{ user: any }>("/auth/me", {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    const user = mapUser(response.user);
    setState((prev) => ({
      ...prev,
      user,
    }));

    return user;
  };

  const changePassword = async (payload: { currentPassword: string; newPassword: string }) => {
    if (!getApiToken()) {
      throw new Error("Please sign in before changing password");
    }

    await apiRequest<{ success: boolean; message?: string }>("/auth/change-password", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  };

  const toggleTwoFactor = async (enabled: boolean) => {
    if (!getApiToken()) {
      throw new Error("Please sign in before changing 2FA settings");
    }

    const response = await apiRequest<{ user: any }>("/auth/2fa", {
      method: "PUT",
      body: JSON.stringify({ enabled }),
    });

    const user = mapUser(response.user);
    setState((prev) => ({
      ...prev,
      user,
    }));

    return user;
  };

  return (
    <AppContext.Provider
      value={{
        state,
        isAuthResolved,
        sessionRefreshKey,
        login,
        register,
        logout,
        addToCart,
        removeFromCart,
        updateQuantity,
        checkout,
        createReservation,
        updateProfile,
        changePassword,
        toggleTwoFactor,
        toggleTheme,
        products,
      }}
    >
      <div className={`${state.theme} min-h-screen text-slate-100 bg-[#0a0a0a] transition-colors duration-300`}>
        {children}
      </div>
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
