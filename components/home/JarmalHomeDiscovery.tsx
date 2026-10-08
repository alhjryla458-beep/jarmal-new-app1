import { Zap, WalletCards, ReceiptText, PackageSearch, Store, ShoppingBag, ChevronLeft, ClipboardList } from 'lucide-react';

type DiscoveryProduct = { id: string; store_id: string; name: string; description: string | null; price: number; image_url: string | null; is_available: boolean };
type DiscoveryStore = { id: string; name: string; store_type: string };

type DiscoveryProps = {
  providersCount: number;
  packagesCount: number;
  products: DiscoveryProduct[];
  popularProducts?: DiscoveryProduct[];
  stores: DiscoveryStore[];
  onNavigate: (screen: string) => void;
  onStoreCategory: (category: string) => void;
  onOpenStore?: (storeId: string) => void;
};

export function JarmalHomeDiscovery({
  providersCount,
  packagesCount,
  products,
  popularProducts: popularProductsProp,
  stores,
  onNavigate,
  onStoreCategory,
  onOpenStore
}: DiscoveryProps) {
  const popularProducts = popularProductsProp ?? [];
  const storeTypes = Array.from(new Set(stores.map((store) => store.store_type).filter(Boolean))).slice(0, 6);

  return (
    <div className="jarmal-discovery">
      <section className="jarmal-discovery-section">
        <div className="jarmal-section-heading">
          <div>
            <p>كل ما تحتاجه في مكان واحد</p>
            <h2>خدمات جَرْمَل السريعة</h2>
          </div>
          <Zap size={20} />
        </div>

        <div className="jarmal-service-grid">
          <button type="button" onClick={() => onNavigate('wallet')} className="jarmal-service-card">
            <span><WalletCards size={21} /></span>
            <strong>تعبئة الرصيد</strong>
            <small>من المحفظة ووسائل الدفع المتاحة</small>
          </button>
          <button type="button" onClick={() => onNavigate('services')} className="jarmal-service-card">
            <span><ReceiptText size={21} /></span>
            <strong>سداد الفواتير</strong>
            <small>الخدمات الفعلية المتاحة في جَرْمَل</small>
          </button>
          <button type="button" onClick={() => onNavigate('services')} className="jarmal-service-card">
            <span><PackageSearch size={21} /></span>
            <strong>الباقات والخدمات</strong>
            <small>{packagesCount > 0 ? `${packagesCount} خدمة متاحة` : 'استكشف الخدمات المتاحة'}</small>
          </button>
          <button type="button" onClick={() => onNavigate('orders')} className="jarmal-service-card">
            <span><ClipboardList size={21} /></span>
            <strong>طلباتي</strong>
            <small>تابع طلباتك وحالتها من مكان واحد</small>
          </button>
        </div>
      </section>

      {storeTypes.length > 0 && (
        <section className="jarmal-discovery-section">
          <div className="jarmal-section-heading">
            <div>
              <p>اكتشف حسب النشاط</p>
              <h2>الأقسام</h2>
            </div>
            <Store size={20} />
          </div>
          <div className="jarmal-category-rail">
            {storeTypes.map((type) => (
              <button key={type} type="button" onClick={() => onStoreCategory(type)}>
                <span><Store size={18} /></span>
                <b>{type}</b>
              </button>
            ))}
          </div>
        </section>
      )}

      {popularProducts.length > 0 && (
        <section className="jarmal-discovery-section">
          <div className="jarmal-section-heading">
            <div>
              <p>الأكثر طلبًا من عملاء جَرْمَل</p>
              <h2>الأكثر طلبًا</h2>
            </div>
            <PackageSearch size={20} />
          </div>
          <div className="jarmal-product-rail">
            {popularProducts.map((product) => (
              <button key={product.id} type="button" onClick={() => { const store = stores.find((item) => item.id === product.store_id); if (store) onOpenStore?.(store.id); }} className="jarmal-discovery-product text-right">
                <div className="jarmal-discovery-product-icon">{product.image_url ? <img src={product.image_url} alt="" loading="lazy" /> : <ShoppingBag size={22} />}</div>
                <div className="min-w-0">
                  <strong>{product.name}</strong>
                  <small>{product.description || 'منتج متاح من متجر معتمد'}</small>
                  <b>{product.price.toLocaleString('ar-YE')} ر.ي</b>
                </div>
                <ChevronLeft size={17} />
              </button>
            ))}
          </div>
        </section>
      )}

      {providersCount === 0 && packagesCount === 0 && (
        <p className="jarmal-discovery-note">ستظهر خدمات الشحن والباقات والفواتير هنا عندما تكون مفعلة فعليًا من الإدارة.</p>
      )}
    </div>
  );
}
