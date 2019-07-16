import React from "react";
import Loader from "react-loader-spinner";
import { findDOMNode } from "react-dom";
import ReactTooltip from "react-tooltip";
import moment from "moment";
import "moment/locale/nl-be";
import {
  faPlay,
  faPause,
  faChevronRight,
  faChevronLeft
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

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
        let content;
        if (hunk.content.match(/\*\*.*\*/)) {
          let trimmed = hunk.content.trim().replace(/^\*+|\*+$/g, "");
          content = <h1>{trimmed}</h1>;
        } else {
          content = hunk.content.replace(/[^\x00-\x7F]/g, "").replace(/_/g, "");
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
  let paragraph = (
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

  let trimmed = props.paragraph.text.trim();
  if (trimmed.startsWith("_") && trimmed.endsWith("_")) {
    return <em>{paragraph}</em>;
  }
  return paragraph;
}

function Poem(props) {
  return (
    <div className="diff">
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

function Overlay(props) {
  return (
    <div className="overlay" onClick={props.handleClick}>
      <div className="overlay-left">
        <FontAwesomeIcon icon={faChevronLeft} className="overlay-button" />{" "}
      </div>
      <div className="overlay-center">
        <FontAwesomeIcon icon={faPause} className="overlay-button" />{" "}
      </div>
      <div className="overlay-right">
        <FontAwesomeIcon icon={faChevronRight} className="overlay-button" />{" "}
      </div>
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
      initializing: true,
      loading: true,
      goingForward: true,
      autoPlaying: this.props.autoPlay,
      tapped: null
    };
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleTapEvent = this.handleTapEvent.bind(this);
    this.handleNextClick = this.handleNextClick.bind(this);
    this.handlePreviousClick = this.handlePreviousClick.bind(this);
    this.handlePlayPauseClick = this.handlePlayPauseClick.bind(this);
    this.handleOverlayClick = this.handleOverlayClick.bind(this);
    this.handleHelpClick = this.handleHelpClick.bind(this);
  }

  componentDidMount() {
    document.addEventListener("keydown", this.handleKeyDown);
    document.title = this.props.title + "- robin ramael";

    var intervalId = this.state.autoPlaying
      ? setInterval(this.timer.bind(this), this.props.delay)
      : null;

    Promise.all([
      this.props.history.ensureIndex(this.props.startAt),
      later(2000)
    ]).then(() => {
      this.setState({
        initializing: false,
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

  render() {
    if (this.props.showEpitaph) {
      if (this.state.initializing) {
        return (
          <div className="content">
            <div className="container">
              alles mengt met elkaar <br /> maar heel traag <br /> – marwin vos
            </div>
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
    }

    if (this.state.loading) {
      return (
        <div className="loader">
          <Loader type="Rings" color="#ffffff" height={80} width={80} />
        </div>
      );
    }

    let from = this.props.history
      .getCommit(Math.max(0, this.state.currIdx))
      .trimStart();
    let to = this.props.history
      .getCommit(
        Math.min(this.props.history.commits.length - 1, this.state.currIdx + 1)
      )
      .trimStart();
    let dt = this.props.history.commits[Math.max(0, this.state.currIdx)].date;

    return (
      <>
        {this.state.showOverlay ? (
          <Overlay handleClick={this.handleOverlayClick} />
        ) : null}
        <div className="top-bar">
          <span>{this.state.tapped}</span>
          <span className="timestamp">
            {moment(dt)
              .local()
              .locale("nl-be")
              .format("DD/MM/YYYY - H:mm:ss ")}
          </span>
          <span className="controls">
            <span
              className="controls-button controls-left"
              onClick={this.handlePreviousClick}
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </span>
            <span
              className="controls-button controls-play-pause"
              onClick={this.handlePlayPauseClick}
            >
              <FontAwesomeIcon
                icon={this.state.autoPlaying ? faPause : faPlay}
              />
            </span>
            <span
              className="controls-button controls-right"
              onClick={this.handleNextClick}
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </span>
          </span>
        </div>

        <div className="content" onClick={this.handleTapEvent}>
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
          <div className="container">
            {this.props.showTitle && this.props.title ? (
              <h1 className="not-in-diff">{this.props.title}</h1>
            ) : null}
            {this.props.debug ? <SimpleView text={from} /> : null}
            <DiffViewer
              from={from}
              to={to}
              goingForward={this.state.goingForward}
            />
            {this.props.debug ? <SimpleView text={to} /> : null}
          </div>
        </div>
        <p
          className="help"
          data-place="left"
          data-type="dark"
          data-multiline="true"
          ref="help"
          onClick={this.handleHelpClick}
        >
          ?
        </p>
      </>
    );
  }

  handleTapEvent(e) {
    let widthPercent = e.clientX / window.innerWidth;

    if (widthPercent < this.props.tapControlWidth) {
      this.previousSlide();
    } else if (widthPercent > 1 - this.props.tapControlWidth) {
      this.nextSlide();
    } else {
      this.handlePressPlayPause();
    }
  }
  handleKeyDown(e) {
    if (e.keyCode === 39) {
      this.pause();
      this.nextSlide();
    } else if (e.keyCode === 37) {
      this.pause();
      this.previousSlide();
    } else if (e.keyCode === 32) {
      e.preventDefault();
      this.handlePressPlayPause();
    } else if (e.keyCode === 69) {
      this.gotoSlide(this.props.history.commits.length - 1);
      this.pause();
      e.preventDefault();
    }
  }

  gotoSlide(idx) {
    this.setState({ loading: true });
    this.props.history.ensureIndex(idx).then(() => {
      this.setState({
        currIdx: idx,
        loading: false
      });
    });
  }
  previousSlide() {
    if (this.state.currIdx > 0) {
      this.setState({ currIdx: this.state.currIdx - 1, goingForward: false });
    }
  }

  nextSlide() {
    if (this.state.currIdx < this.props.history.commits.length - 1) {
      this.setState({ currIdx: this.state.currIdx + 1, goingForward: true });
    } else {
      this.pause();
    }
  }

  handleNextClick(e) {
    e.preventDefault();
    this.pause();
    this.nextSlide();
  }

  handlePreviousClick(e) {
    e.preventDefault();
    this.pause();
    this.previousSlide();
  }

  handlePlayPauseClick(e) {
    e.preventDefault();
    this.handlePressPlayPause();
  }

  timer() {
    this.nextSlide();
  }

  handlePressPlayPause(e) {
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

  handleOverlayClick(e) {
    this.setState({ showOverlay: false });
  }

  handleHelpClick(e) {
    this.setState({ showOverlay: true });
  }
}
