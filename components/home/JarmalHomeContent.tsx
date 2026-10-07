import { useEffect, useState } from 'react';
import { Bell, ChevronLeft, Megaphone, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type HomeContentRow = {
  id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  target_type: string;
  target_id: string | null;
  sort_order: number;
};

type HomeContentProps = {
  onNavigate?: (screen: string) => void;
  onOpenAssistant?: () => void;
};

function isWithinSchedule(row: { starts_at?: string | null; ends_at?: string | null }) {
  const now = Date.now();
  const start = row.starts_at ? Date.parse(row.starts_at) : Number.NEGATIVE_INFINITY;
  const end = row.ends_at ? Date.parse(row.ends_at) : Number.POSITIVE_INFINITY;
  return now >= start && now <= end;
}

function HomeImage({ src, fallback }: { src?: string | null; fallback: React.ReactNode }) {
  if (!src) return <div className="jarmal-home-content-fallback">{fallback}</div>;
  return <img src={src} alt="" loading="lazy" className="jarmal-home-content-image" />;
}

export function JarmalHomeContent({ onNavigate, onOpenAssistant }: HomeContentProps) {
  const [stories, setStories] = useState<HomeContentRow[]>([]);
  const [ads, setAds] = useState<HomeContentRow[]>([]);
  const [offers, setOffers] = useState<HomeContentRow[]>([]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const [storiesResult, adsResult, offersResult] = await Promise.all([
        supabase
          .from('app_stories')
          .select('id,title,image_url,target_type,target_id,sort_order,starts_at,ends_at')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        supabase
          .from('app_ads')
          .select('id,title,description,image_url,target_type,target_id,sort_order,starts_at,ends_at')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        supabase
          .from('app_offers')
          .select('id,title,description,image_url,discount_text,target_type,target_id,sort_order,starts_at,ends_at')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
      ]);

      if (!mounted) return;

      if (!storiesResult.error && storiesResult.data) {
        setStories(storiesResult.data.filter(isWithinSchedule) as HomeContentRow[]);
      }
      if (!adsResult.error && adsResult.data) {
        setAds(adsResult.data.filter(isWithinSchedule) as HomeContentRow[]);
      }
      if (!offersResult.error && offersResult.data) {
        setOffers(offersResult.data.filter(isWithinSchedule) as HomeContentRow[]);
      }
    };

    void load();
    return () => { mounted = false; };
  }, []);

  const handleTarget = (row: HomeContentRow) => {
    if (row.target_type === 'assistant') {
      onOpenAssistant?.();
      return;
    }
    if (row.target_type === 'wallet') {
      onNavigate?.('wallet');
      return;
    }
    if (row.target_type === 'services') {
      onNavigate?.('services');
    }
  };

  return (
    <>
      {stories.length > 0 && (
        <section className="jarmal-home-content-section" aria-label="قصص جَرْمَل">
          <div className="jarmal-home-content-heading">
            <div>
              <span>آخر ما يهمك</span>
              <h2>قصص جَرْمَل</h2>
            </div>
            <Bell size={19} />
          </div>
          <div className="jarmal-stories-rail">
            {stories.map((story) => (
              <button key={story.id} type="button" className="jarmal-story-card" onClick={() => handleTarget(story)}>
                <HomeImage src={story.image_url} fallback={<Sparkles size={24} />} />
                <span>{story.title}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {ads.length > 0 && (
        <section className="jarmal-home-content-section" aria-label="إعلانات جَرْمَل">
          <div className="jarmal-home-content-heading">
            <div>
              <span>مختارات جَرْمَل</span>
              <h2>إعلانات مميزة</h2>
            </div>
            <Megaphone size={19} />
          </div>
          <div className="jarmal-ad-rail">
            {ads.map((ad) => (
              <button key={ad.id} type="button" className="jarmal-ad-card" onClick={() => handleTarget(ad)}>
                <HomeImage src={ad.image_url} fallback={<Megaphone size={28} />} />
                <div>
                  <h3>{ad.title}</h3>
                  {ad.description && <p>{ad.description}</p>}
                </div>
                <ChevronLeft size={18} />
              </button>
            ))}
          </div>
        </section>
      )}

      {offers.length > 0 && (
        <section className="jarmal-home-content-section" aria-label="عروض جَرْمَل">
          <div className="jarmal-home-content-heading">
            <div>
              <span>فرص تستحق التجربة</span>
              <h2>عروض جَرْمَل</h2>
            </div>
            <Sparkles size={19} />
          </div>
          <div className="jarmal-offers-rail">
            {offers.map((offer) => (
              <button key={offer.id} type="button" className="jarmal-offer-card" onClick={() => handleTarget(offer)}>
                <HomeImage src={offer.image_url} fallback={<Sparkles size={28} />} />
                <div className="jarmal-offer-copy">
                  <h3>{offer.title}</h3>
                  {offer.description && <p>{offer.description}</p>}
                  <span>عرض متاح من جَرْمَل</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
