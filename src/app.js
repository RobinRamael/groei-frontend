import React from "react";
import ReactDOM from "react-dom";
import HistoryView from "./history";

function App({ history }) {
  return <HistoryView history={history} />;
}

export function render(history, root) {
  ReactDOM.render(<App history={history} />, root);
}
