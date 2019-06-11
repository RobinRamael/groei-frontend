import React from "react";
import ReactDOM from "react-dom";
import HistoryView from "./history";

function App({ history }) {
  let startAt = parseInt(window.location.hash.substr(1));
  return (
    <HistoryView
      history={history}
      startAt={startAt || 0}
      autoPlay={false}
      debug={false}
    />
  );
}

export function render(history, root) {
  ReactDOM.render(<App history={history} />, root);
}
