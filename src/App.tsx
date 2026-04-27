import GameBoard from './components/GameBoard'

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>FreeCell <span className="app-version">v{__APP_VERSION__}</span></h1>
      </header>
      <main>
        <GameBoard />
      </main>
    </div>
  )
}

export default App
