import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "https://a12468fefc8445ccb495c53f0dbf528c@sentry.io/1502754"
});

const root = document.getElementById("root");
const message = document.getElementById("message");

async function getContent(poemName, sha) {
  let url = process.env.PUBLIC_URL + `/versions/${poemName}/${sha}.json`;
  const contentResponse = await fetch(url);

  if (!contentResponse.ok) {
    Sentry.captureMessage(`Failed to fetch ${url}`, {
      extra: { reason: contentResponse }
    });
    throw contentResponse;
  }
  const contentJson = await contentResponse.json();
  // const content = window.atob(contentJson.content);
  return contentJson.content;
}

class HistoryPage {
  constructor(poemName, commits, start, pageSize) {
    this.commits = commits || [];
    this.start = start;
    this.pageSize = pageSize;
    this.poemName = poemName;

    this.loading = false;
    this.ready = false;
    this.content = {};
  }

  load() {
    if (this.loading || this.ready) {
      return;
    }

    this.loading = true;
    this.content = {};

    let shasToLoad =
      this.start >= 0
        ? this.commits
            .slice(this.start, this.start + this.pageSize)
            .map(ci => ci.sha)
        : [];

    return Promise.all(
      shasToLoad.map(async sha => {
        this.content[sha] = await getContent(this.poemName, sha);
      })
    ).then(() => {
      this.ready = true;
      this.loading = false;
    });
  }

  get end() {
    return this.start + this.pageSize;
  }
  getCommit(sha) {
    return this.content[sha];
  }
}

class History {
  constructor(poemName, commits, startAt = 0, pageSize = 100, bound = 50) {
    this.poemName = poemName;
    this.commits = commits;
    this.pageSize = pageSize;
    this.bound = bound;

    this.currPage = new HistoryPage(poemName, [], 0, 0);
    this.prevPage = new HistoryPage(poemName, [], 0, 0);
    this.nextPage = new HistoryPage(poemName, [], 0, 0);
  }

  ensureIndex(index) {
    let pageNo = Math.ceil(index / this.pageSize);
    let currPageStart = (pageNo - 1) * this.pageSize;

    this.currPage = new HistoryPage(
      this.poemName,
      this.commits,
      currPageStart,
      this.pageSize
    );

    this.prevPage = new HistoryPage(
      this.poemName,
      this.commits,
      currPageStart - this.pageSize,
      this.pageSize
    );

    this.nextPage = new HistoryPage(
      this.poemName,
      this.commits,
      currPageStart + this.pageSize,
      this.pageSize
    );

    return Promise.all([
      this.currPage.load(),
      this.nextPage.load(),
      this.prevPage.load()
    ]);
  }

  hasIndex(idx) {
    return this.prevPage.start <= idx && idx < this.nextPage.end;
  }

  shiftWindowTo(idx) {
    if (idx >= this.currPage.end) {
      this.shiftWindowForward();
    } else if (idx < this.currPage.start) {
      this.shiftWindowBackward();
    }
  }

  shiftWindowForward() {
    this.prevPage = this.currPage;
    this.currPage = this.nextPage;

    this.nextPage = new HistoryPage(
      this.poemName,
      this.commits,
      this.currPage.end,
      this.pageSize
    );
  }

  shiftWindowBackward() {
    this.nextPage = this.currPage;
    this.currPage = this.prevPage;

    this.prevPage = new HistoryPage(
      this.poemName,
      this.commits,
      this.currPage.start - this.pageSize,
      this.pageSize
    );
  }

  ensureLoading(idx) {
    if (this.currPage.start <= idx && idx < this.currPage.start + this.bound) {
      this.prevPage.load();
    } else if (
      this.currPage.end - this.bound <= idx &&
      idx < this.currPage.end
    ) {
      this.nextPage.load();
    }
  }

  getCommit(idx) {
    this.shiftWindowTo(idx);
    this.ensureLoading(idx);
    return this.currPage.getCommit(this.commits[idx].sha);
  }
}

const POEMS = ["love_poem", "hethaltingprobleem"];

async function getHistory() {
  let url = new URL(window.location);

  let poemName =
    POEMS.find(name => url.pathname.includes(name)) || "hethaltingprobleem";

  const commitsResponse = await fetch(
    process.env.PUBLIC_URL + `/versions/${poemName}.json`
  );
  if (!commitsResponse.ok) {
    throw commitsResponse;
  }
  const commitsJson = await commitsResponse.json();
  const commits = commitsJson.history
    .map(commit => ({
      sha: commit.hex,
      date: new Date(commit.created)
    }))
    .sort(function(a, b) {
      return a.date - b.date;
    });

  return new History(poemName, commits);
}

Promise.all([getHistory(), import("./app")])
  .then(([history, app]) => {
    app.render(history, root);
  })
  .catch(error => {
    console.log(error);
    Sentry.captureMessage("Global error", { extra: { reason: error.reason } });
    message.innerHTML = `<p>Unexpected error. Check the console.</p>`;
  });
