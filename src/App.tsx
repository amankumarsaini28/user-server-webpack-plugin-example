import "./App.css";

async function getData() {
  "use server";
  console.log("blah");
  return fetch("/path/to/internal/api");
}

const App = () => {
  return (
    <div className="content">
      <h1>Rsbuild with React</h1>
      <p>Start building amazing things with Rsbuild.</p>
    </div>
  );
};

export default App;
