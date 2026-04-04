import { OnlineHomeDailyCard } from "./online/OnlineHomeDailyCard";
import OnlineHomeNewAlbum from "./online/OnlineHomeNewAlbum";
import { OnlineHomePersonalFmCard } from "./online/OnlineHomePersonalFmCard";
import OnlineHomeRecommendArtist from "./online/OnlineHomeRecommendArtist";

export const OnlineHomePage = () => (
  <div className="space-y-8 pb-8">
    <section className="grid gap-6 xl:grid-cols-[1.18fr_1fr]">
      <OnlineHomeDailyCard />
      <OnlineHomePersonalFmCard />
    </section>
    <OnlineHomeRecommendArtist/>
    <OnlineHomeNewAlbum/>
  </div>
);
