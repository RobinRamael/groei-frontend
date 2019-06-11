import React from "react";
import Loader from "react-loader-spinner";

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
    this.state = { currIdx: this.props.startAt, loading: true };
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
    let text = this.props.history.getCommit(this.state.currIdx);

    let paragraphs;
    if (text) {
      paragraphs = text.split("\n\n");
    } else {
      paragraphs = [];
    }

    return (
      <div>
        {paragraphs.map(paragraph => (
          <p>
            {paragraph.split("\n").map(line => (
              <React.Fragment>
                {line}
                <br />
              </React.Fragment>
            ))}
          </p>
        ))}
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
      this.setState({ currIdx: this.state.currIdx - 1 });
    }
  }

  nextSlide() {
    if (this.state.currIdx < this.props.history.commits.length - 1) {
      this.setState({ currIdx: this.state.currIdx + 1 });
    }
  }
}
