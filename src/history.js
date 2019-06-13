import React from "react";
import Loader from "react-loader-spinner";
import * as stringHash from "string-hash";

import { treeDiff, ADDED, REMOVED } from "./differ";

function withUniqueKeys(xs) {
  let seen = new Set();

  return xs.map((part, i) => {
    let key;
    if (seen.has(part.text)) {
      key = part.text + "-" + i;
    } else {
      key = part.text;
    }

    seen.add(part.text);

    part.key = key;
    return part;
  });
}

function LineView(props) {
  return (
    <React.Fragment>
      {withUniqueKeys(props.line.hunks)
        .filter(h => h.status !== props.dontShowStatus)
        .map(hunk => (
          <span className={hunk.status} key={hunk.key}>
            {hunk.content}
          </span>
        ))}
      <br />
    </React.Fragment>
  );
}

function ParagraphView(props) {
  return (
    <p>
      {withUniqueKeys(props.paragraph.lines).map(line => (
        <LineView
          line={line}
          dontShowStatus={props.dontShowStatus}
          key={line.key}
        />
      ))}
    </p>
  );
}

function DiffViewer(props) {
  let diffTree = treeDiff(props.from.trim(), props.to.trim());

  return (
    <div className="container">
      {withUniqueKeys(diffTree).map(par => (
        <ParagraphView
          paragraph={par}
          dontShowStatus={props.dontShowStatus}
          key={par.key}
        />
      ))}
    </div>
  );
}

function PageDbg(props) {
  return (
    <div>
      {props.title} - {props.page.loading ? "loading" : "not loading"} -{" "}
      {props.page.ready ? "ready" : "not ready"} - size{" "}
      {Object.keys(props.page.content).length} - {props.page.start} to{" "}
      {props.page.end}
    </div>
  );
}

export default class HistoryView extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currIdx: this.props.startAt,
      loading: true,
      goingForward: true,
      autoPlaying: this.props.autoPlay
    };
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  componentDidMount() {
    document.addEventListener("keydown", this.handleKeyDown);

    var intervalId = this.state.autoPlaying
      ? setInterval(this.timer.bind(this), 100)
      : null;

    this.props.history.ensureIndex(this.props.startAt).then(() => {
      this.setState({ loading: false, intervalId: intervalId });
    });
  }

  componentWillUnmount() {
    clearInterval(this.state.intervalId);
  }

  timer() {
    this.nextSlide();
  }

  handlePressPlayPause() {
    console.log(this.state.autoPlaying);
    this.state.autoPlaying ? this.pause() : this.play();
  }

  pause() {
    this.setState({ autoPlaying: false });
    clearInterval(this.state.intervalId);
  }

  play() {
    let intervalId = setInterval(this.timer.bind(this), 100);
    this.setState({ intervalId: intervalId, autoPlaying: true });
  }

  renderText() {
    let from, to;

    if (this.state.goingForward) {
      from = this.props.history.getCommit(this.state.currIdx);
      to = this.props.history.getCommit(
        this.state.currIdx < this.props.history.commits.length
          ? this.state.currIdx + 1
          : this.state.currIdx
      );
    } else {
      to = this.props.history.getCommit(this.state.currIdx);
      from = this.props.history.getCommit(this.state.currIdx + 1);
    }

    return (
      <DiffViewer
        from={from}
        to={to}
        dontShowStatus={this.state.goingForward ? REMOVED : ADDED}
      />
    );
  }

  render() {
    if (this.state.loading) {
      return (
        <div className="loader">
          <Loader type="Rings" color="#ffffff" height={80} width={80} />
        </div>
      );
    }

    return (
      <div className="content">
        {this.props.debug ? (
          <div>
            <PageDbg title="prev" page={this.props.history.prevPage} />
            <PageDbg title="curr" page={this.props.history.currPage} />
            <PageDbg title="next" page={this.props.history.nextPage} />
            <p>Index: {this.state.currIdx}</p>
          </div>
        ) : null}

        {this.renderText()}
      </div>
    );
  }

  handleKeyDown(e) {
    if (e.keyCode === 39) {
      this.nextSlide();
    } else if (e.keyCode === 37) {
      this.previousSlide();
    } else if (e.keyCode === 69) {
      this.handlePressPlayPause();
    }
  }

  previousSlide() {
    if (this.state.currIdx > 0) {
      this.setState({ currIdx: this.state.currIdx - 1, goingForward: false });
    }
  }

  nextSlide() {
    if (this.state.currIdx < this.props.history.commits.length - 1) {
      this.setState({ currIdx: this.state.currIdx + 1, goingForward: true });
    }
  }
}
