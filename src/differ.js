import * as jsdiff from "diff";

export const ADDED = "added";
export const REMOVED = "removed";
export const UNCHANGED = "";

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

  get text() {
    return this.content;
  }
}

class Line {
  constructor(hunks = []) {
    this.hunks = hunks;
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
    let s = this.lines.map(l => l.text).join("");
    return s;
  }
}

export function treeDiff(from, to) {
  let diff = jsdiff.diffWords(to, from);

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
