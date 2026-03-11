import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  ArrowLeft, ShoppingBag, Search, Save, Plus, Trash2,
  Loader2, Edit2, X, Upload, ExternalLink, GripVertical,
} from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import productsData from "@/data/products.json";

interface ShopProduct {
  id: number;
  title: string;
  description: string;
  affiliateUrl: string;
  price: string;
  imageUrl: string | null;
  category: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

type ProductForm = {
  title: string;
  description: string;
  affiliateUrl: string;
  price: string;
  imageUrl: string;
  category: string;
  isActive: boolean;
  sortOrder: number;
};

const emptyForm: ProductForm = {
  title: "",
  description: "",
  affiliateUrl: "",
  price: "",
  imageUrl: "",
  category: "Books",
  isActive: true,
  sortOrder: 0,
};

export default function AdminShop() {
  const { user } = useAuth();
  const isAdmin = (user as any)?.isAdmin;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);

  const { data: products = [], isLoading } = useQuery<ShopProduct[]>({
    queryKey: ["/api/admin/shop-products"],
    enabled: isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: (data: ProductForm) =>
      apiRequest("POST", "/api/admin/shop-products", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shop-products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shop/products"] });
      toast({ title: "Product created" });
      setShowAdd(false);
      setForm(emptyForm);
    },
    onError: () => toast({ title: "Failed to create product", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ProductForm> }) =>
      apiRequest("PATCH", `/api/admin/shop-products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shop-products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shop/products"] });
      toast({ title: "Product updated" });
      setEditingId(null);
    },
    onError: () => toast({ title: "Failed to update product", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/admin/shop-products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shop-products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shop/products"] });
      toast({ title: "Product deleted" });
    },
    onError: () => toast({ title: "Failed to delete product", variant: "destructive" }),
  });

  const seedMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/admin/shop-products/seed", {
        products: productsData.products,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shop-products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shop/products"] });
      toast({ title: "Products seeded from JSON data" });
    },
    onError: (err: any) => toast({ title: err?.message || "Failed to seed products", variant: "destructive" }),
  });

  const filtered = products.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  const startEdit = (product: ShopProduct) => {
    setEditingId(product.id);
    setForm({
      title: product.title,
      description: product.description,
      affiliateUrl: product.affiliateUrl,
      price: product.price,
      imageUrl: product.imageUrl || "",
      category: product.category,
      isActive: product.isActive,
      sortOrder: product.sortOrder,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">Admin access required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Admin - Shop Products" description="Manage affiliate shop products" />
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" data-testid="link-back-admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-admin-shop-title">
              <ShoppingBag className="w-6 h-6" />
              Shop Products
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage affiliate products displayed in the Book Slump Shop
            </p>
          </div>
          <Badge variant="outline" data-testid="text-product-count">
            {products.length} products
          </Badge>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-products"
            />
          </div>
          <Button
            onClick={() => { setShowAdd(true); setForm(emptyForm); setEditingId(null); }}
            data-testid="button-add-product"
          >
            <Plus className="w-4 h-4 mr-1" /> Add Product
          </Button>
          {products.length === 0 && (
            <Button
              variant="outline"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              data-testid="button-seed-products"
            >
              {seedMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-1" />
              )}
              Seed from JSON
            </Button>
          )}
        </div>

        {(showAdd || editingId !== null) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">
                {editingId !== null ? "Edit Product" : "Add New Product"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Product title"
                    data-testid="input-product-title"
                  />
                </div>
                <div>
                  <Label>Price</Label>
                  <Input
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="$19.99"
                    data-testid="input-product-price"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Product description"
                    rows={2}
                    data-testid="input-product-description"
                  />
                </div>
                <div>
                  <Label>Affiliate URL</Label>
                  <Input
                    value={form.affiliateUrl}
                    onChange={(e) => setForm({ ...form, affiliateUrl: e.target.value })}
                    placeholder="https://amazon.com/..."
                    data-testid="input-product-url"
                  />
                </div>
                <div>
                  <Label>Image URL</Label>
                  <Input
                    value={form.imageUrl}
                    onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                    placeholder="https://..."
                    data-testid="input-product-image"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Input
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="Books"
                    data-testid="input-product-category"
                  />
                </div>
                <div>
                  <Label>Sort Order</Label>
                  <Input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                    data-testid="input-product-sort"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.isActive}
                    onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
                    data-testid="switch-product-active"
                  />
                  <Label>Active (visible in shop)</Label>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={() => {
                    if (editingId !== null) {
                      updateMutation.mutate({ id: editingId, data: form });
                    } else {
                      createMutation.mutate(form);
                    }
                  }}
                  disabled={!form.title || !form.price || !form.affiliateUrl || createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-product"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-1" />
                  )}
                  {editingId !== null ? "Update" : "Create"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => { setShowAdd(false); cancelEdit(); }}
                  data-testid="button-cancel-product"
                >
                  <X className="w-4 h-4 mr-1" /> Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              {products.length === 0
                ? "No shop products yet. Add one or seed from the existing JSON data."
                : "No products match your search."}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((product) => (
              <Card
                key={product.id}
                className={`p-4 ${!product.isActive ? "opacity-60" : ""}`}
                data-testid={`card-admin-product-${product.id}`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded bg-muted flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {product.imageUrl ? (
                      <img
                        loading="lazy"
                        decoding="async"
                        src={product.imageUrl}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ShoppingBag className="w-6 h-6 text-muted-foreground/30" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <h3 className="font-semibold truncate" data-testid={`text-product-title-${product.id}`}>
                        {product.title}
                      </h3>
                      <Badge variant="secondary" className="flex-shrink-0">
                        {product.price}
                      </Badge>
                      {!product.isActive && (
                        <Badge variant="outline" className="flex-shrink-0 text-orange-600">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                      {product.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {product.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Order: {product.sortOrder}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(product.affiliateUrl, "_blank")}
                      data-testid={`button-view-product-${product.id}`}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startEdit(product)}
                      data-testid={`button-edit-product-${product.id}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Delete "${product.title}"?`)) {
                          deleteMutation.mutate(product.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-product-${product.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
