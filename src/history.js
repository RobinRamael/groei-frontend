import React from "react";
import Loader from "react-loader-spinner";
import moment from "moment";
import "moment/locale/nl-be";
import {
  faPlay,
  faPause,
  faAngleRight,
  faAngleLeft,
  faAngleDoubleRight,
  faAngleDoubleLeft
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
        <FontAwesomeIcon icon={faAngleLeft} className="overlay-button" />{" "}
      </div>
      <div className="overlay-center">
        <FontAwesomeIcon icon={faPause} className="overlay-button" />{" "}
      </div>
      <div className="overlay-right">
        <FontAwesomeIcon icon={faAngleRight} className="overlay-button" />{" "}
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
    this.timer = this.timer.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleTapEvent = this.handleTapEvent.bind(this);
    this.handleNextClick = this.handleNextClick.bind(this);
    this.handlePreviousClick = this.handlePreviousClick.bind(this);
    this.handlePlayPauseClick = this.handlePlayPauseClick.bind(this);
    this.handleOverlayClick = this.handleOverlayClick.bind(this);
    this.handleHelpClick = this.handleHelpClick.bind(this);
    this.handleLastSlideClick = this.handleLastSlideClick.bind(this);
    this.handleFirstSlideClick = this.handleFirstSlideClick.bind(this);
  }

  componentDidMount() {
    document.addEventListener("keydown", this.handleKeyDown);
    document.title = this.props.title + " - robin ramael";

    if (this.props.autoPlay) {
      this.play();
    }

    Promise.all([
      this.props.history.ensureIndex(this.props.startAt),
      later(2000)
    ]).then(() => {
      this.setState({
        initializing: false,
        loading: false,
        starting: true
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

    let from = this.props.history.getCommit(Math.max(0, this.state.currIdx));

    from = typeof from === "string" ? from.trimStart() : "";

    let to = this.props.history.getCommit(
      Math.min(this.props.history.commits.length - 1, this.state.currIdx + 1)
    );

    to = typeof to === "string" ? to.trimStart() : "";

    let dt = this.props.history.commits[Math.max(0, this.state.currIdx)].date;

    return (
      <>
        {this.state.showOverlay ? (
          <Overlay handleClick={this.handleOverlayClick} />
        ) : null}
        <div className="top-bar">
          <span>{this.state.tapped}</span>
          <span class="about">
            <a href="/about/">metatekst</a>
          </span>
          <span className="timestamp">
            {moment(dt)
              .local()
              .locale("nl-be")
              .format("DD/MM/YYYY - H:mm:ss ")}
          </span>
          <span className="controls">
            <span
              className="controls-button controls-start"
              onClick={this.handleFirstSlideClick}
            >
              <FontAwesomeIcon icon={faAngleDoubleLeft} />
            </span>
            <span
              className="controls-button controls-left"
              onClick={this.handlePreviousClick}
            >
              <FontAwesomeIcon icon={faAngleLeft} />
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
              <FontAwesomeIcon icon={faAngleRight} />
            </span>
            <span
              className="controls-button controls-end"
              onClick={this.handleLastSlideClick}
            >
              <FontAwesomeIcon icon={faAngleDoubleRight} />
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
      this.lastSlide();
      e.preventDefault();
    } else if (e.keyCode === 66) {
      this.firstSlide();
      e.preventDefault();
    }
  }

  loadSlide(idx) {
    this.setState({ loading: true });
    return this.props.history.ensureIndex(idx).then(() => {
      this.setState({
        currIdx: idx,
        loading: false
      });
    });
  }

  gotoSlide(idx) {
    if (this.props.history.hasIndex(idx)) {
      this.setState({ currIdx: idx });
    } else {
      let wasPlaying = this.state.autoPlaying;
      this.pause();
      this.props.history.ensureIndex(idx).then(() => {
        this.setState({
          currIdx: idx
        });
        if (wasPlaying) {
          this.play();
        }
      });
    }
  }

  previousSlide() {
    if (this.state.currIdx > 0) {
      this.gotoSlide(this.state.currIdx - 1);
      this.setState({ goingForward: false });
    }
  }

  nextSlide() {
    if (this.state.currIdx < this.props.history.commits.length - 1) {
      this.gotoSlide(this.state.currIdx + 1);
      this.setState({ goingForward: true });
    } else {
      this.pause();
    }
  }

  lastSlide() {
    this.loadSlide(this.props.history.commits.length - 1);
    this.pause();
  }

  firstSlide() {
    this.pause();
    this.loadSlide(0).then(() => {
      this.play();
    });
  }

  handleNextClick(e) {
    e.preventDefault();
    this.pause();
    this.nextSlide();
    return false;
  }

  handlePreviousClick(e) {
    e.preventDefault();
    this.pause();
    this.previousSlide();
    return false;
  }

  handlePlayPauseClick(e) {
    e.preventDefault();
    this.handlePressPlayPause();
    return false;
  }

  handleLastSlideClick(e) {
    e.preventDefault();
    this.lastSlide();
    return false;
  }

  handleFirstSlideClick(e) {
    e.preventDefault();
    this.firstSlide();
    return false;
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
    let intervalId = setInterval(this.timer, this.props.delay);
    this.setState({ intervalId: intervalId, autoPlaying: true });
  }

  handleOverlayClick(e) {
    this.setState({ showOverlay: false });
  }

  handleHelpClick(e) {
    this.setState({ showOverlay: true });
  }
}
