// src/components/admin/SearchBar.tsx
import React from 'react'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = "SEARCH..."
}) => (
  <div className="relative">
    <Search className="h-3 w-3 absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
    <Input
      placeholder={placeholder}
      className="pl-7 text-xs font-mono h-7"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
)
