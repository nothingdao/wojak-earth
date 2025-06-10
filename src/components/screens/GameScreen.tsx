// src/components/screens/GameScreen.tsx
import { Layout } from '../layout/Layout'
import { ViewRenderer } from '../ViewRenderer'
import { useGame } from '@/providers/GameProvider'

export function GameScreen() {
  const { state, actions } = useGame()

  return (
    <Layout>
      <ViewRenderer
        currentView={state.currentView}
        character={state.character!}
        gameData={state.gameData}
        loadingItems={state.loadingItems}
        actions={actions}
      />
    </Layout>
  )
}
