import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Navigate, createHashRouter, RouterProvider } from "react-router-dom";
import "@aural/ui";
import "@/styles/globals.css";
import { CollectionPage } from "./pages/CollectionPage";
import { FavoritesPage } from "./pages/FavoritesPage";
import { HomePage } from "./pages/HomePage";
import { AlbumsPage } from "./pages/AlbumsPage";
import { AlbumDetailPage } from "./pages/AlbumDetailPage";
import { ArtistsPage } from "./pages/ArtistsPage";
import { ArtistDetailPage } from "./pages/ArtistDetailPage";
import { LibraryPage } from "./pages/LibraryPage";
import { AppShell } from "./layout/AppShell";
import { PlayerPage } from "./pages/PlayerPage";
import { PlaylistDetailPage } from "./pages/PlaylistDetailPage";
import { RecentPage } from "./pages/RecentPage";
import { SettingsPage } from "./pages/SettingsPage";
import { OnlineFavoritesPage } from "./pages/OnlineFavoritesPage";
import { OnlineHistoryPage } from "./pages/OnlineHistoryPage";
import { OnlinePlaylistsPage } from "./pages/OnlinePlaylistsPage";
import { OnlinePlaylistDetailPage } from "./pages/OnlinePlaylistDetailPage";
import { OnlineDownloadsPage } from "./pages/OnlineDownloadsPage";
import { OnlineArtistsPage } from "./pages/OnlineArtistsPage";
import { OnlineArtistDetailPage } from "./pages/OnlineArtistDetailPage";
import { OnlineAlbumsPage } from "./pages/OnlineAlbumsPage";
import { OnlineAlbumDetailPage } from "./pages/OnlineAlbumDetailPage";
import { OnlineChartsPage } from "./pages/OnlineChartsPage";
import "./styles/app.css";

const router = createHashRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <HomePage />
      },
      {
        path: "songs",
        element: <LibraryPage />
      },
      {
        path: "artists",
        element: <ArtistsPage />
      },
      {
        path: "artists/:artistId",
        element: <ArtistDetailPage />
      },
      {
        path: "albums",
        element: <AlbumsPage />
      },
      {
        path: "albums/:albumId",
        element: <AlbumDetailPage />
      },
      {
        path: "library",
        element: <Navigate to="/songs" replace />
      },
      {
        path: "search",
        element: <Navigate to="/songs" replace />
      },
      {
        path: "collection",
        element: <CollectionPage />
      },
      {
        path: "collection/:playlistId",
        element: <PlaylistDetailPage />
      },
      {
        path: "favorites",
        element: <FavoritesPage />
      },
      {
        path: "recent",
        element: <RecentPage />
      },
      {
        path: "settings",
        element: <SettingsPage />
      },
      {
        path: "online",
        element: <Navigate to="/online/favorites" replace />
      },
      {
        path: "online/favorites",
        element: <OnlineFavoritesPage />
      },
      {
        path: "online/artists",
        element: <OnlineArtistsPage />
      },
      {
        path: "online/artists/:artistId",
        element: <OnlineArtistDetailPage />
      },
      {
        path: "online/albums",
        element: <OnlineAlbumsPage />
      },
      {
        path: "online/albums/:albumId",
        element: <OnlineAlbumDetailPage />
      },
      {
        path: "online/charts",
        element: <OnlineChartsPage />
      },
      {
        path: "online/history",
        element: <OnlineHistoryPage />
      },
      {
        path: "online/playlists",
        element: <OnlinePlaylistsPage />
      },
      {
        path: "online/playlists/:playlistId",
        element: <OnlinePlaylistDetailPage />
      },
      {
        path: "online/downloads",
        element: <OnlineDownloadsPage />
      },
      {
        path: "player",
        element: <PlayerPage />
      }
    ]
  }
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
