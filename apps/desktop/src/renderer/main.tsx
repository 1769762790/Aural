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
