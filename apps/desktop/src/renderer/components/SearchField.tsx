interface SearchFieldProps {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

export const SearchField = ({
  value,
  placeholder = "Search tracks, artists, albums, or playlists",
  onChange
}: SearchFieldProps) => (
  <label className="aural-search-field">
    <span>Search</span>
    <input
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  </label>
);
