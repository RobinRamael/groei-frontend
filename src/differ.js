import * as jsdiff from "diff";

export const ADDED = "added";
export const REMOVED = "removed";
export const UNCHANGED = "";

const PAR_SEP = "\n\n";
const LINE_SEP = "\n";

function partStatus(part) {
  return part.added ? ADDED : part.removed ? REMOVED : UNCHANGED;
}

class Hunk {
  constructor(content, status) {
    this.content = content;
    this.status = status;
  }

  get text() {
    return this.content;
  }
}

function partition(xs, f) {
  let passed = [];
  let failed = [];

  xs.forEach(x => {
    if (f(x)) {
      passed.push(x);
    } else {
      failed.push(x);
    }
  });

  return [passed, failed];
}

class Line {
  constructor(hunks = []) {
    this.hunks = hunks;
  }

  getNormalizedHunks(statusComingFirst = ADDED) {
    let parts = [];
    let currPart = [];

    this.hunks.forEach(hunk => {
      if (hunk.content === " ") {
        currPart.content += " ";
      } else if (hunk.status === UNCHANGED) {
        parts.push(currPart);
        parts.push([hunk]);
        currPart = [];
      } else {
        currPart.push(hunk);
      }
    });

    if (currPart) {
      parts.push(currPart);
    }

    return (
      parts
        .map(part => {
          // we can ignore UNCHANGED here, as it will always be by itself in a part.
          let [added, removed] = partition(
            part,
            h => h.status === statusComingFirst
          );

          return added.concat(removed);
        })
        .flat()
        // .filter(hunk => hunk.content.trim() !== "")
        .reduce((mergedHunks, hunk) => {
          if (
            mergedHunks.length === 0 || // if the array doesn't have a last element yet
            mergedHunks[mergedHunks.length - 1].status !== hunk.status // or if the last element has a different status
          ) {
            return mergedHunks.concat([hunk]); // start a new hunk
          } else {
            mergedHunks[mergedHunks.length - 1].content += " " + hunk.content; // add to the last one
            return mergedHunks;
          }
        }, [])
    );
  }

  add(hunk) {
    this.hunks.push(hunk);
  }

  get text() {
    let s = this.hunks.map(h => h.text).join("");
    return s;
  }
}

class Paragraph {
  constructor(lines = []) {
    this.lines = lines;
  }

  add(line) {
    this.lines.push(line);
  }

  get text() {
    let s = this.lines.map(l => l.text).join("\n");
    return s;
  }
}

export function simpleSplit(text) {
  return text
    .replace(/\n *\n/g, PAR_SEP)
    .split(PAR_SEP)
    .map(
      par =>
        new Paragraph(
          par.split(LINE_SEP).map(line => new Line([new Hunk(line, {})]))
        )
    );
}

const READING = 0;
const READNEWLINE = 1;

export function treeDiff(from, to) {
  let diff = jsdiff.diffWords(from, to);

  let tree = [];

  let currPar = new Paragraph();
  let currLine = new Line();
  let currHunkChars = [];

  let state = READING;

  diff.forEach(part => {
    let status = partStatus(part);
    part.value
      .replace(/\n *\n/g, PAR_SEP)
      .split("")
      .forEach(c => {
        if (state === READNEWLINE) {
          if (c === LINE_SEP) {
            // just read second newline
            // => end of paragraph

            currLine.add(new Hunk(currHunkChars.join(""), status));
            currPar.add(currLine);
            tree.push(currPar);

            currHunkChars = [];
            currLine = new Line();
            currPar = new Paragraph();
            state = READING;
          } else {
            // read one newline and then something else
            // => end of line
            currLine.add(new Hunk(currHunkChars.join(""), status));
            currPar.add(currLine);

            currLine = new Line();
            currHunkChars = [c];
            state = READING;
          }
        } else {
          // READING state

          if (c === LINE_SEP) {
            // just read first newline
            state = READNEWLINE;
          } else {
            // just read a char that is not a newline
            currHunkChars.push(c);
            state = READING;
          }
        }
      });
    currLine.add(new Hunk(currHunkChars.join(""), status));
    currHunkChars = [];
  });

  return tree;
}
