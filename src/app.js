import React from "react";
import ReactDOM from "react-dom";
import HistoryView from "./history";

function App({ history }) {
  let url = new URL(window.location);
  let searchParams = new URLSearchParams(url.search);
  let startAt = parseInt(searchParams.get("start") || "0");
  let autoPlay = parseInt(searchParams.get("autoplay")) === 1;

  console.log(startAt, autoPlay);

  return (
    <HistoryView
      history={history}
      startAt={startAt}
      autoPlay={autoPlay}
      debug={false}
    />
  );
}

export function render(history, root) {
  ReactDOM.render(<App history={history} />, root);
}
