import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAsyncResource } from "@renderer/hooks/useAsyncResource";
import { bridge } from "@renderer/lib/bridge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi
} from "@renderer/components/ui/carousel";
import { cn } from "@/lib/utils";

const OnlineHomeRecommendArtist = () => {
  const artists = useAsyncResource(() => bridge.online.getTopArtists(50), [], "online:home:top-artists:50");
  const items = artists.data ?? [];
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!carouselApi || items.length <= 1 || isHovered) {
      return;
    }

    const timer = window.setInterval(() => {
      if (carouselApi.canScrollNext()) {
        carouselApi.scrollNext();
        return;
      }

      carouselApi.scrollTo(0);
    }, 2800);

    return () => {
      window.clearInterval(timer);
    };
  }, [carouselApi, isHovered, items.length]);

  return (
    <section className="w-full space-y-5">
      <div className="space-y-2">
        <h2 className="text-[32px] font-black leading-[0.9] tracking-[-0.08em] text-foreground">推荐歌手</h2>
      </div>

      <Carousel
        setApi={setCarouselApi}
        opts={{
          align: "start",
          dragFree: true,
          loop: items.length > 7
        }}
        className="w-full"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <CarouselContent className="pb-2">
          {items.map((artist) => (
            <CarouselItem key={artist.id} className="basis-[150px] md:basis-[160px] lg:basis-[170px]">
              <Link to={`/online/artists/${artist.id}`} className="group flex flex-col items-center justify-start text-center">
                <div
                  className={cn(
                    "size-[150px] rounded-full border border-border/70 bg-cover bg-center transition-all duration-300"
                  )}
                >
                  <img
                    src={artist.coverUrl ?? ""}
                    alt={artist.name}
                    className="size-full rounded-full object-cover"
                  />
                </div>
                <div className="mt-4 w-full space-y-1">
                  <p className="truncate text-sm font-semibold text-foreground transition-colors duration-300 group-hover:text-primary">
                    {artist.name}
                  </p>
                </div>
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  );
};

export default OnlineHomeRecommendArtist;
