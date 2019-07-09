import React from "react";
import Loader from "react-loader-spinner";
import * as stringHash from "string-hash";

import { treeDiff, simpleSplit, ADDED, REMOVED } from "./differ";

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
      {withUniqueKeys(
        props.line.getNormalizedHunks(props.statusComingFirst)
      ).map(hunk => (
        <span className={hunk.status} key={hunk.key}>
          {hunk.content}{" "}
          {/* space is important here, as react doesn't seem to render it otherwise.*/}
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
          statusComingFirst={props.statusComingFirst}
          key={line.key}
        />
      ))}
    </p>
  );
}

function Poem(props) {
  return (
    <div className="diff container">
      {withUniqueKeys(props.diff).map(par => (
        <ParagraphView
          paragraph={par}
          key={par.key}
          statusComingFirst={props.goingForward ? ADDED : REMOVED}
        />
      ))}
    </div>
  );
}
function DiffViewer(props) {
  let diffTree = treeDiff(props.from, props.to);

  return <Poem diff={diffTree} goingForward={props.goingForward} />;
}

function SimpleView(props) {
  let diffTree = simpleSplit(props.text);

  return <Poem diff={diffTree} />;
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
      ? setInterval(this.timer.bind(this), this.props.delay)
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
    this.state.autoPlaying ? this.pause() : this.play();
  }

  pause() {
    this.setState({ autoPlaying: false });
    clearInterval(this.state.intervalId);
  }

  play() {
    let intervalId = setInterval(this.timer.bind(this), this.props.delay);
    this.setState({ intervalId: intervalId, autoPlaying: true });
  }

  renderText() {
    let from = this.props.history.getCommit(Math.max(0, this.state.currIdx));
    let to = this.props.history.getCommit(
      Math.min(this.props.history.commits.length - 1, this.state.currIdx + 1)
    );

    return (
      <div className="container">
        {this.props.debug ? <SimpleView text={from} /> : null}
        <DiffViewer
          from={from}
          to={to}
          goingForward={this.state.goingForward}
        />
        {this.props.debug ? <SimpleView text={to} /> : null}
      </div>
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
            <p>
              from: {this.state.currIdx} - to: {this.state.currIdx + 1}
            </p>
          </div>
        ) : null}

        {this.renderText()}
      </div>
    );
  }

  handleKeyDown(e) {
    if (e.keyCode === 39) {
      this.pause();
      this.nextSlide();
    } else if (e.keyCode === 37) {
      this.pause();
      this.previousSlide();
    } else if (e.keyCode === 69 || e.keyCode === 32) {
      e.preventDefault();
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
