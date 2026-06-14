'use client';
import { useState } from 'react';

interface Props {
  apiType: string;
  itemId: string;
  itemData: Record<string, unknown>;
  initialFavorited?: boolean;
  onToggle?: (favorited: boolean) => void;
}

export default function FavoriteButton({ apiType, itemId, itemData, initialFavorited = false, onToggle }: Props) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiType, itemId, itemData }),
      });
      const data = await res.json();
      setFavorited(data.favorited);
      onToggle?.(data.favorited);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={favorited ? '즐겨찾기 해제' : '즐겨찾기 추가'}
      className={`transition-colors text-lg ${loading ? 'opacity-50' : 'hover:scale-110'}`}
    >
      {favorited ? '⭐' : '☆'}
    </button>
  );
}
