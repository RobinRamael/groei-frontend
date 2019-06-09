import React, { useEffect, useState } from "react";
import { getSlides } from "./differ";
import { useSpring } from "react-use";
import Slide from "./slide";
import "./comment-box.css";

function hashCode(s) {
  return s.split("").reduce(function(a, b) {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);
}

export default class HistoryView extends React.Component {
  constructor(props) {
    super(props);
    this.state = { currIdx: 0, loading: true };
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  componentDidMount() {
    document.addEventListener("keydown", this.handleKeyDown);
    this.props.history.currLoading.then(() =>
      this.setState({ loading: false })
    );
  }

  render() {
    let text = this.props.history.getCommit(this.state.currIdx);

    let paragraphs;
    if (text) {
      paragraphs = text.split("\n\n");
    } else {
      paragraphs = [];
    }

    if (!this.state.loading) {
      return (
        <div>
          {paragraphs.map(paragraph => (
            <p key={hashCode(paragraph)}>
              {paragraph.split("\n").map(line => (
                <React.Fragment key={hashCode(line)}>
                  {line}
                  <br />
                </React.Fragment>
              ))}
            </p>
          ))}
        </div>
      );
    } else {
      return <div>Loading</div>;
    }
  }

  handleKeyDown(e) {
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
    if (this.state.currIdx < this.props.history.length) {
      this.setState({ currIdx: this.state.currIdx + 1 });
    }
  }
}

// export default function History({ history, language }) {
//   const codes = commits.map(commit => commit.content);
//   const slideLines = getSlides(codes, language);
//   const [current, target, setTarget] = useSliderSpring(codes.length - 1);
//   const index = Math.round(current);

//   const nextSlide = () =>
//     setTarget(Math.min(Math.round(target + 0.51), slideLines.length - 1));
//   const prevSlide = () => setTarget(Math.max(Math.round(target - 0.51), 0));

//     document.body.onkeydown = function(e) {
//       if (e.keyCode === 39) {
//         nextSlide();
//       } else if (e.keyCode === 37) {
//         prevSlide();
//       } else if (e.keyCode === 32) {
//         setTarget(current);
//       }
//     };

//   return (
//     <React.Fragment>
//       <Slide time={current - index} lines={slideLines[index]} />
//     </React.Fragment>
//   );
// }
// function useSliderSpring(initial) {
//   const [target, setTarget] = useState(initial);
//   const tension = 0;
//   const friction = 10;
//   const value = useSpring(target, tension, friction);

//   return [Math.round(value * 100) / 100, target, setTarget];
// }
