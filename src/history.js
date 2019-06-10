import React from "react";
import Loader from "react-loader-spinner";

const JsDiff = require("diff");

// {
// console.log(part); return part.value
//   .split("\n")
//   .filter(part => part.removed)
//   .map(parsInCurrPart => (
//     <p className={part.added ? "green" : part.removed}>
//       {parsInCurrPart}
//     </p>
//   ));
// }
//
//
const ADDED = 1;
const REMOVED = 2;
const UNCHANGED = 0;
const PAR_SEP = "\n\n";
const LINE_SEP = "\n";

function partStatus(part) {
  return part.added ? "added" : part.removed ? "removed" : "";
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

function treeDiff(diff) {
  let tree = [];
  let currPar = [];
  let currLine = [];

  diff.forEach(part => {
    var text = part.value.replace(/\n *\n/g, "\n\n");

    let [firstLineTail, partWithoutFirstLine] = splitOnFirst(text, "\n");

    currLine.push({ content: firstLineTail, status: partStatus(part) });

    if (!partWithoutFirstLine) {
      return;
    }
    // if this is the end of the line not, the end of the part
    currPar.push(currLine);
    currLine = []; // close the line

    let [firstParagraphTail, restOfPart] = splitOnFirst(
      partWithoutFirstLine,
      "\n\n"
    );

    firstParagraphTail
      .split("\n")
      .filter(s => s)
      .forEach(line =>
        currPar.push([{ content: line, status: partStatus(part) }])
      );

    if (!restOfPart) {
      return;
    }

    // if this is the end of the par, not the end of the part
    tree.push(currPar);
    currPar = []; // close the par

    let [middleParagraphs, tailParagraphHead] = splitOnLast(restOfPart, "\n\n");

    // add the middle
    middleParagraphs.split("\n\n").forEach(par => {
      let splitPar = par
        .split("\n")
        .filter(s => s)
        .map(line => [{ content: line, status: partStatus(part) }]);

      tree.push(splitPar);
    });

    let [lastParagraphFirstLines, lastLinePart] = splitOnLast(
      tailParagraphHead,
      "\n"
    );

    lastParagraphFirstLines
      .split("\n")
      .filter(s => s)
      .forEach(line =>
        currPar.push([{ content: line, status: partStatus(part) }])
      );

    currLine.push({ content: lastLinePart, status: partStatus(part) });
  });

  currPar.push(currLine);
  tree.push(currPar);
  return tree;
}

function DiffViewer(props) {
  let diffTree = treeDiff(props.diff);

  return (
    <div className="container">
      {diffTree.map((par, i) => (
        <p>
          {par.map(line => (
            <React.Fragment>
              {line.map(hunk => (
                <span class={hunk.status}> {hunk.content} </span>
              ))}
              <br />
            </React.Fragment>
          ))}
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
      goingForward: true
    };
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  componentDidMount() {
    document.addEventListener("keydown", this.handleKeyDown);

    this.props.history.ensureIndex(this.props.startAt).then(() => {
      var intervalId = this.props.autoPlay
        ? setInterval(this.timer.bind(this), 100)
        : null;
      this.setState({ loading: false, intervalId: intervalId });
    });
  }

  componentWillUnmount() {
    clearInterval(this.state.intervalId);
  }

  timer() {
    this.nextSlide();
  }

  renderText() {
    let from, to;
    if (this.state.goingForward) {
      if (this.state.currIdx === 0) {
        from = "";
      } else {
        from = this.props.history.getCommit(this.state.currIdx - 1);
      }
      to = this.props.history.getCommit(this.state.currIdx);
    } else {
      to = this.props.history.getCommit(this.state.currIdx);
      from = this.props.history.getCommit(this.state.currIdx + 1);
    }

    return <DiffViewer diff={JsDiff.diffWords(from.trim(), to.trim())} />;
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
    clearInterval(this.state.intervalId);
    if (e.keyCode === 39) {
      this.nextSlide();
    } else if (e.keyCode === 37) {
      this.previousSlide();
    }
  }

  previousSlide() {
    if (this.state.currIdx > 0) {
      this.setState({ currIdx: this.state.currIdx - 1, goingForward: false });
    }
  }

  nextSlide() {
    if (this.state.currIdx < this.props.history.commits.length - 1) {
      this.setState({ currIdx: this.state.currIdx + 1 });
    }
  }
}
