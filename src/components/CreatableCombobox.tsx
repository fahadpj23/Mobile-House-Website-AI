"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Plus, Check } from "lucide-react";

interface ComboboxItem {
  id: string;
  name: string;
  value: string;
}

interface Props {
  items: ComboboxItem[];
  value: string;
  placeholder?: string;
  emptyHint?: string;
  onCreateLabel: (query: string) => string;
  onChange: (value: string | null) => void;
  onCreate: (name: string) => void | Promise<void>;
}

export default function CreatableCombobox({
  items,
  value,
  placeholder = "Select or add...",
  emptyHint = "No results.",
  onCreateLabel,
  onChange,
  onCreate,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const selectedLabel = useMemo(
    () => items.find((i) => i.value === value)?.name || "",
    [items, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, query]);

  const trimmed = query.trim();
  const exactExists = items.some(
    (i) => i.name.toLowerCase() === trimmed.toLowerCase(),
  );
  const canCreate = trimmed.length > 0 && !exactExists;

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input text-left flex items-center justify-between w-full"
      >
        <span className={selectedLabel ? "text-gray-900" : "text-gray-400"}>
          {selectedLabel || placeholder}
        </span>
        <Search size={14} className="text-gray-400" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border rounded-lg shadow-lg">
          <div className="p-2 border-b">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-full px-2 py-1.5 text-sm outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && canCreate) {
                  e.preventDefault();
                  onCreate(trimmed);
                  setQuery("");
                  setOpen(false);
                }
              }}
            />
          </div>

          <div className="max-h-56 overflow-y-auto">
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-gray-50"
              >
                — Clear selection —
              </button>
            )}

            {filtered.length === 0 && !canCreate && (
              <p className="px-3 py-2 text-sm text-gray-400">{emptyHint}</p>
            )}

            {filtered.map((item) => {
              const selected = item.value === value;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onChange(item.value);
                    setQuery("");
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-gray-50 ${
                    selected ? "bg-blue-50 text-blue-700" : ""
                  }`}
                >
                  <span>{item.name}</span>
                  {selected && <Check size={14} />}
                </button>
              );
            })}

            {canCreate && (
              <button
                type="button"
                onClick={() => {
                  onCreate(trimmed);
                  setQuery("");
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 text-blue-600 hover:bg-blue-50 border-t"
              >
                <Plus size={14} />
                {onCreateLabel(trimmed)}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
