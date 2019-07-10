import React from "react";
import Tappable from "react-tappable/lib/Tappable";
import Loader from "react-loader-spinner";

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
      ).map(hunk => {
        let content = hunk.content;
        if (hunk.content.match(/\*\*.*\*/)) {
          let trimmed = content.trim().replace(/^\*+|\*+$/g, "");
          content = <h1>{trimmed}</h1>;
        }
        return (
          <span className={hunk.status} key={hunk.key}>
            {content}{" "}
            {/* space is important here, as react doesn't seem to render it otherwise.*/}
          </span>
        );
      })}
      <br />
    </React.Fragment>
  );
}

function ParagraphView(props) {
  return (
    <div className="paragraph">
      {withUniqueKeys(props.paragraph.lines).map(line => (
        <LineView
          line={line}
          statusComingFirst={props.statusComingFirst}
          key={line.key}
        />
      ))}
    </div>
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

function later(delay) {
  return new Promise(function(resolve) {
    setTimeout(resolve, delay);
  });
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
    this.handleTapEvent = this.handleTapEvent.bind(this);
  }

  componentDidMount() {
    document.addEventListener("keydown", this.handleKeyDown);

    var intervalId = this.state.autoPlaying
      ? setInterval(this.timer.bind(this), this.props.delay)
      : null;

    Promise.all([
      this.props.history.ensureIndex(this.props.startAt),
      later(2000)
    ]).then(() => {
      this.setState({
        loading: false,
        starting: true,
        intervalId: intervalId
      });
      later(700).then(() => {
        this.setState({ starting: false });
      });
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
        {this.props.showTitle && this.props.title ? (
          <h1 className="not-in-diff">{this.props.title}</h1>
        ) : null}
        {this.props.debug ? <SimpleView text={from} /> : null}
        <DiffViewer
          from={from.trimStart()}
          to={to.trimStart()}
          goingForward={this.state.goingForward}
        />
        {this.props.debug ? <SimpleView text={to} /> : null}
      </div>
    );
  }

  render() {
    if (this.props.showEpitaph) {
      if (this.state.loading) {
        return (
          <div className="content">
            alles mengt met elkaar <br /> maar heel traag <br /> – marwin vos
          </div>
        );
      }
      if (this.state.starting) {
        return (
          <div className="content">
            <div className="container">
              {this.props.showTitle && this.props.title ? (
                <h1 className="not-in-diff">{this.props.title}</h1>
              ) : null}
            </div>
          </div>
        );
      }
    } else if (this.state.loading) {
      return (
        <div className="loader">
          <Loader type="Rings" color="#ffffff" height={80} width={80} />
        </div>
      );
    }

    return (
      <Tappable onTap={this.handleTapEvent}>
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
      </Tappable>
    );
  }

  handleTapEvent(e) {
    this.handlePressPlayPause();
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
