import CompoundCalculator from "./components/CompoundCalculator";

function App() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-800 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        <CompoundCalculator />
      </div>
    </div>
  );
}

export default App;
