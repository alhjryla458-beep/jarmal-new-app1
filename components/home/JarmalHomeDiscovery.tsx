import { Zap, WalletCards, ReceiptText, PackageSearch, Store, ShoppingBag, ChevronLeft } from 'lucide-react';

type DiscoveryProduct = { id: string; name: string; description: string | null; price: number; is_available: boolean };
type DiscoveryStore = { id: string; name: string; store_type: string };

type DiscoveryProps = {
  providersCount: number;
  packagesCount: number;
  products: DiscoveryProduct[];
  stores: DiscoveryStore[];
  onNavigate: (screen: string) => void;
  onStoreCategory: (category: string) => void;
};

export function JarmalHomeDiscovery({
  providersCount,
  packagesCount,
  products,
  stores,
  onNavigate,
  onStoreCategory
}: DiscoveryProps) {
  const availableProducts = products.filter((p) => p.is_available);
  const popularProducts = availableProducts.slice(0, 6);
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
          <button type="button" onClick={() => onNavigate('home')} className="jarmal-service-card">
            <span><ShoppingBag size={21} /></span>
            <strong>تسوق الآن</strong>
            <small>{stores.length} متجرًا معتمدًا</small>
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
              <p>منتجات متاحة حاليًا</p>
              <h2>منتجات جَرْمَل</h2>
            </div>
            <PackageSearch size={20} />
          </div>
          <div className="jarmal-product-rail">
            {popularProducts.map((product) => (
              <article key={product.id} className="jarmal-discovery-product">
                <div className="jarmal-discovery-product-icon"><ShoppingBag size={22} /></div>
                <div className="min-w-0">
                  <strong>{product.name}</strong>
                  <small>{product.description || 'منتج متاح من متجر معتمد'}</small>
                  <b>{product.price.toLocaleString('ar-YE')} ر.ي</b>
                </div>
                <ChevronLeft size={17} />
              </article>
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
