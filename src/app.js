import React from "react";
import ReactDOM from "react-dom";
import HistoryView from "./history";
import ReactTooltip from "react-tooltip";

const POEMS = ["love_poem", "hethaltingprobleem"];

function App({ history, showEpitaph }) {
  let url = new URL(window.location);
  let searchParams = new URLSearchParams(url.search);
  let startAt = parseInt(searchParams.get("start") || "0");
  let autoPlay = parseInt(searchParams.get("autoplay") || "1") === 1;
  let debug = parseInt(searchParams.get("debug") || "0") === 1;
  let delay = Math.max(parseInt(searchParams.get("delay") || "200"), 100);

  let poemName =
    POEMS.find(name => url.pathname.includes(name)) || "hethaltingprobleem";

  let title =
    poemName === "hethaltingprobleem" ? "het halting probleem" : "love poem";

  return (
    <React.Fragment>
      <HistoryView
        history={history}
        startAt={startAt}
        autoPlay={autoPlay}
        debug={debug}
        delay={delay}
        showEpitaph={poemName === "hethaltingprobleem"}
        title={title}
        showTitle={poemName === "hethaltingprobleem"}
      />
      <p
        className="help"
        data-place="left"
        data-type="opaque"
        data-multiline="true"
        data-tip="raak scherm aan <br/> spatie - links - rechts <br/> ga naar (e)inde"
      >
        ?
      </p>
      <ReactTooltip />
    </React.Fragment>
  );
}

export function render(history, root) {
  ReactDOM.render(<App history={history} />, root);
}
