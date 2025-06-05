// src/components/TravelScreen.tsx
import React from 'react'
import { LocationPreview } from './LocationPreview'
import type { DatabaseLocation } from '@/types'

interface TravelScreenProps {
  destination: DatabaseLocation
  locations: DatabaseLocation[]
}

export const TravelScreen: React.FC<TravelScreenProps> = ({
  destination,
  locations
}) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md mx-auto">
        <div className="mb-6">
          <div className="mb-6 flex justify-center">
            <LocationPreview
              location={destination}
              locations={locations}
              size={140}
              animated={true}
              className="animate-in zoom-in-50 duration-500"
            />
          </div>

          <div className="text-xl font-bold mb-2">Traveling to...</div>
          <div className="text-2xl font-bold text-primary mb-2">{destination.name}</div>
          <div className="text-muted-foreground mb-4 leading-relaxed">
            {destination.description}
          </div>

          <div className="mb-4 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <span>🎯</span>
                <span>Level {destination.difficulty}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>🌍</span>
                <span className="capitalize">{destination.biome}</span>
              </div>
              {destination.playerCount > 0 && (
                <div className="flex items-center gap-1">
                  <span>👥</span>
                  <span>{destination.playerCount} players</span>
                </div>
              )}
            </div>
          </div>

          <div className="w-full bg-muted rounded-full h-3 mb-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-primary/80 to-primary h-3 rounded-full shadow-sm"
              style={{
                animation: 'travel-progress 9.8s ease-in-out forwards',
                width: '0%'
              }}
            />
          </div>

          <div className="text-sm text-muted-foreground animate-pulse">
            <div className="flex items-center justify-center gap-2">
              <span className="animate-spin">⚡</span>
              <span>Preparing for arrival...</span>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes travel-progress {
            0% { width: 0%; }
            100% { width: 100%; }
          }
        `}</style>
      </div>
    </div>
  )
}
