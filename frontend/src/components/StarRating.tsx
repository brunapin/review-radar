import { Star } from 'lucide-react'
import { sizes } from '../tokens'

interface Props {
  score: number
  size?: number
}

export function StarRating({ score, size = sizes.rating.md }: Props) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={size}
          className={i < score ? 'text-amber-400 fill-amber-400' : 'text-gray-600'}
        />
      ))}
    </div>
  )
}
