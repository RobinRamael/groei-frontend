const root = document.getElementById("root");
const message = document.getElementById("message");

async function getContent(sha) {
  const contentResponse = await fetch(
    process.env.PUBLIC_URL + `/versions/hethaltingprobleem/${sha}.json`
  );

  if (!contentResponse.ok) {
    throw contentResponse;
  }
  const contentJson = await contentResponse.json();
  // const content = window.atob(contentJson.content);
  return contentJson.content;
}

class HistoryPage {
  constructor(commits, start, pageSize) {
    this.commits = commits || [];
    this.start = start;
    this.pageSize = pageSize;

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
        this.content[sha] = await getContent(sha);
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
  constructor(commits, startAt = 0, pageSize = 100, bound = 25) {
    this.commits = commits;
    this.pageSize = pageSize;
    this.bound = bound;

    this.currPage = new HistoryPage([], 0, 0);
    this.prevPage = new HistoryPage([], 0, 0);
    this.nextPage = new HistoryPage([], 0, 0);
  }

  ensureIndex(index) {
    let pageNo = Math.ceil(index / this.pageSize);
    let currPageStart = (pageNo - 1) * this.pageSize;

    this.currPage = new HistoryPage(this.commits, currPageStart, this.pageSize);

    this.prevPage = new HistoryPage(
      this.commits,
      currPageStart - this.pageSize,
      this.pageSize
    );

    this.nextPage = new HistoryPage(
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
      this.commits,
      this.currPage.end,
      this.pageSize
    );
  }

  shiftWindowBackward() {
    this.nextPage = this.currPage;
    this.currPage = this.prevPage;

    this.prevPage = new HistoryPage(
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

async function getHistory() {
  const commitsResponse = await fetch(
    process.env.PUBLIC_URL + "/versions/hethaltingprobleem.json"
  );
  if (!commitsResponse.ok) {
    throw commitsResponse;
  }
  const commitsJson = await commitsResponse.json();
  const commits = commitsJson.history
    .slice(50)
    .map(commit => ({
      sha: commit.hex,
      date: new Date(commit.created)
    }))
    .sort(function(a, b) {
      return a.date - b.date;
    });

  return new History(commits);
}

Promise.all([
  getHistory(),
  import("./app")
  // loadLanguage(lang)
])
  .then(([history, app]) => {
    app.render(history, root);
  })
  .catch(error => {
    console.error(error);
    message.innerHTML = `<p>Unexpected error. Check the console.</p>`;
  });
