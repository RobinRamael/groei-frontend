import React from "react";
import Loader from "react-loader-spinner";

const JsDiff = require("diff");
const stringHash = require("string-hash");

const ADDED = "added";
const REMOVED = "removed";
const UNCHANGED = "";
const PAR_SEP = "\n\n";
const LINE_SEP = "\n";

function partStatus(part) {
  return part.added ? ADDED : part.removed ? REMOVED : UNCHANGED;
}

function splitOnFirst(s, sep) {
  let sepIndex = s.indexOf(sep);

  if (sepIndex === -1) {
    return [s, ""];
  } else {
    return [s.substring(0, sepIndex), s.substring(sepIndex + sep.length)];
  }
}

function splitOnLast(s, sep) {
  let sepIndex = s.lastIndexOf(sep);

  if (sepIndex === -1) {
    return [s, ""];
  } else {
    return [s.substring(0, sepIndex), s.substring(sepIndex + sep.length)];
  }
}

class Hunk {
  constructor(content, part) {
    this.content = content;
    this.status = partStatus(part);
  }
}

class Line {
  constructor(hunks = []) {
    this.hunks = hunks;
  }

  add(hunk) {
    this.hunks.push(hunk);
  }

  keyed_hunks() {
    let seen = new Set();

    return this.hunks.map((hunk, i) => {
      let key;
      if (seen.has(hunk.content)) {
        key = stringHash(hunk.content) + "-" + i;
      } else {
        key = stringHash(hunk.content);
      }

      seen.add(hunk.content);

      hunk.key = key;
      return hunk;
    });
  }
}

class Paragraph {
  constructor(lines = []) {
    this.lines = lines;
  }

  add(line) {
    this.lines.push(line);
  }
}

function treeDiff(diff) {
  let tree = [];
  let currPar = new Paragraph();
  let currLine = new Line();

  diff.forEach(part => {
    var text = part.value.replace(/\n *\n/g, "\n\n");

    let [firstLineTail, partWithoutFirstLine] = splitOnFirst(text, "\n");

    currLine.add(new Hunk(firstLineTail, part));

    if (!partWithoutFirstLine) {
      return;
    }
    // if this is the end of the line not, the end of the part
    currPar.add(currLine);
    currLine = new Line();

    let [firstParagraphTail, restOfPart] = splitOnFirst(
      partWithoutFirstLine,
      "\n\n"
    );

    firstParagraphTail
      .split("\n")
      .filter(s => s)
      .forEach(line => currPar.add(new Line([new Hunk(line, part)])));

    if (!restOfPart) {
      return;
    }

    // if this is the end of the par, not the end of the part
    tree.push(currPar);
    currPar = new Paragraph();

    let [middleParagraphs, tailParagraphHead] = splitOnLast(restOfPart, "\n\n");

    // add the middle
    middleParagraphs.split("\n\n").forEach(par => {
      let lines = par
        .split("\n")
        .filter(s => s)
        .map(line => new Line([new Hunk(line, part)]));

      tree.push(new Paragraph(lines));
    });

    let [lastParagraphFirstLines, lastLinePart] = splitOnLast(
      tailParagraphHead,
      "\n"
    );

    lastParagraphFirstLines
      .split("\n")
      .filter(s => s)
      .forEach(line => currPar.add(new Line([new Hunk(line, part)])));

    currLine.add(new Hunk(lastLinePart, part));
  });

  currPar.add(currLine);
  tree.push(currPar);
  return tree;
}

function DiffViewer(props) {
  let diff = JsDiff.diffWords(props.from.trim(), props.to.trim());

  let diffTree = treeDiff(diff);

  return (
    <div className="container">
      {diffTree.map((par, i) => (
        <p>
          {par.lines.map(line => {
            return (
              <React.Fragment>
                {line
                  .keyed_hunks()
                  .filter(h => h.status !== props.dontShowStatus)
                  .map(hunk => (
                    <span className={hunk.status} key={hunk.key}>
                      {hunk.content}
                    </span>
                  ))}
                <br />
              </React.Fragment>
            );
          })}
        </p>
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
