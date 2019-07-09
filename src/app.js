import React from "react";
import ReactDOM from "react-dom";
import HistoryView from "./history";
import ReactTooltip from "react-tooltip";

function App({ history }) {
  let url = new URL(window.location);
  let searchParams = new URLSearchParams(url.search);
  let startAt = parseInt(searchParams.get("start") || "0");
  let autoPlay = parseInt(searchParams.get("autoplay") || "1") === 1;
  let debug = parseInt(searchParams.get("debug") || "0") === 1;
  let delay = Math.max(parseInt(searchParams.get("delay") || "200"), 100);

  return (
    <React.Fragment>
      <HistoryView
        history={history}
        startAt={startAt}
        autoPlay={autoPlay}
        debug={debug}
        delay={delay}
      />
      <p className="help" data-place="left" data-tip="spatie - links - rechts">
        ?
      </p>
      <ReactTooltip />
    </React.Fragment>
  );
}

export function render(history, root) {
  ReactDOM.render(<App history={history} />, root);
}
